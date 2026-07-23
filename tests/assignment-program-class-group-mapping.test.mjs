import assert from "node:assert/strict";
import test from "node:test";

import { mapEducationLevelToClassGroup } from "../src/lib/assignments/classGroups.ts";

// Desteklenen tum education_level degerleri deterministic olarak eslenmeli.
test("desteklenen tum education_level degerleri deterministic class_group'a eslenir", () => {
  const expected = {
    primary_1: "grade_1",
    primary_2: "grade_2",
    primary_3: "grade_3",
    primary_4: "grade_4",
    middle_5_6: "grade_5_6",
    middle_7_8: "grade_7_8",
    high_school: "high_school",
    adult: "general",
  };

  for (const [educationLevel, classGroup] of Object.entries(expected)) {
    const result = mapEducationLevelToClassGroup(educationLevel);
    assert.equal(result.ok, true, `${educationLevel} basarili eslenmeli`);
    assert.equal(result.value, classGroup, `${educationLevel} -> ${classGroup} olmali`);
  }
});

test("ayni education_level her zaman ayni class_group'u uretir (deterministic)", () => {
  const first = mapEducationLevelToClassGroup("middle_5_6");
  const second = mapEducationLevelToClassGroup("middle_5_6");
  assert.deepEqual(first, second);
});

test("null egitim seviyesi acik bir hata doner, varsayilan grup uretmez", () => {
  const result = mapEducationLevelToClassGroup(null);
  assert.equal(result.ok, false);
  assert.equal(typeof result.message, "string");
  assert.ok(result.message.length > 0);
});

test("undefined egitim seviyesi acik bir hata doner", () => {
  const result = mapEducationLevelToClassGroup(undefined);
  assert.equal(result.ok, false);
});

test("bos string acik bir hata doner", () => {
  const result = mapEducationLevelToClassGroup("");
  assert.equal(result.ok, false);
});

test("bilinmeyen bir egitim seviyesi metni acik bir hata doner", () => {
  const result = mapEducationLevelToClassGroup("university");
  assert.equal(result.ok, false);
});

test("class_group degerini (ör. 'grade_1') dogrudan education_level olarak vermek de reddedilir - iki alan karistirilmamali", () => {
  const result = mapEducationLevelToClassGroup("grade_1");
  assert.equal(result.ok, false);
});

test("sayi/obje gibi string olmayan degerler reddedilir", () => {
  assert.equal(mapEducationLevelToClassGroup(42).ok, false);
  assert.equal(mapEducationLevelToClassGroup({}).ok, false);
  assert.equal(mapEducationLevelToClassGroup([]).ok, false);
});
