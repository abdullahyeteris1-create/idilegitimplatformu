import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

import {
  buildEducationProgramDaySeed,
  buildEducationProgramEmptyTaskSeed,
  mapEducationProgramTemplateSummary,
} from "../src/lib/education-programs/repository.ts";

test("repository 1-60 gun icin ardisik gun seed'i uretir", () => {
  const days = buildEducationProgramDaySeed("template-1", 60);
  assert.equal(days.length, 60);
  assert.deepEqual(days[0], { template_id: "template-1", day_number: 1 });
  assert.deepEqual(days[59], { template_id: "template-1", day_number: 60 });
});

test("repository her gun icin tam bes bos calisma yuvasi uretir", () => {
  const days = Array.from({ length: 20 }, (_, index) => ({
    id: `day-${index + 1}`,
    day_number: index + 1,
  }));
  const tasks = buildEducationProgramEmptyTaskSeed(days);

  assert.equal(tasks.length, 100);
  assert.deepEqual(
    tasks.filter((task) => task.template_day_id === "day-7").map((task) => task.order_number),
    [1, 2, 3, 4, 5],
  );
  assert.ok(tasks.every((task) => task.exercise_slug === null));
});

test("repository veritabani satirini strict uygulama tipine map eder", () => {
  const template = mapEducationProgramTemplateSummary({
    id: "template-1",
    name: "Program",
    admin_description: "Açıklama",
    category: "grade_4",
    day_count: 20,
    status: "published",
    created_by: "teacher",
    created_at: "2026-07-25T10:00:00.000Z",
    updated_at: "2026-07-25T11:00:00.000Z",
  });

  assert.ok(template);
  assert.equal(template.category, "grade_4");
  assert.equal(template.dayCount, 20);
  assert.equal(template.status, "published");
});

test("repository gecersiz kategori veya gun sayisina sahip satiri kabul etmez", () => {
  assert.equal(
    mapEducationProgramTemplateSummary({
      id: "template-1",
      name: "Program",
      category: "invalid",
      day_count: 20,
    }),
    null,
  );

  assert.equal(
    mapEducationProgramTemplateSummary({
      id: "template-1",
      name: "Program",
      category: "grade_1",
      day_count: 100,
    }),
    null,
  );
});

test("repository yalniz education_program tablolarina baglidir", async () => {
  const source = await readFile(
    new URL("../src/lib/education-programs/repository.ts", import.meta.url),
    "utf8",
  );

  assert.match(source, /education_program_templates/);
  assert.match(source, /education_program_template_days/);
  assert.match(source, /education_program_template_tasks/);
  assert.doesNotMatch(source, /@\/lib\/assignments/);
  assert.doesNotMatch(source, /student_education_program/);
});
