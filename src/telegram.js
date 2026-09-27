// Отправка уведомлений о новых вакансиях в Telegram.
// Если токен/chatId не заданы — просто печатает в консоль (для локального теста).
import { config } from "../config.js";

const stripHtml = (s) => String(s || "").replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();

function escapeHtml(s) {
  return String(s || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

// Формирует одно сообщение по вакансии.
function formatVacancy(v) {
  const title = escapeHtml(v.title);
  const company = escapeHtml(v.company);
  const loc = escapeHtml(v.location || "—");
  const reason = escapeHtml(v.matchReason || "");
  return (
    `🆕 <b>${title}</b>\n` +
    `🏢 ${company}  ·  📍 ${loc}\n` +
    (reason ? `🏷 ${reason}\n` : "") +
    `🔗 ${escapeHtml(v.url)}`
  );
}

async function sendMessage(text) {
  const { botToken, chatId } = config.telegram;
  if (!botToken || !chatId) {
    console.log("\n[Telegram не настроен — вывод в консоль]\n" + stripHtml(text) + "\n");
    return;
  }
  const url = `https://api.telegram.org/bot${botToken}/sendMessage`;
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      chat_id: chatId,
      text,
      parse_mode: "HTML",
      disable_web_page_preview: false,
    }),
  });
  if (!res.ok) {
    const body = await res.text();
    console.error(`[Telegram] ошибка ${res.status}: ${body}`);
  }
}

// Отправляет пачку новых вакансий (по одному сообщению на вакансию,
// с небольшой паузой, чтобы не упереться в лимиты Telegram).
export async function notifyNew(newVacancies) {
  if (!newVacancies.length) {
    console.log("Новых вакансий нет — уведомлять не о чем.");
    return;
  }
  await sendMessage(`📊 Найдено новых подходящих вакансий: <b>${newVacancies.length}</b>`);
  for (const v of newVacancies) {
    await sendMessage(formatVacancy(v));
    await new Promise((r) => setTimeout(r, 1200));
  }
}
