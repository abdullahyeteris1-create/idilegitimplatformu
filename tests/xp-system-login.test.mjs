import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const ROUTE_URL = new URL("../src/app/api/student-session/route.ts", import.meta.url);

async function readRoute() {
  return readFile(ROUTE_URL, "utf8");
}

test("1-4) login XP Istanbul tarihiyle tek bir idempotency anahtari kullanir", async () => {
  const source = await readRoute();

  assert.match(source, /getIstanbulDateString/);
  assert.match(source, /award_student_xp_v1/);
  assert.match(source, /p_event_type: XP_AWARD_EVENT_TYPE/);
  assert.match(source, /p_idempotency_key: `login:\$\{studentId\}:\$\{istanbulDate\}`/);
  assert.match(source, /await awardFirstLoginXp\(String\(student\.id\)\);/);
});

test("5-8) XP ödülü login akışını bozmaz ve cookie sonrası çalışır", async () => {
  const source = await readRoute();

  const cookieWriteIndex = source.indexOf("response.cookies.set({");
  const xpAwardIndex = source.indexOf("await awardFirstLoginXp(String(student.id));");
  assert.ok(cookieWriteIndex >= 0);
  assert.ok(xpAwardIndex >= 0);
  assert.ok(cookieWriteIndex < xpAwardIndex);
  assert.match(source, /catch \(error\) \{\s*console\.error\("XP award on student login failed", error\);/s);
  assert.match(source, /if \(error\) \{\s*logSupabaseError\(error\);\s*\}/s);
});

