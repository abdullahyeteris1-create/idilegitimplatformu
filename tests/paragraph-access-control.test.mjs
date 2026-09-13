import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { canAccessParagraphExercises } from "../src/lib/paragraph-exercises/paragraphAccessPolicy.ts";

const migration = await readFile("supabase/migrations/20260914100000_add_paragraph_exercises_access.sql", "utf8");
const previewGroups = await readFile("src/components/exercises-preview/exercisePreviewGroups.ts", "utf8");
const centerPage = await readFile("src/app/egzersizler/page.tsx", "utf8");
const paragraphPage = await readFile("src/app/egzersizler/paragraf-calismalari/page.tsx", "utf8");
const accessApi = await readFile("src/app/api/admin/students/[studentId]/route.ts", "utf8");
const teacherDetail = await readFile("src/components/teacher-panel/TeacherParagraphAccess.tsx", "utf8");
const tracking = await readFile("src/lib/teachers/studentTrackingRepository.ts", "utf8");
const analysis = await readFile("src/components/teacher-panel/TeacherStudentDetailClient.tsx", "utf8");

test("migration paragraph erişimini default false ve not-null tanımlar", () => {
  assert.match(migration, /add column if not exists paragraph_exercises_enabled boolean/i);
  assert.match(migration, /not null default false/i);
});

test("canAccessParagraphExercises yalnızca açık boolean değerini kabul eder", () => {
  assert.equal(canAccessParagraphExercises({ paragraphExercisesEnabled: true }), true);
  assert.equal(canAccessParagraphExercises({ paragraphExercisesEnabled: false }), false);
  assert.equal(canAccessParagraphExercises({}), false);
  assert.equal(canAccessParagraphExercises(null), false);
});

test("teacher API mevcut admin/teacher session authorization modelini ve flag update'i kullanır", () => {
  assert.match(accessApi, /isAdminSessionValid\(request\)/);
  assert.match(accessApi, /paragraphExercisesEnabled/);
  assert.match(accessApi, /paragraph_exercises_enabled/);
  assert.match(teacherDetail, /method: "PATCH"/);
  assert.match(teacherDetail, /paragraphExercisesEnabled: nextEnabled/);
});

test("teacher detail toggle ve read model flag'i taşır", () => {
  assert.match(teacherDetail, /Ek Çalışma Erişimleri/);
  assert.match(teacherDetail, /Paragraf Çalışmaları/);
  assert.match(teacherDetail, /role="switch"/);
  assert.match(tracking, /paragraph_exercises_enabled/);
  assert.match(analysis, /<TeacherParagraphAccess/);
});

test("exercise center flag true iken ayrı kategori ekler, false iken eklemez", () => {
  assert.match(previewGroups, /id: "paragraph-exercises"/);
  assert.match(previewGroups, /buildPreviewExerciseGroups\(paragraphExercisesEnabled = false\)/);
  assert.match(previewGroups, /return paragraphExercisesEnabled \? \[\.\.\.PREVIEW_EXERCISE_GROUPS/);
  assert.match(centerPage, /getParagraphExerciseAccess/);
  assert.match(centerPage, /paragraphExercisesEnabled=/);
});

test("direct paragraph route server-side access guard ve kapalı ekranını içerir", () => {
  assert.match(paragraphPage, /getParagraphExerciseAccess/);
  assert.match(paragraphPage, /henüz hesabın için aktif değil/i);
  assert.match(paragraphPage, /Öğretmenin uygun gördüğünde/i);
  assert.match(paragraphPage, /href="\/egzersizler"/);
});

test("flag kapatma result geçmişini ve analiz entegrasyonunu silmez", () => {
  assert.doesNotMatch(teacherDetail, /delete|remove/i);
  assert.match(analysis, /TeacherParagraphAnalysis/);
  assert.match(tracking, /EXERCISE_RESULTS_TABLE/);
});

test("diğer exercise grupları mevcut katalogdan korunur", () => {
  assert.match(previewGroups, /panelCategories\.map/);
  assert.match(previewGroups, /PREVIEW_EXERCISE_GROUPS/);
  assert.match(previewGroups, /return paragraphExercisesEnabled \? \[\.\.\.PREVIEW_EXERCISE_GROUPS/);
});
