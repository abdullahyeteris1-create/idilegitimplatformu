import assert from "node:assert/strict";
import test from "node:test";

import {
  EDUCATION_PROGRAM_CATEGORIES,
  getEducationProgramCategoryLabel,
  isEducationProgramCategory,
} from "../src/lib/education-programs/categories.ts";

test("education program kategorileri beklenen sekiz yonetici etiketini icerir", () => {
  assert.deepEqual(
    EDUCATION_PROGRAM_CATEGORIES.map((category) => category.label),
    [
      "1. sınıf",
      "2. sınıf",
      "3. sınıf",
      "4. sınıf",
      "5–6. sınıf",
      "7–8. sınıf",
      "Lise",
      "Genel/Yetişkin",
    ],
  );
});

test("kategori kodlari tekildir ve yalniz tanimli kodlar kabul edilir", () => {
  const values = EDUCATION_PROGRAM_CATEGORIES.map((category) => category.value);
  assert.equal(new Set(values).size, 8);

  for (const value of values) {
    assert.equal(isEducationProgramCategory(value), true);
  }

  assert.equal(isEducationProgramCategory(""), false);
  assert.equal(isEducationProgramCategory("assignment"), false);
  assert.equal(isEducationProgramCategory("grade_9"), false);
  assert.equal(isEducationProgramCategory(null), false);
});

test("kategori etiketi saklama kodundan guvenli bicimde cozulur", () => {
  assert.equal(getEducationProgramCategoryLabel("grade_5_6"), "5–6. sınıf");
  assert.equal(getEducationProgramCategoryLabel("general_adult"), "Genel/Yetişkin");
});
