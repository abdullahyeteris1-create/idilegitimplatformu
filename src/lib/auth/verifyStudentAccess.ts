import type { NextRequest } from "next/server";
import {
  parseSessionVersion,
  readStudentSessionToken,
  STUDENT_SESSION_COOKIE_NAME,
  STUDENT_SESSION_EXPIRED_MESSAGE,
} from "@/lib/auth/studentSession";
import { checkStudentDateAccess } from "@/lib/students/studentAccessDates";
import { getSupabaseServiceRoleClient } from "@/lib/supabase/server";

const STUDENTS_TABLE = process.env.NEXT_PUBLIC_SUPABASE_STUDENTS_TABLE ?? "students";
const PASSIVE_STUDENT_MESSAGE = "Bu ogrenci hesabi pasif durumda.";
const ACCESS_CHECK_FAILED_MESSAGE = "Ogrenci erisimi dogrulanamadi. Lutfen tekrar deneyin.";

export type StudentAccessSuccess = {
  ok: true;
  studentId: string;
  username: string;
};

export type StudentAccessFailure = {
  ok: false;
  status: 401 | 403 | 500;
  message: string;
  clearSessionCookie: boolean;
};

export type StudentAccessResult = StudentAccessSuccess | StudentAccessFailure;

function sessionFailure(): StudentAccessFailure {
  return {
    ok: false,
    status: 401,
    message: STUDENT_SESSION_EXPIRED_MESSAGE,
    clearSessionCookie: true,
  };
}

export function isStudentActiveStatus(isActive: unknown, status: unknown): boolean {
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
    };
  }

  try {
    const { data: student, error } = await supabase
      .from(STUDENTS_TABLE)
      .select("id,username,session_version,is_active,status,education_start_date,access_end_date")
      .eq("id", session.studentId)
      .maybeSingle();

    if (error) {
      console.error({
        code: error.code,
        message: error.message,
        details: error.details,
        hint: error.hint,
      });
      return {
        ok: false,
        status: 500,
        message: ACCESS_CHECK_FAILED_MESSAGE,
        clearSessionCookie: false,
      };
    }

    if (!student || String(student.id ?? "") !== session.studentId) {
      return sessionFailure();
    }

    const currentSessionVersion = parseSessionVersion(student.session_version);
    if (currentSessionVersion === null || currentSessionVersion !== session.sessionVersion) {
      return sessionFailure();
    }

    if (!isStudentActiveStatus(student.is_active, student.status)) {
      return {
        ok: false,
        status: 403,
        message: PASSIVE_STUDENT_MESSAGE,
        clearSessionCookie: false,
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
    };
  } catch {
    return {
      ok: false,
      status: 500,
      message: ACCESS_CHECK_FAILED_MESSAGE,
      clearSessionCookie: false,
    };
  }
}

export function verifyStudentAccess(request: NextRequest): Promise<StudentAccessResult> {
  return verifyStudentAccessToken(request.cookies.get(STUDENT_SESSION_COOKIE_NAME)?.value ?? "");
}
