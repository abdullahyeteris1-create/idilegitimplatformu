import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { test } from "node:test";
import {
  CHARACTERS,
  createEmotionalReadingSession,
  EMOTIONAL_READING_GRADES,
  EMOTIONAL_READING_PROMPTS_BY_GRADE,
  EMOTIONS,
  getEmotionWheelRotation,
} from "../src/lib/emotional-reading/content.ts";
import { ASSIGNMENT_EXERCISE_BY_SLUG } from "../src/lib/assignments/exerciseCatalog.ts";
import { CATEGORY_EXERCISE_SLUGS } from "../src/components/exercises-preview/exercisePreviewGroups.ts";

const clientSource = await readFile(new URL("../src/app/egzersizler/duygulu-okuma/EmotionalReadingClient.tsx", import.meta.url), "utf8");
const apiSource = await readFile(new URL("../src/app/api/student/results/route.ts", import.meta.url), "utf8");
const pageSource = await readFile(new URL("../src/app/egzersizler/duygulu-okuma/page.tsx", import.meta.url), "utf8");

test("exercise is registered in the Okuma - Anlama catalog and route", () => {
  assert.ok(CATEGORY_EXERCISE_SLUGS.assessment.includes("duygulu-okuma"));
  assert.equal(ASSIGNMENT_EXERCISE_BY_SLUG.get("duygulu-okuma")?.route, "/egzersizler/duygulu-okuma");
  assert.equal(ASSIGNMENT_EXERCISE_BY_SLUG.get("duygulu-okuma")?.resultExerciseType, "emotional-reading");
  assert.match(pageSource, /duygulu-okuma/);
});

test("grades 1-4 each have 25 original prompts with unique ids", () => {
  const prompts = EMOTIONAL_READING_GRADES.flatMap((grade) => {
    const gradePrompts = EMOTIONAL_READING_PROMPTS_BY_GRADE[grade];
    assert.equal(gradePrompts.length, 25);
    for (const prompt of gradePrompts) {
      assert.equal(prompt.grade, grade);
      assert.ok(prompt.sentence.trim());
      assert.match(prompt.sentence, /[.!?]["”]?$/u);
    }
    return gradePrompts;
  });
  assert.equal(prompts.length, 100);
  assert.equal(new Set(prompts.map((prompt) => prompt.id)).size, 100);
  assert.equal(new Set(prompts.map((prompt) => prompt.sentence)).size, 100);
});

test("emotion and character libraries have the requested sizes", () => {
  assert.equal(EMOTIONS.length, 8);
  assert.equal(new Set(EMOTIONS.map((emotion) => emotion.id)).size, 8);
  assert.equal(CHARACTERS.length, 7);
  assert.equal(new Set(CHARACTERS.map((character) => character.id)).size, 7);
  assert.ok(EMOTIONS.every((emotion) => emotion.label && emotion.emoji && emotion.instruction));
  assert.ok(CHARACTERS.every((character) => character.label && character.emoji && character.instruction));
});

test("five-round emotion mode prefers five unique emotions", () => {
  const session = createEmotionalReadingSession(2, "emotion-task", () => 0.37);
  assert.equal(session.length, 5);
  assert.equal(new Set(session.map((round) => round.emotion.id)).size, 5);
  assert.ok(session.every((round) => round.character === null));
  assert.ok(session.every((round) => round.prompt.grade === 2));
});

test("five-round acting mode prefers unique emotions and characters", () => {
  const session = createEmotionalReadingSession(4, "acting", () => 0.63);
  assert.equal(new Set(session.map((round) => round.emotion.id)).size, 5);
  assert.equal(new Set(session.map((round) => round.character?.id)).size, 5);
  assert.ok(session.every((round) => round.character));
});

test("wheel target rotation is deterministic and tied to selected emotion", () => {
  EMOTIONS.forEach((emotion, index) => {
    assert.equal(getEmotionWheelRotation(emotion.id, 4), 1440 - index * 45);
  });
  assert.equal(getEmotionWheelRotation(EMOTIONS[1].id, 4), 1395);
  assert.equal(getEmotionWheelRotation(EMOTIONS[7].id, 4), 1125);
  assert.ok(clientSource.includes("getEmotionWheelRotation(currentRound.emotion.id"));
  assert.ok(clientSource.includes('transform: "rotate(" + rotation + "deg)"'));
});

test("wheel spin is locked, reduced motion is supported and retries keep the same round", () => {
  assert.ok(clientSource.includes('if (isSpinning || !currentRound) return;'));
  assert.ok(clientSource.includes('disabled={isSpinning}'));
  assert.ok(clientSource.includes('sessionGenerationRef'));
  assert.ok(clientSource.includes('sessionGeneration !== sessionGenerationRef.current'));
  assert.ok(clientSource.includes('prefers-reduced-motion'));
  assert.ok(clientSource.includes('if (nextReflection === "try-again") {'));
  const retryStart = clientSource.indexOf('if (nextReflection === "try-again")');
  assert.notEqual(retryStart, -1);
  assert.equal(clientSource.slice(retryStart, retryStart + 220).includes('setRoundIndex'), false);
});

test("reflection, stars and final summary are completion-based rather than speech scoring", () => {
  assert.match(clientSource, /Sence nasıl okudun/);
  assert.match(clientSource, /Tamamlanan görev/);
  assert.match(clientSource, /scoreMeaning/);
  assert.match(clientSource, /ses kalitesi ölçülmez/);
  assert.doesNotMatch(clientSource, /Telaffuzun %|Akıcılığın çok iyi|Duyguyu doğru okudun/);
});

test("result persistence stores mode, completed rounds and self-reflection", () => {
  assert.match(clientSource, /saveExerciseResultSecure/);
  assert.match(clientSource, /exerciseType: RESULT_TYPE/);
  assert.match(clientSource, /completedRounds: ROUND_COUNT/);
  assert.match(clientSource, /starsEarned: ROUND_COUNT/);
  assert.match(clientSource, /selfReflectionGood/);
  assert.match(clientSource, /selfReflectionExcellent/);
  assert.match(apiSource, /"emotional-reading": {/);
  assert.doesNotMatch(clientSource, /getUserMedia|MediaRecorder|SpeechRecognition|webkitSpeechRecognition/);
});

test("both game modes have five rounds and the card is student-visible but not assignment-enabled yet", () => {
  const entry = ASSIGNMENT_EXERCISE_BY_SLUG.get("duygulu-okuma");
  assert.ok(entry);
  assert.equal(entry.assignmentEnabled, false);
  assert.match(clientSource, /ROUND_COUNT = 5/);
  assert.match(clientSource, /Duygu Görevi/);
  assert.match(clientSource, /Oyunculuk Modu/);
});
