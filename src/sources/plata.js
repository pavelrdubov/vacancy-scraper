// Источник: Plata Card — через публичный Greenhouse API (чистый JSON).
const API = "https://boards-api.greenhouse.io/v1/boards/platacard/jobs?content=true";

const decodeHtmlEntities = (s) =>
  String(s || "")
    .replace(/&lt;/g, "<").replace(/&gt;/g, ">")
    .replace(/&amp;/g, "&").replace(/&#39;/g, "'").replace(/&quot;/g, '"')
    .replace(/&nbsp;/g, " ");

export async function scrapePlata() {
  const res = await fetch(API, { headers: { "User-Agent": "vacancy-scraper" } });
  if (!res.ok) throw new Error(`Plata/Greenhouse HTTP ${res.status}`);
  const data = await res.json();
  const jobs = data.jobs || [];

  return jobs.map((j) => {
    const office = (j.offices && j.offices[0] && j.offices[0].location) || "";
    const location = j.location?.name || office || "";
    const workModel = (j.metadata || []).find((m) => m.name === "work_model")?.value || "";
    const department = (j.departments || []).map((d) => d.name).join(", ");
    return {
      id: `plata-${j.id}`,
      company: "Plata Card",
      title: (j.title || "").trim(),
      location,
      workMode: workModel,
      department,
      url: j.absolute_url,
      description: decodeHtmlEntities(j.content).replace(/<[^>]+>/g, " "),
    };
  });
}
