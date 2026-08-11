import assert from "node:assert/strict";
import test from "node:test";
import fs from "node:fs/promises";
import { getStudentExerciseRecommendations, analyzeStudentSkills } from "../src/lib/recommendations/studentExerciseRecommendations.ts";

const result = (exerciseType, successRate, index) => ({
  id: `${exerciseType}-${index}`,
  exerciseType,
  successRate,
  completedAt: new Date(Date.UTC(2026, 7, 11, 12, index)).toISOString(),
});

test("yetersiz veri kesin zayıf alan etiketi üretmez ve fallback döner", () => {
  const output = getStudentExerciseRecommendations([result("two-side-focus", 55, 1), result("two-side-focus", 58, 2)]);
  assert.equal(output.analysis[0].trend, "insufficient_data");
  assert.equal(output.recommendations.length, 0);
});

test("minimum örnek sayısının altında kalan kategori insufficient_data olarak kalır", () => {
  const output = analyzeStudentSkills([result("memory-game", 84, 1), result("memory-game", 86, 2)]);
  assert.equal(output[0].sampleCount, 2);
  assert.equal(output[0].recommendedPriority, "low");
  assert.equal(output[0].trend, "insufficient_data");
});

test("düşük performans kategorisi daha yüksek öncelik alır", () => {
  const input = [
    ...[55, 55, 55].map((score, i) => result("two-side-focus", score, i)),
    ...[85, 85, 85].map((score, i) => result("memory-game", score, i + 3)),
  ];
  const output = getStudentExerciseRecommendations(input);
  assert.equal(output.recommendations[0].categoryId, "attention");
});

test("yüksek priority low_performance, insufficient_data önerisinin önüne gelir", () => {
  const input = [
    ...[27, 27, 27].map((score, i) => result("two-side-focus", score, i)),
    result("memory-game", 0, 4),
  ];
  const output = getStudentExerciseRecommendations(input);
  assert.equal(output.recommendations[0].reasonCode, "low_performance");
  assert.equal(output.recommendations[0].categoryId, "attention");
  assert.equal(output.recommendations[1].reasonCode, "insufficient_data");
});

test("declining reason, priorityScore düşük olsa bile stable low_performance önüne gelir", () => {
  const input = [
    ...[90, 90, 80, 80, 80, 80, 80].map((score, i) => result("card-matching", score, i + 3)),
    ...[20, 20, 20].map((score, i) => result("two-side-focus", score, i)),
  ];
  const output = getStudentExerciseRecommendations(input);
  assert.equal(output.recommendations[0].reasonCode, "declining");
  assert.equal(output.recommendations[1].reasonCode, "low_performance");
});

test("trend +8 improving, -8 declining ve +2 stable hesaplanır", () => {
  const make = (type, previous, recent) => [...previous, ...recent].map((score, i) => result(type, score, i));
  assert.equal(analyzeStudentSkills(make("two-side-focus", [50, 50, 50, 50, 50], [58, 58, 58, 58, 58]))[0].trend, "improving");
  assert.equal(analyzeStudentSkills(make("card-matching", [80, 80, 80, 80, 80], [72, 72, 72, 72, 72]))[0].trend, "declining");
  assert.equal(analyzeStudentSkills(make("word-finding", [70, 70, 70, 70, 70], [72, 72, 72, 72, 72]))[0].trend, "stable");
});

test("uzun süredir çalışılmayan kategori priority skorunu artırır", () => {
  const now = new Date("2026-08-11T12:00:00.000Z");
  const recent = [0, 1, 2].map((i) => ({ ...result("two-side-focus", 70, i), completedAt: "2026-07-20T12:00:00.000Z" }));
  const practiced = [0, 1, 2].map((i) => ({ ...result("memory-game", 70, i + 3), completedAt: "2026-08-10T12:00:00.000Z" }));
  const output = getStudentExerciseRecommendations([...recent, ...practiced], now);
  assert.ok(output.recommendations.find((item) => item.categoryId === "attention").priorityScore > output.recommendations.find((item) => item.categoryId === "memory").priorityScore);
});

test("stale reason metni verilen now değerine göre deterministiktir", () => {
  const input = [0, 1, 2].map((i) => ({ ...result("two-side-focus", 85, i), completedAt: "2026-07-20T12:00:00.000Z" }));
  const output = getStudentExerciseRecommendations(input, new Date("2026-08-11T12:00:00.000Z"));
  assert.equal(output.recommendations[0].reasonCode, "needs_practice");
  assert.match(output.recommendations[0].reasonText, /22 gündür/);
});

test("en fazla üç öneri verir, kategori çeşitliliğini korur ve oyun sonucu yoksa analiz dışı kalır", () => {
  const input = [
    ...[55, 55, 55].map((score, i) => result("two-side-focus", score, i)),
    ...[60, 60, 60].map((score, i) => result("memory-game", score, i + 3)),
    ...[65, 65, 65].map((score, i) => result("eye-brain", score, i + 6)),
    ...[45, 45, 45].map((score, i) => result("hangman", score, i + 9)),
  ];
  const output = getStudentExerciseRecommendations(input);
  assert.ok(output.recommendations.length <= 3);
  assert.equal(new Set(output.recommendations.map((item) => item.categoryId)).size, output.recommendations.length);
  assert.equal(output.analysis.some((item) => item.categoryId === "memory"), true);
});

test("aynı exercise_type yakın zamanda yapılmışsa alternatif egzersizi seçer", () => {
  const input = [
    ...[55, 55, 55].map((score, i) => result("two-side-focus", score, i)),
    ...[60, 60, 60].map((score, i) => result("memory-game", score, i + 3)),
  ];
  const output = getStudentExerciseRecommendations(input);
  assert.notEqual(output.recommendations[0].exerciseSlug, "cift-tarafli-odak");
});

test("başka öğrenci kimliği enjekte edilemez ve oturumsuz istek access failure'a gider", async () => {
  const source = await fs.readFile(new URL("../src/app/api/student/recommendations/route.ts", import.meta.url), "utf8");
  assert.match(source, /const access = await verifyStudentAccess\(request\)/);
  assert.match(source, /access\.status/);
  assert.doesNotMatch(source, /studentId.*searchParams|request\.json|\.insert\(|\.update\(|\.delete\(/);
});

test("dashboard recommendation fetch'i loading/empty/error durumlarını izole eder", async () => {
  const source = await fs.readFile(new URL("../src/components/student-panel-preview/TodaysProgramTasksCard.tsx", import.meta.url), "utf8");
  assert.match(source, /status: \"loading\"/);
  assert.match(source, /recommendations\.length === 0/);
  assert.match(source, /status: \"error\"/);
  assert.match(source, /catch \(error\)/);
  assert.match(source, /<SmartRecommendationsCard[\s\S]*<section className=\{styles\.todaysProgramSection\}/);
});

test("recommendation endpoint kimliği client parametresinden değil session'dan ve service role'dan alır", async () => {
  const source = await fs.readFile(new URL("../src/app/api/student/recommendations/route.ts", import.meta.url), "utf8");
  assert.match(source, /verifyStudentAccess\(request\)/);
  assert.match(source, /getSupabaseServiceRoleClient\(\)/);
  assert.match(source, /eq\("student_id", access\.studentId\)/);
  assert.doesNotMatch(source, /NEXT_PUBLIC_SUPABASE_ANON_KEY|createClient|request\.nextUrl\.searchParams\.get\(['"]student/);
});
