import assert from "node:assert/strict";
import test from "node:test";

import {
  EDUCATION_PROGRAM_EXERCISE_CATALOG,
} from "../src/lib/education-programs/exerciseCatalog.ts";
import {
  validateCompleteEducationProgramTemplate,
  validateEducationProgramDayTasks,
  validateEducationProgramTemplateMetadata,
} from "../src/lib/education-programs/validation.ts";

function metadata(overrides = {}) {
  return {
    name: "20 Günlük Başlangıç",
    category: "grade_2",
    adminDescription: "Yönetici açıklaması",
    dayCount: 20,
    ...overrides,
  };
}

function completeTasks(dayNumber = 1) {
  return EDUCATION_PROGRAM_EXERCISE_CATALOG.slice(0, 5).map((exercise, index) => ({
    id: `task-${dayNumber}-${index + 1}`,
    templateDayId: `day-${dayNumber}`,
    orderNumber: index + 1,
    exerciseSlug: exercise.slug,
    exerciseTitle: exercise.title,
    durationSeconds: 300,
    startingLevel: exercise.supportsLevel ? exercise.levelMin : null,
    settings: {},
    createdAt: "2026-07-25T00:00:00.000Z",
    updatedAt: "2026-07-25T00:00:00.000Z",
  }));
}

function taskInputs() {
  return completeTasks().map((task) => ({
    orderNumber: task.orderNumber,
    exerciseSlug: task.exerciseSlug,
    durationSeconds: task.durationSeconds,
    startingLevel: task.startingLevel,
    settings: {},
  }));
}

test("program adi ve kategori zorunludur", () => {
  const missingName = validateEducationProgramTemplateMetadata(metadata({ name: " " }));
  assert.equal(missingName.ok, false);
  assert.match(missingName.message, /Program adı zorunludur/);

  const missingCategory = validateEducationProgramTemplateMetadata(metadata({ category: "" }));
  assert.equal(missingCategory.ok, false);
  assert.match(missingCategory.issues.map((issue) => issue.message).join(" "), /Kategori zorunludur/);
});

test("gun sayisi yalniz 1-60 araliginda kabul edilir", () => {
  assert.equal(validateEducationProgramTemplateMetadata(metadata({ dayCount: 1 })).ok, true);
  assert.equal(validateEducationProgramTemplateMetadata(metadata({ dayCount: 20 })).ok, true);
  assert.equal(validateEducationProgramTemplateMetadata(metadata({ dayCount: 60 })).ok, true);
  assert.equal(validateEducationProgramTemplateMetadata(metadata({ dayCount: 0 })).ok, false);
  assert.equal(validateEducationProgramTemplateMetadata(metadata({ dayCount: 61 })).ok, false);
  assert.equal(validateEducationProgramTemplateMetadata(metadata({ dayCount: 2.5 })).ok, false);
});

test("taslak gun tam bes bos calisma yuvasi ile kaydedilebilir", () => {
  const tasks = Array.from({ length: 5 }, (_, index) => ({
    orderNumber: index + 1,
    exerciseSlug: null,
    durationSeconds: null,
    startingLevel: null,
    settings: {},
  }));

  const result = validateEducationProgramDayTasks(tasks, {
    allowIncomplete: true,
    dayNumber: 1,
  });
  assert.equal(result.ok, true);
  assert.equal(result.value.length, 5);
});

test("programi tam kaydetmek icin her gun tam bes secili calisma gerekir", () => {
  const incomplete = taskInputs();
  incomplete[3] = {
    orderNumber: 4,
    exerciseSlug: null,
    durationSeconds: null,
    startingLevel: null,
    settings: {},
  };

  const result = validateEducationProgramDayTasks(incomplete, {
    allowIncomplete: false,
    dayNumber: 3,
  });
  assert.equal(result.ok, false);
  assert.match(result.message, /Egzersiz seçilmelidir/);
});

test("ayni egzersiz ayni gun icinde iki kez secilemez", () => {
  const tasks = taskInputs();
  tasks[1] = { ...tasks[1], exerciseSlug: tasks[0].exerciseSlug };
  const result = validateEducationProgramDayTasks(tasks, {
    allowIncomplete: false,
    dayNumber: 1,
  });

  assert.equal(result.ok, false);
  assert.match(result.issues.map((issue) => issue.message).join(" "), /birden fazla seçilemez/);
});

test("eksik program gunu acik bir validation hatasi uretir", () => {
  const template = {
    id: "template-1",
    name: "Program",
    adminDescription: null,
    category: "grade_1",
    dayCount: 2,
    status: "draft",
    createdBy: "teacher",
    createdAt: "2026-07-25T00:00:00.000Z",
    updatedAt: "2026-07-25T00:00:00.000Z",
    days: [
      {
        id: "day-1",
        templateId: "template-1",
        dayNumber: 1,
        title: null,
        description: null,
        tasks: completeTasks(1),
        createdAt: "2026-07-25T00:00:00.000Z",
        updatedAt: "2026-07-25T00:00:00.000Z",
      },
    ],
  };

  const result = validateCompleteEducationProgramTemplate(template);
  assert.equal(result.ok, false);
  assert.match(result.issues.map((issue) => issue.message).join(" "), /Gün 2 eksik/);
});

test("tum gunleri bes calismayla dolu sablon kabul edilir", () => {
  const template = {
    id: "template-1",
    name: "Program",
    adminDescription: null,
    category: "grade_1",
    dayCount: 2,
    status: "draft",
    createdBy: "teacher",
    createdAt: "2026-07-25T00:00:00.000Z",
    updatedAt: "2026-07-25T00:00:00.000Z",
    days: [1, 2].map((dayNumber) => ({
      id: `day-${dayNumber}`,
      templateId: "template-1",
      dayNumber,
      title: null,
      description: null,
      tasks: completeTasks(dayNumber),
      createdAt: "2026-07-25T00:00:00.000Z",
      updatedAt: "2026-07-25T00:00:00.000Z",
    })),
  };

  assert.equal(validateCompleteEducationProgramTemplate(template).ok, true);
});
