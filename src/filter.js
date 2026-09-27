// Логика фильтрации вакансий по ключевым словам и странам LatAm.
import { config } from "../config.js";

const buildRegex = (patterns) =>
  new RegExp(patterns.join("|"), "i");

const keywordRe = buildRegex(config.keywords);
const latamRe = buildRegex(config.latamCountries);

// Совпадение по ключевым словам: смотрим в название + описание.
export function matchesKeywords(vacancy) {
  const haystack = `${vacancy.title || ""}\n${vacancy.description || ""}`;
  return keywordRe.test(haystack);
}

// Совпадение по LatAm: смотрим в локацию + название (страна часто в скобках названия).
export function matchesLatam(vacancy) {
  const haystack = `${vacancy.location || ""}\n${vacancy.title || ""}`;
  return latamRe.test(haystack);
}

// Главный фильтр — учитывает filterMode из конфига.
export function passesFilter(vacancy) {
  const kw = matchesKeywords(vacancy);
  const latam = matchesLatam(vacancy);

  switch (config.filterMode) {
    case "keywords_or_latam":  return kw || latam;
    case "keywords_and_latam": return kw && latam;
    case "keywords_only":      return kw;
    case "latam_only":         return latam;
    case "all":                return true;
    default:                   return kw || latam;
  }
}

// Помечает, почему вакансия прошла (для колонки match_reason в CSV).
export function matchReason(vacancy) {
  const reasons = [];
  if (matchesKeywords(vacancy)) reasons.push("keyword");
  if (matchesLatam(vacancy)) reasons.push("latam");
  return reasons.join("+") || "-";
}
