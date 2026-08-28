import assert from "node:assert/strict";
import test from "node:test";

test("lesson record student query returns only active students", async () => {
  const fs = await import("node:fs/promises");
  const storage = await fs.readFile("src/lib/idil-panel/summaryStorage.ts", "utf8");
  const status = await fs.readFile("src/lib/students/studentStatus.ts", "utf8");
  const page = await fs.readFile("src/app/ogretmen/idil-panel/ders-kayitlari/page.tsx", "utf8");

  assert.match(storage, /\.from\(STUDENTS_TABLE\)[\s\S]*?\.select\("\*"\)[\s\S]*?\.eq\("status", "active"\)[\s\S]*?\.eq\("is_active", true\)/);
  assert.match(status, /\["active", "passive", "completed"\]/);
  assert.match(page, /listStudentsForLessonRecords\(\)/);
  const lessonReader = storage.match(/export async function listLessons\(\)[\s\S]*?(?=\nexport async function)/)?.[0] ?? "";
  assert.match(lessonReader, /\.from\(LESSONS_TABLE\)[\s\S]*?\.select\("\*"\)/);
  assert.doesNotMatch(lessonReader, /\.eq\("status", "active"\)/);
});

test("active student status transitions are reflected by the next lesson-records query", () => {
  const isVisible = (student) => student.status === "active" && student.is_active === true;

  assert.equal(isVisible({ status: "active", is_active: true }), true);
  assert.equal(isVisible({ status: "passive", is_active: false }), false);
  assert.equal(isVisible({ status: "completed", is_active: false }), false);
  assert.equal(isVisible({ status: "active", is_active: false }), false);
  assert.equal(isVisible({ status: "active", is_active: true }), true);
});
