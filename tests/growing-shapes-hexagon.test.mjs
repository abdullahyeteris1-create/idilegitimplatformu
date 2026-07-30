import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";
import {
  advanceGrowingShapesMotor,
  createGrowingShapesMotor,
  getGrowingShapesJumpDurationMs,
  getGrowingShapesResponsiveMetrics,
} from "../src/lib/exercise-engine/growingShapes.ts";

const read = (path) => fs.readFileSync(path, "utf8");
const client = read("src/app/egzersizler/buyuyen-sekiller-altigen/GrowingShapesHexagonExerciseClient.tsx");
const page = read("src/app/egzersizler/buyuyen-sekiller-altigen/page.tsx");
const migration = read("supabase/migrations/20260730140000_add_buyuyen_sekiller_altigen_to_exercise_whitelist.sql");

test("growing shapes route and result identity are integrated", () => {
  assert.match(page, /buyuyen-sekiller-altigen/);
  assert.match(client, /growing-shapes-hexagon/);
  assert.match(client, /Büyüyen Şekiller/);
  assert.match(client, /useEducationProgramTaskCompletion\(educationProgramLaunch\?\.taskId, EXERCISE_TYPE\)/);
});

test("animation settings are applied and lifecycle cleanup is explicit", () => {
  assert.match(client, /advanceGrowingShapesMotor\(/);
  assert.match(client, /jumpDurationMs, jumpEndDurationMs/);
  assert.match(client, /cancelAnimationFrame/);
  assert.match(client, /closeAudio/);
  assert.match(client, /window\.addEventListener\("resize"/);
  assert.match(client, /AudioContext/);
  assert.match(client, /closeAudio/);
});

test("migration preserves the RPC contract and adds only the new slug", () => {
  assert.match(migration, /create or replace function public\.assign_education_program_template_v1/);
  assert.match(migration, /security definer/);
  assert.match(migration, /set search_path = public, pg_temp/);
  assert.match(migration, /'buyuyen-sekiller-altigen'/);
  assert.match(migration, /grant execute on function public\.assign_education_program_template_v1\(uuid, uuid, text, text, text, text\) to service_role/);
  assert.equal(migration.includes("13-nokta-emoji-takip"), true);
});

test("the new migration is not executed by the test suite", () => {
  assert.equal(migration.includes("supabase db push"), false);
});

const motorOptions = {
  minRadius: 10,
  maxRadius: 50,
  stepSize: 10,
  speedMode: "fixed",
  jumpDurationMs: 500,
  jumpEndDurationMs: 100,
};

test("fixed speed creates one new layer only at each jump interval", () => {
  let motor = createGrowingShapesMotor(motorOptions);
  let result = advanceGrowingShapesMotor(motor, 0, 60_000, motorOptions);
  motor = result.state;
  assert.equal(result.stepsCreated, 1);
  result = advanceGrowingShapesMotor(motor, 499, 60_000, motorOptions);
  assert.equal(result.stepsCreated, 0);
  result = advanceGrowingShapesMotor(motor, 500, 60_000, motorOptions);
  assert.equal(result.stepsCreated, 1);
  assert.equal(result.state.shapesDisplayed, 2);
});

test("variable speed interpolates from start to end without crossing the end interval", () => {
  assert.equal(getGrowingShapesJumpDurationMs("variable", 0, 60_000, 500, 100), 500);
  assert.equal(getGrowingShapesJumpDurationMs("variable", 60_000, 60_000, 500, 100), 100);
  assert.ok(getGrowingShapesJumpDurationMs("variable", 30_000, 60_000, 500, 100) >= 100);
  assert.equal(getGrowingShapesJumpDurationMs("fixed", 30_000, 60_000, 500, 100), 500);
});

test("reaching the outer radius starts a new cycle and clears prior layers", () => {
  let motor = createGrowingShapesMotor(motorOptions);
  for (const time of [0, 500, 1000, 1500, 2000, 2500]) {
    motor = advanceGrowingShapesMotor(motor, time, 60_000, motorOptions).state;
  }
  assert.equal(motor.cycleIndex, 1);
  assert.deepEqual(motor.layers, [20, 30]);
  assert.equal(motor.shapesDisplayed, 6);
});

test("responsive metrics use the short canvas side and DPR-independent geometry", () => {
  const metrics = getGrowingShapesResponsiveMetrics(1200, 600);
  assert.equal(metrics.minRadius, 30);
  assert.equal(metrics.maxRadius, 252);
  assert.ok(metrics.stepSize > 0);
});

test("client uses the step motor rather than frame-count or total-duration radius growth", () => {
  assert.match(client, /advanceGrowingShapesMotor\(/);
  assert.match(client, /getGrowingShapesResponsiveMetrics\(/);
  assert.doesNotMatch(client, /Math\.floor\(currentTime\)/);
  assert.doesNotMatch(client, /currentTime \/ finalDurationSeconds/);
  assert.match(client, /cancelAnimationFrame/);
  assert.match(client, /clearMode === "with-clearing"/);
});

test("the reference behavior uses outline-only hexagons inside a normal card", () => {
  const drawSource = client.slice(client.indexOf("function drawHexagon"), client.indexOf("export function GrowingShapesHexagonExerciseClient"));
  assert.doesNotMatch(drawSource, /ctx\.fill\(/);
  assert.match(drawSource, /ctx\.stroke\(/);
  assert.doesNotMatch(client, /h-screen/);
  assert.doesNotMatch(client, /w-full h-screen/);
  assert.match(client, /aspect-\[4\/3\]/);
  assert.match(client, /ResizeObserver/);
});

test("controls and settings remain in the same card across phases", () => {
  assert.match(client, /const settingControls/);
  assert.match(client, /settingsLocked/);
  assert.match(client, /phase === "running"/);
  assert.match(client, /phase === "paused"/);
  assert.match(client, /Devam Et/);
  assert.match(client, /Tekrar Başlat/);
  assert.doesNotMatch(client, /<FullscreenExerciseShell/);
});

test("settings use a compact responsive eight-cell layout", () => {
  assert.match(client, /grid-cols-1/);
  assert.match(client, /sm:grid-cols-2/);
  assert.match(client, /md:grid-cols-4/);
  assert.match(client, /xl:grid-cols-\[1\.1fr_1fr_1fr_1\.1fr_1fr_0\.8fr_0\.9fr_0\.75fr\]/);
  assert.match(client, /min-w-0/);
  assert.match(client, /SETTINGS_LABEL_CLASS/);
  assert.match(client, /SETTINGS_SELECT_CLASS/);
  assert.match(client, /h-11 w-full min-w-0 whitespace-nowrap/);
  assert.match(client, /px-3 pr-10/);
  assert.match(client, /htmlFor="growing-shapes-duration"/);
  assert.match(client, /id="growing-shapes-duration"/);
  assert.match(client, /htmlFor="growing-shapes-metronome"/);
  assert.match(client, /id="growing-shapes-metronome"/);
  assert.match(client, /Sıçrama Bitişi/);
  assert.doesNotMatch(client, /Sıçrama Süresi Bitiş/);
  assert.doesNotMatch(client, /Değişken hızda kullanılır/);
  assert.match(client, /disabled=\{settingsLocked \|\| speedMode === "fixed"\}/);
});

test("control buttons keep readable alignment and reset sizing", () => {
  assert.match(client, /CONTROL_BUTTON_BASE_CLASS/);
  assert.match(client, /inline-flex min-h-11 items-center justify-center whitespace-nowrap/);
  assert.match(client, /min-w-\[150px\]/);
  assert.match(client, /sm:grid-cols-\[minmax\(0,1fr\)_minmax\(150px,220px\)\]/);
});
