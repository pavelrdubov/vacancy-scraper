// Небольшой самотест фильтра — запуск: npm run test:filter
import { passesFilter, matchReason } from "./filter.js";
import { config } from "../config.js";

const cases = [
  { v: { title: "Business Development Manager", location: "Karachi, Pakistan" }, expect: true,  note: "ключевое слово BizDev" },
  { v: { title: "Sales Specialist", location: "Bolivia" },                       expect: true,  note: "LatAm (Bolivia)" },
  { v: { title: "Strategy & Operations Manager", location: "Cyprus" },           expect: true,  note: "ключевое слово strategy" },
  { v: { title: "M&A Analyst", location: "Moscow" },                             expect: true,  note: "ключевое слово M&A" },
  { v: { title: "Voice Support Specialist", location: "Armenia" },               expect: false, note: "не подходит ни по чему" },
  { v: { title: "Head of FP&A", location: "Mexico City" },                       expect: true,  note: "FP&A + Mexico" },
  { v: { title: "Backend Developer", location: "Yerevan" },                      expect: false, note: "разработка вне LatAm" },
  { v: { title: "Corporate Development Lead", location: "Dubai" },               expect: true,  note: "corp dev" },
];

let pass = 0, fail = 0;
console.log(`Режим фильтра: ${config.filterMode}\n`);
for (const c of cases) {
  const got = passesFilter(c.v);
  const ok = got === c.expect;
  ok ? pass++ : fail++;
  console.log(`${ok ? "✓" : "✗"}  [${matchReason(c.v).padEnd(15)}] ${c.v.title} @ ${c.v.location}  — ${c.note}`);
  if (!ok) console.log(`     ОЖИДАЛОСЬ ${c.expect}, ПОЛУЧЕНО ${got}`);
}
console.log(`\nИтог: ${pass} прошло, ${fail} упало.`);
process.exit(fail ? 1 : 0);
