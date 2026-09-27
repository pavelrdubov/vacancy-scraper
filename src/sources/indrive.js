// Источник: inDrive — ATS Pinpoint.
// Стратегия 1 (основная): публичный JSON API Pinpoint (postings.json).
// Стратегия 2 (запасная): разбор server-rendered страницы careers.indrive.com.
const PINPOINT_JSON = "https://indrive.pinpointhq.com/postings.json";
const CAREERS_BASE = "https://careers.indrive.com/vacancies";
const UA = { "User-Agent": "Mozilla/5.0 (compatible; vacancy-scraper/1.0)" };

// --- Стратегия 1: Pinpoint JSON ---
async function fromPinpointJson() {
  const res = await fetch(PINPOINT_JSON, { headers: UA });
  if (!res.ok) throw new Error(`Pinpoint HTTP ${res.status}`);
  const json = await res.json();

  // Pinpoint отдаёт данные в разных формах в зависимости от аккаунта —
  // обрабатываем несколько возможных структур.
  const list = json.data || json.postings || json.results || [];
  if (!Array.isArray(list) || list.length === 0) throw new Error("Pinpoint: пустой список");

  return list.map((item) => {
    const a = item.attributes || item;
    const loc =
      a.location?.name ||
      a.location_name ||
      [a.city, a.country].filter(Boolean).join(", ") ||
      a.location ||
      "";
    return {
      id: `indrive-${item.id || a.id || a.reference || a.url}`,
      company: "inDrive",
      title: (a.title || a.name || "").trim(),
      location: typeof loc === "string" ? loc : "",
      workMode: a.workplace_type || a.remote_status || a.work_model || "",
      department: a.department?.name || a.department || a.division || "",
      url: a.url || a.apply_url || a.careers_url || "",
      description: (a.description || a.description_text || "").replace(/<[^>]+>/g, " "),
    };
  }).filter((v) => v.title && v.url);
}

// --- Стратегия 2: HTML careers.indrive.com (server-rendered, пагинация) ---
async function fromCareersHtml() {
  const vacancies = [];
  const seenUrls = new Set();

  for (let page = 1; page <= 10; page++) {
    const url = page === 1 ? `${CAREERS_BASE}/` : `${CAREERS_BASE}/page/${page}/`;
    const res = await fetch(url, { headers: UA });
    if (!res.ok) break;
    const html = await res.text();

    // Ссылки на постинги вида .../en/postings/UUID с текстом-названием.
    const re = /<a[^>]+href="(https:\/\/indrive\.pinpointhq\.com\/en\/postings\/[^"]+)"[^>]*>([\s\S]*?)<\/a>/g;
    let m;
    let foundOnPage = 0;
    while ((m = re.exec(html)) !== null) {
      const href = m[1];
      if (seenUrls.has(href)) continue;
      seenUrls.add(href);
      foundOnPage++;

      const rawText = m[2].replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
      // Формат текста: "Title <Mode> - Full Time - <Division> <Country>"
      // Название = всё до первого " - "; локация = хвост после последнего " - ".
      let title = rawText;
      let tail = "";
      const parts = rawText.split(" - ");
      if (parts.length >= 2) {
        title = parts[0].replace(/\s+(Hybrid|Onsite|Remote|Fully remote)$/i, "").trim();
        tail = parts[parts.length - 1].trim(); // "Finance Cyprus" → division + country
      }
      const idMatch = href.match(/postings\/([0-9a-f-]+)/i);
      vacancies.push({
        id: `indrive-${idMatch ? idMatch[1] : href}`,
        company: "inDrive",
        title,
        location: tail,     // содержит страну — гео-фильтр отработает
        workMode: (rawText.match(/\b(Hybrid|Onsite|Fully remote|Remote)\b/i) || [""])[0],
        department: "",
        url: href,
        description: "",    // на листинге описания нет; фильтр по title+location
      });
    }
    if (foundOnPage === 0) break; // страниц больше нет
  }
  return vacancies;
}

export async function scrapeIndrive() {
  try {
    const viaJson = await fromPinpointJson();
    if (viaJson.length) return viaJson;
    throw new Error("Pinpoint JSON вернул 0 — пробуем HTML");
  } catch (e) {
    console.warn(`  [inDrive] Pinpoint JSON недоступен (${e.message}); переключаюсь на HTML careers-страницу.`);
    return await fromCareersHtml();
  }
}
