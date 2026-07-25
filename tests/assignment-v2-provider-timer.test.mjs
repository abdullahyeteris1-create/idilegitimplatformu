import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import {
  calculateAssignmentDeadlineMs,
  calculateAssignmentRemainingSeconds,
  formatAssignmentClock,
} from "../src/lib/assignments/assignmentV2.ts";

const PROVIDER_URL = new URL("../src/components/assignments/AssignmentTaskProvider.tsx", import.meta.url);
const TIMER_URL = new URL("../src/components/assignments/AssignmentTaskTimer.tsx", import.meta.url);
const STORAGE_URL = new URL("../src/lib/results/secureResultStorage.ts", import.meta.url);
const OLD_COMPLETE_URL = new URL(
  "../src/app/api/student/assignment-program-tasks/[taskId]/complete/route.ts",
  import.meta.url,
);
const START_MIGRATION_URL = new URL(
  "../supabase/migrations/20260725170000_add_assignment_task_attempt_start.sql",
  import.meta.url,
);
const COMPLETE_MIGRATION_URL = new URL(
  "../supabase/migrations/20260725180000_add_atomic_assignment_task_completion.sql",
  import.meta.url,
);
const read = (url) => readFile(url, "utf8");

test("25 provider: programTaskId yoksa free mode ve istek yok", async () => {
  const source = await read(PROVIDER_URL);
  assert.match(source, /useState<AssignmentState>\("free"\)/);
  assert.match(source, /if \(!taskId\) return;/);
});

test("26 provider: programTaskId varsa config-loading state'ine geçer", async () => {
  const source = await read(PROVIDER_URL);
  assert.match(source, /setAssignmentMode\(true\)/);
  assert.match(source, /transition\("config-loading"\)/);
});

test("27 provider: config hatasında task null kalır ve free fallback yapılmaz", async () => {
  const source = await read(PROVIDER_URL);
  assert.match(source, /updateTaskConfig\(null\)/);
  assert.match(source, /setError\(safeApiError\(payload, "CONFIG_UNAVAILABLE"\)\)/);
  assert.match(source, /transition\("error"\)/);
});

test("28 provider: start cevabı doğrulanmadan running olmaz", async () => {
  const source = await read(PROVIDER_URL);
  const startSection = source.slice(source.indexOf("const startAssignment"));
  assert.ok(startSection.indexOf("normalizeAssignmentStartResponse") < startSection.indexOf('transition("running")'));
});

test("29 provider: attempt kimliği yalnız crypto.randomUUID ile bellekte üretilir", async () => {
  const source = await read(PROVIDER_URL);
  assert.match(source, /crypto\.randomUUID\(\)/);
  assert.match(source, /attemptIdRef/);
  assert.doesNotMatch(source, /localStorage|sessionStorage|indexedDB/);
});

test("30 provider: start retry var olan attemptIdRef değerini yeniden kullanır", async () => {
  const source = await read(PROVIDER_URL);
  assert.match(source, /let currentAttemptId = attemptIdRef\.current/);
  assert.match(source, /if \(!currentAttemptId\)[\s\S]*crypto\.randomUUID/);
});

test("31 provider: attempt URL'ye veya kalıcı storage'a yazılmaz", async () => {
  const source = await read(PROVIDER_URL);
  assert.doesNotMatch(source, /setItem|replaceState|pushState|attemptId=/);
});

test("32 provider: completion response commit doğrulanmadan completed state yok", async () => {
  const source = await read(PROVIDER_URL);
  const completion = source.slice(source.indexOf("const sendCompletion"), source.indexOf("const completeAssignment"));
  assert.match(completion, /normalizeAssignmentCompletionResponse/);
  assert.match(completion, /normalized\.taskCompleted/);
  assert.ok(completion.indexOf("normalizeAssignmentCompletionResponse") < completion.indexOf('transition("completed")'));
});

test("33 provider: STALE_ATTEMPT özel state üretir", async () => {
  const source = await read(PROVIDER_URL);
  assert.match(source, /apiError\.code === "STALE_ATTEMPT"/);
  assert.match(source, /transition\("stale-attempt"\)/);
});

test("34 provider: adapter yoksa completion çağrısı yapılmaz", async () => {
  const source = await read(PROVIDER_URL);
  const prepare = source.slice(source.indexOf("const prepareDeadlineResult"), source.indexOf("useEffect(() =>", source.indexOf("const prepareDeadlineResult")));
  assert.match(prepare, /if \(!snapshotProvider\)/);
  assert.match(prepare, /V2_ADAPTER_NOT_READY/);
  assert.ok(prepare.indexOf("if (!snapshotProvider)") < prepare.indexOf("sendCompletion(snapshot)"));
});

test("35 timer: serverNow/expiresAt istemci deadline'ına çevrilir", () => {
  const deadline = calculateAssignmentDeadlineMs(
    "2026-07-25T10:00:00.000Z",
    "2026-07-25T10:05:00.000Z",
    1_000_000,
  );
  assert.equal(deadline, 1_300_000);
  assert.equal(calculateAssignmentRemainingSeconds(deadline, 1_000_000), 300);
});

test("36 timer: 300 saniye 05:00 gösterilir", () => {
  assert.equal(formatAssignmentClock(300), "05:00");
});

test("37 timer: son 30 saniye state'i running ile sınırlıdır", async () => {
  const source = await read(PROVIDER_URL);
  assert.match(source, /assignmentState === "running"[\s\S]*remainingSeconds > 0[\s\S]*remainingSeconds <= 30/);
});

test("38 timer: visibilitychange görünür olduğunda resync yapar", async () => {
  const source = await read(PROVIDER_URL);
  assert.match(source, /document\.visibilityState === "visible"\) synchronize\(\)/);
  assert.match(source, /addEventListener\("visibilitychange", handleVisibilityChange\)/);
});

test("39 timer: window focus olduğunda resync yapar", async () => {
  const source = await read(PROVIDER_URL);
  assert.match(source, /window\.addEventListener\("focus", synchronize\)/);
});

test("40 timer: 00:00 otomatik success değil result hazırlama akışıdır", async () => {
  const source = await read(PROVIDER_URL);
  const countdown = source.slice(source.indexOf("const synchronize"), source.indexOf("const startAssignment"));
  assert.match(countdown, /nextRemaining === 0[\s\S]*prepareDeadlineResult/);
  assert.doesNotMatch(countdown, /transition\("completed"\)/);
});

test("41 timer: DURATION_NOT_ELAPSED remainingSeconds ile deadline resync eder", async () => {
  const source = await read(PROVIDER_URL);
  assert.match(source, /apiError\.code === "DURATION_NOT_ELAPSED"/);
  assert.match(source, /apiError\.remainingSeconds \* 1000/);
  assert.match(source, /transition\("running"\)/);
});

test("42 timer: legacy dal eski deadline, empty-body complete ve event akışını korur", async () => {
  const source = await read(TIMER_URL);
  assert.match(source, /function LegacyAssignmentTaskTimer/);
  assert.match(source, /Date\.now\(\) \+ task\.durationSeconds \* 1000/);
  assert.match(source, /body: JSON\.stringify\(\{\}\)/);
  assert.match(source, /PROGRAM_TASK_COMPLETED_EVENT/);
});

test("43 değişiklik altyapısı ayrı Phase 3 dosyalarında tutulur", async () => {
  const provider = await read(PROVIDER_URL);
  const timer = await read(TIMER_URL);
  assert.match(provider, /registerResultSnapshotProvider/);
  assert.match(timer, /V2 adapter hazır değil/);
});

test("44 dokuz egzersiz adapter'ı bu fazda merkezi provider tarafından otomatik bağlanmaz", async () => {
  const source = await read(PROVIDER_URL);
  assert.doesNotMatch(source, /kare-gorme-alani|ayni-olani-yakala|takistoskop|kart-eslestirme/);
});

test("45 Faz 1 ve Faz 2 migration sözleşmeleri yerinde durur", async () => {
  const [startSql, completeSql] = await Promise.all([
    read(START_MIGRATION_URL),
    read(COMPLETE_MIGRATION_URL),
  ]);
  assert.match(startSql, /start_student_assignment_program_task/);
  assert.match(completeSql, /complete_student_assignment_program_task_v2/);
});

test("46 eski completion RPC ve route korunur", async () => {
  const source = await read(OLD_COMPLETE_URL);
  assert.match(source, /complete_student_assignment_program_task/);
  assert.match(source, /body.*resultId|resultId/s);
});

test("47 secureResultStorage serbest/legacy sonuç API akışını korur", async () => {
  const source = await read(STORAGE_URL);
  assert.match(source, /fetch\("\/api\/student\/results"/);
  assert.match(source, /completeProgramTask/);
  assert.match(source, /emitProgramTaskCompleted/);
});

test("V2 UI durum metinleri yalnız gerçek completion sonucunda başarı gösterir", async () => {
  const source = await read(TIMER_URL);
  assert.match(source, /Görev hazırlanıyor/);
  assert.match(source, /Çalışma başlatılıyor/);
  assert.match(source, /Sonuç hazırlanıyor/);
  assert.match(source, /Kaydediliyor/);
  assert.match(source, /assignmentState === "completed" && assignment\.completionResult/);
  assert.match(source, /Ödevlerime Dön/);
});
