import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

const source = fs.readFileSync("src/app/egzersizler/adam-asmaca/HangmanExerciseClient.tsx", "utf8");

test("Adam Asmaca varsayilan olarak 6 yanlis hakkini kullanir ve 10 hak secenegini sunar", () => {
  assert.match(source, /const DEFAULT_MAX_WRONG_GUESSES = 6/);
  assert.match(source, /const WRONG_GUESS_OPTIONS = \[6, 10\] as const/);
  assert.match(source, /name="hangman-max-wrong-guesses"/);
  assert.match(source, /\{option\} Yanlış Hakkı/);
});
test("Adam Asmaca hak seçimi ilk tahminden sonra kilitlenir ve yeni oyunda açılır", () => {
  assert.match(source, /disabled=\{hasStarted\}/);
  assert.match(source, /setHasStarted\(true\)/);
  assert.match(source, /setHasStarted\(false\)/);
});

test("6 ve 10 hak modlarinin çizim aşamaları eksiksiz ve merkez eksenlidir", () => {
  assert.match(source, /const drawingStage = Math\.min\(wrongGuesses\.length, maxWrongGuesses\)/);
  for (const stage of ["showStructure", "showBeam", "showRope", "showHead", "showBody", "showLeftArm", "showRightArm", "showLeftLeg", "showRightLeg", "showFace"]) {
    assert.match(source, new RegExp(`const ${stage} =`));
  }
  assert.match(source, /<svg viewBox="0 0 240 260"/);
  assert.match(source, /cx="164" cy="96" r="28"/);
  assert.match(source, /M164 124 V184/);
  assert.match(source, /M164 142 L124 164/);
  assert.match(source, /M164 142 L204 164/);
  assert.match(source, /M164 184 L132 224/);
  assert.match(source, /M164 184 L196 224/);
});
