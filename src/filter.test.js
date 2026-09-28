// Небольшой самотест фильтра — запуск: npm run test:filter
import { passesFilter, matchReason } from "./filter.js";
import { config } from "../config.js";

const cases = [
  { v: { title: "Head of FP&A", location: "Bogotá, Colombia" },              expect: true,  note: "FP&A + LatAm" },
  { v: { title: "Chief Financial Controller", location: "Mexico City" },     expect: true,  note: "financial control + LatAm" },
  { v: { title: "Business Development Manager", location: "Mexico" },        expect: true,  note: "BizDev + LatAm" },
  { v: { title: "Strategy & Operations Manager", location: "Cyprus" },       expect: false, note: "strategy, но не LatAm (AND-режим)" },
  { v: { title: "M&A Analyst", location: "Moscow" },                         expect: false, note: "M&A, но не LatAm" },
  { v: { title: "Sales Specialist", location: "Bolivia" },                   expect: false, note: "в LatAm, но роль в чёрном списке" },
  { v: { title: "Agente de Cobranza", location: "CDMX" },                    expect: false, note: "чёрный список (cobranza)" },
  { v: { title: "Backend Developer", location: "Lima" },                     expect: false, note: "в LatAm, но нет ключевого слова" },
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
