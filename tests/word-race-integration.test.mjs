import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";
import test from "node:test";

/**
 * Kelime Yarisi platforma REACT'E CEVRILMEDEN entegre edildi: prototip HTML'i
 * bayt bayt korunur, egzersiz sayfasinin iframe'inde calisir ve bittiginde
 * postMessage ile sonucu platforma bildirir. Bu testler hem entegrasyonun
 * (katalog/route/sonuc/XP) tamamligini hem de prototipin bozulmadigini
 * dogrular.
 */

const ROOT = process.cwd();
const SOURCE_PROTOTYPE = path.join(ROOT, "prototypes", "kelime-yarisi.html");
const ASSET = path.join(ROOT, "src", "exercise-assets", "kelime-yarisi.html");

const read = (relativePath) => readFile(path.join(ROOT, relativePath), "utf8");

const {
  injectWordRaceResultBridge,
  readWordRaceGameHtml,
  readWordRaceHtml,
} = await import("../src/lib/word-race/wordRaceAsset.ts");

const { WORD_RACE_BRIDGE_MESSAGE_SOURCE } = await import(
  "../src/lib/word-race/wordRaceBridge.ts"
);

const { EDUCATION_PROGRAM_EXERCISE_CATALOG } = await import(
  "../src/lib/education-programs/exerciseCatalog.ts"
);
const { resolveEducationProgramExerciseRoute } = await import(
  "../src/lib/education-programs/exerciseRouteCatalog.ts"
);
const { ASSIGNMENT_EXERCISE_CATALOG } = await import(
  "../src/lib/assignments/exerciseCatalog.ts"
);
const { getAssignmentExerciseDefinition } = await import(
  "../src/lib/assignments/assignmentExerciseCatalog.ts"
);
const { exerciseTypeAwardsXp } = await import("../src/lib/xp/xpPolicy.ts");

/* ---------------- prototip butunlugu ---------------- */

test("egzersiz asset'i kaynak prototiple birebir ayni", async () => {
  const normalize = (value) => value.replace(/\r\n/g, "\n");

  assert.equal(normalize(await readFile(ASSET, "utf8")), normalize(await readFile(SOURCE_PROTOTYPE, "utf8")));
});

test("koprü enjeksiyonu SADECE ekleme yapar, hicbir satiri silmez", async () => {
  const raw = await readWordRaceHtml();
  const bridged = injectWordRaceResultBridge(raw);

  assert.ok(bridged.length > raw.length);
  assert.ok(bridged.includes(WORD_RACE_BRIDGE_MESSAGE_SOURCE));

  // Enjekte edilen satirlar cikarilinca geriye TAM OLARAK kaynak prototip kalir.
  const restored = bridged
    .split("\n")
    .filter((line) => !line.includes("__idilWordRace") && !line.includes("__idilStart") && !line.includes("__idilError"))
    .join("\n");
  const bridgeBlock = restored.indexOf(WORD_RACE_BRIDGE_MESSAGE_SOURCE);

  assert.ok(bridgeBlock >= 0, "koprü blogu bulunmali");
  // Oyunun kendi kodundan hicbir sey kaybolmadi: kaynak dosyadaki her satir
  // koprü eklenmis ciktida da var.
  for (const line of raw.split("\n")) {
    assert.ok(bridged.includes(line), `kaynak satir kayboldu: ${line.slice(0, 60)}`);
  }
});

test("kanca noktalari prototipte hala benzersiz (prototip degisirse yukleme patlar)", async () => {
  const raw = await readWordRaceHtml();

  for (const anchor of [
    "  function startGame(level, { preserveTotals = false } = {}) {",
    '    el("veilOver").classList.remove("hidden");',
  ]) {
    assert.equal(raw.split(anchor).length - 1, 1, `anchor benzersiz olmali: ${anchor}`);
  }

  // Anchor bulunamazsa sessizce degil, hata firlatarak bozulmali.
  assert.throws(() => injectWordRaceResultBridge("<html></html>"), /kanca noktasi/);
});

test("oyun HTML'i postMessage koprusunu ve gerekli alanlari icerir", async () => {
  const html = await readWordRaceGameHtml();

  assert.match(html, /window\.parent\.postMessage/);
  for (const field of [
    "score",
    "correctCount",
    "wrongCount",
    "durationSeconds",
    "reachedLevel",
    "lanes",
    "reachedSpeedMs",
    "carId",
    "completionReason",
    "maxWrong",
  ]) {
    assert.ok(html.includes(`${field}:`), `koprü payload'inda ${field} olmali`);
  }
});

/* ---------------- katalog / route entegrasyonu ---------------- */

test("Egitim Programi katalogunda ve route allow-list'inde kayitli", () => {
  const entry = EDUCATION_PROGRAM_EXERCISE_CATALOG.find((item) => item.slug === "kelime-yarisi");

  assert.ok(entry, "education-program katalogunda olmali");
  assert.equal(entry.resultExerciseType, "word-race");
  assert.notEqual(entry.isEducationProgramSelectable, false, "secilebilir olmali");

  // Allow-list guvenlik siniri: slug URL'e enterpole edilmez, buradan cozulur.
  assert.equal(resolveEducationProgramExerciseRoute("kelime-yarisi"), "/egzersizler/kelime-yarisi");
});

test("Assignment kataloglarinda odeve atanabilir ve ogrenciye gorunur", () => {
  const entry = ASSIGNMENT_EXERCISE_CATALOG.find((item) => item.slug === "kelime-yarisi");

  assert.ok(entry, "assignment katalogunda olmali");
  assert.equal(entry.route, "/egzersizler/kelime-yarisi");
  assert.equal(entry.resultExerciseType, "word-race");
  assert.equal(entry.assignmentEnabled, true);
  assert.notEqual(entry.isStudentCatalogVisible, false, "ogrenci katalogunda gorunmeli");

  const allowlist = getAssignmentExerciseDefinition("kelime-yarisi");
  assert.ok(allowlist);
  assert.equal(allowlist.integrationStatus, "ready");
  assert.equal(allowlist.assignmentEligible, true);
});

test("ogrenci egzersiz merkezinde ve 'Akil ve Zeka Oyunlari' kategorisinde listelenir", async () => {
  const center = await read("src/app/egzersizler/ExercisesCenterClient.tsx");
  assert.match(center, /\/egzersizler\/kelime-yarisi/);

  // Kart "Akil ve Zeka Oyunlari" grubunun icinde olmali, Odaklanma'da degil.
  const brainGroupStart = center.indexOf('title: "Akıl ve Zeka Oyunları"');
  const nextGroupStart = center.indexOf('title: "Metin Çalışmaları"');
  assert.ok(brainGroupStart >= 0 && nextGroupStart > brainGroupStart);
  assert.ok(
    center.slice(brainGroupStart, nextGroupStart).includes("/egzersizler/kelime-yarisi"),
    "kart 'Akil ve Zeka Oyunlari' grubunda olmali",
  );

  const groups = await read("src/components/exercises-preview/exercisePreviewGroups.ts");
  assert.match(groups, /"word-games": \[[^\]]*"kelime-yarisi"/);
  assert.doesNotMatch(groups, /focus: \[[^\]]*"kelime-yarisi"/);
});

/* ---------------- sonuc / XP ---------------- */

test("sonuc turu tanimli ve XP kazandirir", async () => {
  const types = await read("src/lib/results/types.ts");
  assert.match(types, /\| "word-race"/);

  assert.equal(exerciseTypeAwardsXp("word-race"), true);
});

test("results API detay semasi koprünün gonderdigi TUM alanlari kabul eder", async () => {
  const route = await read("src/app/api/student/results/route.ts");
  const schemaBlock = route.slice(route.indexOf('"word-race": {'));

  // Sema bilinmeyen anahtari reddettigi icin koprü ile bire bir ortusmeli.
  for (const field of [
    "category",
    "reachedLevel",
    "lanes",
    "reachedSpeedMs",
    "carId",
    "completionReason",
    "maxWrong",
  ]) {
    assert.ok(schemaBlock.includes(`${field}:`), `sema ${field} icermeli`);
  }

  // Prototipte gercekten var olan araclar ve 10 yanlis siniri.
  assert.match(schemaBlock, /"spor", "viper", "taksi", "polis", "minivan"/);
  assert.match(schemaBlock, /maxWrong: \{ type: "integer", min: 10, max: 10 \}/);
});

test("egzersiz istatistik/sonuc ekranlarinda adi ve route'u cozumleniyor", async () => {
  for (const [file, pattern] of [
    ["src/lib/results/generalStatistics.ts", /"word-race": \{ categoryId: "word-games"/],
    ["src/components/results/ResultSummaryClient.tsx", /"word-race": "Kelime Yarışı"/],
    ["src/components/dashboard/StudentDashboardClient.tsx", /"word-race": "\/egzersizler\/kelime-yarisi"/],
    ["src/components/student-panel-preview/StudentPanelPreview.tsx", /"word-race": "\/egzersizler\/kelime-yarisi"/],
    ["src/app/api/ai/student-analysis/route.ts", /"word-race": "Kelime Yarışı"/],
  ]) {
    assert.match(await read(file), pattern, file);
  }
});

/* ---------------- egzersiz sayfasi ---------------- */

test("egzersiz sayfasi launch dogrulamasini yapar ve guvenli sonuc akisini kullanir", async () => {
  const page = await read("src/app/egzersizler/kelime-yarisi/page.tsx");
  assert.match(page, /resolveEducationProgramExerciseLaunch/);
  assert.match(page, /"kelime-yarisi"/);

  const client = await read("src/app/egzersizler/kelime-yarisi/WordRaceExerciseClient.tsx");
  assert.match(client, /saveExerciseResultSecure/);
  assert.match(client, /useEducationProgramTaskCompletion/);
  // Ogrenci kimligi client'tan gonderilmez; sunucu oturumdan cozer.
  assert.doesNotMatch(client, /studentId/);
  // Mesaj kaynagi pencere kimligiyle dogrulanir (sandbox'li iframe opaque origin).
  assert.match(client, /event\.source !== frameRef\.current\.contentWindow/);
  assert.match(client, /sandbox="allow-scripts"/);
});
