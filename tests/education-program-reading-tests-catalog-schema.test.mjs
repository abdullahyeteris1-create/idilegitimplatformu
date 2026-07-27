import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

import { resolveEducationProgramExerciseRoute } from "../src/lib/education-programs/exerciseRouteCatalog.ts";
import { getEducationProgramExercise } from "../src/lib/education-programs/exerciseCatalog.ts";

async function read(relativePath) {
  return readFile(new URL(`../${relativePath}`, import.meta.url), "utf8");
}

const CATALOG_PATH = "src/lib/education-programs/exerciseCatalog.ts";

// 1) Katalog kaydi
test("1) anlama-testi exerciseCatalog'da slug/route/resultExerciseType ile dogru kayitlidir", () => {
  const definition = getEducationProgramExercise("anlama-testi");

  assert.ok(definition, "anlama-testi exerciseCatalog'da bulunmali");
  assert.equal(definition.title, "Anlama Testi");
  assert.equal(definition.resultExerciseType, "reading-comprehension");
  assert.equal(definition.supportsLevel, false);
});

test("1) okuma-hizi-testi exerciseCatalog'da slug/route/resultExerciseType ile dogru kayitlidir", () => {
  const definition = getEducationProgramExercise("okuma-hizi-testi");

  assert.ok(definition, "okuma-hizi-testi exerciseCatalog'da bulunmali");
  assert.equal(definition.title, "Okuma Hızı Testi");
  assert.equal(definition.resultExerciseType, "reading-speed-test");
  assert.equal(definition.supportsLevel, false);
});

// 2) Route kaydi
test("2) anlama-testi ve okuma-hizi-testi route kataloglarinda dogru route ile kayitlidir", () => {
  assert.equal(resolveEducationProgramExerciseRoute("anlama-testi"), "/egzersizler/anlama-testi");
  assert.equal(resolveEducationProgramExerciseRoute("okuma-hizi-testi"), "/egzersizler/okuma-hizi-testi");
});

// 2) Bu iki calisma sure gerektirmiyor mu?
test("2) anlama-testi ve okuma-hizi-testi supportsDuration:false ile isaretlidir, defaultDurationSeconds hic tanimlanmamistir", () => {
  const comprehension = getEducationProgramExercise("anlama-testi");
  const speedTest = getEducationProgramExercise("okuma-hizi-testi");

  assert.equal(comprehension.supportsDuration, false);
  assert.equal(speedTest.supportsDuration, false);
  assert.equal("defaultDurationSeconds" in comprehension, false);
  assert.equal("defaultDurationSeconds" in speedTest, false);
});

test("diger 12 egzersiz supportsDuration alanini hic tanimlamaz (varsayilan: sure destekler, geriye donuk davranis degismedi)", () => {
  const stillTimedSlugs = [
    "kare-gorme-alani",
    "ayni-olani-yakala",
    "benzer-kelimeler",
    "kelime-bulma",
    "goz-egzersizleri-kolonlar",
    "takistoskop",
    "harf-rakam-sayma",
    "hafiza-gelistirme",
    "kart-eslestirme",
    "blok-okuma",
    "golgeleme",
    "gruplama-calismasi",
  ];

  for (const slug of stillTimedSlugs) {
    const definition = getEducationProgramExercise(slug);
    assert.ok(definition, `${slug} katalogda bulunmali`);
    assert.equal("supportsDuration" in definition, false, `${slug} supportsDuration tanimlamamali`);
    assert.equal(typeof definition.defaultDurationSeconds, "number", `${slug} defaultDurationSeconds sayisal olmali`);
  }
});

test("EducationProgramExerciseDefinition tipi supportsDuration ve defaultDurationSeconds'i opsiyonel tanimlar", async () => {
  const source = await read(CATALOG_PATH);

  assert.match(source, /supportsDuration\?: boolean;/);
  assert.match(source, /defaultDurationSeconds\?: number;/);
});

test("anlama-testi ve okuma-hizi-testi settings semasi tanimlanmadi (bu iki calismada ogretmen ayari yok)", async () => {
  const { getExerciseSettingsSchema } = await import("../src/lib/education-programs/exerciseSettingsSchemas.ts");

  assert.equal(getExerciseSettingsSchema("anlama-testi"), undefined);
  assert.equal(getExerciseSettingsSchema("okuma-hizi-testi"), undefined);
});
