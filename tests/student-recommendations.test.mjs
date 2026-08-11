import assert from "node:assert/strict";
import test from "node:test";
import fs from "node:fs/promises";
import { getStudentExerciseRecommendations, analyzeStudentSkills, AKIL_VE_ZEKA_OYUNLARI_EXERCISE_SLUGS } from "../src/lib/recommendations/studentExerciseRecommendations.ts";
import { ASSIGNMENT_EXERCISE_CATALOG } from "../src/lib/assignments/exerciseCatalog.ts";

const result = (exerciseType, successRate, index) => ({
  id: `${exerciseType}-${index}`,
  exerciseType,
  successRate,
  completedAt: new Date(Date.UTC(2026, 7, 11, 12, index)).toISOString(),
});

test("sample 2 ve yuksek skor strong area uretmez", () => {
  const output = getStudentExerciseRecommendations([
    result("memory-game", 95, 1),
    result("memory-game", 95, 2),
  ]);
  assert.deepEqual(output.summary.strengths, []);
  assert.equal(output.summary.strongestArea, null);
});

test("sample 4 ve score 88 strong area uretir", () => {
  const output = getStudentExerciseRecommendations([1, 2, 3, 4].map((i) => result("memory-game", 88, i)));
  assert.deepEqual(output.summary.strengths.map((area) => area.categoryId), ["memory"]);
  assert.deepEqual(output.summary.strongestArea, { categoryId: "memory", categoryTitle: "Hafıza", score: 88 });
});

test("iki strong kategori score DESC ve deterministik siralanir", () => {
  const output = getStudentExerciseRecommendations([
    ...[84, 84, 84].map((score, i) => result("eye-brain", score, i)),
    ...[92, 92, 92].map((score, i) => result("memory-game", score, i + 3)),
  ]);
  assert.deepEqual(output.summary.strengths.map((area) => area.categoryId), ["memory", "eye"]);
});

test("dusuk performans yeterli sample ile development area olur", () => {
  const output = getStudentExerciseRecommendations([1, 2, 3].map((i) => result("two-side-focus", 54, i)));
  assert.deepEqual(output.summary.developmentAreas.map((area) => area.categoryId), ["attention"]);
  assert.equal(output.summary.developmentAreas[0].score, 54);
});

test("improving trend +8 improvingAreas icinde trendDelta olarak doner", () => {
  const input = [
    ...[50, 50, 50, 50, 50].map((score, i) => result("two-side-focus", score, i)),
    ...[58, 58, 58, 58, 58].map((score, i) => result("two-side-focus", score, i + 5)),
  ];
  const output = getStudentExerciseRecommendations(input);
  assert.deepEqual(output.summary.improvingAreas.map((area) => ({ categoryId: area.categoryId, trendDelta: area.trendDelta })), [{ categoryId: "attention", trendDelta: 8 }]);
});

test("stable trend improvingAreas icinde gorunmez", () => {
  const input = [
    ...[70, 70, 70, 70, 70].map((score, i) => result("two-side-focus", score, i)),
    ...[72, 72, 72, 72, 72].map((score, i) => result("two-side-focus", score, i + 5)),
  ];
  assert.deepEqual(getStudentExerciseRecommendations(input).summary.improvingAreas, []);
});

test("declining trend improvingAreas icinde gorunmez", () => {
  const input = [
    ...[80, 80, 80, 80, 80].map((score, i) => result("two-side-focus", score, i)),
    ...[72, 72, 72, 72, 72].map((score, i) => result("two-side-focus", score, i + 5)),
  ];
  assert.deepEqual(getStudentExerciseRecommendations(input).summary.improvingAreas, []);
});

test("strong ve development alanlari coach summary uretir", () => {
  const output = getStudentExerciseRecommendations([
    ...[88, 88, 88].map((score, i) => result("memory-game", score, i)),
    ...[54, 54, 54].map((score, i) => result("two-side-focus", score, i + 3)),
  ]);
  assert.equal(output.summary.coachSummary, "Hafıza alanındaki güçlü performansını korurken, Dikkat çalışmalarına biraz daha ağırlık verebilirsin.");
});

test("Akil ve Zeka Oyunu dusuk basariyla bile onerilmez", () => {
  const input = [
    ...[10, 10, 10].map((score, i) => result("word-race", score, i)),
    ...[60, 60, 60].map((score, i) => result("two-side-focus", score, i + 3)),
  ];
  const output = getStudentExerciseRecommendations(input);
  assert.equal(output.analysis.some((item) => item.averageSuccessRate === 10), false);
  assert.equal(output.recommendations.some((item) => item.exerciseSlug === "kelime-yarisi"), false);
});

test("word-games grubundaki katalog oyunlarinin hicbiri recommendation analizine girmez", () => {
  assert.deepEqual(AKIL_VE_ZEKA_OYUNLARI_EXERCISE_SLUGS, [
    "kelime-tahmin",
    "adam-asmaca",
    "gorsel-puzzle",
    "dikkat-labirenti",
    "kelime-yarisi",
    "hafiza-yarisi",
  ]);
  const gameTypes = ASSIGNMENT_EXERCISE_CATALOG
    .filter((exercise) => AKIL_VE_ZEKA_OYUNLARI_EXERCISE_SLUGS.includes(exercise.slug))
    .map((exercise) => exercise.resultExerciseType);
  const output = analyzeStudentSkills(gameTypes.flatMap((type) => [
    result(type, 10, 1),
    result(type, 10, 2),
    result(type, 10, 3),
  ]));
  assert.deepEqual(output, []);
});

test("Akil ve Zeka Oyunu sonuclari kategori ortalama ve trend hesabina girmez", () => {
  const input = [
    ...[95, 95, 95, 95, 95, 95].map((score, i) => result("word-race", score, i)),
    ...[60, 60, 60].map((score, i) => result("two-side-focus", score, i + 6)),
  ];
  const output = analyzeStudentSkills(input);
  const attention = output.find((item) => item.categoryId === "attention");
  assert.equal(attention?.sampleCount, 3);
  assert.equal(attention?.averageSuccessRate, 60);
  assert.equal(attention?.trend, "stable");
});

test("oyunlar insufficient_data ve balanced_practice fallback onerilerinde cikmaz", () => {
  const insufficient = getStudentExerciseRecommendations([
    result("word-race", 50, 1),
    result("word-race", 50, 2),
  ]);
  assert.equal(insufficient.recommendations.some((item) => item.exerciseSlug === "kelime-yarisi"), false);

  const balanced = getStudentExerciseRecommendations([
    ...[80, 80, 80].map((score, i) => result("word-race", score, i)),
    ...[80, 80, 80].map((score, i) => result("two-side-focus", score, i + 3)),
  ]);
  assert.equal(balanced.recommendations.some((item) => item.exerciseSlug === "kelime-yarisi"), false);
  assert.equal(balanced.recommendations.some((item) => item.reasonCode === "balanced_practice"), true);
});

test("yalnizca Akil ve Zeka Oyunu sonucu olan ogrenci zayif alan olarak degerlendirilmez", () => {
  const output = getStudentExerciseRecommendations([
    ...[10, 10, 10, 10].map((score, i) => result("word-race", score, i)),
  ]);
  assert.equal(output.analysis.length, 0);
  assert.equal(output.recommendations.length, 0);
  assert.deepEqual(output.summary.developmentAreas, []);
  assert.deepEqual(output.summary.trends, []);
});

test("normal gelisim egzersizleri onerilmeye devam eder ve limit diversity korunur", () => {
  const input = [
    ...[45, 45, 45].map((score, i) => result("two-side-focus", score, i)),
    ...[55, 55, 55].map((score, i) => result("block-reading", score, i + 3)),
    ...[65, 65, 65].map((score, i) => result("eye-brain", score, i + 6)),
    ...[5, 5, 5].map((score, i) => result("word-race", score, i + 9)),
  ];
  const output = getStudentExerciseRecommendations(input);
  assert.ok(output.recommendations.length > 0);
  assert.ok(output.recommendations.length <= 3);
  assert.equal(new Set(output.recommendations.map((item) => item.categoryId)).size, output.recommendations.length);
  assert.equal(output.recommendations.some((item) => item.exerciseSlug === "kelime-yarisi"), false);
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
  assert.match(source, /RecommendationInsights/);
});

test("recommendation endpoint kimliği client parametresinden değil session'dan ve service role'dan alır", async () => {
  const source = await fs.readFile(new URL("../src/app/api/student/recommendations/route.ts", import.meta.url), "utf8");
  assert.match(source, /verifyStudentAccess\(request\)/);
  assert.match(source, /getSupabaseServiceRoleClient\(\)/);
  assert.match(source, /eq\("student_id", access\.studentId\)/);
  assert.doesNotMatch(source, /NEXT_PUBLIC_SUPABASE_ANON_KEY|createClient|request\.nextUrl\.searchParams\.get\(['"]student/);
});

test("recommendation response summary alanlarini raw result veya PII olmadan dondurur", async () => {
  const source = await fs.readFile(new URL("../src/app/api/student/recommendations/route.ts", import.meta.url), "utf8");
  assert.match(source, /\.\.\.result\.summary/);
  assert.doesNotMatch(source, /email|phone|username|full_name/i);
  assert.doesNotMatch(source, /success_rate.*student_id|student_id.*success_rate/);
});

test("coach mesajÄ± improving alanÄ± iÃ§in progress tonunu kullanÄ±r", () => {
  const input = [
    ...[50, 50, 50, 50, 50].map((score, i) => result("two-side-focus", score, i)),
    ...[58, 58, 58, 58, 58].map((score, i) => result("two-side-focus", score, i + 5)),
  ];
  const coach = getStudentExerciseRecommendations(input).summary.coachMessage;
  assert.equal(coach.tone, "progress");
  assert.equal(coach.highlightedCategory, "Dikkat");
});

test("coach mesajÄ± strong ve development iÃ§in balanced tonunu kullanÄ±r", () => {
  const coach = getStudentExerciseRecommendations([
    ...[88, 88, 88].map((score, i) => result("memory-game", score, i)),
    ...[54, 54, 54].map((score, i) => result("two-side-focus", score, i + 3)),
  ]).summary.coachMessage;
  assert.equal(coach.tone, "balanced");
  assert.equal(coach.highlightedCategory, "Dikkat");
});

test("coach mesajÄ± development iÃ§in focus, strong iÃ§in encouraging tonunu kullanÄ±r", () => {
  const development = getStudentExerciseRecommendations([1, 2, 3].map((i) => result("two-side-focus", 54, i))).summary.coachMessage;
  const strong = getStudentExerciseRecommendations([1, 2, 3].map((i) => result("memory-game", 88, i))).summary.coachMessage;
  assert.equal(development.tone, "focus");
  assert.equal(strong.tone, "encouraging");
});

test("coach mesajÄ± yetersiz veride getting_started olur", () => {
  const coach = getStudentExerciseRecommendations([result("memory-game", 88, 1), result("memory-game", 88, 2)]).summary.coachMessage;
  assert.equal(coach.tone, "getting_started");
  assert.equal(coach.highlightedCategory, undefined);
  assert.equal(coach.recommendedExerciseSlug, undefined);
});

test("declining coach mesajÄ± yapÄ±cÄ± ve deterministiktir", () => {
  const coach = getStudentExerciseRecommendations([
    ...[90, 90, 90, 90, 90].map((score, i) => result("two-side-focus", score, i)),
    ...[80, 80, 80, 80, 80].map((score, i) => result("two-side-focus", score, i + 5)),
  ]).summary.coachMessage;
  assert.equal(coach.tone, "focus");
  assert.match(coach.message, /dalgalan/);
  assert.doesNotMatch(coach.message, /baÅŸarÄ±sÄ±z|zayÄ±f|kÃ¶tÃ¼|geridesin|yetersizsin/i);
});

test("coach CTA'sÄ± recommendation listesindeki slug'dan gelir", () => {
  const output = getStudentExerciseRecommendations([1, 2, 3].map((i) => result("two-side-focus", 54, i)));
  assert.ok(output.recommendations.some((item) => item.exerciseSlug === output.summary.coachMessage.recommendedExerciseSlug));
});

test("word-games coach mesajÄ±nda oyun veya PII bulunmaz", () => {
  const output = getStudentExerciseRecommendations([1, 2, 3, 4].map((i) => result("word-race", 10, i)));
  const serialized = JSON.stringify(output.summary.coachMessage);
  assert.equal(output.summary.coachMessage.tone, "getting_started");
  assert.doesNotMatch(serialized, /word-games|kelime-yarisi|AkÄ±l|Zeka|email|phone|username|student/i);
});

test("coach mesajÄ± aynÄ± girdide aynÄ± ve makul uzunluktadÄ±r", () => {
  const input = [1, 2, 3].map((i) => result("memory-game", 88, i));
  const first = getStudentExerciseRecommendations(input).summary.coachMessage;
  const second = getStudentExerciseRecommendations(input).summary.coachMessage;
  assert.deepEqual(first, second);
  assert.ok(first.message.length >= 100 && first.message.length <= 220);
});
