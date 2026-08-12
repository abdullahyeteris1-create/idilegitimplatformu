import assert from "node:assert/strict";
import test from "node:test";
import { readFile } from "node:fs/promises";

import { mapEducationLevelToClassGroup } from "../src/lib/assignments/classGroups.ts";
import {
  getTatliDukkaniScoreEvaluation,
  getTatliDukkaniScoreRange,
  TATLI_DUKKANI_SCORE_RANGES,
} from "../src/lib/tatli-dukkani/scoreRanges.ts";

test("Tatlı Dükkanı class mapping platformun gerçek education seviyelerini kullanır", () => {
  assert.equal(mapEducationLevelToClassGroup("primary_1").value, "grade_1");
  assert.equal(mapEducationLevelToClassGroup("middle_5_6").value, "grade_5_6");
  assert.equal(mapEducationLevelToClassGroup("high_school").value, "high_school");
  assert.equal(mapEducationLevelToClassGroup("adult").value, "general");
});

test("her score bandı alt ve üst sınırlarında deterministik", () => {
  for (const range of TATLI_DUKKANI_SCORE_RANGES) {
    assert.equal(getTatliDukkaniScoreRange(range.min), range);
    if (range.max !== null) assert.equal(getTatliDukkaniScoreRange(range.max), range);
  }
  assert.equal(getTatliDukkaniScoreRange(2_300).label, "Mükemmel");
});

test("bilinmeyen sınıf nötr genel değerlendirmeye düşer", () => {
  const result = getTatliDukkaniScoreEvaluation(850, null);
  assert.equal(result.classGroup, null);
  assert.equal(result.classLabel, null);
  assert.equal(result.range.label, "İyi");
});

test("sonuç ekranı gerçek oyun metriklerini ve güvenli kaydı korur", async () => {
  const source = await readFile("src/app/egzersizler/tatli-dukkani/TatliDukkaniExerciseClient.tsx", "utf8");
  assert.match(source, /Skor Değerlendirmesi/);
  assert.match(source, /rounds - correct/);
  assert.match(source, /successRate/);
  assert.match(source, /saveExerciseResultSecure/);
  assert.doesNotMatch(source, /saveExerciseResultSecure\(\{[\s\S]{0,500}studentId/);
});
