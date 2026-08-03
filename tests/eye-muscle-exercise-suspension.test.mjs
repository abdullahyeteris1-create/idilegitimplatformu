import assert from "node:assert/strict";
import { test } from "node:test";
import fs from "node:fs/promises";

import {
  ASSIGNMENT_EXERCISE_BY_SLUG,
  ASSIGNMENT_EXERCISE_CATALOG,
  isExerciseRouteVisibleInStudentCatalog,
  isExerciseVisibleInStudentCatalog,
} from "../src/lib/assignments/exerciseCatalog.ts";
import {
  EDUCATION_PROGRAM_EXERCISE_CATALOG,
  getEducationProgramExercise,
  isEducationProgramExerciseSelectable,
  SELECTABLE_EDUCATION_PROGRAM_EXERCISE_CATALOG,
} from "../src/lib/education-programs/exerciseCatalog.ts";
import { PREVIEW_EXERCISE_GROUPS } from "../src/components/exercises-preview/exercisePreviewGroups.ts";
import { resolveEducationProgramExerciseRoute } from "../src/lib/education-programs/exerciseRouteCatalog.ts";

const SUSPENDED_SLUG = "goz-kaslari";
const SUSPENDED_TITLE = "Göz Kaslarını Geliştirme Çalışması";
const SUSPENDED_ROUTE = "/egzersizler/goz-kaslari";
const SUSPENDED_RESULT_TYPE = "eye-muscle";

// --- A. Ogrenci katalogu --------------------------------------------------

test("A1) askidaki egzersiz ogrenci Goz Egzersizleri kategorisinde GORUNMUYOR", () => {
  const eyeGroup = PREVIEW_EXERCISE_GROUPS.find((group) => group.id === "eye");
  assert.ok(eyeGroup, "eye kategorisi bulunmali");
  assert.ok(
    !eyeGroup.exercises.some((exercise) => exercise.slug === SUSPENDED_SLUG),
    "askidaki egzersiz kategoride gorunmemeli",
  );
});

test("A2) askidaki egzersiz HICBIR ogrenci kategorisinde gorunmuyor", () => {
  for (const group of PREVIEW_EXERCISE_GROUPS) {
    assert.ok(
      !group.exercises.some((exercise) => exercise.slug === SUSPENDED_SLUG),
      `${group.id} kategorisinde gorunmemeli`,
    );
    assert.ok(
      !group.exercises.some((exercise) => exercise.href === SUSPENDED_ROUTE),
      `${group.id} kategorisinde route ile gorunmemeli`,
    );
    assert.ok(
      !group.exercises.some((exercise) => exercise.title === SUSPENDED_TITLE),
      `${group.id} kategorisinde adiyla gorunmemeli`,
    );
  }
});

test("A3) diger Goz Egzersizleri gorunmeye DEVAM ediyor", () => {
  const eyeGroup = PREVIEW_EXERCISE_GROUPS.find((group) => group.id === "eye");
  const slugs = eyeGroup.exercises.map((exercise) => exercise.slug);

  for (const expected of ["goz-beyin", "13-nokta-emoji-takip", "buyuyen-sekiller-altigen"]) {
    assert.ok(slugs.includes(expected), `${expected} kategoride kalmali`);
  }
  assert.ok(eyeGroup.exercises.length > 0, "kategori bos kalmamali");
});

test("A4) kategori sayaci askidaki egzersizi SAYMIYOR", () => {
  const eyeGroup = PREVIEW_EXERCISE_GROUPS.find((group) => group.id === "eye");
  // Sayac dogrudan exercises.length'ten turer (CategoryCards / ExerciseGroupPanel).
  assert.equal(eyeGroup.exercises.length, 3);
  assert.equal(
    eyeGroup.exercises.length,
    eyeGroup.exercises.filter((exercise) => exercise.slug !== SUSPENDED_SLUG).length,
  );
});

test("A5) gorunurluk yardimcisi slug ve route uzerinden dogru calisir", () => {
  assert.equal(isExerciseVisibleInStudentCatalog(SUSPENDED_SLUG), false);
  assert.equal(isExerciseRouteVisibleInStudentCatalog(SUSPENDED_ROUTE), false);

  // Askiya alinmamis calismalar etkilenmez
  assert.equal(isExerciseVisibleInStudentCatalog("13-nokta-emoji-takip"), true);
  assert.equal(isExerciseRouteVisibleInStudentCatalog("/egzersizler/takistoskop"), true);

  // Katalogda olmayan slug/route gizlenmez (varsayilan gorunur)
  assert.equal(isExerciseVisibleInStudentCatalog("sayi-tablosu"), true);
  assert.equal(isExerciseRouteVisibleInStudentCatalog("/egzersizler/bilinmeyen"), true);
});

test("A6) merkezi katalogdaki yayin disi egzersizler beklenen listeyle sinirli", () => {
  const suspended = ASSIGNMENT_EXERCISE_CATALOG.filter(
    (exercise) => exercise.isStudentCatalogVisible === false,
  );
  assert.deepEqual(suspended.map((exercise) => exercise.slug), ["kelime-yarisi", SUSPENDED_SLUG]);
});

// --- B. Egitim Programi secicisi -------------------------------------------

test("B1) askidaki egzersiz Egitim Programi SECICISINDE gorunmuyor", () => {
  assert.ok(
    !SELECTABLE_EDUCATION_PROGRAM_EXERCISE_CATALOG.some((exercise) => exercise.slug === SUSPENDED_SLUG),
    "secilebilir listede olmamali",
  );
  assert.equal(isEducationProgramExerciseSelectable(SUSPENDED_SLUG), false);
});

test("B2) diger Egitim Programi egzersizleri secilebilir kalmaya devam ediyor", () => {
  assert.equal(
    SELECTABLE_EDUCATION_PROGRAM_EXERCISE_CATALOG.length,
    EDUCATION_PROGRAM_EXERCISE_CATALOG.length - 2,
    "iki yayin disi egzersiz cikarilmali",
  );

  for (const expected of ["takistoskop", "kare-gorme-alani", "cift-tarafli-odak", "13-nokta-emoji-takip"]) {
    assert.ok(
      SELECTABLE_EDUCATION_PROGRAM_EXERCISE_CATALOG.some((exercise) => exercise.slug === expected),
      `${expected} secilebilir kalmali`,
    );
    assert.equal(isEducationProgramExerciseSelectable(expected), true);
  }
});

test("B3) secilemez egzersizler beklenen listeyle sinirli", () => {
  const suspended = EDUCATION_PROGRAM_EXERCISE_CATALOG.filter(
    (exercise) => exercise.isEducationProgramSelectable === false,
  );
  assert.deepEqual(suspended.map((exercise) => exercise.slug), ["kelime-yarisi", SUSPENDED_SLUG]);
});

// --- C. Mevcut kayit uyumlulugu -------------------------------------------

test("C1) tam katalog lookup'i askidaki egzersizi HALA buluyor", () => {
  const definition = getEducationProgramExercise(SUSPENDED_SLUG);
  assert.ok(definition, "katalog kaydi silinmemeli");
  assert.equal(definition.title, SUSPENDED_TITLE);
  assert.equal(definition.resultExerciseType, SUSPENDED_RESULT_TYPE);
  // Calisma davranisini belirleyen alanlar korunmali
  assert.equal(definition.supportsLevel, true);
  assert.equal(definition.levelMin, 1);
  assert.equal(definition.levelMax, 5);
  assert.equal(definition.defaultDurationSeconds, 300);
});

test("C2) mevcut Education Program gorevinin GORUNEN ADI cozumlenebiliyor", () => {
  // Template Editor eski gorevleri bu fonksiyonla cozer - "Bilinmeyen egzersiz"
  // gostermemesi icin kaydin durmasi sarttir.
  assert.equal(getEducationProgramExercise(SUSPENDED_SLUG)?.title, SUSPENDED_TITLE);
});

test("C3) route cozumlemesi devam ediyor (atanmis gorev baglantisi bozulmuyor)", () => {
  assert.equal(resolveEducationProgramExerciseRoute(SUSPENDED_SLUG), SUSPENDED_ROUTE);
});

test("C4) Assignment katalog kaydi ve route bilgisi korunuyor", () => {
  const definition = ASSIGNMENT_EXERCISE_BY_SLUG.get(SUSPENDED_SLUG);
  assert.ok(definition, "assignment katalog kaydi silinmemeli");
  assert.equal(definition.title, SUSPENDED_TITLE);
  assert.equal(definition.route, SUSPENDED_ROUTE);
  assert.equal(definition.resultExerciseType, SUSPENDED_RESULT_TYPE);
  assert.equal(definition.category, "eye");
});

// --- D. Assignment V2 ------------------------------------------------------

test("D1) Assignment V2 secilebilirligi DEGISMEDI (kapsam disi birakildi)", () => {
  const definition = ASSIGNMENT_EXERCISE_BY_SLUG.get(SUSPENDED_SLUG);
  assert.equal(definition.assignmentEnabled, true, "assignmentEnabled bilincli olarak true kalmali");
  assert.deepEqual(definition.supportedSettings, ["level", "durationMinutes"]);
});

test("D2) askiya alma bayragi assignmentEnabled'dan BAGIMSIZ bir alandir", () => {
  const definition = ASSIGNMENT_EXERCISE_BY_SLUG.get(SUSPENDED_SLUG);
  assert.equal(definition.isStudentCatalogVisible, false);
  assert.equal(definition.assignmentEnabled, true);
});

// --- E. Teknik davranis ----------------------------------------------------

test("E1) route, client bileseni ve motor dosyalari yerinde", async () => {
  for (const path of [
    "src/app/egzersizler/goz-kaslari/page.tsx",
    "src/app/egzersizler/goz-kaslari/EyeMuscleExerciseClient.tsx",
  ]) {
    const stat = await fs.stat(path);
    assert.ok(stat.isFile(), `${path} korunmali`);
  }
});

test("E2) sonuc API eslemesi ve completion akisi korunuyor", async () => {
  const resultsRoute = await fs.readFile("src/app/api/student/results/route.ts", "utf8");
  const client = await fs.readFile("src/app/egzersizler/goz-kaslari/EyeMuscleExerciseClient.tsx", "utf8");

  // Sonuc tipi hala tanimli
  const resultTypes = await fs.readFile("src/lib/results/types.ts", "utf8");
  assert.match(resultTypes, /"eye-muscle"/);

  // Completion akisi client'ta duruyor
  assert.match(client, /useEducationProgramTaskCompletion/);
  assert.match(client, /saveExerciseResultSecure/);
  assert.match(client, /exerciseType: "eye-muscle"/);

  // results route'u bu gorev kapsaminda degismedi (egzersiz tipine ozel dal yok)
  assert.doesNotMatch(resultsRoute, /isStudentCatalogVisible|isEducationProgramSelectable/);
});

test("E3) whitelist migration dosyasi DEGISMEDI ve slug'i hala iceriyor", async () => {
  const migration = await fs.readFile(
    "supabase/migrations/20260729230000_add_goz_kaslari_to_exercise_whitelist.sql",
    "utf8",
  );
  assert.match(migration, /'goz-kaslari'/);
  assert.match(migration, /create or replace function public\.assign_education_program_template_v1/);
  // Askiya alma uygulama katmanindadir - migration'a hicbir sey eklenmedi.
  assert.doesNotMatch(migration, /isStudentCatalogVisible|isEducationProgramSelectable|suspend/i);
});

test("E4) askiya alma tek satirlik bir bayrakla geri alinabilir", async () => {
  const assignmentCatalog = await fs.readFile("src/lib/assignments/exerciseCatalog.ts", "utf8");
  const educationCatalog = await fs.readFile("src/lib/education-programs/exerciseCatalog.ts", "utf8");

  assert.match(assignmentCatalog, /isStudentCatalogVisible: false,/);
  assert.match(educationCatalog, /isEducationProgramSelectable: false,/);
  // Alanlar opsiyonel -> tanimsiz birakmak "gorunur/secilebilir" demektir.
  assert.match(assignmentCatalog, /isStudentCatalogVisible\?: boolean;/);
  assert.match(educationCatalog, /isEducationProgramSelectable\?: boolean;/);
});

test("E5) Template Editor secici icin filtreli, mevcut kayit icin tam lookup kullanir", async () => {
  const editor = await fs.readFile(
    "src/components/education-programs/EducationProgramTemplateEditor.tsx",
    "utf8",
  );

  // Secici filtreli listeyi kullanir
  assert.match(editor, /\{exerciseOptions\.map\(\(exercise\) => \(/);
  assert.match(editor, /SELECTABLE_EDUCATION_PROGRAM_EXERCISE_CATALOG/);
  // Mevcut gorevler tam lookup ile cozulur
  assert.match(editor, /getEducationProgramExercise\(slot\.exerciseSlug\)/);
  // Askiya alinmis eski secim option listesine geri eklenir
  assert.match(editor, /const isSuspendedLegacySelection = Boolean\(/);
  assert.match(editor, /\[definition, \.\.\.SELECTABLE_EDUCATION_PROGRAM_EXERCISE_CATALOG\]/);
  // Filtreli liste artik dogrudan secici disinda kullanilmiyor
  assert.doesNotMatch(editor, /EDUCATION_PROGRAM_EXERCISE_CATALOG\.map/);
});

test("E6) validation askiya alinmis egzersizi iceren MEVCUT programi hala gecerli sayar", async () => {
  const validation = await fs.readFile("src/lib/education-programs/validation.ts", "utf8");
  // Tam lookup kullanildigi icin eski program kaydedilmeye devam edebilir.
  assert.match(validation, /getEducationProgramExercise\(exerciseSlug\)/);
  assert.doesNotMatch(validation, /SELECTABLE_EDUCATION_PROGRAM_EXERCISE_CATALOG/);
});
