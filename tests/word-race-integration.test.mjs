import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

import {
  WORD_RACE_LEVELS,
  WORD_RACE_MAX_WRONG,
  WORD_RACE_SPEEDS,
} from "../src/components/exercises/word-race/wordRaceConfig.ts";
import {
  ASSIGNMENT_EXERCISE_BY_SLUG,
  isExerciseRouteVisibleInStudentCatalog,
  isExerciseVisibleInStudentCatalog,
} from "../src/lib/assignments/exerciseCatalog.ts";
import {
  ASSIGNMENT_EXERCISE_CATALOG as ASSIGNMENT_PROGRAM_EXERCISE_CATALOG,
  isAssignmentReadyExerciseSlug,
} from "../src/lib/assignments/assignmentExerciseCatalog.ts";
import {
  getEducationProgramExercise,
  isEducationProgramExerciseSelectable,
  SELECTABLE_EDUCATION_PROGRAM_EXERCISE_CATALOG,
} from "../src/lib/education-programs/exerciseCatalog.ts";
import { PREVIEW_EXERCISE_GROUPS } from "../src/components/exercises-preview/exercisePreviewGroups.ts";

const read = (path) => readFile(new URL(`../${path}`, import.meta.url), "utf8");

test("Kelime Yarisi kaydi korunur ancak ogrenci kataloglarinda yayin disidir", async () => {
  const [catalog, center] = await Promise.all([
    read("src/lib/assignments/exerciseCatalog.ts"),
    read("src/app/egzersizler/ExercisesCenterClient.tsx"),
  ]);
  assert.match(catalog, /slug: "kelime-yarisi"/);
  assert.match(catalog, /route: "\/egzersizler\/kelime-yarisi"/);
  assert.match(catalog, /category: "attention"/);
  assert.equal(ASSIGNMENT_EXERCISE_BY_SLUG.get("kelime-yarisi")?.isStudentCatalogVisible, false);
  assert.equal(isExerciseVisibleInStudentCatalog("kelime-yarisi"), false);
  assert.equal(isExerciseRouteVisibleInStudentCatalog("/egzersizler/kelime-yarisi"), false);
  assert.ok(
    PREVIEW_EXERCISE_GROUPS.every((group) =>
      group.exercises.every((exercise) => exercise.slug !== "kelime-yarisi"),
    ),
  );
  // Kart tanimi geri alinmadi; genel merkez merkezi route filtresinden gecirir.
  assert.match(center, /title: "Kelime Yarışı"/);
  assert.match(center, /href: "\/egzersizler\/kelime-yarisi"/);
  assert.match(center, /isExerciseRouteVisibleInStudentCatalog\(exercise\.href\)/);
});

test("Kelime Yarisi yeni atama ve egitim programi secicilerinde bulunmaz", async () => {
  const definition = ASSIGNMENT_EXERCISE_BY_SLUG.get("kelime-yarisi");
  assert.ok(definition);
  assert.equal(definition.assignmentEnabled, false);

  const assignmentProgramDefinition = ASSIGNMENT_PROGRAM_EXERCISE_CATALOG.find(
    (exercise) => exercise.exerciseSlug === "kelime-yarisi",
  );
  assert.ok(assignmentProgramDefinition, "eski program kayitlari icin tam katalog tanimi korunmali");
  assert.equal(assignmentProgramDefinition.integrationStatus, "needs_minor_changes");
  assert.equal(isAssignmentReadyExerciseSlug("kelime-yarisi"), false);

  assert.ok(getEducationProgramExercise("kelime-yarisi"), "eski egitim programi kaydi cozumlenebilmeli");
  assert.equal(isEducationProgramExerciseSelectable("kelime-yarisi"), false);
  assert.ok(
    !SELECTABLE_EDUCATION_PROGRAM_EXERCISE_CATALOG.some(
      (exercise) => exercise.slug === "kelime-yarisi",
    ),
  );

  const [createApi, updateApi, assignmentUi, educationAction] = await Promise.all([
    read("src/app/api/admin/assignments/[assignmentId]/items/route.ts"),
    read("src/app/api/admin/assignment-items/[itemId]/route.ts"),
    read("src/app/ogretmen/idil-panel/odevler/page.tsx"),
    read("src/app/ogretmen/idil-panel/egitim-programlari/actions.ts"),
  ]);
  assert.match(createApi, /!definition\.assignmentEnabled/);
  assert.match(updateApi, /nextSlug !== item\.exerciseSlug && !definition\.assignmentEnabled/);
  assert.match(assignmentUi, /filter\(\(item\) => item\.assignmentEnabled\)/);
  assert.match(educationAction, /isEducationProgramExerciseSelectable/);
  assert.match(educationAction, /legacyUnselectableSlugs/);
});

test("dogrudan route oyunu sunucu tarafinda baslatmaz", async () => {
  const page = await read("src/app/egzersizler/kelime-yarisi/page.tsx");
  assert.match(page, /import \{ notFound \} from "next\/navigation"/);
  assert.match(page, /isExerciseVisibleInStudentCatalog\(WORD_RACE_EXERCISE_SLUG\)/);
  assert.match(page, /notFound\(\)/);
  assert.ok(page.indexOf("notFound()") < page.indexOf("<WordRaceGame"));
});

test("sonuc, XP, migration ve prototip entegrasyonu korunur", async () => {
  const [game, resultsRoute, migration, prototype] = await Promise.all([
    read("src/components/exercises/word-race/WordRaceGame.tsx"),
    read("src/app/api/student/results/route.ts"),
    read("supabase/migrations/20260804120000_add_kelime_yarisi_to_exercise_whitelist.sql"),
    read("prototypes/kelime-yarisi.html"),
  ]);
  assert.match(game, /saveExerciseResultSecure/);
  assert.match(game, /useEducationProgramTaskCompletion/);
  assert.match(resultsRoute, /"word-race": \{/);
  assert.match(migration, /kelime-yarisi/);
  assert.match(prototype, /<title>Kelime Yarışı/);
});

test("seviye, serit, hiz ve toplam yanlis kurallari prototiple ayni", () => {
  assert.deepEqual(WORD_RACE_LEVELS.map((level) => level.lanes), [3, 3, 4, 5, 6]);
  assert.deepEqual([...WORD_RACE_SPEEDS], [5000, 4000, 3000, 2500, 2000, 1500, 1000]);
  assert.equal(WORD_RACE_MAX_WRONG, 10);
});

test("Canvas motoru tek RAF kullanir ve tum kaynaklari destroy sirasinda temizler", async () => {
  const source = await read("src/components/exercises/word-race/wordRaceEngine.ts");
  assert.match(source, /this\.animationFrameId = window\.requestAnimationFrame\(this\.loop\)/);
  assert.match(source, /window\.cancelAnimationFrame\(this\.animationFrameId\)/);
  assert.match(source, /this\.resizeObserver\?\.disconnect\(\)/);
  assert.match(source, /removeEventListener\("keydown"/);
  assert.match(source, /window\.clearTimeout\(this\.transitionTimerId\)/);
});

test("kelime karti olculeri gate uretiminde saklanir ve cizimde perspektif scale uygulanmaz", async () => {
  const source = await read("src/components/exercises/word-race/wordRaceEngine.ts");
  assert.match(source, /commonMetrics: this\.measureCard\(common, this\.state\.lanes\)/);
  assert.match(source, /const metrics = isOdd \? gate\.oddMetrics : gate\.commonMetrics/);
  assert.doesNotMatch(source, /context\.scale\(/);
});

test("sonuc guvenli ve idempotent platform akisiyla kaydedilir", async () => {
  const source = await read("src/components/exercises/word-race/WordRaceGame.tsx");
  assert.match(source, /saveExerciseResultSecure\(payload\)/);
  assert.match(source, /completeTaskAfterResultSave\(\)/);
  assert.match(source, /saveInFlightRef\.current \|\| saveCompletedRef\.current/);
  assert.doesNotMatch(source, /\bstudentId\b/);
  assert.doesNotMatch(source, /\bsaveExerciseResult\b(?!Secure)/);
});
