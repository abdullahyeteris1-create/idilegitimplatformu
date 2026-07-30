import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const route = await readFile("src/app/api/admin/students/bulk/route.ts", "utf8");
const page = await readFile("src/app/ogretmen/idil-panel/toplu-ogrenci-aktar/page.tsx", "utf8");

test("CSV aktarımı server bulk rotasına gider ve hash alanlarını yazar", () => {
  assert.match(page, /fetch\("\/api\/admin\/students\/bulk"/);
  assert.match(route, /hashStudentPassword/);
  assert.match(route, /password_hash/);
  assert.doesNotMatch(route, /Math\.random/gi);
});

test("CSV önizlemesi gerçek parolayı HTML'e yazmaz", () => {
  assert.doesNotMatch(page, /\{row\.password\}/);
  assert.doesNotMatch(route, /importedUsernames.*password/i);
});
