// Делает fetch() и Playwright прокси-осведомлёнными — НЕОБЯЗАТЕЛЬНО.
// Node's global fetch НЕ использует системный прокси Windows сам по себе.
// Если пакет undici установлен и найден прокси (env / config / системный
// прокси Windows) — направляем fetch через него. Если undici нет или прокси
// не найден — просто работаем напрямую, без ошибок.
import { execSync } from "node:child_process";
import { config } from "../config.js";

// Читает системный HTTP-прокси Windows из реестра (его ставит VPN-клиент
// при включении «системного прокси»).
function detectWindowsSystemProxy() {
  if (process.platform !== "win32") return "";
  try {
    const out = execSync(
      'reg query "HKCU\\Software\\Microsoft\\Windows\\CurrentVersion\\Internet Settings" /v ProxyServer',
      { encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] }
    );
    const m = out.match(/ProxyServer\s+REG_SZ\s+(.+)/i);
    if (!m) return "";
    let val = m[1].trim();
    if (val.includes("=")) {
      const parts = val.split(";");
      const https = parts.find((s) => s.toLowerCase().startsWith("https="));
      const http = parts.find((s) => s.toLowerCase().startsWith("http="));
      val = ((https || http || "").split("=")[1] || "").trim();
    }
    if (!val) return "";
    return /^https?:\/\//i.test(val) ? val : `http://${val}`;
  } catch {
    return "";
  }
}

function resolveProxyUrl() {
  return (
    process.env.HTTPS_PROXY || process.env.https_proxy ||
    process.env.HTTP_PROXY  || process.env.http_proxy  ||
    config.proxy || detectWindowsSystemProxy() || ""
  );
}

// Возвращает URL прокси (или "") и по возможности применяет его к fetch.
export async function applyProxy() {
  const url = resolveProxyUrl();
  if (!url) {
    console.log("Прокси не найден — работаю напрямую.");
    return "";
  }
  // undici — необязательный. Пытаемся подключить динамически.
  try {
    const { setGlobalDispatcher, ProxyAgent } = await import("undici");
    setGlobalDispatcher(new ProxyAgent(url));
    console.log(`Прокси для fetch: ${url}`);
  } catch (e) {
    console.warn(
      `Прокси найден (${url}), но пакет 'undici' не установлен — ` +
      `fetch пойдёт напрямую. Браузер (Yango/Yandex) прокси всё равно получит.`
    );
  }
  return url; // всё равно вернём — Playwright умеет прокси без undici
}
