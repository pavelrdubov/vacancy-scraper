// Источник: Yango — SPA, рендерится в JS, поэтому через Playwright.
// Открываем страницу вакансий, закрываем cookie-баннер, жмём "Load more"
// пока он есть, затем считываем карточки.
import { config } from "../../config.js";

const URL = "https://yango.com/career/vacancy";

export async function scrapeYango(browser) {
  const page = await browser.newPage();
  page.setDefaultTimeout(config.browser.timeoutMs);
  try {
    await page.goto(URL, { waitUntil: "domcontentloaded" });

    // Закрыть cookie-баннер, если появился ("Принять" / "Accept").
    try {
      const accept = page.getByRole("button", { name: /принять|accept/i });
      await accept.click({ timeout: 5000 });
    } catch { /* баннера нет — ок */ }

    // Дождаться появления хотя бы одной карточки вакансии.
    await page.waitForSelector('a[href*="/vacancy/"], a[href*="vacancy/"]', { timeout: config.browser.timeoutMs });

    // Жмём "Load more", пока кнопка есть (макс. 30 раз — предохранитель).
    for (let i = 0; i < 30; i++) {
      const btn = page.getByRole("button", { name: /load more|показать ещё|показать еще/i });
      if (await btn.count() === 0) break;
      try {
        await btn.first().click({ timeout: 4000 });
        await page.waitForTimeout(900);
      } catch {
        break;
      }
    }

    // Считываем карточки прямо со страницы.
    const raw = await page.evaluate(() => {
      const anchors = Array.from(document.querySelectorAll('a[href*="vacancy/"]'));
      const out = [];
      const seen = new Set();
      for (const a of anchors) {
        const href = a.href;
        const idm = href.match(/vacancy\/(\d+)/);
        if (!idm) continue;                 // берём только карточки с числовым id
        if (seen.has(idm[1])) continue;
        seen.add(idm[1]);
        const text = (a.innerText || "").trim();
        if (!text) continue;
        out.push({ id: idm[1], href, text });
      }
      return out;
    });

    return raw.map((r) => {
      const lines = r.text.split("\n").map((s) => s.trim()).filter(Boolean);
      const title = lines[0] || "";
      const team = lines[1] || "";
      const rest = lines.slice(1).join(" ");   // team + режимы + локация
      return {
        id: `yango-${r.id}`,
        company: "Yango",
        title,
        location: rest,        // страна обычно в скобках title; team/mode тоже тут
        workMode: (r.text.match(/\b(remote|office|hybrid|удал[её]нн\w*|гибрид\w*|офис)\b/i) || [""])[0],
        department: team,
        url: r.href,
        description: r.text,
      };
    });
  } finally {
    await page.close();
  }
}
