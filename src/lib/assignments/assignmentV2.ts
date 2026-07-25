export type AssignmentTaskConfig = {
  taskId: string;
  exerciseSlug: string;
  route: string;
  title: string;
  dayNumber: number;
  taskOrder: number;
  startingLevel: number;
  durationSeconds: number;
  settings: Record<string, string | number | boolean>;
  taskStatus: string;
  dayStatus: string;
  canStart: boolean;
  assignmentV2Enabled: boolean;
};

export type AssignmentResultSnapshot = {
  score: number;
  successRate: number;
  correctCount: number;
  wrongCount: number;
  level?: number | null;
  details: Record<string, unknown>;
};

type AssignmentResultSnapshotInput = {
  score: unknown;
  successRate: unknown;
  correctCount: unknown;
  wrongCount: unknown;
  level?: unknown;
  details?: Record<string, unknown>;
};

function clampFiniteNumber(value: unknown, minimum: number, maximum: number): number {
  if (typeof value !== "number" || !Number.isFinite(value)) return minimum;
  return Math.min(maximum, Math.max(minimum, value));
}

/**
 * Egzersiz adapter'larinin deadline aninda uretecegi snapshot'i ortak V2
 * semasina getirir. Kimlik, sure ve completion alanlari client detaylarina
 * eklenmez; bunlar complete-v2 tarafinda sunucu tarafindan belirlenir.
 */
export function createAssignmentResultSnapshot(
  input: AssignmentResultSnapshotInput,
): AssignmentResultSnapshot {
  const normalizedLevel =
    typeof input.level === "number" && Number.isFinite(input.level)
      ? Math.min(1000, Math.max(1, Math.trunc(input.level)))
      : null;

  return {
    score: clampFiniteNumber(input.score, -1_000_000, 1_000_000),
    successRate: clampFiniteNumber(input.successRate, 0, 100),
    correctCount: Math.trunc(clampFiniteNumber(input.correctCount, 0, 100_000)),
    wrongCount: Math.trunc(clampFiniteNumber(input.wrongCount, 0, 100_000)),
    level: normalizedLevel,
    details: input.details ?? {},
  };
}

export type AssignmentStartRequest = {
  attemptId: string;
  exerciseSlug: string;
};

export type AssignmentStartResponse = {
  ok: true;
  taskId: string;
  attemptId: string;
  startedAt: string;
  expiresAt: string;
  serverNow: string;
  durationSeconds: number;
  taskStatus: string;
  dayStatus: string;
  idempotent: boolean;
};

export type AssignmentCompletionRequest = {
  attemptId: string;
  exerciseSlug: string;
  result: AssignmentResultSnapshot;
};

export type AssignmentCompletionResponse = {
  ok: true;
  idempotent: boolean;
  taskId: string;
  attemptId: string;
  resultId: string;
  taskCompleted: boolean;
  dayCompleted: boolean;
  completedTasksInDay: number;
  totalTasksInDay: number;
  nextDayUnlocked: boolean;
  programCompleted: boolean;
  completedDays: number;
  totalDays: number;
  serverCompletedAt: string;
};

export type AssignmentV2ErrorCode =
  | "SESSION_REQUIRED"
  | "ACCESS_DENIED"
  | "ASSIGNMENT_V2_DISABLED"
  | "ASSIGNMENT_V2_COMPLETION_REQUIRED"
  | "ASSIGNMENT_V2_RESULT_ROUTE_DISABLED"
  | "ASSIGNMENT_V2_LEGACY_PATH_BLOCKED"
  | "ASSIGNMENT_V2_GUARD_UNAVAILABLE"
  | "INVALID_REQUEST_BODY"
  | "INVALID_STUDENT_ID"
  | "INVALID_TASK_ID"
  | "INVALID_ATTEMPT_ID"
  | "INVALID_EXERCISE_SLUG"
  | "TASK_NOT_FOUND"
  | "TASK_NOT_OWNED"
  | "PROGRAM_NOT_ACTIVE"
  | "DAY_LOCKED"
  | "DAY_ALREADY_COMPLETED"
  | "NOT_CURRENT_DAY"
  | "TASK_LOCKED"
  | "TASK_NOT_STARTED"
  | "TASK_ALREADY_COMPLETED"
  | "TASK_CANCELLED"
  | "ATTEMPT_ID_ALREADY_IN_USE"
  | "STALE_ATTEMPT"
  | "INVALID_ATTEMPT_STATE"
  | "INVALID_TASK_DURATION"
  | "EXERCISE_MISMATCH"
  | "EXERCISE_ROUTE_MISMATCH"
  | "DURATION_NOT_ELAPSED"
  | "RESULT_SCHEMA_INVALID"
  | "INVALID_RESULT_PAYLOAD"
  | "ALREADY_COMPLETED_BY_ANOTHER_ATTEMPT"
  | "DATA_INTEGRITY_ERROR"
  | "CONFIG_UNAVAILABLE"
  | "V2_ADAPTER_NOT_READY"
  | "NETWORK_ERROR"
  | "UNKNOWN_ERROR";

export type AssignmentV2Error = {
  code: AssignmentV2ErrorCode;
  message: string;
  remainingSeconds?: number;
};

export type AssignmentV2ErrorResponse = {
  ok: false;
  error: AssignmentV2Error;
};

export type AssignmentV2RpcErrorMapping = AssignmentV2Error & {
  status: number;
};

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

const ERROR_MAPPINGS: Record<AssignmentV2ErrorCode, Omit<AssignmentV2RpcErrorMapping, "code">> = {
  SESSION_REQUIRED: { status: 401, message: "Oturumunuz sona erdi. Lütfen tekrar giriş yapın." },
  ACCESS_DENIED: { status: 403, message: "Bu işlem için yetkiniz bulunmuyor." },
  ASSIGNMENT_V2_DISABLED: { status: 409, message: "Ödev V2 akışı şu anda etkin değil." },
  ASSIGNMENT_V2_COMPLETION_REQUIRED: {
    status: 409,
    message: "Bu görev yeni ödev tamamlama akışıyla tamamlanmalıdır.",
  },
  ASSIGNMENT_V2_RESULT_ROUTE_DISABLED: {
    status: 409,
    message: "Atanmış görev sonuçları yeni ödev tamamlama akışıyla kaydedilmelidir.",
  },
  ASSIGNMENT_V2_LEGACY_PATH_BLOCKED: {
    status: 409,
    message: "Bu atanmış görev eski sonuç kayıt akışını kullanamaz.",
  },
  ASSIGNMENT_V2_GUARD_UNAVAILABLE: {
    status: 500,
    message: "Ödev akışı güvenli biçimde doğrulanamadı.",
  },
  INVALID_REQUEST_BODY: { status: 400, message: "Gönderilen istek gövdesi geçersiz." },
  INVALID_STUDENT_ID: { status: 400, message: "Öğrenci kimliği geçersiz." },
  INVALID_TASK_ID: { status: 400, message: "Görev kimliği geçersiz." },
  INVALID_ATTEMPT_ID: { status: 400, message: "Çalışma oturumu kimliği geçersiz." },
  INVALID_EXERCISE_SLUG: { status: 400, message: "Egzersiz kimliği geçersiz." },
  TASK_NOT_FOUND: { status: 404, message: "Görev bulunamadı." },
  TASK_NOT_OWNED: { status: 403, message: "Bu görev öğrenciye ait değil." },
  PROGRAM_NOT_ACTIVE: { status: 409, message: "Ödev programı aktif durumda değil." },
  DAY_LOCKED: { status: 409, message: "Bu program günü henüz açık değil." },
  DAY_ALREADY_COMPLETED: { status: 409, message: "Bu program günü zaten tamamlanmış." },
  NOT_CURRENT_DAY: { status: 409, message: "Bu görev sıradaki açık program gününde değil." },
  TASK_LOCKED: { status: 409, message: "Bu görev henüz açık değil." },
  TASK_NOT_STARTED: { status: 409, message: "Görev için geçerli bir çalışma başlatılmamış." },
  TASK_ALREADY_COMPLETED: { status: 409, message: "Bu görev zaten tamamlanmış." },
  TASK_CANCELLED: { status: 409, message: "Bu görev iptal edilmiş." },
  ATTEMPT_ID_ALREADY_IN_USE: {
    status: 409,
    message: "Çalışma oturumu kimliği başka bir görevde kullanılıyor.",
  },
  STALE_ATTEMPT: {
    status: 409,
    message: "Bu çalışma oturumu artık geçerli değil. Lütfen çalışmayı yeniden başlatın.",
  },
  INVALID_ATTEMPT_STATE: { status: 422, message: "Çalışma oturumunun sunucu durumu geçersiz." },
  INVALID_TASK_DURATION: { status: 422, message: "Görev süresi geçersiz." },
  EXERCISE_MISMATCH: { status: 422, message: "Egzersiz bu görevle eşleşmiyor." },
  EXERCISE_ROUTE_MISMATCH: { status: 409, message: "Görev yanlış egzersiz sayfasında açılmış." },
  DURATION_NOT_ELAPSED: { status: 409, message: "Görev süresi henüz dolmadı." },
  RESULT_SCHEMA_INVALID: { status: 422, message: "Egzersiz sonucu beklenen biçimde değil." },
  INVALID_RESULT_PAYLOAD: { status: 422, message: "Egzersiz sonucu geçersiz." },
  ALREADY_COMPLETED_BY_ANOTHER_ATTEMPT: {
    status: 409,
    message: "Görev başka bir çalışma oturumuyla tamamlanmış.",
  },
  DATA_INTEGRITY_ERROR: { status: 409, message: "Görev verileri tutarlı değil." },
  CONFIG_UNAVAILABLE: { status: 500, message: "Görev bilgileri alınamadı." },
  V2_ADAPTER_NOT_READY: { status: 422, message: "V2 adapter hazır değil." },
  NETWORK_ERROR: { status: 500, message: "Bağlantı kurulamadı. Lütfen tekrar deneyin." },
  UNKNOWN_ERROR: { status: 500, message: "İşlem tamamlanamadı. Lütfen tekrar deneyin." },
};

const RPC_ERROR_CODES = new Set<AssignmentV2ErrorCode>([
  "INVALID_STUDENT_ID",
  "INVALID_TASK_ID",
  "INVALID_ATTEMPT_ID",
  "INVALID_EXERCISE_SLUG",
  "TASK_NOT_FOUND",
  "TASK_NOT_OWNED",
  "PROGRAM_NOT_ACTIVE",
  "DAY_LOCKED",
  "DAY_ALREADY_COMPLETED",
  "NOT_CURRENT_DAY",
  "TASK_LOCKED",
  "TASK_NOT_STARTED",
  "TASK_ALREADY_COMPLETED",
  "TASK_CANCELLED",
  "ATTEMPT_ID_ALREADY_IN_USE",
  "STALE_ATTEMPT",
  "INVALID_ATTEMPT_STATE",
  "INVALID_TASK_DURATION",
  "EXERCISE_MISMATCH",
  "DURATION_NOT_ELAPSED",
  "RESULT_SCHEMA_INVALID",
  "INVALID_RESULT_PAYLOAD",
  "ALREADY_COMPLETED_BY_ANOTHER_ATTEMPT",
  "DATA_INTEGRITY_ERROR",
]);

export function isAssignmentUuid(value: unknown): value is string {
  return typeof value === "string" && UUID_PATTERN.test(value);
}

export function isPlainRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

export function assignmentV2Error(code: AssignmentV2ErrorCode): AssignmentV2RpcErrorMapping {
  return { code, ...ERROR_MAPPINGS[code] };
}

export function isAssignmentV2ErrorCode(value: unknown): value is AssignmentV2ErrorCode {
  return typeof value === "string" && value in ERROR_MAPPINGS;
}

export function mapAssignmentV2RpcError(rawMessage: string): AssignmentV2RpcErrorMapping {
  const separatorIndex = rawMessage.indexOf(":");
  const rawCode = (separatorIndex === -1 ? rawMessage : rawMessage.slice(0, separatorIndex)).trim();
  const code = RPC_ERROR_CODES.has(rawCode as AssignmentV2ErrorCode)
    ? (rawCode as AssignmentV2ErrorCode)
    : "UNKNOWN_ERROR";
  const mapped = assignmentV2Error(code);

  if (code !== "DURATION_NOT_ELAPSED") {
    return mapped;
  }

  const match = rawMessage.match(/\bremainingSeconds=(\d+)\b/);
  if (!match) {
    return mapped;
  }

  const remainingSeconds = Number(match[1]);
  return Number.isSafeInteger(remainingSeconds) && remainingSeconds >= 0
    ? { ...mapped, remainingSeconds }
    : mapped;
}

export function parseAssignmentStartRequest(value: unknown): AssignmentStartRequest | null {
  if (!isPlainRecord(value)) return null;
  if (Object.keys(value).some((key) => !["attemptId", "exerciseSlug"].includes(key))) return null;
  const exerciseSlug = typeof value.exerciseSlug === "string" ? value.exerciseSlug.trim() : "";
  if (!isAssignmentUuid(value.attemptId) || !exerciseSlug) return null;
  return { attemptId: value.attemptId, exerciseSlug };
}

export function isAssignmentResultSnapshot(value: unknown): value is AssignmentResultSnapshot {
  if (!isPlainRecord(value)) return false;
  if (
    Object.keys(value).some(
      (key) => !["score", "successRate", "correctCount", "wrongCount", "level", "details"].includes(key),
    )
  ) {
    return false;
  }

  const levelIsValid =
    value.level === undefined ||
    value.level === null ||
    (Number.isSafeInteger(value.level) && Number(value.level) >= 1 && Number(value.level) <= 1000);
  const detailsAreSafe =
    isPlainRecord(value.details) &&
    !Object.keys(value.details).some((key) =>
      [
        "studentid",
        "student_id",
        "programtaskid",
        "program_task_id",
        "attemptid",
        "attempt_id",
        "durationseconds",
        "duration_seconds",
        "duration",
        "exercisetype",
        "exercise_type",
        "completedat",
        "completed_at",
      ].includes(key.toLowerCase()),
    );

  return (
    typeof value.score === "number" &&
    Number.isFinite(value.score) &&
    value.score >= -1_000_000 &&
    value.score <= 1_000_000 &&
    typeof value.successRate === "number" &&
    Number.isFinite(value.successRate) &&
    value.successRate >= 0 &&
    value.successRate <= 100 &&
    Number.isSafeInteger(value.correctCount) &&
    Number(value.correctCount) >= 0 &&
    Number(value.correctCount) <= 100_000 &&
    Number.isSafeInteger(value.wrongCount) &&
    Number(value.wrongCount) >= 0 &&
    Number(value.wrongCount) <= 100_000 &&
    levelIsValid &&
    detailsAreSafe
  );
}

export function parseAssignmentCompletionRequest(value: unknown): AssignmentCompletionRequest | null {
  if (!isPlainRecord(value)) return null;
  if (Object.keys(value).some((key) => !["attemptId", "exerciseSlug", "result"].includes(key))) return null;
  const exerciseSlug = typeof value.exerciseSlug === "string" ? value.exerciseSlug.trim() : "";
  if (!isAssignmentUuid(value.attemptId) || !exerciseSlug || !isAssignmentResultSnapshot(value.result)) {
    return null;
  }
  return { attemptId: value.attemptId, exerciseSlug, result: value.result };
}

function isIsoDate(value: unknown): value is string {
  return typeof value === "string" && value.length > 0 && Number.isFinite(Date.parse(value));
}

function isNonNegativeInteger(value: unknown): value is number {
  return Number.isSafeInteger(value) && Number(value) >= 0;
}

export function normalizeAssignmentStartResponse(value: unknown): AssignmentStartResponse | null {
  if (!isPlainRecord(value)) return null;
  if (
    !isAssignmentUuid(value.taskId) ||
    !isAssignmentUuid(value.attemptId) ||
    !isIsoDate(value.startedAt) ||
    !isIsoDate(value.expiresAt) ||
    !isIsoDate(value.serverNow) ||
    !Number.isSafeInteger(value.durationSeconds) ||
    Number(value.durationSeconds) <= 0 ||
    typeof value.taskStatus !== "string" ||
    typeof value.dayStatus !== "string" ||
    typeof value.idempotent !== "boolean"
  ) {
    return null;
  }

  return {
    ok: true,
    taskId: value.taskId,
    attemptId: value.attemptId,
    startedAt: value.startedAt,
    expiresAt: value.expiresAt,
    serverNow: value.serverNow,
    durationSeconds: value.durationSeconds as number,
    taskStatus: value.taskStatus,
    dayStatus: value.dayStatus,
    idempotent: value.idempotent,
  };
}

export function normalizeAssignmentCompletionResponse(
  value: unknown,
): AssignmentCompletionResponse | null {
  if (!isPlainRecord(value)) return null;
  if (
    value.ok !== true ||
    typeof value.idempotent !== "boolean" ||
    !isAssignmentUuid(value.taskId) ||
    !isAssignmentUuid(value.attemptId) ||
    !isAssignmentUuid(value.resultId) ||
    typeof value.taskCompleted !== "boolean" ||
    typeof value.dayCompleted !== "boolean" ||
    !isNonNegativeInteger(value.completedTasksInDay) ||
    !isNonNegativeInteger(value.totalTasksInDay) ||
    typeof value.nextDayUnlocked !== "boolean" ||
    typeof value.programCompleted !== "boolean" ||
    !isNonNegativeInteger(value.completedDays) ||
    !isNonNegativeInteger(value.totalDays) ||
    !isIsoDate(value.serverCompletedAt)
  ) {
    return null;
  }

  return {
    ok: true,
    idempotent: value.idempotent,
    taskId: value.taskId,
    attemptId: value.attemptId,
    resultId: value.resultId,
    taskCompleted: value.taskCompleted,
    dayCompleted: value.dayCompleted,
    completedTasksInDay: value.completedTasksInDay,
    totalTasksInDay: value.totalTasksInDay,
    nextDayUnlocked: value.nextDayUnlocked,
    programCompleted: value.programCompleted,
    completedDays: value.completedDays,
    totalDays: value.totalDays,
    serverCompletedAt: value.serverCompletedAt,
  };
}

export function calculateAssignmentDeadlineMs(
  serverNow: string,
  expiresAt: string,
  clientNowMs: number,
): number | null {
  const serverNowMs = Date.parse(serverNow);
  const expiresAtMs = Date.parse(expiresAt);
  if (!Number.isFinite(serverNowMs) || !Number.isFinite(expiresAtMs) || !Number.isFinite(clientNowMs)) {
    return null;
  }
  return clientNowMs + Math.max(0, expiresAtMs - serverNowMs);
}

export function calculateAssignmentRemainingSeconds(deadlineMs: number, nowMs: number): number {
  if (!Number.isFinite(deadlineMs) || !Number.isFinite(nowMs)) return 0;
  return Math.max(0, Math.ceil((deadlineMs - nowMs) / 1000));
}

export function formatAssignmentClock(totalSeconds: number): string {
  const safe = Math.max(0, Math.floor(totalSeconds));
  const minutes = Math.floor(safe / 60);
  const seconds = safe % 60;
  return `${minutes.toString().padStart(2, "0")}:${seconds.toString().padStart(2, "0")}`;
}
