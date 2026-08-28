import assert from "node:assert/strict";
import test from "node:test";
import { isValidLessonNo, MAX_LESSON_NO, parseLessonNo } from "../src/lib/idil-panel/lessonRecordValidation.ts";

test("lesson record day selection supports the requested 1-40 range", () => {
  assert.equal(MAX_LESSON_NO, 40);
  for (const lessonNo of [1, 16, 17, 24, 32, 40]) {
    assert.equal(isValidLessonNo(lessonNo), true);
    assert.equal(parseLessonNo(String(lessonNo)), lessonNo);
  }
  assert.equal(isValidLessonNo(41), false);
  assert.equal(parseLessonNo("41"), null);
  assert.equal(parseLessonNo("0"), null);
});

test("lesson record UI and write boundary use the shared maximum", async () => {
  const fs = await import("node:fs/promises");
  const page = await fs.readFile("src/app/ogretmen/idil-panel/ders-kayitlari/page.tsx", "utf8");
  const storage = await fs.readFile("src/lib/idil-panel/summaryStorage.ts", "utf8");
  assert.match(page, /Array\.from\(\{ length: MAX_LESSON_NO \}/);
  assert.match(page, /parseLessonNo/);
  assert.match(storage, /assertValidLessonNo\(payload\.lessonNo\)/);
  assert.match(storage, /if \(payload\.lessonNo !== undefined\)/);
});
