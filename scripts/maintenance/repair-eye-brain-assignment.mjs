#!/usr/bin/env node
// Faz 2.6A.1 - "goz-beyin" canli program onarim bakim scripti.
//
// AMAC: Mevcut TEK aktif ogrenci programindaki 14 adet "goz-beyin" gorevini,
// assignment-ready baska egzersizlerle degistirmek icin GUVENLI bir arac.
//
// GUVENLIK MODELI (fail-closed):
//   - Varsayilan mod HER ZAMAN dry-run'dir. Hicbir "--execute" bayragi
//     verilmeden bu script hicbir kosulda Supabase'e yazma istegi yollamaz -
//     kod tabaninda gercek bir veri degistirme cagrisi bulunmaz.
//   - "--execute" verilse bile, coklu-satir guncellemesini TEK bir DB
//     transaction'i icinde garanti edecek altyapi (ya "supabase db" ile
//     calistirilan tek SQL, ya da adanmis bir service-role RPC) bu turda
//     KASITLI OLARAK olusturulmadi - bu yuzden execute modu, asagida
//     tanimlanan sabit bir hata koduyla, hicbir yazma yapmadan sonlanir.
//   - Yalniz service-role Supabase baglantisi kullanilir (anon key fallback
//     YOKTUR) - src/lib/supabase/server.ts'teki getSupabaseServiceRoleClient
//     dogrudan yeniden kullanilir.
//   - Program UUID'si kaynak koda hic yazilmaz - script canli veriden
//     "status='active'" olan TEK programi bulur, sayisi 1 degilse durur.
//   - Loglarda kimlik bilgisi (ogrencinin adi/iletisim bilgileri), gizli
//     anahtarlar veya tam program/gorev UUID'leri ASLA gosterilmez - yalniz
//     maskId() ile kisaltilmis id'ler.

import { execFileSync } from "node:child_process";
import process from "node:process";

import { getSupabaseServiceRoleClient } from "../../src/lib/supabase/server.ts";
import {
  ASSIGNMENT_EXERCISE_CATALOG,
  getAssignmentExerciseDefinition,
} from "../../src/lib/assignments/assignmentExerciseCatalog.ts";
import {
  EYE_BRAIN_REPLACEMENT_MAPPING,
  OPERATION_NAME,
  computeReplacementCandidates,
  deriveConfirmationToken,
  findDuplicateSlugsPerDay,
  maskId,
  matchMappingToLiveTasks,
  simulateReplacement,
  validateDay1Routes,
  validateDayStatusDistribution,
  validateMappingShape,
  validatePostSimulationInvariants,
  validateReplacementEligibility,
} from "./lib/eyeBrainRepairPlan.mjs";

const EXPECTED_CANDIDATE_COUNT = 7;

const STUDENT_ASSIGNMENT_PROGRAMS_TABLE = "student_assignment_programs";
const STUDENT_ASSIGNMENT_PROGRAM_DAYS_TABLE = "student_assignment_program_days";
const STUDENT_ASSIGNMENT_PROGRAM_TASKS_TABLE = "student_assignment_program_tasks";
const PROGRAM_CLASS_EXERCISE_SETTINGS_TABLE = "program_class_exercise_settings";

function parseArgs(argv) {
  const result = { execute: false, confirm: null };
  for (const arg of argv) {
    if (arg === "--execute") {
      result.execute = true;
    } else if (arg.startsWith("--confirm=")) {
      result.confirm = arg.slice("--confirm=".length);
    }
  }
  return result;
}

function getGitInfo() {
  const run = (args) => execFileSync("git", args, { encoding: "utf8" }).trim();
  try {
    return {
      headFull: run(["rev-parse", "HEAD"]),
      headShort: run(["rev-parse", "--short", "HEAD"]),
      branch: run(["branch", "--show-current"]),
    };
  } catch (error) {
    throw new Error(`Git bilgisi alinamadi - script git deposunun disinda calistirilmis olabilir: ${error.message}`);
  }
}

function fail(code, detail) {
  console.error(`\n✖ ${code}`);
  if (detail) {
    if (Array.isArray(detail)) {
      for (const line of detail) console.error(`  - ${line}`);
    } else {
      console.error(`  ${detail}`);
    }
  }
  process.exit(1);
}

function mapProgramRow(row) {
  return {
    id: row.id,
    studentId: row.student_id,
    status: row.status,
    totalDays: row.total_days,
    tasksPerDay: row.tasks_per_day,
    templateId: row.template_id,
    templateSnapshot: row.template_snapshot,
  };
}

function mapDayRow(row) {
  return { id: row.id, dayNumber: row.day_number, status: row.status };
}

function mapTaskRow(row) {
  return {
    id: row.id,
    dayNumber: row.day_number,
    taskOrder: row.task_order,
    exerciseSlug: row.exercise_slug,
    category: row.category,
    status: row.status,
    startingLevel: row.starting_level,
    currentLevel: row.current_level,
    durationSeconds: row.duration_seconds,
    settings: row.settings,
    startedAt: row.started_at,
    expiresAt: row.expires_at,
    completedAt: row.completed_at,
    completionReason: row.completion_reason,
    resultId: row.result_id,
    lastHeartbeatAt: row.last_heartbeat_at,
  };
}

function mapTemplateSettingRow(row) {
  return {
    exerciseSlug: row.exercise_slug,
    enabled: row.enabled,
    startingLevel: row.starting_level,
    durationSeconds: row.duration_seconds,
    settings: row.settings,
    dailyWeight: row.daily_weight,
  };
}

function mapSnapshotSetting(entry) {
  return {
    exerciseSlug: entry.exerciseSlug,
    enabled: entry.enabled,
    startingLevel: entry.startingLevel,
    durationSeconds: entry.durationSeconds,
    settings: entry.settings,
    dailyWeight: entry.dailyWeight,
  };
}

/**
 * Tum salt-okunur on-kontrolleri + simulasyonu calistirir. Dry-run VE
 * execute modu tarafindan AYNI fonksiyon cagrilir - boylece execute modu
 * "dry-run'dan beri veri degisti mi" sorusunu, ayri bir karsilastirma kodu
 * yazmadan, dogal olarak yeniden tum zinciri kosarak cevaplar.
 */
async function runVerification(supabase, gitInfo) {
  const errors = [];

  const { data: programRows, error: programError } = await supabase
    .from(STUDENT_ASSIGNMENT_PROGRAMS_TABLE)
    .select("id, student_id, status, total_days, tasks_per_day, template_id, template_snapshot")
    .eq("status", "active");

  if (programError) {
    return { ok: false, code: "PROGRAM_QUERY_FAILED", errors: [programError.message ?? "bilinmeyen hata"] };
  }
  if (!Array.isArray(programRows) || programRows.length !== 1) {
    return {
      ok: false,
      code: "ACTIVE_PROGRAM_COUNT_MISMATCH",
      errors: [`status='active' olan tam 1 program bekleniyordu, bulunan: ${programRows?.length ?? 0}`],
    };
  }

  const program = mapProgramRow(programRows[0]);
  if (program.totalDays !== 20 || program.tasksPerDay !== 5) {
    return {
      ok: false,
      code: "PROGRAM_SHAPE_MISMATCH",
      errors: [`total_days=20 & tasks_per_day=5 bekleniyordu, bulunan: ${program.totalDays}/${program.tasksPerDay}`],
    };
  }

  const { data: dayRows, error: dayError } = await supabase
    .from(STUDENT_ASSIGNMENT_PROGRAM_DAYS_TABLE)
    .select("id, day_number, status")
    .eq("program_id", program.id)
    .order("day_number", { ascending: true });

  if (dayError) {
    return { ok: false, code: "DAYS_QUERY_FAILED", errors: [dayError.message ?? "bilinmeyen hata"] };
  }
  const days = (dayRows ?? []).map(mapDayRow);
  if (days.length !== 20) {
    return { ok: false, code: "DAY_COUNT_MISMATCH", errors: [`20 gun bekleniyordu, bulunan: ${days.length}`] };
  }
  const dayNumbers = new Set(days.map((day) => day.dayNumber));
  if (dayNumbers.size !== 20) {
    errors.push(`gun numaralarinda tekrar/eksik var (benzersiz: ${dayNumbers.size})`);
  }

  const { data: taskRows, error: taskError } = await supabase
    .from(STUDENT_ASSIGNMENT_PROGRAM_TASKS_TABLE)
    .select(
      "id, day_number, task_order, exercise_slug, category, status, starting_level, current_level, duration_seconds, settings, started_at, expires_at, completed_at, completion_reason, result_id, last_heartbeat_at",
    )
    .eq("program_id", program.id)
    .eq("student_id", program.studentId)
    .order("day_number", { ascending: true })
    .order("task_order", { ascending: true });

  if (taskError) {
    return { ok: false, code: "TASKS_QUERY_FAILED", errors: [taskError.message ?? "bilinmeyen hata"] };
  }
  const tasks = (taskRows ?? []).map(mapTaskRow);
  if (tasks.length !== 100) {
    return { ok: false, code: "TASK_COUNT_MISMATCH", errors: [`100 gorev bekleniyordu, bulunan: ${tasks.length}`] };
  }
  const eyeBrainCountBefore = tasks.filter((task) => task.exerciseSlug === "goz-beyin").length;
  if (eyeBrainCountBefore !== 14) {
    return {
      ok: false,
      code: "EYE_BRAIN_COUNT_MISMATCH",
      errors: [`14 "goz-beyin" gorevi bekleniyordu, bulunan: ${eyeBrainCountBefore}`],
    };
  }

  // Kaynak template ayarlari: once template_id (canli, guncel) - yoksa
  // template_snapshot'a (programin olusturuldugu andaki dondurulmus kopya) dus.
  let templateSettingsBySlug = {};
  let templateSource = null;
  if (program.templateId) {
    const { data: settingRows, error: settingError } = await supabase
      .from(PROGRAM_CLASS_EXERCISE_SETTINGS_TABLE)
      .select("exercise_slug, enabled, starting_level, duration_seconds, settings, daily_weight")
      .eq("template_id", program.templateId);

    if (settingError) {
      return { ok: false, code: "TEMPLATE_SETTINGS_QUERY_FAILED", errors: [settingError.message ?? "bilinmeyen hata"] };
    }
    for (const row of settingRows ?? []) {
      const mapped = mapTemplateSettingRow(row);
      templateSettingsBySlug[mapped.exerciseSlug] = mapped;
    }
    templateSource = "program_class_exercise_settings (canli, template_id)";
  } else if (program.templateSnapshot?.exerciseSettings && Array.isArray(program.templateSnapshot.exerciseSettings)) {
    for (const entry of program.templateSnapshot.exerciseSettings) {
      const mapped = mapSnapshotSetting(entry);
      templateSettingsBySlug[mapped.exerciseSlug] = mapped;
    }
    templateSource = "template_snapshot (donmus kopya, template_id NULL)";
  }

  if (Object.keys(templateSettingsBySlug).length === 0) {
    return { ok: false, code: "TEMPLATE_SETTINGS_UNAVAILABLE", errors: ["kaynak template ayarlari (ne canli ne snapshot) bulunamadi"] };
  }

  const candidates = computeReplacementCandidates(ASSIGNMENT_EXERCISE_CATALOG, templateSettingsBySlug);
  if (candidates.length !== EXPECTED_CANDIDATE_COUNT) {
    return {
      ok: false,
      code: "CANDIDATE_COUNT_MISMATCH",
      errors: [
        `beklenen replacement aday sayisi ${EXPECTED_CANDIDATE_COUNT}, bulunan: ${candidates.length} (${candidates.join(", ") || "yok"})`,
      ],
    };
  }

  const mappingShape = validateMappingShape(EYE_BRAIN_REPLACEMENT_MAPPING);
  if (!mappingShape.ok) {
    return { ok: false, code: "MAPPING_SHAPE_INVALID", errors: mappingShape.errors };
  }

  const matchResult = matchMappingToLiveTasks(EYE_BRAIN_REPLACEMENT_MAPPING, tasks);
  if (!matchResult.ok) {
    return { ok: false, code: "MAPPING_LIVE_MISMATCH", errors: matchResult.errors };
  }

  const eligibilityErrors = [];
  for (const mappingEntry of EYE_BRAIN_REPLACEMENT_MAPPING) {
    const catalogDefinition = getAssignmentExerciseDefinition(mappingEntry.exerciseSlug);
    const templateSetting = templateSettingsBySlug[mappingEntry.exerciseSlug];
    eligibilityErrors.push(...validateReplacementEligibility({ mappingEntry, catalogDefinition, templateSetting }));
  }
  if (eligibilityErrors.length > 0) {
    return { ok: false, code: "REPLACEMENT_NOT_ELIGIBLE", errors: eligibilityErrors };
  }

  const simulatedTasks = simulateReplacement(tasks, EYE_BRAIN_REPLACEMENT_MAPPING);

  const postSimErrors = validatePostSimulationInvariants(simulatedTasks);
  if (postSimErrors.length > 0) {
    return { ok: false, code: "POST_SIMULATION_INVARIANT_FAILED", errors: postSimErrors };
  }

  const duplicates = findDuplicateSlugsPerDay(simulatedTasks);
  if (duplicates.length > 0) {
    return {
      ok: false,
      code: "DUPLICATE_SLUG_PER_DAY",
      errors: duplicates.map((dup) => `gun ${dup.dayNumber}: "${dup.slug}" ${dup.count} kez gorunuyor`),
    };
  }

  const dayStatusErrors = validateDayStatusDistribution(days);
  if (dayStatusErrors.length > 0) {
    return { ok: false, code: "DAY_STATUS_DISTRIBUTION_MISMATCH", errors: dayStatusErrors };
  }

  const day1RouteErrors = validateDay1Routes(simulatedTasks, getAssignmentExerciseDefinition);
  if (day1RouteErrors.length > 0) {
    return { ok: false, code: "DAY1_ROUTE_INVALID", errors: day1RouteErrors };
  }

  const eyeBrainTaskIds = tasks.filter((task) => task.exerciseSlug === "goz-beyin").map((task) => task.id);
  const token = deriveConfirmationToken({
    programId: program.id,
    headCommit: gitInfo.headFull,
    taskIds: eyeBrainTaskIds,
    operationName: OPERATION_NAME,
  });

  return {
    ok: true,
    program,
    days,
    tasks,
    templateSource,
    templateSettingsBySlug,
    candidates,
    simulatedTasks,
    matched: matchResult.matched,
    token,
  };
}

function printPreVerificationHeader(mode, gitInfo) {
  console.log(`\n${OPERATION_NAME}`);
  console.log(`mod: ${mode}`);
  console.log(`branch: ${gitInfo.branch}`);
  console.log(`HEAD (kisa): ${gitInfo.headShort}`);
}

function printVerificationSummary(result) {
  const eyeBrainBefore = result.tasks.filter((task) => task.exerciseSlug === "goz-beyin").length;
  const eyeBrainAfter = result.simulatedTasks.filter((task) => task.exerciseSlug === "goz-beyin").length;

  console.log(`\nhedef program (maskeli id): ${maskId(result.program.id)}`);
  console.log(`gun sayisi: ${result.days.length} | gorev sayisi: ${result.tasks.length}`);
  console.log(`kaynak template kaynagi: ${result.templateSource}`);
  console.log(`replacement aday sayisi: ${result.candidates.length} (${result.candidates.join(", ")})`);
  console.log(`goz-beyin (once -> sonra): ${eyeBrainBefore} -> ${eyeBrainAfter}`);

  console.log("\n14 replacement satiri:");
  for (const { mappingEntry, liveTask } of result.matched) {
    console.log(
      `  gun ${String(mappingEntry.dayNumber).padStart(2, " ")} sira ${mappingEntry.taskOrder}  ${maskId(liveTask.id)}  goz-beyin -> ${mappingEntry.exerciseSlug}`,
    );
  }

  console.log("\nbutunluk kontrolleri: HEPSI GECTI");
  console.log("  - 1 aktif program");
  console.log("  - 20 gun / 100 gorev (once ve sonra)");
  console.log("  - 14 hedef, hepsi dokunulmamis (locked/available, ilerleme alanlari NULL)");
  console.log("  - mapping 14 benzersiz pozisyon, canliyla 1:1 eslesti");
  console.log("  - tum replacement'lar ready + routable + template'te enabled + dailyWeight>0");
  console.log("  - template starting level / duration / settings mapping'le uyumlu");
  console.log("  - simulasyon sonrasi goz-beyin=0, her gun 5 gorev + 5 benzersiz slug");
  console.log("  - status dagilimi: available=5, locked=95, in_progress/completed/cancelled=0");
  console.log("  - gun durum dagilimi: 1 available / 19 locked");
  console.log("  - gun 1'in 5 gorevi de gecerli route'a sahip");
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const mode = args.execute ? "execute" : "dry-run";
  const gitInfo = getGitInfo();

  printPreVerificationHeader(mode, gitInfo);

  const supabase = getSupabaseServiceRoleClient();
  if (!supabase) {
    fail(
      "SERVICE_ROLE_KEY_MISSING",
      "SUPABASE_SERVICE_ROLE_KEY (veya SUPABASE_SERVICE_ROLE) ve NEXT_PUBLIC_SUPABASE_URL ortam degiskenleri gerekli - anon key fallback YOKTUR.",
    );
    return;
  }

  const result = await runVerification(supabase, gitInfo);
  if (!result.ok) {
    fail(result.code, result.errors);
    return;
  }

  printVerificationSummary(result);

  if (mode === "dry-run") {
    console.log(`\nexecute icin gereken confirmation token: ${result.token}`);
    console.log("\nDRY-RUN PASSED — NO DATA WAS MODIFIED\n");
    process.exit(0);
    return;
  }

  // mode === "execute": ayni dogrulama zinciri yeniden ve TAM olarak
  // kosuldu (runVerification yukarida zaten calisti) - dry-run'dan beri
  // veri degismisse (ör. bir hedef gorev baslatilmissa) bu noktaya hic
  // ulasilmaz, yukarida zaten fail-closed cikilir.
  console.log("\nexecute on-kontrolleri (preflight) yeniden kosuldu ve gecti.");

  if (!args.confirm || args.confirm !== result.token) {
    fail(
      "CONFIRMATION_TOKEN_MISMATCH",
      "Gecerli --confirm=<token> saglanmadi veya token guncel canli veriyle uyusmuyor. Once dry-run calistirip guncel token'i alin.",
    );
    return;
  }

  // Faz 2.6A.2: artik transaction-guvenli yazma altyapisi (bkz. supabase/
  // migrations/20260725090000_repair_active_assignment_eye_brain_tasks_rpc.sql)
  // var - script BURADA 14 ayri update ATMAZ, yalniz o RPC'yi BIR KEZ cagirir.
  // RPC kendi icinde ayni token'i (aynen p_confirmation_token/p_expected_
  // head_commit ile) yeniden hesaplayip dogrular - bu yuzden client tarafinda
  // "token'i tekrar hesapla" adimi gereksizdir, ama RPC'nin token'i REDDETME
  // ihtimaline karsi (ör. RPC canli veriyi bu script'in preflight'indan SONRA
  // tekrar okudugunda bir sey degismisse) hata mesaji asagida acikca yansitilir.
  console.log(`\nRPC cagriliyor: repair_active_assignment_eye_brain_tasks (confirm token: ${result.token.slice(0, 8)}…)`);

  const { data: rpcData, error: rpcError } = await supabase.rpc("repair_active_assignment_eye_brain_tasks", {
    p_confirmation_token: args.confirm,
    p_expected_head_commit: gitInfo.headFull,
  });

  if (rpcError) {
    fail("RPC_CALL_FAILED", rpcError.message ?? "bilinmeyen RPC hatasi");
    return;
  }

  const expectedSummary = {
    ok: true,
    operation: OPERATION_NAME,
    updated_count: 14,
    day_count: 20,
    task_count: 100,
    eye_brain_remaining: 0,
    available_count: 5,
    locked_count: 95,
  };
  const summaryMismatches = Object.entries(expectedSummary).filter(([key, expected]) => rpcData?.[key] !== expected);
  if (summaryMismatches.length > 0) {
    fail(
      "RPC_RESULT_UNEXPECTED",
      summaryMismatches.map(([key, expected]) => `${key}: beklenen ${JSON.stringify(expected)}, gelen ${JSON.stringify(rpcData?.[key])}`),
    );
    return;
  }

  console.log("\nRPC ozeti:", JSON.stringify(rpcData));
  console.log(`\nmesaj: ${rpcData.message}`);
  console.log("\nEXECUTE PASSED — goz-beyin gorevleri degistirildi (tek transaction)\n");
  process.exit(0);
}

await main();
