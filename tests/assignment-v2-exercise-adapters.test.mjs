import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const ROOT = new URL("../", import.meta.url);

async function source(relativePath) {
  return readFile(new URL(relativePath, ROOT), "utf8");
}

test("adapter-common: snapshot alanlarini sinirlar ve provider kaydini stabil tutar", async () => {
  const [adapter, provider, contract, timer] = await Promise.all([
    source("src/components/assignments/useAssignmentExerciseAdapter.ts"),
    source("src/components/assignments/AssignmentTaskProvider.tsx"),
    source("src/lib/assignments/assignmentV2.ts"),
    source("src/components/assignments/AssignmentTaskTimer.tsx"),
  ]);

  assert.match(adapter, /registerResultSnapshotProvider\(provider\)/);
  assert.match(adapter, /await startAssignment\(\)/);
  assert.match(adapter, /pendingLocalStartRef/);
  assert.match(adapter, /adapterReady/);
  assert.match(adapter, /assignmentState !== "running"/);
  assert.match(adapter, /isLegacyAssignment/);
  assert.match(contract, /createAssignmentResultSnapshot/);
  assert.match(contract, /Math\.min\(1000/);
  assert.match(contract, /100_000/);
  assert.match(provider, /errorRef\.current\?\.code === "V2_ADAPTER_NOT_READY"/);
  assert.match(timer, /Kaydetme sırasında bir sorun oluştu\./);
  assert.match(timer, /const STUDENT_PANEL_ROUTE = "\/ogrenci"/);
});

test("benzer-kelimeler: V2 start, snapshot, kilit ve legacy kayit ayrimi", async () => {
  const component = await source(
    "src/app/egzersizler/benzer-kelimeler/SimilarWordsExerciseClient.tsx",
  );
  assert.match(component, /useAssignmentExerciseAdapter/);
  assert.match(component, /createAssignmentResultSnapshot/);
  assert.match(component, /await assignmentAdapter\.startExercise/);
  assert.match(component, /disabled=\{!assignmentAdapter\.canStart \|\| assignmentAdapter\.isStartPending\}/);
  assert.match(component, /assignmentAdapter\.canInteractRef\.current/);
  assert.match(component, /assignmentAdapter\.isAssignmentV2 \? null : <div/);
  assert.match(component, /if \(assignmentAdapter\.isAssignmentV2\) return;/);
  assert.match(component, /phase !== "play" \|\| assignmentAdapter\.isAssignmentV2/);
});

test("ayni-olani-yakala: V2 toplam timeri yok, item dongusu deadline'a kadar surer", async () => {
  const component = await source(
    "src/app/egzersizler/ayni-olani-yakala/CatchSameExerciseClient.tsx",
  );
  assert.match(component, /await assignmentAdapter\.startExercise/);
  assert.match(component, /createAssignmentResultSnapshot/);
  assert.match(component, /if \(!assignmentAdapter\.isAssignmentV2\) \{\s*timerIntervalRef\.current/);
  assert.match(component, /assignmentAdapter\.canInteractRef\.current/);
  assert.match(component, /if \(assignmentAdapter\.isAssignmentV2\) return;/);
  assert.match(component, /!assignmentAdapter\.isAssignmentV2 \? \(\s*<>/);
  assert.match(component, /assignmentAdapter\.isInteractionLocked/);
});

test("kare-gorme-alani: V2 cevaplari kilitler ve doğal round yenilemesini korur", async () => {
  const component = await source(
    "src/app/egzersizler/kare-gorme-alani/SquareVisionExerciseClient.tsx",
  );
  assert.match(component, /await assignmentAdapter\.startExercise/);
  assert.match(component, /createAssignmentResultSnapshot/);
  assert.match(component, /phase !== "running" \|\| assignmentAdapter\.isAssignmentV2/);
  assert.match(component, /!assignmentAdapter\.canInteractRef\.current/);
  assert.match(component, /if \(assignmentAdapter\.isAssignmentV2\) return;/);
  assert.match(component, /!assignmentAdapter\.isAssignmentV2 && \(phase === "running"/);
  assert.match(component, /disabled=\{phase !== "running" \|\| assignmentAdapter\.isInteractionLocked\}/);
});

test("kelime-bulma: V2 deadline disinda finalize olmaz ve paragraf turlari yenilenir", async () => {
  const component = await source(
    "src/app/egzersizler/kelime-bulma/WordFindingExerciseClient.tsx",
  );
  assert.match(component, /await assignmentAdapter\.startExercise/);
  assert.match(component, /createAssignmentResultSnapshot/);
  assert.match(component, /if \(!assignmentAdapter\.isAssignmentV2\) \{\s*tickRef\.current/);
  assert.match(component, /!assignmentAdapter\.isAssignmentV2 && phase === "running"/);
  assert.match(component, /setTextSeed\(\(prev\) => prev \+ 1\)/);
  assert.match(component, /!assignmentAdapter\.canInteractRef\.current/);
  assert.match(component, /assignmentAdapter\.isAssignmentV2 \? null : <button/);
  assert.match(component, /if \(assignmentAdapter\.isAssignmentV2\) return;/);
});

test("takistoskop: gösterim timeri korunur, V2 finish ve legacy save kapatilir", async () => {
  const component = await source(
    "src/components/exercises/TachistoscopeExerciseClient.tsx",
  );
  assert.match(component, /await assignmentAdapter\.startExercise/);
  assert.match(component, /createAssignmentResultSnapshot/);
  assert.match(component, /currentRound\.speedMs/);
  assert.match(component, /sessionStartedAt === null \|\|\s*assignmentAdapter\.isAssignmentV2/);
  assert.match(component, /assignmentAdapter\.canInteractRef\.current/);
  assert.match(component, /if \(assignmentAdapter\.isAssignmentV2\) return;/);
  assert.match(component, /!assignmentAdapter\.isAssignmentV2 \? <button/);
  assert.match(component, /assignmentAdapter\.isInteractionLocked/);
  assert.match(component, /disabled=\{!assignmentAdapter\.canStart \|\| assignmentAdapter\.isStartPending\}/);
});

test("harf-rakam-sayma: soru timeri korunur, V2 manuel kontrolleri gizlenir", async () => {
  const component = await source(
    "src/app/egzersizler/harf-rakam-sayma/LetterNumberCountingFocusClient.tsx",
  );
  assert.match(component, /await assignmentAdapter\.startExercise/);
  assert.match(component, /createAssignmentResultSnapshot/);
  assert.match(component, /setRemainingSeconds\(\(prev\)/);
  assert.match(component, /!assignmentAdapter\.canInteractRef\.current/);
  assert.match(component, /if \(assignmentAdapter\.isAssignmentV2\) return;/);
  assert.match(component, /\) : !assignmentAdapter\.isAssignmentV2 \? \(/);
  assert.match(component, /assignmentAdapter\.isInteractionLocked/);
  assert.match(component, /disabled=\{!assignmentAdapter\.canStart \|\| assignmentAdapter\.isStartPending\}/);
});

test("goz-egzersizleri-kolonlar: V2 lokal toplam bitisi kapatir ve hareketi surdurur", async () => {
  const component = await source(
    "src/app/egzersizler/goz-egzersizleri-kolonlar/ColumnEyeExerciseClient.tsx",
  );
  assert.match(component, /await assignmentAdapter\.startExercise/);
  assert.match(component, /createAssignmentResultSnapshot/);
  assert.match(component, /phase !== "running" \|\| assignmentAdapter\.isAssignmentV2/);
  assert.match(component, /assignmentAdapter\.isAssignmentV2 && !assignmentAdapter\.isRunning/);
  assert.match(component, /if \(assignmentAdapter\.isAssignmentV2\) return;/);
  assert.match(component, /!assignmentAdapter\.isAssignmentV2 && \(phase === "running"/);
  assert.match(component, /assignmentAdapter\.remainingSeconds \?\? totalDurationSeconds/);
});

test("hafiza-gelistirme: V2 snapshot semasi ve doğal round zinciri korunur", async () => {
  const component = await source(
    "src/app/egzersizler/hafiza-gelistirme/MemoryGameExerciseClient.tsx",
  );
  assert.match(component, /await assignmentAdapter\.startExercise/);
  assert.match(component, /createAssignmentResultSnapshot/);
  assert.match(component, /wrongCount: totalWrongCount/);
  assert.match(component, /nextRoundTimerRef\.current = window\.setTimeout/);
  assert.match(component, /phase !== "play" \|\| assignmentAdapter\.isAssignmentV2/);
  assert.match(component, /assignmentAdapter\.canInteractRef\.current/);
  assert.match(component, /if \(assignmentAdapter\.isAssignmentV2\) return;/);
  assert.match(component, /assignmentAdapter\.isAssignmentV2 \? null : <button/);
  assert.match(component, /assignmentAdapter\.isInteractionLocked/);
});

test("kart-eslestirme: V2 snapshot semasi ve otomatik yeni deste korunur", async () => {
  const component = await source(
    "src/app/egzersizler/kart-eslestirme/CardMatchingExerciseClient.tsx",
  );
  assert.match(component, /await assignmentAdapter\.startExercise/);
  assert.match(component, /createAssignmentResultSnapshot/);
  assert.match(component, /wrongCount,/);
  assert.match(component, /renewDeckAfterRound/);
  assert.match(component, /assignmentAdapter\.canInteractRef\.current/);
  assert.match(component, /if \(assignmentAdapter\.isAssignmentV2\) return;/);
  assert.match(component, /assignmentAdapter\.isAssignmentV2 \? null : <button/);
  assert.match(component, /assignmentAdapter\.isInteractionLocked/);
  assert.match(component, /if \(!assignmentAdapter\.isAssignmentV2\) startElapsedTimer\(\)/);
});
