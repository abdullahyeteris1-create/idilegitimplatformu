import assert from "node:assert/strict";
import { test } from "node:test";
import {
  chooseEmoji,
  DURATION_OPTIONS,
  EMOJI_OPTIONS,
  getNextPositionIndex,
  getPatternSequence,
  SPEED_OPTIONS,
  THIRTEEN_POINT_POSITIONS,
} from "../src/lib/exercise-engine/thirteenPointEmojiTracking.ts";
import fs from "node:fs/promises";

test("13 benzersiz takip konumu tanımlıdır", () => {
  assert.equal(THIRTEEN_POINT_POSITIONS.length, 13);
  assert.equal(new Set(THIRTEEN_POINT_POSITIONS.map((position) => position.id)).size, 13);
  assert.equal(THIRTEEN_POINT_POSITIONS.filter((position) => position.group === "center").length, 1);
  assert.equal(THIRTEEN_POINT_POSITIONS.filter((position) => position.group === "inner").length, 4);
  assert.equal(THIRTEEN_POINT_POSITIONS.filter((position) => position.group === "outer").length, 4);
  assert.equal(THIRTEEN_POINT_POSITIONS.filter((position) => position.group === "edge").length, 4);
});

test("sıralı ve ters sıralı pattern deterministiktir", () => {
  assert.deepEqual(getPatternSequence("sequential").map((item) => item.id), THIRTEEN_POINT_POSITIONS.map((item) => item.id));
  assert.deepEqual(getPatternSequence("reverse").map((item) => item.id), [...THIRTEEN_POINT_POSITIONS].reverse().map((item) => item.id));
});

test("rastgele pattern aynı konumu art arda seçmez", () => {
  const next = getNextPositionIndex("random", 4, () => 0);
  assert.notEqual(next, 4);
  assert.notEqual(next, 4 % THIRTEEN_POINT_POSITIONS.length);
});

test("merkezden dışa ve dıştan merkeze dizileri beklenen merkez davranışını taşır", () => {
  const centerOut = getPatternSequence("center-out");
  const outerCenter = getPatternSequence("outer-center");
  assert.equal(centerOut[0].id, "center");
  assert.equal(centerOut.length, 13);
  assert.equal(outerCenter[1].id, "center");
  assert.equal(outerCenter[3].id, "center");
});

test("sabit emoji modu seçimi değiştirmez", () => {
  assert.equal(chooseEmoji("fixed", "🐱", "⭐", () => 0), "🐱");
});

test("rastgele emoji modu emoji havuzundan seçer ve mümkünse öncekiyi tekrarlamaz", () => {
  const next = chooseEmoji("random", "⭐", "⭐", () => 0);
  assert.ok(EMOJI_OPTIONS.some((option) => option.value === next));
  assert.notEqual(next, "⭐");
});

test("hız ve süre seçenekleri istenen aralığı taşır", () => {
  assert.deepEqual([...SPEED_OPTIONS], [5000, 3000, 2000, 1500, 1000, 700, 450, 300]);
  assert.deepEqual([...DURATION_OPTIONS], [30, 60, 120, 180, 300]);
});

test("katalog, route ve migration yeni egzersizi içerir", async () => {
  const [assignmentCatalog, educationCatalog, routeCatalog, migration] = await Promise.all([
    fs.readFile("src/lib/assignments/exerciseCatalog.ts", "utf8"),
    fs.readFile("src/lib/education-programs/exerciseCatalog.ts", "utf8"),
    fs.readFile("src/lib/education-programs/exerciseRouteCatalog.ts", "utf8"),
    fs.readFile("supabase/migrations/20260730130000_add_13_nokta_emoji_takip_to_exercise_whitelist.sql", "utf8"),
  ]);
  for (const source of [assignmentCatalog, educationCatalog, routeCatalog, migration]) {
    assert.match(source, /13-nokta-emoji-takip/);
  }
  assert.match(assignmentCatalog, /thirteen-point-emoji-tracking/);
  assert.match(educationCatalog, /thirteen-point-emoji-tracking/);
  assert.match(migration, /create or replace function public\.assign_education_program_template_v1/);
});

test("eski whitelist migrationları değişmeden kalır", async () => {
  const first = await fs.readFile("supabase/migrations/20260729220000_add_cift_tarafli_odak_to_exercise_whitelist.sql", "utf8");
  const second = await fs.readFile("supabase/migrations/20260729230000_add_goz_kaslari_to_exercise_whitelist.sql", "utf8");
  assert.match(first, /cift-tarafli-odak/);
  assert.match(second, /goz-kaslari/);
  assert.doesNotMatch(first, /13-nokta-emoji-takip/);
  assert.doesNotMatch(second, /13-nokta-emoji-takip/);
});

test("ana eylem butonu tema degiskenleriyle gorunur ve tamamlaninca yeniden baslatir", async () => {
  const client = await fs.readFile("src/app/egzersizler/13-nokta-emoji-takip/ThirteenPointEmojiTrackingClient.tsx", "utf8");
  const theme = await fs.readFile("src/components/exercises/thirteen-point-emoji-theme.module.css", "utf8");
  assert.match(client, /styles\.primaryButton/);
  assert.match(client, /status === "completed" \? "Tekrar Başlat"/);
  assert.doesNotMatch(client, /bg-\[var\(--idil-primary\)\]/);
  assert.match(theme, /background: var\(--idil-strong\)/);
  assert.match(theme, /color: var\(--idil-strong-contrast\)/);
});

test("production'da reddedilen 60 saniyelik payload artik route dogrulamasindan gecmektedir", async () => {
  const payload = {
    exerciseType: "thirteen-point-emoji-tracking",
    exerciseTitle: "13 Nokta Emoji Takip Egzersizi",
    score: 85,
    successRate: 100,
    correctCount: 85,
    wrongCount: 0,
    durationSeconds: 60,
    completedAt: "2025-08-05T10:00:00.000Z",
    submissionKey: "submission-production-regression",
    assignmentItemId: null,
    details: {
      durationSeconds: 60,
      speed: 700,
      jumpCount: 85,
      emojiMode: "fixed",
      emoji: "⭐",
      movementPattern: "sequential",
      soundEnabled: false,
    },
  };

  const route = await fs.readFile("src/app/api/student/results/route.ts", "utf8");
  const forbiddenStart = route.indexOf("const FORBIDDEN_DETAIL_KEYS");
  const forbiddenEnd = route.indexOf("]);", forbiddenStart);
  const forbiddenKeys = route.slice(forbiddenStart, forbiddenEnd);
  assert.doesNotMatch(forbiddenKeys, /"durationseconds"/);

  const schemaStart = route.indexOf('"thirteen-point-emoji-tracking": {');
  const schemaEnd = route.indexOf("\n  },", schemaStart);
  const schema = route.slice(schemaStart, schemaEnd);
  const expectedRules = {
    durationSeconds: /durationSeconds: \{ type: "integer", min: 1, max: MAX_DURATION_SECONDS \}/,
    speed: /speed: \{ type: "integer", min: 300, max: 5_000 \}/,
    jumpCount: /jumpCount: \{ type: "integer", min: 0, max: 100_000 \}/,
    emojiMode: /emojiMode: \{ type: "string", values: \["fixed", "random"\] \}/,
    emoji: /emoji: \{ type: "string", maxLength: 8 \}/,
    movementPattern: /movementPattern: \{ type: "string", values: \["sequential", "reverse", "random", "center-out", "outer-center"\] \}/,
    soundEnabled: /soundEnabled: \{ type: "boolean" \}/,
  };
  assert.deepEqual(Object.keys(payload.details), Object.keys(expectedRules));
  for (const [key, rule] of Object.entries(expectedRules)) assert.match(schema, rule, `${key} kurali eslesmeli`);
  assert.equal(payload.durationSeconds, 60);
  assert.equal(payload.details.durationSeconds, 60);
  assert.equal(typeof payload.details.speed, "number");
  assert.equal(typeof payload.details.jumpCount, "number");
  assert.equal(typeof payload.details.emojiMode, "string");
  assert.equal(typeof payload.details.emoji, "string");
  assert.equal(typeof payload.details.movementPattern, "string");
  assert.equal(typeof payload.details.soundEnabled, "boolean");
});
