import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import {
  createHeceleSession,
  HECELE_CONTENT,
  HECELE_CONTENT_VALIDATION_ERRORS,
  HECELE_GRADES,
  HECELE_SUPPORT_LEVELS,
  HECELE_TASK_COUNT,
} from "../src/lib/hecele-dinle-oku/content.ts";
import { ASSIGNMENT_EXERCISE_BY_SLUG } from "../src/lib/assignments/exerciseCatalog.ts";
import { CATEGORY_EXERCISE_SLUGS } from "../src/components/exercises-preview/exercisePreviewGroups.ts";

const clientSource = await readFile(new URL("../src/app/egzersizler/hecele-dinle-oku/HeceleDinleOkuClient.tsx", import.meta.url), "utf8");
const pageSource = await readFile(new URL("../src/app/egzersizler/hecele-dinle-oku/page.tsx", import.meta.url), "utf8");
const apiSource = await readFile(new URL("../src/app/api/student/results/route.ts", import.meta.url), "utf8");

test("exercise is registered in assessment category and route", () => {
  const entry = ASSIGNMENT_EXERCISE_BY_SLUG.get("hecele-dinle-oku");
  assert.ok(entry);
  assert.equal(entry.route, "/egzersizler/hecele-dinle-oku");
  assert.equal(entry.category, "comprehension");
  assert.equal(entry.resultExerciseType, "hecele-dinle-oku");
  assert.ok(CATEGORY_EXERCISE_SLUGS.assessment.includes("hecele-dinle-oku"));
  assert.match(pageSource, /EducationProgramExerciseChrome/);
});

test("V1 has only grades 1-2, three support levels and 140 verified items", () => {
  assert.deepEqual(HECELE_GRADES, [1, 2]);
  assert.equal(HECELE_SUPPORT_LEVELS.length, 3);
  assert.deepEqual(HECELE_SUPPORT_LEVELS.map((level) => level.id), ["very-slow", "slow", "word-by-word"]);
  assert.equal(HECELE_CONTENT[1].words.length, 40);
  assert.equal(HECELE_CONTENT[1].sentences.length, 30);
  assert.equal(HECELE_CONTENT[2].words.length, 40);
  assert.equal(HECELE_CONTENT[2].sentences.length, 30);
  assert.equal(HECELE_CONTENT_VALIDATION_ERRORS.length, 0, HECELE_CONTENT_VALIDATION_ERRORS.join("; "));
});

test("sessions contain eight unique items and progress from words to sentences", () => {
  for (const supportLevel of HECELE_SUPPORT_LEVELS.map((level) => level.id)) {
    const session = createHeceleSession(1, supportLevel);
    assert.equal(session.length, HECELE_TASK_COUNT);
    assert.equal(new Set(session.map((item) => item.id)).size, HECELE_TASK_COUNT);
    assert.deepEqual(session.slice(0, 4).map((item) => item.type), ["word", "word", "word", "word"]);
    assert.deepEqual(session.slice(4).map((item) => item.type), ["sentence", "sentence", "sentence", "sentence"]);
  }
});

test("explicit Turkish syllable metadata reconstructs every word and keeps Turkish characters", () => {
  const words = Object.values(HECELE_CONTENT).flatMap((content) => content.words);
  assert.ok(words.some((item) => /[çğıöşü]/u.test(item.text)));
  for (const word of words) assert.equal(word.syllables.join(""), word.text, word.id);
  for (const content of Object.values(HECELE_CONTENT)) {
    for (const sentence of content.sentences) {
      for (const token of sentence.tokens) assert.equal(token.syllables.join(""), token.normalized, `${sentence.id}/${token.text}`);
    }
  }
});

test("support levels materially change scaffolding and optional reveal is present", () => {
  const [verySlow, slow, wordByWord] = HECELE_SUPPORT_LEVELS;
  assert.equal(verySlow.syllableSupport, true);
  assert.ok(verySlow.syllablePauseMs > slow.syllablePauseMs);
  assert.equal(slow.syllableSupport, true);
  assert.equal(wordByWord.syllableSupport, false);
  assert.match(clientSource, /Heceyi Göster/);
  assert.match(clientSource, /support\.syllableSupport/);
  assert.match(clientSource, /Okuma Takibi/);
});

test("model reading is explicit, speech is cleaned up, and V1 has no microphone or fake reading score", () => {
  assert.match(clientSource, /onClick={startModelReading}/);
  assert.match(clientSource, /window\.speechSynthesis\.cancel\(\)/);
  assert.match(clientSource, /speechRunRef\.current \+= 1/);
  assert.match(clientSource, /if \(speechRunRef\.current !== runId\) return/);
  assert.doesNotMatch(clientSource, /useEffect\(\(\) => \{\s*startModelReading/);
  for (const forbidden of ["getUserMedia", "MediaRecorder", "SpeechRecognition", "webkitSpeechRecognition", "accuracyScore", "pronunciationScore", "fluencyScore"]) {
    assert.doesNotMatch(clientSource, new RegExp(forbidden));
  }
  assert.match(clientSource, /Şimdi Sen Oku/);
  assert.match(clientSource, /Okudum/);
  assert.match(clientSource, /Yeni Çalışma/);
  assert.match(clientSource, /Tekrar Çalış/);
  assert.match(apiSource, /"hecele-dinle-oku":/);
  assert.match(clientSource, /scoreMeaning:/);
});
