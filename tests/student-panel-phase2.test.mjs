import assert from "node:assert/strict";
import test from "node:test";
import { getStudentPanelAchievements, getStudentPanelGameScores, getStudentPanelWeeklyProgress } from "../src/lib/student/studentPanelPhase2.ts";

const makeResult = (overrides = {}) => ({
  id: overrides.id ?? crypto.randomUUID(), studentId: "student-1", studentName: "Test", exerciseType: overrides.exerciseType ?? "block-reading", exerciseTitle: overrides.exerciseTitle ?? "Test", date: overrides.date ?? "2026-08-13T10:00:00.000Z", durationSeconds: overrides.durationSeconds ?? 600, correctCount: 8, wrongCount: 2, score: overrides.score ?? 50, successRate: overrides.successRate ?? 80, details: overrides.details ?? {},
});

test("weekly progress filters last 7 days and sums duration/active days", () => {
  const now = new Date("2026-08-13T12:00:00.000Z");
  const progress = getStudentPanelWeeklyProgress([
    makeResult({ id: "1", date: "2026-08-13T10:00:00.000Z", durationSeconds: 120 }),
    makeResult({ id: "2", date: "2026-08-12T10:00:00.000Z", durationSeconds: 180 }),
    makeResult({ id: "3", date: "2026-08-01T10:00:00.000Z", durationSeconds: 999 }),
  ], now);
  assert.equal(progress.completedCount, 2);
  assert.equal(progress.durationMinutes, 5);
  assert.equal(progress.activeDays, 2);
});

test("weekly progress derives reading speed and comprehension deltas", () => {
  const now = new Date("2026-08-13T12:00:00.000Z");
  const progress = getStudentPanelWeeklyProgress([
    makeResult({ id: "1", exerciseType: "reading-speed-test", date: "2026-08-08T10:00:00.000Z", details: { readingSpeedWpm: 40 } }),
    makeResult({ id: "2", exerciseType: "reading-speed-test", date: "2026-08-12T10:00:00.000Z", details: { readingSpeedWpm: 54 } }),
    makeResult({ id: "3", exerciseType: "reading-comprehension", date: "2026-08-08T10:00:00.000Z", successRate: 70 }),
    makeResult({ id: "4", exerciseType: "reading-comprehension", date: "2026-08-12T10:00:00.000Z", successRate: 76 }),
  ], now);
  assert.equal(progress.readingSpeedDelta, 14);
  assert.equal(progress.comprehensionDelta, 6);
});

test("weekly progress has zero-safe no-data fallback", () => {
  const progress = getStudentPanelWeeklyProgress([], new Date("2026-08-13T12:00:00.000Z"));
  assert.deepEqual(progress, { activeDays: 0, durationMinutes: 0, completedCount: 0, readingSpeedDelta: null, comprehensionDelta: null, trend: [0, 0, 0, 0, 0, 0, 0] });
});

test("achievements use real recent personal bests, suppress duplicates and cap at three", () => {
  const now = new Date("2026-08-13T12:00:00.000Z");
  const achievements = getStudentPanelAchievements([
    makeResult({ id: "1", exerciseType: "reading-speed-test", date: "2026-08-12T10:00:00.000Z", details: { readingSpeedWpm: 70 } }),
    makeResult({ id: "2", exerciseType: "reading-comprehension", date: "2026-08-12T11:00:00.000Z", successRate: 100 }),
    makeResult({ id: "3", exerciseType: "tatli-dukkani", date: "2026-08-12T12:00:00.000Z", score: 99 }),
    makeResult({ id: "4", exerciseType: "tatli-dukkani", date: "2026-08-12T13:00:00.000Z", score: 99 }),
  ], now);
  assert.equal(achievements.length, 3);
  assert.equal(new Set(achievements.map((item) => item.id)).size, achievements.length);
});

test("game scores return each game best score and missing-score fallback", () => {
  const scores = getStudentPanelGameScores([
    makeResult({ id: "1", exerciseType: "tatli-dukkani", score: 88, date: "2026-08-12T10:00:00.000Z" }),
    makeResult({ id: "2", exerciseType: "tatli-dukkani", score: 91, date: "2026-08-13T10:00:00.000Z" }),
  ]);
  assert.equal(scores.length, 3);
  assert.equal(scores.find((item) => item.slug === "tatli-dukkani")?.bestScore, 91);
  assert.equal(scores.find((item) => item.slug === "tatli-dukkani")?.lastPlayed, "2026-08-13T10:00:00.000Z");
  assert.equal(scores.find((item) => item.slug === "hafiza-yarisi")?.bestScore, null);
  assert.equal(scores.find((item) => item.slug === "kayip-nesne")?.href, "/egzersizler/kayip-nesne");
});

test("dashboard source renders Phase 2 sections, existing badge route and one results fetch", async () => {
  const { readFile } = await import("node:fs/promises");
  const source = await readFile("src/components/student-panel-preview/StudentPanelPreview.tsx", "utf8");
  assert.match(source, /WeeklyProgressCard/);
  assert.match(source, /AchievementsCard/);
  assert.match(source, /GameScoresCard/);
  assert.match(source, /BadgeSummary/);
  assert.match(source, /haftalık değişim/);
  assert.match(source, /ortalama anlama oranı/);
  assert.match(source, /Günlük çalışma/);
  assert.match(source, /phase2NewBadge/);
  assert.match(source, /href="\/ogrenci\/rozetlerim"/);
  assert.equal((source.match(/fetch\("\/api\/student\/results"/g) ?? []).length, 1);
});
