import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import {
  createStudentSessionToken,
  getStudentSessionCookieOptions,
  parseSessionVersion,
  STUDENT_SESSION_COOKIE_NAME,
} from "@/lib/auth/studentSession";
import { isStudentActiveStatus } from "@/lib/auth/verifyStudentAccess";
import { checkStudentDateAccess } from "@/lib/students/studentAccessDates";
import { getSupabaseServiceRoleClient } from "@/lib/supabase/server";

const STUDENTS_TABLE = process.env.NEXT_PUBLIC_SUPABASE_STUDENTS_TABLE ?? "students";

type StudentLoginBody = {
  username?: unknown;
  password?: unknown;
};

const LOGIN_COMPLETION_FAILED_MESSAGE = "Giriş işlemi tamamlanamadı. Lütfen tekrar deneyin.";

type SessionIncrementResult = {
  sessionVersion: number;
  lastLoginAt: string;
};

function parseSessionIncrementResult(data: unknown): SessionIncrementResult | null {
  if (!Array.isArray(data) || data.length !== 1) {
    return null;
  }

  const row = data[0];
  if (typeof row !== "object" || row === null || Array.isArray(row)) {
    return null;
  }

  const record = row as Record<string, unknown>;
  const sessionVersion = parseSessionVersion(record.session_version);
  const lastLoginAt = typeof record.last_login_at === "string" ? record.last_login_at.trim() : "";
  if (sessionVersion === null || !lastLoginAt || !Number.isFinite(Date.parse(lastLoginAt))) {
    return null;
  }

  return { sessionVersion, lastLoginAt };
}

function logSupabaseError(error: { code?: unknown; message?: unknown; details?: unknown; hint?: unknown }) {
  console.error({
    code: error.code,
    message: error.message,
    details: error.details,
    hint: error.hint,
  });
}

function normalizeLookup(value: string): string {
  return value
    .trim()
    .toLocaleLowerCase("tr-TR")
    .replace(/ğ/g, "g")
    .replace(/ü/g, "u")
    .replace(/ş/g, "s")
    .replace(/ı/g, "i")
    .replace(/ö/g, "o")
    .replace(/ç/g, "c")
    .replace(/İ/g, "i")
    .replace(/[^a-z0-9]/g, "");
}

export async function POST(request: NextRequest) {
  let body: StudentLoginBody;
  try {
    body = (await request.json()) as StudentLoginBody;
  } catch {
    return NextResponse.json({ ok: false, message: "Gecersiz istek." }, { status: 400 });
  }

  const username = typeof body.username === "string" ? body.username.trim() : "";
  const password = typeof body.password === "string" ? body.password.trim() : "";

  if (!username || !password) {
    return NextResponse.json({ ok: false, message: "Kullanici adi ve sifre zorunludur." }, { status: 400 });
  }

  const supabase = getSupabaseServiceRoleClient();
  if (!supabase) {
    return NextResponse.json({ ok: false, message: LOGIN_COMPLETION_FAILED_MESSAGE }, { status: 500 });
  }

  let lookupResult;
  try {
    lookupResult = await supabase
      .from(STUDENTS_TABLE)
      .select(
        "id,name,username,password,class_name,parent_name,phone,parent_email,is_active,status,education_start_date,access_end_date,education_status,education_level,assignment_mode,created_at,notes",
      );
  } catch {
    return NextResponse.json({ ok: false, message: LOGIN_COMPLETION_FAILED_MESSAGE }, { status: 500 });
  }

  const { data, error } = lookupResult;
  if (error || !Array.isArray(data)) {
    if (error) logSupabaseError(error);
    return NextResponse.json({ ok: false, message: LOGIN_COMPLETION_FAILED_MESSAGE }, { status: 500 });
  }

  const normalizedUsername = normalizeLookup(username);
  const student = data.find((row) => {
    const rowUsername = typeof row.username === "string" ? normalizeLookup(row.username) : "";
    const rowName = typeof row.name === "string" ? normalizeLookup(row.name) : "";
    return rowUsername === normalizedUsername || rowName === normalizedUsername;
  });

  if (!student || String(student.password ?? "").trim() !== password) {
    return NextResponse.json({ ok: false, message: "Kullanici adi veya sifre hatali." }, { status: 401 });
  }

  const isActive = isStudentActiveStatus(student.is_active, student.status);
  if (!isActive) {
    return NextResponse.json({ ok: false, message: "Bu ogrenci hesabi pasif durumda." }, { status: 403 });
  }

  const dateAccessCheck = checkStudentDateAccess(
    typeof student.education_start_date === "string" ? student.education_start_date : null,
    typeof student.access_end_date === "string" ? student.access_end_date : null,
  );

  if (!dateAccessCheck.allowed) {
    return NextResponse.json({ ok: false, message: dateAccessCheck.message }, { status: 403 });
  }

  let rpcData: unknown;
  try {
    const { data: incrementData, error: incrementError } = await supabase.rpc(
      "increment_student_session_version",
      { p_student_id: String(student.id) },
    );
    if (incrementError) {
      logSupabaseError(incrementError);
      return NextResponse.json({ ok: false, message: LOGIN_COMPLETION_FAILED_MESSAGE }, { status: 500 });
    }
    rpcData = incrementData;
  } catch {
    return NextResponse.json({ ok: false, message: LOGIN_COMPLETION_FAILED_MESSAGE }, { status: 500 });
  }

  const incrementResult = parseSessionIncrementResult(rpcData);
  if (!incrementResult) {
    return NextResponse.json({ ok: false, message: LOGIN_COMPLETION_FAILED_MESSAGE }, { status: 500 });
  }

  const token = createStudentSessionToken(
    String(student.id),
    String(student.username ?? username),
    incrementResult.sessionVersion,
  );
  if (!token) {
    return NextResponse.json({ ok: false, message: LOGIN_COMPLETION_FAILED_MESSAGE }, { status: 500 });
  }

  const response = NextResponse.json({
    ok: true,
    student: {
      id: String(student.id),
      name: String(student.name ?? ""),
      username: String(student.username ?? username),
      className: typeof student.class_name === "string" ? student.class_name : undefined,
      classLevel: typeof student.class_name === "string" ? student.class_name : undefined,
      parentName: typeof student.parent_name === "string" ? student.parent_name : undefined,
      parentPhone: typeof student.phone === "string" ? student.phone : undefined,
      parentEmail: typeof student.parent_email === "string" ? student.parent_email : undefined,
      status: isActive ? "active" : "passive",
      isActive,
      educationStatus:
        student.education_status === "general" || student.education_status === "speed-reading"
          ? student.education_status
          : undefined,
      educationLevel:
        typeof student.education_level === "string" ? student.education_level : undefined,
      assignmentMode:
        student.assignment_mode === "manual" || student.assignment_mode === "ai_assisted" || student.assignment_mode === "automatic"
          ? student.assignment_mode
          : "automatic",
      createdAt: String(student.created_at ?? new Date().toISOString()),
      notes: typeof student.notes === "string" ? student.notes : undefined,
    },
  });

  response.cookies.set({
    name: STUDENT_SESSION_COOKIE_NAME,
    value: token,
    ...getStudentSessionCookieOptions(),
  });

  return response;
}

export async function DELETE() {
  const response = NextResponse.json({ ok: true });
  response.cookies.set({
    name: STUDENT_SESSION_COOKIE_NAME,
    value: "",
    ...getStudentSessionCookieOptions(),
    maxAge: 0,
  });
  return response;
}
