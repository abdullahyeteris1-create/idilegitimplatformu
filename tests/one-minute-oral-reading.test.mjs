import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import {
  calculateComprehensionScore,
  calculateCorrectWords,
  calculateWordsRead,
  countReadingWords,
  formatReadingDuration,
  getElapsedReadingSeconds,
  getRemainingSeconds,
  isTimerFinished,
  ONE_MINUTE_SECONDS,
  validateReadingErrors,
} from "../src/lib/one-minute-reading/metrics.ts";
import { getTextsForGrade, ONE_MINUTE_READING_TEXTS } from "../src/lib/one-minute-reading/content.ts";

const clientSource = await readFile(new URL("../src/app/egzersizler/bir-dakika-sesli-okuma/OneMinuteOralReadingClient.tsx", import.meta.url), "utf8");

function getSourceBlock(startMarker, endMarker) {
  const start = clientSource.indexOf(startMarker);
  const end = clientSource.indexOf(endMarker, start + startMarker.length);
  assert.notEqual(start, -1, `missing source marker: ${startMarker}`);
  assert.notEqual(end, -1, `missing source marker: ${endMarker}`);
  return clientSource.slice(start, end);
}

test("all 8 passages are within the intended grade ranges", () => {
  const ranges = new Map([
    [1, [60, 70]],
    [2, [75, 90]],
    [3, [90, 110]],
    [4, [110, 130]],
  ]);

  assert.equal(ONE_MINUTE_READING_TEXTS.length, 8);
  for (const grade of [1, 2, 3, 4]) assert.equal(getTextsForGrade(grade).length, 2);
  for (const text of ONE_MINUTE_READING_TEXTS) {
    const [minimum, maximum] = ranges.get(text.grade);
    const wordCount = countReadingWords(text.paragraphs.join(" "));
    assert.ok(wordCount >= minimum && wordCount <= maximum, `${text.title}: ${wordCount}`);
  }
});

test("all 24 comprehension questions remain structurally valid", () => {
  assert.equal(ONE_MINUTE_READING_TEXTS.reduce((total, text) => total + text.comprehensionQuestions.length, 0), 24);
  for (const text of ONE_MINUTE_READING_TEXTS) {
    assert.equal(text.comprehensionQuestions.length, 3, text.title);
    for (const question of text.comprehensionQuestions) {
      assert.equal(question.options.length, 3, question.id);
      assert.ok(question.question.length > 0, question.id);
      assert.ok(question.correctAnswer >= 0 && question.correctAnswer < question.options.length, question.id);
      assert.equal(new Set(question.options).size, question.options.length, question.id);
    }
  }
});

test("timer starts from a timestamp and normal timeout remains 60 seconds", () => {
  assert.equal(ONE_MINUTE_SECONDS, 60);
  assert.match(clientSource, /setStartedAt\(Date\.now\(\)\)/);
  assert.equal(getRemainingSeconds(1_000, 1_000), 60);
  assert.equal(getRemainingSeconds(1_000, 61_000), 0);
  assert.equal(isTimerFinished(1_000, 60_999), false);
  assert.equal(isTimerFinished(1_000, 61_000), true);
});

test("early-finish button is rendered only in the active reading phase", () => {
  const readingBlock = getSourceBlock('if (phase === "reading")', 'if (phase === "time-up")');
  assert.match(readingBlock, /Metni Bitirdim/);
  assert.equal((clientSource.match(/Metni Bitirdim/g) ?? []).length, 1);
});

test("confirmation does not pause or reset the timestamp-based timer", () => {
  const openBlock = getSourceBlock("const handleOpenFinishConfirmation", "const handleCancelFinishConfirmation");
  assert.match(openBlock, /setFinishConfirmationOpen\(true\)/);
  assert.doesNotMatch(openBlock, /setStartedAt|setRemainingSeconds/);
  assert.match(clientSource, /Süre işlemeye devam ediyor/);
});

test("cancel confirmation closes only the confirmation and continues the same attempt", () => {
  const cancelBlock = getSourceBlock("const handleCancelFinishConfirmation", "const handleConfirmEarlyFinish");
  assert.match(cancelBlock, /setFinishConfirmationOpen\(false\)/);
  assert.doesNotMatch(cancelBlock, /setStartedAt|setRemainingSeconds|setPhase/);
});

test("early confirmation records actual elapsed seconds from timestamps", () => {
  assert.equal(getElapsedReadingSeconds(1_000, 43_000), 42);
  assert.equal(getElapsedReadingSeconds(1_000, 1_100), 1);
  assert.equal(getElapsedReadingSeconds(1_000, 100_000), 60);
  const earlyBlock = getSourceBlock("const handleConfirmEarlyFinish", "const persistResult");
  assert.match(earlyBlock, /getElapsedReadingSeconds\(startedAt, now\)/);
});

test("early finish automatically selects the final countable word", () => {
  const earlyBlock = getSourceBlock("const handleConfirmEarlyFinish", "const persistResult");
  assert.match(earlyBlock, /setLastWordIndex\(Math\.max\(0, totalWords - 1\)\)/);
  assert.match(earlyBlock, /setPhase\("errors"\)/);
});

test("normal timeout still transitions to manual last-word selection", () => {
  const timeoutBlock = getSourceBlock('if (phase === "time-up")', 'if (phase === "marking"');
  assert.match(timeoutBlock, /onClick=\{\(\) => setPhase\("marking"\)\}/);
  assert.match(timeoutBlock, /Son Kelimeyi İşaretle/);
});

test("timeout wins if confirmation is open and cannot double-finish", () => {
  assert.match(clientSource, /setFinishConfirmationOpen\(false\);[\s\S]*setPhase\("time-up"\)/);
  assert.match(clientSource, /if \(timerFinishedRef\.current\) return;/);
  const earlyBlock = getSourceBlock("const handleConfirmEarlyFinish", "const persistResult");
  assert.match(earlyBlock, /if \(isTimerFinished\(startedAt, now\)\)[\s\S]*finishByTimeout\(\)/);
});

test("finish transition is guarded against duplicate execution", () => {
  assert.ok((clientSource.match(/timerFinishedRef\.current = true/g) ?? []).length >= 2);
  assert.match(clientSource, /const finishByTimeout = useCallback/);
});

test("retry resets duration, confirmation, selected word, errors and answers", () => {
  const resetBlock = getSourceBlock("const resetAttemptState", "const handleGradeSelect");
  for (const marker of ["setReadingDurationSeconds(null)", "setFinishConfirmationOpen(false)", "setLastWordIndex(null)", "setReadingErrors(0)", "setAnswers({})"]) {
    assert.match(resetBlock, new RegExp(marker.replace(/[()[\]{}]/g, "\\$&")));
  }
  const retryAction = getSourceBlock("<div className={styles.resultActions}", "{saveStatus");
  assert.match(retryAction, /resetAttemptState\(\)/);
});

test("new text resets the same attempt state", () => {
  const newTextBlock = getSourceBlock("const handleNewText", "const handleStartReading");
  assert.match(newTextBlock, /getRandomTextForGrade\(grade, selectedText\.id\)/);
  assert.match(newTextBlock, /resetAttemptState\(\)/);
});

test("Turkish punctuation, apostrophes and paragraph breaks count as words", () => {
  assert.equal(countReadingWords("Çocuklar, güzel bir gün! Öğretmen'in kitabı."), 6);
  assert.equal(countReadingWords("Birinci paragraf.\n\nİkinci paragraf; üç kelime."), 6);
  assert.equal(countReadingWords("kitap, geldi. çocuklar!"), 3);
});

test("last-word selection maps to the number of words read", () => {
  assert.equal(calculateWordsRead(null, 40), 0);
  assert.equal(calculateWordsRead(0, 40), 1);
  assert.equal(calculateWordsRead(17, 40), 18);
  assert.equal(calculateWordsRead(999, 40), 40);
});

test("reading errors are clamped and correct words are calculated", () => {
  assert.equal(validateReadingErrors(-2, 20), 0);
  assert.equal(validateReadingErrors(25, 20), 20);
  assert.equal(validateReadingErrors(4.9, 20), 4);
  assert.equal(calculateCorrectWords(86, 4), 82);
  assert.equal(calculateCorrectWords(5, 12), 0);
});

test("comprehension scoring and duration display stay deterministic", () => {
  assert.equal(calculateComprehensionScore(2, 3), 67);
  assert.equal(calculateComprehensionScore(3, 3), 100);
  assert.equal(calculateComprehensionScore(0, 0), 0);
  assert.equal(formatReadingDuration(60), "1 dk");
  assert.equal(formatReadingDuration(42), "42 sn");
  assert.equal(formatReadingDuration(Number.NaN), "1 sn");
  assert.match(clientSource, /Okuma Süresi/);
  assert.match(clientSource, /durationSeconds: attempt\.readingDurationSeconds/);
});

test("V2 still does not depend on microphone, speech recognition or recording APIs", () => {
  assert.doesNotMatch(clientSource, /navigator\.mediaDevices|SpeechRecognition|webkitSpeechRecognition|MediaRecorder/);
});