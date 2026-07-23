import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

import { isAssignmentClassGroup, ASSIGNMENT_CLASS_GROUPS } from "../src/lib/assignments/classGroups.ts";
import {
  ASSIGNMENT_DENIED_EXERCISE_SLUGS,
  ASSIGNMENT_EXERCISE_CATALOG,
  getAssignmentExerciseDefinition,
  isAssignmentCatalogExerciseSlug,
  isAssignmentReadyExerciseSlug,
} from "../src/lib/assignments/assignmentExerciseCatalog.ts";
import { validateClassGroup, validateExerciseSettings } from "../src/lib/assignments/assignmentValidation.ts";
import {
  createDeterministicRandom,
  generateProgramPreview,
  INSUFFICIENT_EXERCISE_POOL_MESSAGE,
  NO_READY_COMPREHENSION_WARNING,
} from "../src/lib/assignments/programPreview.ts";

let idCounter = 0;

function makeSetting(exerciseSlug, overrides = {}) {
  const definition = getAssignmentExerciseDefinition(exerciseSlug);
  idCounter += 1;
  return {
    id: `setting-${idCounter}`,
    templateId: "template-1",
    exerciseSlug,
    enabled: true,
    startingLevel: definition?.levelMin ?? 1,
    durationSeconds: 300,
    settings: { ...(definition?.defaultSettings ?? {}) },
    dailyWeight: 1,
    repeatCooldownDays: 0,
    maxOccurrencesPerProgram: null,
    displayOrder: 0,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    ...overrides,
  };
}

// BILINCLI olarak TUM katalogdan (yalniz "ready" olanlardan degil) uretilir:
// generateProgramPreview'in KENDISI "ready" olmayanlari (integrationStatus
// needs_minor_changes/needs_major_changes) elemek ZORUNDADIR - bu havuz
// bunu her testte dolayli olarak da dogrular (bkz. TEST 21/22/27).
function makeFullPool() {
  return ASSIGNMENT_EXERCISE_CATALOG.map((definition, index) => makeSetting(definition.exerciseSlug, { displayOrder: index }));
}

function makeReadyOnlyPool() {
  return ASSIGNMENT_EXERCISE_CATALOG.filter((definition) => definition.integrationStatus === "ready").map(
    (definition, index) => makeSetting(definition.exerciseSlug, { displayOrder: index }),
  );
}

test("TEST 1: ayni seed + ayni sablon = ayni 20x5 program", () => {
  const pool = makeFullPool();
  const first = generateProgramPreview({ classGroup: "grade_1", generationSeed: "sabit-seed", exerciseSettings: pool });
  const second = generateProgramPreview({ classGroup: "grade_1", generationSeed: "sabit-seed", exerciseSettings: pool });

  assert.equal(first.ok, true);
  assert.equal(second.ok, true);
  assert.deepEqual(first.preview.days, second.preview.days);
});

test("TEST 2: farkli seed genel olarak farkli siralama uretir", () => {
  const pool = makeFullPool();
  const a = generateProgramPreview({ classGroup: "grade_1", generationSeed: "seed-a", exerciseSettings: pool });
  const b = generateProgramPreview({ classGroup: "grade_1", generationSeed: "seed-b", exerciseSettings: pool });

  assert.equal(a.ok, true);
  assert.equal(b.ok, true);
  assert.notDeepEqual(a.preview.days, b.preview.days);
});

test("TEST 3 ve TEST 4: her gun tam 5 gorev, toplam 100 gorev", () => {
  const pool = makeFullPool();
  const result = generateProgramPreview({ classGroup: "grade_1", generationSeed: "gunluk-sayim", exerciseSettings: pool });

  assert.equal(result.ok, true);
  assert.equal(result.preview.days.length, 20);
  for (const day of result.preview.days) {
    assert.equal(day.tasks.length, 5);
  }
  const totalTasks = result.preview.days.reduce((sum, day) => sum + day.tasks.length, 0);
  assert.equal(totalTasks, 100);
  assert.equal(result.preview.totalTasks, 100);
});

test("TEST 5: ayni gun icinde duplicate exerciseSlug yok", () => {
  const pool = makeFullPool();
  const result = generateProgramPreview({ classGroup: "grade_1", generationSeed: "duplicate-check", exerciseSettings: pool });

  assert.equal(result.ok, true);
  for (const day of result.preview.days) {
    const slugs = day.tasks.map((task) => task.exerciseSlug);
    assert.equal(new Set(slugs).size, slugs.length);
  }
});

test("TEST 6: yasakli 6 slug katalogda veya uretilen programda hicbir zaman cikmaz", () => {
  for (const deniedSlug of ASSIGNMENT_DENIED_EXERCISE_SLUGS) {
    assert.equal(isAssignmentReadyExerciseSlug(deniedSlug), false);
    assert.equal(isAssignmentCatalogExerciseSlug(deniedSlug), false);
    assert.equal(getAssignmentExerciseDefinition(deniedSlug), undefined);
  }

  const pool = makeFullPool();
  const result = generateProgramPreview({ classGroup: "grade_1", generationSeed: "denied-check", exerciseSettings: pool });
  assert.equal(result.ok, true);
  for (const day of result.preview.days) {
    for (const task of day.tasks) {
      assert.equal(ASSIGNMENT_DENIED_EXERCISE_SLUGS.includes(task.exerciseSlug), false);
    }
  }
});

test("TEST 7: Akil ve Zeka Oyunlari kategorisindeki egzersizler katalogda yok", () => {
  // kelime-tahmin/adam-asmaca/gorsel-puzzle/dikkat-labirenti katalogda
  // "memory"/"attention" olarak isaretli ama Akil ve Zeka Oyunlari UI
  // grubu oldugu icin katalogA hic girmiyor (bkz. assignmentExerciseCatalog.ts).
  const akilZekaSlugs = ["kelime-tahmin", "adam-asmaca", "gorsel-puzzle", "dikkat-labirenti"];
  for (const slug of akilZekaSlugs) {
    assert.equal(ASSIGNMENT_EXERCISE_CATALOG.some((entry) => entry.exerciseSlug === slug), false);
  }
});

test("TEST 8: enabled=false olan egzersiz asla cikmaz", () => {
  const pool = makeFullPool();
  pool[0] = { ...pool[0], enabled: false };
  const disabledSlug = pool[0].exerciseSlug;

  const result = generateProgramPreview({ classGroup: "grade_1", generationSeed: "enabled-check", exerciseSettings: pool });
  assert.equal(result.ok, true);
  for (const day of result.preview.days) {
    for (const task of day.tasks) {
      assert.notEqual(task.exerciseSlug, disabledSlug);
    }
  }
});

test("TEST 9: dailyWeight=0 olan egzersiz asla cikmaz", () => {
  const pool = makeFullPool();
  pool[1] = { ...pool[1], dailyWeight: 0 };
  const zeroWeightSlug = pool[1].exerciseSlug;

  const result = generateProgramPreview({ classGroup: "grade_1", generationSeed: "weight-check", exerciseSettings: pool });
  assert.equal(result.ok, true);
  for (const day of result.preview.days) {
    for (const task of day.tasks) {
      assert.notEqual(task.exerciseSlug, zeroWeightSlug);
    }
  }
});

test("TEST 10: maxOccurrencesPerProgram sinirinin asilmamasi", () => {
  const pool = makeFullPool();
  const limitedSlug = pool[0].exerciseSlug;
  pool[0] = { ...pool[0], maxOccurrencesPerProgram: 2 };

  const result = generateProgramPreview({ classGroup: "grade_1", generationSeed: "max-occurrence-check", exerciseSettings: pool });
  assert.equal(result.ok, true);
  const occurrences = result.preview.exerciseSummary.find((entry) => entry.exerciseSlug === limitedSlug)?.count ?? 0;
  assert.ok(occurrences <= 2, `beklenen <=2, gercek ${occurrences}`);
});

test("TEST 11: startingLevel/durationSeconds/settings snapshot dogru kopyalaniyor", () => {
  const pool = makeFullPool();
  const takistoskopSetting = pool.find((setting) => setting.exerciseSlug === "takistoskop");
  takistoskopSetting.startingLevel = 5;
  takistoskopSetting.durationSeconds = 240;
  takistoskopSetting.settings = { speedMs: 500, workMode: "manual", contentType: "letter" };

  const result = generateProgramPreview({ classGroup: "grade_1", generationSeed: "snapshot-check", exerciseSettings: pool });
  assert.equal(result.ok, true);

  const takistoskopTasks = result.preview.days
    .flatMap((day) => day.tasks)
    .filter((task) => task.exerciseSlug === "takistoskop");

  assert.ok(takistoskopTasks.length > 0);
  for (const task of takistoskopTasks) {
    assert.equal(task.startingLevel, 5);
    assert.equal(task.durationSeconds, 240);
    assert.deepEqual(task.settings, { speedMs: 500, workMode: "manual", contentType: "letter" });
  }
});

test("TEST 12: yetersiz havuzda acik hata donuyor", () => {
  const pool = [makeSetting("takistoskop"), makeSetting("goz-beyin")];
  const result = generateProgramPreview({ classGroup: "grade_1", generationSeed: "insufficient-check", exerciseSettings: pool });

  assert.equal(result.ok, false);
  assert.equal(result.message, INSUFFICIENT_EXERCISE_POOL_MESSAGE);
});

test("TEST 13: gecersiz classGroup reddedilir", () => {
  assert.equal(isAssignmentClassGroup("grade_9"), false);
  assert.equal(isAssignmentClassGroup("adult"), false);
  const result = validateClassGroup("grade_9");
  assert.equal(result.ok, false);

  for (const validGroup of ASSIGNMENT_CLASS_GROUPS) {
    assert.equal(isAssignmentClassGroup(validGroup), true);
  }
});

test("TEST 14: bilinmeyen exerciseSlug reddedilir", () => {
  assert.equal(isAssignmentCatalogExerciseSlug("boyle-bir-egzersiz-yok"), false);
  assert.equal(isAssignmentReadyExerciseSlug("boyle-bir-egzersiz-yok"), false);
  assert.equal(getAssignmentExerciseDefinition("boyle-bir-egzersiz-yok"), undefined);
});

test("TEST 15: Takistoskop icin gecerli speedMs kabul edilir", () => {
  const definition = getAssignmentExerciseDefinition("takistoskop");
  const result = validateExerciseSettings({ speedMs: 500, workMode: "manual", contentType: "letter" }, definition.settingsSchema);
  assert.equal(result.ok, true);
  assert.equal(result.value.speedMs, 500);
});

test("TEST 16: Takistoskop icin bilinmeyen settings anahtari reddedilir", () => {
  const definition = getAssignmentExerciseDefinition("takistoskop");
  const result = validateExerciseSettings({ speedMs: 500, displayDurationMs: 500 }, definition.settingsSchema);
  assert.equal(result.ok, false);

  // Object LITERAL syntax "{ __proto__: {...} }" does NOT create an own
  // enumerable "__proto__" property - it sets the object's actual
  // prototype instead, so Object.keys() never sees it. The realistic
  // attack vector is a JSON request body: JSON.parse DOES create a real
  // own "__proto__" property, which is exactly what must be rejected.
  const protoResult = validateExerciseSettings(JSON.parse('{"__proto__":{"polluted":true}}'), definition.settingsSchema);
  assert.equal(protoResult.ok, false);
});

test("TEST 17: yetkisiz istek reddedilir (route auth kontrolu)", async () => {
  const { isAdminSessionValid, ADMIN_SESSION_COOKIE_NAME } = await import("../src/lib/auth/adminSession.ts");

  // next/server's NextRequest is only resolvable inside the Next.js
  // bundler/runtime, not via plain `node --test`; isAdminSessionValid only
  // ever touches `request.cookies.get(name)`, so a minimal fake covering
  // that exact interface is a faithful, dependency-free unit test.
  const makeFakeRequest = (cookieValue) => ({
    cookies: { get: (name) => (name === ADMIN_SESSION_COOKIE_NAME && cookieValue ? { value: cookieValue } : undefined) },
  });

  assert.equal(isAdminSessionValid(makeFakeRequest(undefined)), false);
  assert.equal(isAdminSessionValid(makeFakeRequest("short")), false);
  assert.equal(isAdminSessionValid(makeFakeRequest("a-valid-looking-session-token-value")), true);
});

test("TEST 18: preview route DB'ye yazma cagrisi icermiyor (statik kaynak kontrolu)", async () => {
  const source = await readFile(
    new URL("../src/app/api/admin/assignment-program/preview/route.ts", import.meta.url),
    "utf8",
  );
  assert.doesNotMatch(source, /\.insert\(/);
  assert.doesNotMatch(source, /\.update\(/);
  assert.doesNotMatch(source, /\.upsert\(/);
  assert.doesNotMatch(source, /\.delete\(/);
});

test("createDeterministicRandom [0,1) araliginda deterministic deger uretir", () => {
  const sequenceA = [];
  const randomA = createDeterministicRandom("test-seed");
  for (let i = 0; i < 20; i += 1) {
    const value = randomA();
    assert.ok(value >= 0 && value < 1);
    sequenceA.push(value);
  }

  const sequenceB = [];
  const randomB = createDeterministicRandom("test-seed");
  for (let i = 0; i < 20; i += 1) {
    sequenceB.push(randomB());
  }

  assert.deepEqual(sequenceA, sequenceB);

  const randomDifferentSeed = createDeterministicRandom("different-seed");
  assert.notEqual(sequenceA[0], randomDifferentSeed());
});

// ============================================================================
// integrationStatus modeli icin yeni testler (TEST 19-28)
// ============================================================================

test("TEST 19: katalogda speed/attention/memory/eye/comprehension kategorilerinin tamami en az bir tanimla gorunur", () => {
  const categories = new Set(ASSIGNMENT_EXERCISE_CATALOG.map((entry) => entry.category));
  for (const expectedCategory of ["speed", "attention", "memory", "eye", "comprehension"]) {
    assert.ok(categories.has(expectedCategory), `beklenen kategori katalogda yok: ${expectedCategory}`);
  }
});

test("TEST 20: Okuma/Anlama egzersizlerinin integrationStatus degerleri dogru", () => {
  const expectedStatusBySlug = {
    "okuma-hizi-testi": "needs_minor_changes",
    "blok-okuma": "needs_minor_changes",
    "gruplama-calismasi": "needs_minor_changes",
    "golgeleme": "needs_minor_changes",
    "odakli-okuma": "needs_minor_changes",
    "anlama-testi": "needs_major_changes",
  };

  for (const [slug, expectedStatus] of Object.entries(expectedStatusBySlug)) {
    const definition = getAssignmentExerciseDefinition(slug);
    assert.ok(definition, `katalogda bulunamadi: ${slug}`);
    assert.equal(definition.integrationStatus, expectedStatus, `${slug} icin beklenmeyen integrationStatus`);
    assert.equal(isAssignmentReadyExerciseSlug(slug), false, `${slug} "ready" olmamali`);
    assert.equal(isAssignmentCatalogExerciseSlug(slug), true, `${slug} katalogda GORUNMELI`);
  }

  // anlama-testi gercek katalog kategorisinde "comprehension" olarak kalmali.
  assert.equal(getAssignmentExerciseDefinition("anlama-testi").category, "comprehension");
});

test("TEST 21: integrationStatus=needs_minor_changes program preview'e girmez", () => {
  const pool = makeFullPool();
  const result = generateProgramPreview({ classGroup: "grade_1", generationSeed: "minor-changes-check", exerciseSettings: pool });
  assert.equal(result.ok, true);

  const minorChangeSlugs = ["okuma-hizi-testi", "blok-okuma", "gruplama-calismasi", "golgeleme", "odakli-okuma"];
  for (const day of result.preview.days) {
    for (const task of day.tasks) {
      assert.equal(minorChangeSlugs.includes(task.exerciseSlug), false, `${task.exerciseSlug} preview'de gorunmemeliydi`);
    }
  }
});

test("TEST 22: integrationStatus=needs_major_changes program preview'e girmez", () => {
  const pool = makeFullPool();
  const result = generateProgramPreview({ classGroup: "grade_1", generationSeed: "major-changes-check", exerciseSettings: pool });
  assert.equal(result.ok, true);

  for (const day of result.preview.days) {
    for (const task of day.tasks) {
      assert.notEqual(task.exerciseSlug, "anlama-testi");
    }
  }
});

test("TEST 23: 'disabled' esdegeri (yasakli/pasif) egzersizler program preview'e girmez", () => {
  // Bu turda 6 yasakli slug icin katalogda literal integrationStatus=
  // "disabled" kaydi OLUSTURULMADI (bilincli, daha sert bir yaklasim:
  // bu slug'lar katalogA hic girmiyor - bkz. assignmentExerciseCatalog.ts
  // ust yorumu). Bu yuzden "disabled" durumu, mevcut deny-set mekanizmasi
  // uzerinden dolayli olarak test edilir: denenen bir ProgramClassExerciseSetting
  // satiri hicbir zaman gecerli bir PreviewCandidate'e donusemez, cunku
  // getAssignmentExerciseDefinition bu slug'lar icin undefined doner.
  for (const deniedSlug of ASSIGNMENT_DENIED_EXERCISE_SLUGS) {
    const setting = makeSetting(deniedSlug, { dailyWeight: 1000, maxOccurrencesPerProgram: null });
    // definition bulunamadigi icin makeSetting'in kendi ic degerleri
    // (startingLevel vb.) varsayilana duser - onemli olan, bu satirin
    // generateProgramPreview'e verilse dahi hic bir gorev uretmemesidir.
    const result = generateProgramPreview({
      classGroup: "grade_1",
      generationSeed: `disabled-check-${deniedSlug}`,
      exerciseSettings: [...makeReadyOnlyPool(), setting],
    });
    assert.equal(result.ok, true);
    for (const day of result.preview.days) {
      for (const task of day.tasks) {
        assert.notEqual(task.exerciseSlug, deniedSlug);
      }
    }
  }
});

test("TEST 24: hazir olmayan slug helper/route seviyesinde reddedilir", () => {
  // templates/route.ts PUT handler'i tam olarak bu iki fonksiyonu kullanir:
  // once isAssignmentCatalogExerciseSlug (bilinmeyen/yasakli slug -> 400),
  // sonra isAssignmentReadyExerciseSlug (katalogda var ama ready degil -> 400).
  assert.equal(isAssignmentCatalogExerciseSlug("okuma-hizi-testi"), true);
  assert.equal(isAssignmentReadyExerciseSlug("okuma-hizi-testi"), false);
  assert.equal(isAssignmentCatalogExerciseSlug("anlama-testi"), true);
  assert.equal(isAssignmentReadyExerciseSlug("anlama-testi"), false);

  // Gercek ready bir slug icin ikisi de true olmali.
  assert.equal(isAssignmentCatalogExerciseSlug("takistoskop"), true);
  assert.equal(isAssignmentReadyExerciseSlug("takistoskop"), true);
});

test("TEST 25: GET metadata (ASSIGNMENT_EXERCISE_CATALOG) butun integrationStatus degerlerini koruyor", async () => {
  const statusesPresent = new Set(ASSIGNMENT_EXERCISE_CATALOG.map((entry) => entry.integrationStatus));
  assert.ok(statusesPresent.has("ready"));
  assert.ok(statusesPresent.has("needs_minor_changes"));
  assert.ok(statusesPresent.has("needs_major_changes"));

  // templates/route.ts GET'in gercekten tam katalogu (ready-filtreli
  // olmayan) dondurdugunu statik olarak dogrula.
  const source = await readFile(
    new URL("../src/app/api/admin/assignment-program/templates/route.ts", import.meta.url),
    "utf8",
  );
  assert.match(source, /catalog:\s*ASSIGNMENT_EXERCISE_CATALOG/);
});

test("TEST 26: ready comprehension egzersizi yoksa preview warning uretir", () => {
  const pool = makeFullPool();
  const result = generateProgramPreview({ classGroup: "grade_1", generationSeed: "comprehension-warning-check", exerciseSettings: pool });

  assert.equal(result.ok, true);
  assert.ok(
    result.preview.summary.warnings.includes(NO_READY_COMPREHENSION_WARNING),
    "comprehension uyarisi bulunamadi",
  );
});

test("TEST 27: mevcut 10 ready egzersizle 20x5 uretim hala basarili", () => {
  const readyPool = makeReadyOnlyPool();
  assert.equal(readyPool.length, 10, "ready havuzu 10 kayittan olusmali");

  const result = generateProgramPreview({ classGroup: "grade_1", generationSeed: "ready-only-check", exerciseSettings: readyPool });
  assert.equal(result.ok, true);
  assert.equal(result.preview.totalTasks, 100);
  assert.equal(result.preview.days.length, 20);
});

test("TEST 28: ayni seed ile determinism (guncellenmis 16 kayitlik katalogla) korunuyor", () => {
  const pool = makeFullPool();
  const first = generateProgramPreview({ classGroup: "grade_5_6", generationSeed: "full-catalog-determinism", exerciseSettings: pool });
  const second = generateProgramPreview({ classGroup: "grade_5_6", generationSeed: "full-catalog-determinism", exerciseSettings: pool });

  assert.equal(first.ok, true);
  assert.equal(second.ok, true);
  assert.deepEqual(first.preview, second.preview);
});
