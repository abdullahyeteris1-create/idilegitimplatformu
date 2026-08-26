import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const logic = await readFile("src/lib/exercises/cashRegister.ts", "utf8");
const client = await readFile("src/app/egzersizler/mental-aritmetik/CashRegisterGameClient.tsx", "utf8");
const css = await readFile("src/app/egzersizler/mental-aritmetik/cashRegisterGame.module.css", "utf8");

assert.match(logic, /\["Elma", "🍎", 7\]/);
assert.match(logic, /\["Çilek", "🍓", 17\]/);
assert.match(logic, /beginner: \{ label: "Başlangıç", min: 3, max: 25, items: 6, targetCount: \[2, 3\] \}/);
assert.match(logic, /advanced: \{ label: "İleri", min: 5, max: 50, items: 8, targetCount: \[2, 4\] \}/);
assert.match(logic, /master: \{ label: "Usta", min: 8, max: 80, items: 8, targetCount: \[3, 5\] \}/);
assert.match(logic, /expert: \{ label: "Uzman", min: 10, max: 120, items: 10, targetCount: \[3, 6\] \}/);
assert.match(logic, /randomInt\(-2, 2\)/);
assert.match(logic, /randomInt\(0, 15\)/);
assert.match(logic, /randomInt\(-4, 18\)/);
assert.match(logic, /randomInt\(-5, 35\)/);
assert.match(logic, /CASH_REGISTER_PAYMENT_OPTIONS/);
assert.match(logic, /payment - total/);
assert.match(logic, /Math\.min\(margin, randomInt\(2, 8\)\)/);
assert.match(client, /Listeyi Tamamla/);
assert.match(client, /Para Üstü/);
assert.match(client, /Bütçeyi Yakala/);
assert.match(client, /inputMode="numeric"/);
assert.match(client, /event\.key === "Enter"/);
assert.match(client, /slice\(0, 8\)/);
assert.match(client, /Önce cevabını yazmalısın\./);
assert.match(client, /Geçerli bir sayı yaz\./);
assert.match(client, /score, successRate/);
assert.match(client, /submissionKey: `mental-mental-arithmetic-market-/);
assert.match(client, /href="\/sonuc"/);
assert.match(css, /@media\(max-width:900px\)/);
assert.match(css, /@media\(max-width:640px\)/);
assert.match(css, /prefers-reduced-motion:reduce/);

console.log("mental arithmetic cash register parity checks passed");
