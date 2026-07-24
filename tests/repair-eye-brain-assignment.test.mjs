import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

import { getAssignmentExerciseDefinition } from "../src/lib/assignments/assignmentExerciseCatalog.ts";
import {
  EYE_BRAIN_REPLACEMENT_MAPPING,
  OPERATION_NAME,
  computeReplacementCandidates,
  deriveConfirmationToken,
  findDuplicateSlugsPerDay,
  isTaskUntouched,
  maskId,
  matchMappingToLiveTasks,
  simulateReplacement,
  validateDay1Routes,
  validateDayStatusDistribution,
  validateMappingShape,
  validatePostSimulationInvariants,
  validateReplacementEligibility,
} from "../scripts/maintenance/lib/eyeBrainRepairPlan.mjs";

const SCRIPT_URL = new URL("../scripts/maintenance/repair-eye-brain-assignment.mjs", import.meta.url);
const LIB_URL = new URL("../scripts/maintenance/lib/eyeBrainRepairPlan.mjs", import.meta.url);
const MIGRATION_URL = new URL(
  "../supabase/migrations/20260725090000_repair_active_assignment_eye_brain_tasks_rpc.sql",
  import.meta.url,
);

async function readScript() {
  return readFile(SCRIPT_URL, "utf8");
}

async function readLib() {
  return readFile(LIB_URL, "utf8");
}

async function readMigration() {
  return readFile(MIGRATION_URL, "utf8");
}

// ============================================================================
// Sentetik 100 gorevlik / 20 gunluk canli-veri fixture'i - EYE_BRAIN_
// REPLACEMENT_MAPPING'deki 14 pozisyonu "goz-beyin", geri kalan 86 pozisyonu
// (gunler arasi/ici cakismasiz) benzersiz "filler-<gun>-<sira>" slug'lariyla
// doldurur. Gun 1 = available, digerleri locked (gercek programin ilk
// olusturulma anindaki, hic ilerlemenin oldugu haldeki gorunumu).
// ============================================================================

function buildSyntheticTasks() {
  const mappingByPosition = new Map(
    EYE_BRAIN_REPLACEMENT_MAPPING.map((entry) => [`${entry.dayNumber}:${entry.taskOrder}`, entry]),
  );
  const tasks = [];
  let counter = 0;
  for (let day = 1; day <= 20; day += 1) {
    for (let order = 1; order <= 5; order += 1) {
      counter += 1;
      const isEyeBrainSlot = mappingByPosition.has(`${day}:${order}`);
      tasks.push({
        id: `task-${String(counter).padStart(3, "0")}`,
        dayNumber: day,
        taskOrder: order,
        exerciseSlug: isEyeBrainSlot ? "goz-beyin" : `filler-${day}-${order}`,
        category: isEyeBrainSlot ? "eye" : "attention",
        status: day === 1 ? "available" : "locked",
        startingLevel: 1,
        currentLevel: 1,
        durationSeconds: 300,
        settings: {},
        startedAt: null,
        expiresAt: null,
        completedAt: null,
        completionReason: null,
        resultId: null,
        lastHeartbeatAt: null,
      });
    }
  }
  return tasks;
}

function buildSyntheticDays() {
  const days = [];
  for (let day = 1; day <= 20; day += 1) {
    days.push({ id: `day-${day}`, dayNumber: day, status: day === 1 ? "available" : "locked" });
  }
  return days;
}

function buildValidTemplateSettings() {
  return {
    "goz-egzersizleri-kolonlar": {
      exerciseSlug: "goz-egzersizleri-kolonlar",
      enabled: true,
      startingLevel: 1,
      durationSeconds: 300,
      settings: { columnCount: 3, flowDirection: "column", jumpSpeed: 2500 },
      dailyWeight: 1,
    },
    "ayni-olani-yakala": {
      exerciseSlug: "ayni-olani-yakala",
      enabled: true,
      startingLevel: 1,
      durationSeconds: 300,
      settings: { mode: "symbol", speed: 1500 },
      dailyWeight: 1,
    },
    "hafiza-gelistirme": {
      exerciseSlug: "hafiza-gelistirme",
      enabled: true,
      startingLevel: 2,
      durationSeconds: 300,
      settings: { displayMs: 1000, fontSize: 16, gridLayout: "5x5" },
      dailyWeight: 1,
    },
  };
}

// ============================================================================
// Mapping yapisi ve dagilimi
// ============================================================================

test("EYE_BRAIN_REPLACEMENT_MAPPING tam olarak 14 benzersiz pozisyon iceriyor", () => {
  const result = validateMappingShape(EYE_BRAIN_REPLACEMENT_MAPPING);
  assert.deepEqual(result.errors, []);
  assert.equal(result.ok, true);
  assert.equal(EYE_BRAIN_REPLACEMENT_MAPPING.length, 14);
  const positions = new Set(EYE_BRAIN_REPLACEMENT_MAPPING.map((e) => `${e.dayNumber}:${e.taskOrder}`));
  assert.equal(positions.size, 14);
});

test("validateMappingShape 14'ten farkli uzunlukta hata veriyor", () => {
  const result = validateMappingShape(EYE_BRAIN_REPLACEMENT_MAPPING.slice(0, 13));
  assert.equal(result.ok, false);
  assert.ok(result.errors.some((e) => e.includes("14")));
});

test("replacement dagilimi dogru: 1x goz-egzersizleri-kolonlar, 8x ayni-olani-yakala, 5x hafiza-gelistirme", () => {
  const counts = {};
  for (const entry of EYE_BRAIN_REPLACEMENT_MAPPING) {
    counts[entry.exerciseSlug] = (counts[entry.exerciseSlug] ?? 0) + 1;
  }
  assert.deepEqual(counts, {
    "goz-egzersizleri-kolonlar": 1,
    "ayni-olani-yakala": 8,
    "hafiza-gelistirme": 5,
  });
});

test("mapping'de hicbir slug ayni gun icinde tekrar etmiyor (her gun en fazla 1 mapping girisi)", () => {
  const dayNumbers = EYE_BRAIN_REPLACEMENT_MAPPING.map((e) => e.dayNumber);
  assert.equal(new Set(dayNumbers).size, dayNumbers.length, "her gun mapping'de en fazla bir kez gecmeli");
});

// ============================================================================
// Canli veriyle eslesme + "dokunulmamislik" korumasi
// ============================================================================

test("matchMappingToLiveTasks: mutlu senaryoda 14/14 eslesir", () => {
  const tasks = buildSyntheticTasks();
  const result = matchMappingToLiveTasks(EYE_BRAIN_REPLACEMENT_MAPPING, tasks);
  assert.equal(result.ok, true);
  assert.deepEqual(result.errors, []);
  assert.equal(result.matched.length, 14);
});

test("hedef sayisi 14 degilse (eksik goz-beyin) hata verir", () => {
  // Bir goz-beyin gorevini "canlida zaten baska bir slug'a degismis" gibi
  // simule ederek hedef sayisini 13'e dusuruyoruz.
  const mutated = buildSyntheticTasks();
  const firstEyeBrainIndex = mutated.findIndex((t) => t.exerciseSlug === "goz-beyin");
  mutated[firstEyeBrainIndex] = { ...mutated[firstEyeBrainIndex], exerciseSlug: "harf-rakam-sayma" };

  const result = matchMappingToLiveTasks(EYE_BRAIN_REPLACEMENT_MAPPING, mutated);
  assert.equal(result.ok, false);
  assert.ok(result.errors.some((e) => e.includes("14")));
});

test("baslamis (started_at dolu) hedef gorev varsa hata verir", () => {
  const tasks = buildSyntheticTasks();
  const index = tasks.findIndex((t) => t.exerciseSlug === "goz-beyin");
  tasks[index] = { ...tasks[index], status: "in_progress", startedAt: "2026-01-01T00:00:00Z", expiresAt: "2026-01-01T00:10:00Z" };

  assert.equal(isTaskUntouched(tasks[index]), false);
  const result = matchMappingToLiveTasks(EYE_BRAIN_REPLACEMENT_MAPPING, tasks);
  assert.equal(result.ok, false);
  assert.ok(result.errors.some((e) => e.includes("baslamis")));
});

test("result_id dolu hedef gorev varsa (isTaskUntouched) guvensiz sayilir", () => {
  const task = {
    status: "available",
    startedAt: null,
    expiresAt: null,
    completedAt: null,
    completionReason: null,
    resultId: "some-result-id",
    lastHeartbeatAt: null,
  };
  assert.equal(isTaskUntouched(task), false);
});

test("status='completed' olan hedef gorev guvensiz sayilir", () => {
  const task = {
    status: "completed",
    startedAt: "2026-01-01T00:00:00Z",
    expiresAt: "2026-01-01T00:10:00Z",
    completedAt: "2026-01-01T00:05:00Z",
    completionReason: "result_submitted",
    resultId: "r1",
    lastHeartbeatAt: null,
  };
  assert.equal(isTaskUntouched(task), false);
});

// ============================================================================
// Replacement uygunlugu (katalog + kaynak template)
// ============================================================================

test("validateReplacementEligibility: mutlu senaryoda hicbir hata yok", () => {
  const templateSettings = buildValidTemplateSettings();
  for (const mappingEntry of EYE_BRAIN_REPLACEMENT_MAPPING) {
    const catalogDefinition = getAssignmentExerciseDefinition(mappingEntry.exerciseSlug);
    const errors = validateReplacementEligibility({
      mappingEntry,
      catalogDefinition,
      templateSetting: templateSettings[mappingEntry.exerciseSlug],
    });
    assert.deepEqual(errors, [], `${mappingEntry.exerciseSlug} (gun ${mappingEntry.dayNumber}) hatasiz olmali`);
  }
});

test("kaynak template'te disabled ise hata verir", () => {
  const mappingEntry = EYE_BRAIN_REPLACEMENT_MAPPING[1]; // ayni-olani-yakala
  const catalogDefinition = getAssignmentExerciseDefinition(mappingEntry.exerciseSlug);
  const templateSetting = { ...buildValidTemplateSettings()[mappingEntry.exerciseSlug], enabled: false };
  const errors = validateReplacementEligibility({ mappingEntry, catalogDefinition, templateSetting });
  assert.ok(errors.some((e) => e.includes("disabled")));
});

test("kaynak template'te dailyWeight <= 0 ise hata verir", () => {
  const mappingEntry = EYE_BRAIN_REPLACEMENT_MAPPING[1];
  const catalogDefinition = getAssignmentExerciseDefinition(mappingEntry.exerciseSlug);
  const templateSetting = { ...buildValidTemplateSettings()[mappingEntry.exerciseSlug], dailyWeight: 0 };
  const errors = validateReplacementEligibility({ mappingEntry, catalogDefinition, templateSetting });
  assert.ok(errors.some((e) => e.includes("dailyWeight")));
});

test("katalogda integrationStatus 'ready' degilse hata verir", () => {
  const mappingEntry = EYE_BRAIN_REPLACEMENT_MAPPING[1];
  const fakeCatalogDefinition = { integrationStatus: "needs_major_changes", route: "/egzersizler/x", resultExerciseType: "x" };
  const templateSetting = buildValidTemplateSettings()[mappingEntry.exerciseSlug];
  const errors = validateReplacementEligibility({ mappingEntry, catalogDefinition: fakeCatalogDefinition, templateSetting });
  assert.ok(errors.some((e) => e.includes("ready degil")));
});

test("katalogda route yoksa hata verir", () => {
  const mappingEntry = EYE_BRAIN_REPLACEMENT_MAPPING[1];
  const fakeCatalogDefinition = { integrationStatus: "ready", route: null, resultExerciseType: "x" };
  const templateSetting = buildValidTemplateSettings()[mappingEntry.exerciseSlug];
  const errors = validateReplacementEligibility({ mappingEntry, catalogDefinition: fakeCatalogDefinition, templateSetting });
  assert.ok(errors.some((e) => e.includes("route yok")));
});

test("katalogda resultExerciseType yoksa hata verir", () => {
  const mappingEntry = EYE_BRAIN_REPLACEMENT_MAPPING[1];
  const fakeCatalogDefinition = { integrationStatus: "ready", route: "/egzersizler/x", resultExerciseType: null };
  const templateSetting = buildValidTemplateSettings()[mappingEntry.exerciseSlug];
  const errors = validateReplacementEligibility({ mappingEntry, catalogDefinition: fakeCatalogDefinition, templateSetting });
  assert.ok(errors.some((e) => e.includes("resultExerciseType yok")));
});

test("computeReplacementCandidates: goz-beyin hicbir zaman aday listesine girmiyor", () => {
  const catalog = [
    { exerciseSlug: "goz-beyin", integrationStatus: "ready", route: "/x", resultExerciseType: "x" },
    { exerciseSlug: "harf-rakam-sayma", integrationStatus: "ready", route: "/y", resultExerciseType: "y" },
  ];
  const templateSettingsBySlug = {
    "goz-beyin": { enabled: true, dailyWeight: 1 },
    "harf-rakam-sayma": { enabled: true, dailyWeight: 1 },
  };
  const candidates = computeReplacementCandidates(catalog, templateSettingsBySlug);
  assert.deepEqual(candidates, ["harf-rakam-sayma"]);
});

// ============================================================================
// Simulasyon ve simulasyon-sonrasi degismezler
// ============================================================================

test("simulateReplacement + validatePostSimulationInvariants: 20x5 korunuyor, goz-beyin=0", () => {
  const tasks = buildSyntheticTasks();
  const simulated = simulateReplacement(tasks, EYE_BRAIN_REPLACEMENT_MAPPING);

  assert.equal(simulated.length, 100);
  assert.equal(simulated.filter((t) => t.exerciseSlug === "goz-beyin").length, 0);

  const errors = validatePostSimulationInvariants(simulated);
  assert.deepEqual(errors, []);
});

test("simulasyon sonrasi available/locked dagilimi korunuyor (5/95)", () => {
  const tasks = buildSyntheticTasks();
  const simulated = simulateReplacement(tasks, EYE_BRAIN_REPLACEMENT_MAPPING);
  const byStatus = {};
  for (const t of simulated) byStatus[t.status] = (byStatus[t.status] ?? 0) + 1;
  assert.equal(byStatus.available, 5);
  assert.equal(byStatus.locked, 95);
  assert.equal(byStatus.in_progress ?? 0, 0);
  assert.equal(byStatus.completed ?? 0, 0);
  assert.equal(byStatus.cancelled ?? 0, 0);
});

test("simulasyon, degistirilmeyen (goz-beyin olmayan) gorevlere DOKUNMUYOR", () => {
  const tasks = buildSyntheticTasks();
  const simulated = simulateReplacement(tasks, EYE_BRAIN_REPLACEMENT_MAPPING);
  const untouchedOriginal = tasks.filter((t) => t.exerciseSlug !== "goz-beyin");
  for (const original of untouchedOriginal) {
    const after = simulated.find((t) => t.id === original.id);
    assert.deepEqual(after, original);
  }
});

test("findDuplicateSlugsPerDay: simulasyon sonrasi hicbir gunde yinelenen slug yok", () => {
  const tasks = buildSyntheticTasks();
  const simulated = simulateReplacement(tasks, EYE_BRAIN_REPLACEMENT_MAPPING);
  assert.deepEqual(findDuplicateSlugsPerDay(simulated), []);
});

test("validateDayStatusDistribution: 1 available + 19 locked bekleniyor", () => {
  const days = buildSyntheticDays();
  assert.deepEqual(validateDayStatusDistribution(days), []);
});

test("validateDayStatusDistribution: dagilim bozulmussa hata verir", () => {
  const days = buildSyntheticDays();
  days[1] = { ...days[1], status: "available" }; // 2 available olsun
  const errors = validateDayStatusDistribution(days);
  assert.ok(errors.length > 0);
});

test("validateDay1Routes: gun 1'in 5 gorevi (goz-egzersizleri-kolonlar dahil) gecerli route'a sahip", () => {
  const tasks = buildSyntheticTasks();
  const simulated = simulateReplacement(tasks, EYE_BRAIN_REPLACEMENT_MAPPING);
  // Sentetik filler slug'lar gercek katalogda yok - yalniz gun 1'in
  // GERCEK (replacement + katalogda var olan) gorevlerini test etmek icin
  // gun 1'i tamamen katalogda var olan slug'larla dolduran ayri bir fixture
  // kuruyoruz.
  const day1WithRealSlugs = simulated
    .filter((t) => t.dayNumber === 1)
    .map((t, index) => (t.exerciseSlug === "goz-egzersizleri-kolonlar" ? t : { ...t, exerciseSlug: ["kare-gorme-alani", "benzer-kelimeler", "kelime-bulma", "takistoskop"][index] ?? "takistoskop" }));

  const errors = validateDay1Routes(day1WithRealSlugs, getAssignmentExerciseDefinition);
  assert.deepEqual(errors, []);
});

// ============================================================================
// Confirmation token
// ============================================================================

test("deriveConfirmationToken deterministik: ayni girdi ayni token uretir", () => {
  const input = { programId: "prog-1", headCommit: "abc123", taskIds: ["t2", "t1"], operationName: OPERATION_NAME };
  assert.equal(deriveConfirmationToken(input), deriveConfirmationToken(input));
});

test("deriveConfirmationToken: taskIds sirasindan bagimsizdir (sortlanir)", () => {
  const a = deriveConfirmationToken({ programId: "p", headCommit: "h", taskIds: ["t2", "t1"], operationName: OPERATION_NAME });
  const b = deriveConfirmationToken({ programId: "p", headCommit: "h", taskIds: ["t1", "t2"], operationName: OPERATION_NAME });
  assert.equal(a, b);
});

test("deriveConfirmationToken: farkli programId/headCommit/taskIds farkli token uretir", () => {
  const base = { programId: "prog-1", headCommit: "abc", taskIds: ["t1"], operationName: OPERATION_NAME };
  const base64 = deriveConfirmationToken(base);
  assert.notEqual(base64, deriveConfirmationToken({ ...base, programId: "prog-2" }));
  assert.notEqual(base64, deriveConfirmationToken({ ...base, headCommit: "def" }));
  assert.notEqual(base64, deriveConfirmationToken({ ...base, taskIds: ["t2"] }));
});

test("maskId: kisa/gecersiz girdide guvenli varsayilan, uzun id'de yalniz ilk4...son4 gosterir", () => {
  assert.equal(maskId("short"), "****");
  assert.equal(maskId(undefined), "****");
  assert.equal(maskId("12345678-aaaa-bbbb-cccc-1234567890ab"), "1234…90ab");
});

// ============================================================================
// Script guvenlik davranisi - statik kaynak testleri (Supabase'e baglanmadan)
// ============================================================================

test("repair script (supabase client'in bulundugu dosya) hicbir dogrudan insert/update/upsert/delete icermiyor - yalniz TEK bir .rpc() cagrisi var (Faz 2.6A.2)", async () => {
  const scriptSource = await readScript();
  assert.doesNotMatch(scriptSource, /\.insert\(|\.update\(|\.upsert\(|\.delete\(/);
  const rpcCalls = scriptSource.match(/\.rpc\(/g) ?? [];
  assert.equal(rpcCalls.length, 1, "scriptte TAM OLARAK bir .rpc() cagrisi olmali - 14 ayri update ATILMAMALI");
  assert.match(scriptSource, /\.rpc\("repair_active_assignment_eye_brain_tasks",/);
});

test("repair script'in TEK .rpc() cagrisi yalniz execute modunda, token dogrulamasindan SONRA calisir", async () => {
  const source = await readScript();
  const confirmCheckIndex = source.indexOf("CONFIRMATION_TOKEN_MISMATCH");
  const rpcCallIndex = source.indexOf('.rpc("repair_active_assignment_eye_brain_tasks"');
  assert.ok(confirmCheckIndex !== -1 && rpcCallIndex !== -1 && confirmCheckIndex < rpcCallIndex, "token kontrolu RPC cagrisindan ONCE gelmeli");
});

test("dry-run modu (varsayilan calisma yolu) hicbir zaman .rpc() cagrisina ulasmaz - mod dallanmasi bunu erkenden engeller", async () => {
  const source = await readScript();
  assert.match(source, /if \(mode === "dry-run"\) \{[\s\S]*?process\.exit\(0\);\s*\n\s*return;\s*\n\s*\}/);
});

test("saf yardimci modul (eyeBrainRepairPlan.mjs) Supabase'i hic import etmiyor - yazma YAPAMAZ", async () => {
  const libSource = await readLib();
  assert.doesNotMatch(libSource, /@supabase\/supabase-js/);
  assert.doesNotMatch(libSource, /createClient\(/);
});

test("repair script varsayilan modu dry-run'dir, yalniz '--execute' ile execute moduna gecer", async () => {
  const source = await readScript();
  assert.match(source, /args\.execute \? "execute" : "dry-run"/);
  assert.match(source, /arg === "--execute"/);
});

test("repair script execute icin dogru confirmation token zorunlu kiliyor", async () => {
  const source = await readScript();
  assert.match(source, /args\.confirm !== result\.token/);
  assert.match(source, /CONFIRMATION_TOKEN_MISMATCH/);
});

test("repair script execute modu dogru p_confirmation_token/p_expected_head_commit parametreleriyle RPC'yi cagiriyor", async () => {
  const source = await readScript();
  assert.match(source, /p_confirmation_token:\s*args\.confirm,/);
  assert.match(source, /p_expected_head_commit:\s*gitInfo\.headFull,/);
});

test("repair script RPC hatasini (rpcError) client'a guvenli sekilde yansitiyor, write denemesi yapmiyor", async () => {
  const source = await readScript();
  assert.match(source, /if \(rpcError\) \{/);
  assert.match(source, /RPC_CALL_FAILED/);
});

test("repair script RPC'nin donen JSONB ozetini beklenen degerlerle (14\\/20\\/100\\/0\\/5\\/95) dogruluyor, uyusmazsa hata veriyor", async () => {
  const source = await readScript();
  assert.match(source, /updated_count:\s*14,/);
  assert.match(source, /day_count:\s*20,/);
  assert.match(source, /task_count:\s*100,/);
  assert.match(source, /eye_brain_remaining:\s*0,/);
  assert.match(source, /available_count:\s*5,/);
  assert.match(source, /locked_count:\s*95,/);
  assert.match(source, /RPC_RESULT_UNEXPECTED/);
});

test("repair script yalniz service-role client kullaniyor (anon key fallback yok), eksikse fail-closed cikiyor", async () => {
  const source = await readScript();
  assert.match(source, /getSupabaseServiceRoleClient/);
  assert.doesNotMatch(source, /NEXT_PUBLIC_SUPABASE_ANON_KEY/);
  assert.match(source, /SERVICE_ROLE_KEY_MISSING/);
});

test("repair script gercek program UUID'sini kaynak koda hardcode etmiyor - canli 'status=active' sorgusuyla buluyor", async () => {
  const source = await readScript();
  assert.match(source, /\.eq\("status",\s*"active"\)/);
  assert.doesNotMatch(source, /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/i);
});

test("repair script aktif program sayisi 1 degilse durur", async () => {
  const source = await readScript();
  assert.match(source, /programRows\.length !== 1/);
  assert.match(source, /ACTIVE_PROGRAM_COUNT_MISMATCH/);
});

test("repair script console.log/console.error cagrilarinda ogrenci kimlik bilgisi (ad/email/telefon) gecmiyor", async () => {
  const source = await readScript();
  const logCalls = source.match(/console\.(log|error)\([^;]*?\);/gs) ?? [];
  assert.ok(logCalls.length > 0, "en az bir console.log/console.error cagrisi beklenirdi");
  const suspicious = logCalls.filter((call) => /student_name|studentName|\bemail\b|\bphone\b|telefon/i.test(call));
  assert.deepEqual(suspicious, []);
});

test("repair script hicbir yerde tam (maskelenmemis) id'yi console'a yazmiyor - yalniz maskId(...) kullaniliyor", async () => {
  const source = await readScript();
  // program.id / task.id dogrudan console.log'a verilmemeli - yalniz maskId(...) sarmalanmis olarak.
  assert.doesNotMatch(source, /console\.log\([^)]*\bprogram\.id\b(?!\s*[,)]?\s*\))/);
  assert.match(source, /maskId\(result\.program\.id\)/);
  assert.match(source, /maskId\(liveTask\.id\)/);
});

test("EYE_BRAIN_REPLACEMENT_MAPPING kaynak dosyasi OPERATION_NAME sabitini disa aktariyor", async () => {
  const source = await readLib();
  assert.match(source, /export const OPERATION_NAME = "repair-eye-brain-assignment-2\.6A\.1"/);
});

// ============================================================================
// Faz 2.6A.2 - repair_active_assignment_eye_brain_tasks RPC migration'i:
// yalniz STATIK kaynak testleri (gercek Supabase'e baglanmadan). Migration
// bu turda HICBIR sekilde uygulanmadi/cagrilmadi - bkz. asagidaki "migration
// dosyasi RPC'yi hicbir yerde CAGIRMIYOR" testi.
// ============================================================================

test("migration dosyasi mevcut ve RPC'yi tanimliyor", async () => {
  const sql = await readMigration();
  assert.match(sql, /create or replace function public\.repair_active_assignment_eye_brain_tasks\(/);
});

test("RPC security definer + guvenli search_path ile tanimlaniyor", async () => {
  const sql = await readMigration();
  assert.match(sql, /security definer/i);
  assert.match(sql, /set search_path = public, pg_temp/i);
});

test("RPC yalniz service_role'e acik - anon/authenticated/public icin REVOKE ALL var", async () => {
  const sql = await readMigration();
  const fn = "public\\.repair_active_assignment_eye_brain_tasks\\(text, text\\)";
  assert.match(sql, new RegExp(`revoke all on function ${fn} from public;`, "i"));
  assert.match(sql, new RegExp(`revoke all on function ${fn} from anon;`, "i"));
  assert.match(sql, new RegExp(`revoke all on function ${fn} from authenticated;`, "i"));
  assert.match(sql, new RegExp(`grant execute on function ${fn} to service_role;`, "i"));
});

test("mapping migration icinde tam 14 satir icerir ve JS mapping'iyle gun/sira/slug bakimindan birebir ayni", async () => {
  const sql = await readMigration();
  const valuesBlockMatch = sql.match(/insert into pg_temp\.eye_brain_replacement_mapping[\s\S]*?values\s*([\s\S]*?);/);
  assert.ok(valuesBlockMatch, "mapping INSERT ... VALUES blogu bulunamali");
  const rowMatches = [...valuesBlockMatch[1].matchAll(/\((\d+),\s*(\d+),\s*'([a-z0-9-]+)'/g)];
  assert.equal(rowMatches.length, 14, "migration'da tam 14 mapping satiri olmali");

  const sqlPositions = rowMatches.map((m) => `${m[1]}:${m[2]}:${m[3]}`).sort();
  const jsPositions = EYE_BRAIN_REPLACEMENT_MAPPING.map((e) => `${e.dayNumber}:${e.taskOrder}:${e.exerciseSlug}`).sort();
  assert.deepEqual(sqlPositions, jsPositions, "SQL mapping'i JS EYE_BRAIN_REPLACEMENT_MAPPING ile birebir ayni gun/sira/slug icermeli");
});

test("UPDATE yalniz izin verilen kolonlari degistiriyor - status/result/progress alanlari SET listesinde YOK", async () => {
  const sql = await readMigration();
  const updateMatch = sql.match(/update public\.student_assignment_program_tasks t\s*\n\s*set\s*\n([\s\S]*?)\s*from pg_temp\.eye_brain_replacement_mapping/);
  assert.ok(updateMatch, "UPDATE ... SET blogu bulunamali");
  const setClause = updateMatch[1];

  for (const allowedColumn of ["exercise_slug", "exercise_title", "category", "starting_level", "current_level", "duration_seconds", "settings", "updated_at"]) {
    assert.match(setClause, new RegExp(`${allowedColumn}\\s*=`), `${allowedColumn} SET listesinde olmali`);
  }
  for (const forbiddenColumn of [
    "id =", "program_id =", "program_day_id =", "student_id =", "day_number =", "task_order =",
    "status =", "started_at =", "expires_at =", "completed_at =", "completion_reason =",
    "result_id =", "last_heartbeat_at =", "created_at =",
  ]) {
    assert.doesNotMatch(setClause, new RegExp(forbiddenColumn.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")), `${forbiddenColumn} SET listesinde OLMAMALI`);
  }
});

test("UPDATE WHERE guard'lari goz-beyin + status + tum ilerleme alanlarinin NULL oldugunu tasiyor", async () => {
  const sql = await readMigration();
  const updateBlockMatch = sql.match(/update public\.student_assignment_program_tasks t[\s\S]*?and t\.last_heartbeat_at is null;/);
  assert.ok(updateBlockMatch, "UPDATE bloğu (WHERE guard'lariyla) bulunamali");
  const block = updateBlockMatch[0];
  assert.match(block, /t\.exercise_slug = 'goz-beyin'/);
  assert.match(block, /t\.status in \('locked', 'available'\)/);
  for (const guardColumn of ["started_at", "expires_at", "completed_at", "completion_reason", "result_id", "last_heartbeat_at"]) {
    assert.match(block, new RegExp(`t\\.${guardColumn} is null`));
  }
});

test("guncellenen satir sayisi tam 14 degilse exception atiyor (get diagnostics + row_count)", async () => {
  const sql = await readMigration();
  assert.match(sql, /get diagnostics v_updated_count = row_count;/);
  assert.match(sql, /v_updated_count <> 14/);
  assert.match(sql, /EYE_BRAIN_REPAIR_UPDATE_COUNT_MISMATCH/);
});

test("aktif program sayisi guard'i: STRICT + FOR UPDATE ile tam 1 satir garantisi", async () => {
  const sql = await readMigration();
  assert.match(sql, /select id, total_days, tasks_per_day, template_id\s*\n\s*into strict v_program_id/);
  assert.match(sql, /for update;/);
  assert.match(sql, /when too_many_rows then/);
  assert.match(sql, /when no_data_found then/);
  assert.match(sql, /EYE_BRAIN_REPAIR_ACTIVE_PROGRAM_COUNT_MISMATCH/);
});

test("20 gun / 100 gorev guard'lari var", async () => {
  const sql = await readMigration();
  assert.match(sql, /EYE_BRAIN_REPAIR_DAY_COUNT_MISMATCH/);
  assert.match(sql, /v_day_count <> 20/);
  assert.match(sql, /EYE_BRAIN_REPAIR_TASK_COUNT_MISMATCH/);
  assert.match(sql, /v_task_count <> 100/);
});

test("tam 14 goz-beyin guard'i var", async () => {
  const sql = await readMigration();
  assert.match(sql, /EYE_BRAIN_REPAIR_EYE_BRAIN_COUNT_MISMATCH/);
  assert.match(sql, /v_eye_brain_count <> 14/);
});

test("baslamis/tamamlanmis (started_at/result_id vb.) hedeflere karsi guard var (mapping-canli eslesme kontrolu)", async () => {
  const sql = await readMigration();
  assert.match(sql, /EYE_BRAIN_REPAIR_MAPPING_TARGET_NOT_FOUND/);
  assert.match(sql, /v_mapping_match_count <> 14/);
});

test("kaynak template guard'lari: enabled, daily_weight>0, starting_level/duration_seconds/settings uyumu", async () => {
  const sql = await readMigration();
  assert.match(sql, /pces\.enabled is distinct from true/);
  assert.match(sql, /coalesce\(pces\.daily_weight, 0\) <= 0/);
  assert.match(sql, /pces\.starting_level <> m\.starting_level/);
  assert.match(sql, /pces\.duration_seconds <> m\.duration_seconds/);
  assert.match(sql, /pces\.settings <> m\.settings/);
  assert.match(sql, /EYE_BRAIN_REPAIR_TEMPLATE_SETTING_MISMATCH/);
});

test("gun basina 5 gorev / 5 benzersiz slug (duplicate slug) guncelleme-sonrasi guard'i var", async () => {
  const sql = await readMigration();
  assert.match(sql, /having count\(\*\) <> 5 or count\(distinct exercise_slug\) <> 5/);
});

test("guncelleme-sonrasi status dagilim guard'lari var (available=5, locked=95, diger=0; gun: 1 available\\/19 locked)", async () => {
  const sql = await readMigration();
  assert.match(sql, /v_available_count <> 5 or v_locked_count <> 95 or v_other_status_count <> 0/);
  assert.match(sql, /v_available_day_count <> 1 or v_locked_day_count <> 19/);
});

test("confirmation token digest mantigi JS scriptiyle uyumlu: sha256(operationName|headCommit|programId|sortedTaskIds)", async () => {
  const sql = await readMigration();
  assert.match(sql, /v_operation_name text := 'repair-eye-brain-assignment-2\.6A\.1';/);
  assert.match(sql, /order by t\.id::text collate "C" asc/);
  assert.match(
    sql,
    /v_canonical := v_operation_name \|\| '\|' \|\| p_expected_head_commit \|\| '\|' \|\| v_program_id::text \|\| '\|' \|\| array_to_string\(v_task_ids_sorted, ','\);/,
  );
  assert.match(sql, /v_computed_token := encode\(digest\(v_canonical, 'sha256'\), 'hex'\);/);
  assert.match(sql, /EYE_BRAIN_REPAIR_CONFIRMATION_TOKEN_MISMATCH/);
});

test("RPC guvenli JSONB ozet donduruyor - kisisel veri veya UUID icermiyor", async () => {
  const sql = await readMigration();
  const returnMatch = sql.match(/v_result := jsonb_build_object\(([\s\S]*?)\);/);
  assert.ok(returnMatch, "donus jsonb_build_object blogu bulunamali");
  const body = returnMatch[1];
  assert.match(body, /'ok', true/);
  assert.match(body, /'operation', v_operation_name/);
  assert.match(body, /'updated_count', v_updated_count/);
  assert.match(body, /'day_count', v_day_count/);
  assert.match(body, /'task_count', v_task_count/);
  assert.match(body, /'eye_brain_remaining', v_eye_brain_count/);
  assert.match(body, /'available_count', v_available_count/);
  assert.match(body, /'locked_count', v_locked_count/);
  assert.doesNotMatch(body, /v_program_id/);
  assert.doesNotMatch(body, /student_id/i);
});

test("migration dosyasi RPC'yi hicbir yerde CAGIRMIYOR - yalniz taniml(an)iyor/yetkilendiriliyor", async () => {
  const sql = await readMigration();
  assert.doesNotMatch(sql, /select\s+public\.repair_active_assignment_eye_brain_tasks\(/i);
  assert.doesNotMatch(sql, /perform\s+public\.repair_active_assignment_eye_brain_tasks\(/i);
});

test("migration daily_assignments/create_student_assignment_program'a hicbir sekilde dokunmuyor (yalniz yorumlarda gecebilir)", async () => {
  const sql = await readMigration();
  const lines = sql.split("\n");
  for (const line of lines) {
    if (/daily_assignment|create_student_assignment_program\(/i.test(line)) {
      const trimmed = line.trim();
      const isDocumentationOnly = trimmed.startsWith("--") || trimmed.startsWith("'");
      assert.ok(isDocumentationOnly, `"${trimmed}" bir yorum satiri olmali, DDL/DML hedefi olmamali`);
    }
  }
});
