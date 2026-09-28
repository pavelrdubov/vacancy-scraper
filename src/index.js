// Точка входа: собирает вакансии из всех включённых источников,
// фильтрует, дозаписывает в CSV-лог, определяет новые и шлёт их в Telegram.
import { chromium } from "playwright";
import { config } from "../config.js";
import { applyProxy } from "./proxy.js";
import { passesFilter, matchReason } from "./filter.js";
import { appendToCsv, loadSeen, saveSeen } from "./store.js";
import { notifyNew } from "./telegram.js";

import { scrapePlata } from "./sources/plata.js";
import { scrapeIndrive } from "./sources/indrive.js";
import { scrapeYango } from "./sources/yango.js";
import { scrapeYandex } from "./sources/yandex.js";

async function main() {
  const started = new Date();
  console.log(`\n=== Поиск вакансий — ${started.toISOString()} ===`);
  console.log(`Режим фильтра: ${config.filterMode}\n`);

  // Прокси (VPN) — применяем к fetch и передадим в браузер.
  const proxyUrl = await applyProxy();

  const collected = [];
  let browser = null;

  // Нужен ли браузер (Yango/Yandex рендерятся в JS)?
  let needBrowser =
    (config.sources.yango.enabled) || (config.sources.yandex.enabled);
  if (needBrowser) {
    try {
      browser = await chromium.launch({
        headless: config.browser.headless,
        ...(proxyUrl ? { proxy: { server: proxyUrl } } : {}),
      });
    } catch (e) {
      console.log(`Не удалось запустить браузер: ${e.message}. Yango/Yandex пропускаю.`);
      browser = null;
      needBrowser = false;
    }
  }

  // --- Источники без браузера (быстрые JSON API) ---
  if (config.sources.plata.enabled) {
    await runSource("Plata", () => scrapePlata(), collected);
  }
  if (config.sources.indrive.enabled) {
    await runSource("inDrive", () => scrapeIndrive(), collected);
  }

  // --- Источники через браузер (только если он запустился) ---
  if (config.sources.yango.enabled && browser) {
    await runSource("Yango", () => scrapeYango(browser), collected);
  }
  if (config.sources.yandex.enabled && browser) {
    await runSource("Yandex", () => scrapeYandex(browser), collected);
  }

  if (browser) await browser.close();

  // --- Фильтрация ---
  const matched = [];
  for (const v of collected) {
    if (passesFilter(v)) {
      v.matchReason = matchReason(v);
      matched.push(v);
    }
  }
  console.log(`\nВсего собрано: ${collected.length}. Подходит под фильтр: ${matched.length}.`);

  // --- Новые (которых не было в seen.json) ---
  const seen = loadSeen();
  const isFirstRun = seen.size === 0;
  const newOnes = matched.filter((v) => !seen.has(v.id));

  // --- Запись лога и обновление seen ---
  appendToCsv(matched.filter((v) => !seen.has(v.id))); // в CSV только реально новые строки
  for (const v of matched) seen.add(v.id);
  saveSeen(seen);

  console.log(`Новых подходящих вакансий: ${newOnes.length}` +
    (isFirstRun ? " (первый запуск — уведомления не шлём, только заполняем базу)" : ""));

  // --- Уведомления ---
  // На самом первом запуске НЕ спамим — просто фиксируем текущее состояние.
  if (!isFirstRun) {
    await notifyNew(newOnes);
  } else {
    console.log("База инициализирована. Со следующего запуска будут приходить только новые вакансии.");
  }

  console.log(`\nГотово за ${((Date.now() - started) / 1000).toFixed(1)} c.`);
  console.log(`Лог: ${config.files.csv}`);
}

async function runSource(name, fn, collected) {
  process.stdout.write(`→ ${name}... `);
  try {
    const items = await fn();
    console.log(`${items.length} вакансий`);
    collected.push(...items);
  } catch (e) {
    console.log(`ОШИБКА: ${e.message}`);
  }
}

main().catch((e) => {
  // Не валим весь автозапуск из-за разовой ошибки — логируем и выходим спокойно.
  console.error("Ошибка прогона:", e);
  process.exit(0);
});
