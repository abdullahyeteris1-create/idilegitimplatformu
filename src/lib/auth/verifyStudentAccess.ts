import type { NextRequest } from "next/server";
import {
  parseSessionVersion,
  readStudentSessionToken,
  STUDENT_SESSION_COOKIE_NAME,
  STUDENT_SESSION_EXPIRED_MESSAGE,
} from "@/lib/auth/studentSession";
import { checkStudentDateAccess } from "@/lib/students/studentAccessDates";
import { getSupabaseServiceRoleClient } from "@/lib/supabase/server";
import { canAccessParagraphExercises } from "@/lib/paragraph-exercises/paragraphAccessPolicy";

const STUDENTS_TABLE = process.env.NEXT_PUBLIC_SUPABASE_STUDENTS_TABLE ?? "students";
const PASSIVE_STUDENT_MESSAGE = "Bu ogrenci hesabi pasif durumda.";
const ACCESS_CHECK_FAILED_MESSAGE = "Ogrenci erisimi dogrulanamadi. Lutfen tekrar deneyin.";
const TRANSIENT_ACCESS_MESSAGE = "Ogrenci erisimi gecici olarak dogrulanamadi. Lutfen tekrar deneyin.";
const STUDENT_ACCESS_RETRY_DELAY_MS = 150;
const STUDENT_ACCESS_MAX_ATTEMPTS = 2;
const TRANSIENT_HTTP_STATUSES = new Set([408, 502, 503, 504, 520, 521, 522, 523, 524]);
const TRANSIENT_NETWORK_CODES = new Set([
  "ECONNREFUSED",
  "ECONNRESET",
  "EAI_AGAIN",
  "ETIMEDOUT",
  "UND_ERR_CONNECT_TIMEOUT",
  "UND_ERR_HEADERS_TIMEOUT",
  "UND_ERR_SOCKET",
]);

type SupabaseErrorLike = {
  code?: unknown;
  message?: unknown;
  details?: unknown;
  hint?: unknown;
  status?: unknown;
  statusCode?: unknown;
  cause?: unknown;
};

type StudentAccessQueryResult<T> = {
  data: T;
  error: SupabaseErrorLike | null;
  status?: number;
  statusText?: string;
};

function readObject(value: unknown): SupabaseErrorLike | null {
  return typeof value === "object" && value !== null ? value as SupabaseErrorLike : null;
}

function readHttpStatus(value: unknown): number | null {
  if (typeof value === "number" && Number.isInteger(value)) return value;
  if (typeof value === "string" && /^\d{3}$/.test(value)) return Number(value);
  return null;
}

export function isTransientStudentAccessError(error: unknown, responseStatus?: number): boolean {
  if (responseStatus !== undefined && TRANSIENT_HTTP_STATUSES.has(responseStatus)) {
    return true;
  }

  const record = readObject(error);
  if (!record) return false;

  const errorStatus = readHttpStatus(record.status) ?? readHttpStatus(record.statusCode);
  if (errorStatus !== null && TRANSIENT_HTTP_STATUSES.has(errorStatus)) {
    return true;
  }

  const code = typeof record.code === "string" ? record.code.toUpperCase() : "";
  if (
    /^PGRST00[0-3]$/.test(code) ||
    code.startsWith("08") ||
    code.startsWith("53") ||
    TRANSIENT_NETWORK_CODES.has(code)
  ) {
    return true;
  }

  const cause = readObject(record.cause);
  const causeCode = typeof cause?.code === "string" ? cause.code.toUpperCase() : "";
  if (TRANSIENT_NETWORK_CODES.has(causeCode)) {
    return true;
  }

  const message = typeof record.message === "string" ? record.message : "";
  return /gateway timeout|request timeout|timed out|fetch failed|network error/i.test(message);
}

function waitForStudentAccessRetry(): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, STUDENT_ACCESS_RETRY_DELAY_MS));
}

export async function runStudentAccessQueryWithRetry<T>(
  query: () => PromiseLike<StudentAccessQueryResult<T>>,
): Promise<StudentAccessQueryResult<T>> {
  for (let attempt = 0; attempt < STUDENT_ACCESS_MAX_ATTEMPTS; attempt += 1) {
    try {
      const result = await query();
      const shouldRetry =
        result.error !== null &&
        attempt + 1 < STUDENT_ACCESS_MAX_ATTEMPTS &&
        isTransientStudentAccessError(result.error, result.status);

      if (!shouldRetry) {
        return result;
      }
    } catch (error) {
      if (
        attempt + 1 >= STUDENT_ACCESS_MAX_ATTEMPTS ||
        !isTransientStudentAccessError(error)
      ) {
        throw error;
      }
    }

    await waitForStudentAccessRetry();
  }

  throw new Error("Student access retry loop completed unexpectedly.");
}

export type StudentAccessSuccess = {
  ok: true;
  studentId: string;
  username: string;
  paragraphExercisesEnabled: boolean;
};

export type StudentAccessFailure = {
  ok: false;
  status: 401 | 403 | 500 | 503;
  message: string;
  clearSessionCookie: boolean;
  reason: "session_invalid" | "session_version_mismatch" | "student_inactive" | "access_expired" | "access_check_failed" | "transient_error";
};

export type StudentAccessResult = StudentAccessSuccess | StudentAccessFailure;

function sessionFailure(reason: "session_invalid" | "session_version_mismatch" = "session_invalid"): StudentAccessFailure {
  return {
    ok: false,
    status: 401,
    message: STUDENT_SESSION_EXPIRED_MESSAGE,
    clearSessionCookie: true,
    reason,
  };
}

function transientAccessFailure(): StudentAccessFailure {
  return {
    ok: false,
    status: 503,
    message: TRANSIENT_ACCESS_MESSAGE,
    clearSessionCookie: false,
    reason: "transient_error",
  };
}

function logStudentAccessError(error: SupabaseErrorLike, status?: number) {
  console.error({
    code: error.code,
    message: error.message,
    details: error.details,
    hint: error.hint,
    status,
  });
}

export function isStudentActiveStatus(isActive: unknown, status: unknown): boolean {
  // `completed` is an education lifecycle state, not an access revocation.
  // Legacy rows may still carry is_active=false from before completed became
  // a first-class status, so status is authoritative for this case. The
  // access date check below still gates the session by access_end_date.
  if (status === "completed") {
    return true;
  }

  if (isActive === false || status === "passive") {
    return false;
  }

  if (status === null || status === undefined) {
    return isActive === true;
  }

  return isActive === true && status === "active";
}

export async function verifyStudentAccessToken(token: string): Promise<StudentAccessResult> {
  const session = readStudentSessionToken(token);
  if (!session) {
    return sessionFailure();
  }

  const supabase = getSupabaseServiceRoleClient();
  if (!supabase) {
    return {
      ok: false,
      status: 500,
      message: ACCESS_CHECK_FAILED_MESSAGE,
      clearSessionCookie: false,
      reason: "access_check_failed",
    };
  }

  try {
    const { data: student, error, status } = await runStudentAccessQueryWithRetry(() =>
      supabase
        .from(STUDENTS_TABLE)
        .select("id,username,session_version,is_active,status,education_start_date,access_end_date,paragraph_exercises_enabled")
        .eq("id", session.studentId)
        .maybeSingle(),
    );

    if (error) {
      logStudentAccessError(error, status);
      if (isTransientStudentAccessError(error, status)) {
        return transientAccessFailure();
      }
      return {
        ok: false,
        status: 500,
        message: ACCESS_CHECK_FAILED_MESSAGE,
        clearSessionCookie: false,
        reason: "access_check_failed",
      };
    }

    if (!student || String(student.id ?? "") !== session.studentId) {
      return sessionFailure();
    }

    const currentSessionVersion = parseSessionVersion(student.session_version);
    if (currentSessionVersion === null || currentSessionVersion !== session.sessionVersion) {
      return sessionFailure("session_version_mismatch");
    }

    if (!isStudentActiveStatus(student.is_active, student.status)) {
      return {
        ok: false,
        status: 403,
        message: PASSIVE_STUDENT_MESSAGE,
        clearSessionCookie: false,
        reason: "student_inactive",
      };
    }

    const dateAccess = checkStudentDateAccess(
      typeof student.education_start_date === "string" ? student.education_start_date : null,
      typeof student.access_end_date === "string" ? student.access_end_date : null,
    );
    if (!dateAccess.allowed) {
      return {
        ok: false,
        status: 403,
        message: dateAccess.message,
        clearSessionCookie: false,
        reason: "access_expired",
      };
    }

    const username = typeof student.username === "string" ? student.username.trim() : "";
    if (!username) {
      return sessionFailure();
    }

    return {
      ok: true,
      studentId: session.studentId,
      username,
      paragraphExercisesEnabled: canAccessParagraphExercises({
        paragraphExercisesEnabled: student.paragraph_exercises_enabled,
      }),
    };
  } catch (error) {
    if (isTransientStudentAccessError(error)) {
      logStudentAccessError(readObject(error) ?? { message: "Transient student access request failed." });
      return transientAccessFailure();
    }
    return {
      ok: false,
      status: 500,
      message: ACCESS_CHECK_FAILED_MESSAGE,
      clearSessionCookie: false,
      reason: "access_check_failed",
    };
  }
}

export function verifyStudentAccess(request: NextRequest): Promise<StudentAccessResult> {
  return verifyStudentAccessToken(request.cookies.get(STUDENT_SESSION_COOKIE_NAME)?.value ?? "");
}
