// Источник: Yandex Jobs — SPA, рендерится в JS, через Playwright.
// Проходим по нескольким профессиональным разделам (продажи, управление,
// проекты), прожимаем "Показать ещё" и считываем карточки.
// ПРИМЕЧАНИЕ: с дата-центровых IP (GitHub Actions) Yandex иногда отдаёт
// капчу. Локально из РФ работает штатно. Если поймали капчу — источник
// вернёт [] и не сломает остальной прогон.
import { config } from "../../config.js";

const START_URLS = [
  "https://yandex.ru/jobs/vacancies?professions=partner-manager&professions=bis-dev-manager&professions=sales-manager",
  "https://yandex.ru/jobs/vacancies?professions=product-manager&professions=project-manager-business&professions=tech-manager",
];

async function scrapeOne(browser, url) {
  const page = await browser.newPage();
  page.setDefaultTimeout(config.browser.timeoutMs);
  try {
    await page.goto(url, { waitUntil: "domcontentloaded" });

    // Признак капчи.
    if (/showcaptcha|captcha/i.test(page.url())) {
      console.warn("  [Yandex] капча — раздел пропущен.");
      return [];
    }

    try {
      await page.waitForSelector('a[href*="/jobs/vacancies/"]', { timeout: config.browser.timeoutMs });
    } catch {
      return [];
    }

    for (let i = 0; i < 40; i++) {
      const btn = page.getByRole("button", { name: /показать ещё|показать еще|show more|load more/i });
      if (await btn.count() === 0) break;
      try {
        await btn.first().click({ timeout: 4000 });
        await page.waitForTimeout(800);
      } catch {
        break;
      }
    }

    const raw = await page.evaluate(() => {
      const anchors = Array.from(document.querySelectorAll('a[href*="/jobs/vacancies/"]'));
      const out = [];
      const seen = new Set();
      for (const a of anchors) {
        const href = a.href;
        // реальные вакансии: слаг заканчивается на -<цифры>
        const idm = href.match(/\/jobs\/vacancies\/([a-z0-9-]+?-(\d+))(?:[/?#]|$)/i);
        if (!idm) continue;
        const id = idm[2];
        if (seen.has(id)) continue;
        seen.add(id);
        // текст карточки: поднимаемся к контейнеру
        let node = a;
        for (let k = 0; k < 4 && node.parentElement; k++) node = node.parentElement;
        const text = (node.innerText || a.innerText || "").trim();
        out.push({ id, href, text, title: (a.innerText || "").trim() });
      }
      return out;
    });

    return raw.map((r) => {
      const lines = r.text.split("\n").map((s) => s.trim()).filter(Boolean);
      const title = r.title || lines[0] || "";
      return {
        id: `yandex-${r.id}`,
        company: "Yandex",
        title,
        location: r.text,   // локация/город есть в тексте карточки
        workMode: (r.text.match(/удал[её]нн\w*|гибрид\w*|офис/i) || [""])[0],
        department: "",
        url: r.href.split("?")[0],
        description: r.text,
      };
    });
  } finally {
    await page.close();
  }
}

export async function scrapeYandex(browser) {
  const all = [];
  const seen = new Set();
  for (const url of START_URLS) {
    try {
      const items = await scrapeOne(browser, url);
      for (const it of items) {
        if (seen.has(it.id)) continue;
        seen.add(it.id);
        all.push(it);
      }
    } catch (e) {
      console.warn(`  [Yandex] раздел не удалось прочитать: ${e.message}`);
    }
  }
  return all;
}
