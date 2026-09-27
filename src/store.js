// Хранение: CSV-лог всех вакансий + seen.json для детекции новых.
import fs from "node:fs";
import path from "node:path";
import { config } from "../config.js";

// ---- CSV ----
const CSV_HEADER = [
  "first_seen", "company", "title", "location", "work_mode",
  "department", "match_reason", "url", "id",
];

function csvEscape(value) {
  const s = String(value ?? "").replace(/\s+/g, " ").trim();
  if (s.includes(",") || s.includes('"') || s.includes("\n")) {
    return `"${s.replace(/"/g, '""')}"`;
  }
  return s;
}

function ensureDir(filePath) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
}

// Дозаписывает в CSV только строки, которых там ещё нет (по id).
export function appendToCsv(vacancies) {
  ensureDir(config.files.csv);
  const exists = fs.existsSync(config.files.csv);
  if (!exists) {
    fs.writeFileSync(config.files.csv, CSV_HEADER.join(",") + "\n");
  }
  const today = new Date().toISOString().slice(0, 10);
  const lines = vacancies.map((v) =>
    [
      today, v.company, v.title, v.location, v.workMode || "",
      v.department || "", v.matchReason || "", v.url, v.id,
    ].map(csvEscape).join(",")
  );
  if (lines.length) {
    fs.appendFileSync(config.files.csv, lines.join("\n") + "\n");
  }
}

// ---- seen.json ----
export function loadSeen() {
  try {
    return new Set(JSON.parse(fs.readFileSync(config.files.seen, "utf8")));
  } catch {
    return new Set();
  }
}

export function saveSeen(seenSet) {
  ensureDir(config.files.seen);
  fs.writeFileSync(config.files.seen, JSON.stringify([...seenSet], null, 2));
}
