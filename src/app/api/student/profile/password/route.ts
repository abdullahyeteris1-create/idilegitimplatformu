import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { isSameOriginRequest } from "@/lib/auth/sameOriginRequest";
import {
  hashStudentPassword,
  isStudentPasswordHash,
  verifyStudentPassword,
} from "@/lib/auth/studentPassword";
import { clearStudentSessionCookie } from "@/lib/auth/studentSession";
import { verifyStudentAccess } from "@/lib/auth/verifyStudentAccess";
import { getSupabaseServiceRoleClient } from "@/lib/supabase/server";
import { validateStudentProfilePassword } from "@/lib/students/studentProfilePasswordValidation";

export const runtime = "nodejs";

const STUDENTS_TABLE = process.env.NEXT_PUBLIC_SUPABASE_STUDENTS_TABLE ?? "students";
const PASSWORD_HASH_VERSION = 1;
const MAX_BODY_LENGTH = 4096;
const ALLOWED_FIELDS = new Set(["currentPassword", "newPassword", "confirmPassword"]);

const INVALID_BODY_MESSAGE = "Geçersiz istek gövdesi.";
const CURRENT_PASSWORD_MESSAGE = "Mevcut şifre doğrulanamadı.";
const PASSWORD_UNAVAILABLE_MESSAGE = "Bu hesap için şifre değiştirme işlemi kullanılamıyor.";
const UPDATE_FAILED_MESSAGE = "Şifreniz şu anda değiştirilemedi. Lütfen tekrar deneyin.";

type PasswordBody = {
  currentPassword: string;
  newPassword: string;
  confirmPassword: string;
};

function jsonError(message: string, status: number, requiresReauthentication = false) {
  return NextResponse.json(
    { success: false, message, ...(requiresReauthentication ? { requiresReauthentication: true } : {}) },
    { status, headers: { "Cache-Control": "no-store" } },
  );
}

async function readPasswordBody(request: NextRequest): Promise<PasswordBody | NextResponse> {
  const declaredLength = Number(request.headers.get("content-length"));
  if (Number.isFinite(declaredLength) && declaredLength > MAX_BODY_LENGTH) {
    return jsonError(INVALID_BODY_MESSAGE, 413);
  }

  let text: string;
  try {
    text = await request.text();
  } catch {
    return jsonError(INVALID_BODY_MESSAGE, 400);
  }

  if (!text || text.length > MAX_BODY_LENGTH) {
    return jsonError(INVALID_BODY_MESSAGE, text.length > MAX_BODY_LENGTH ? 413 : 400);
  }

  let body: Record<string, unknown>;
  try {
    const parsed = JSON.parse(text);
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
      return jsonError(INVALID_BODY_MESSAGE, 400);
    }
    body = parsed as Record<string, unknown>;
  } catch {
    return jsonError(INVALID_BODY_MESSAGE, 400);
  }

  if (
    Object.keys(body).some((field) => !ALLOWED_FIELDS.has(field)) ||
    typeof body.currentPassword !== "string" ||
    typeof body.newPassword !== "string" ||
    typeof body.confirmPassword !== "string" ||
    !body.currentPassword ||
    Array.from(body.currentPassword).length > 128 ||
    Array.from(body.newPassword).length > 128 ||
    Array.from(body.confirmPassword).length > 128
  ) {
    return jsonError(INVALID_BODY_MESSAGE, 400);
  }

  return {
    currentPassword: body.currentPassword,
    newPassword: body.newPassword,
    confirmPassword: body.confirmPassword,
  };
}

export async function POST(request: NextRequest) {
  if (!isSameOriginRequest(request)) {
    return jsonError("İstek kaynağı doğrulanamadı.", 403);
  }

  const access = await verifyStudentAccess(request);
  if (!access.ok) {
    const response = jsonError(
      access.message,
      access.status,
      access.status === 401,
    );
    if (access.clearSessionCookie) {
      clearStudentSessionCookie(response);
    }
    return response;
  }

  const body = await readPasswordBody(request);
  if (body instanceof NextResponse) {
    return body;
  }

  if (body.newPassword !== body.confirmPassword) {
    return jsonError("Yeni şifre ve şifre tekrarı eşleşmiyor.", 400);
  }
  if (body.newPassword === body.currentPassword) {
    return jsonError("Yeni şifre mevcut şifrenizden farklı olmalıdır.", 400);
  }

  const supabase = getSupabaseServiceRoleClient();
  if (!supabase) {
    return jsonError(UPDATE_FAILED_MESSAGE, 500);
  }

  const { data: student, error: studentError } = await supabase
    .from(STUDENTS_TABLE)
    .select("id,username,name,password_hash,password_hash_version,session_version")
    .eq("id", access.studentId)
    .maybeSingle();

  if (studentError) {
    console.error("Student self-service password record lookup failed");
    return jsonError(UPDATE_FAILED_MESSAGE, 500);
  }
  if (!student || String(student.id ?? "") !== access.studentId) {
    return jsonError(UPDATE_FAILED_MESSAGE, 404);
  }

  if (
    student.password_hash_version !== PASSWORD_HASH_VERSION ||
    typeof student.password_hash !== "string" ||
    !isStudentPasswordHash(student.password_hash)
  ) {
    return jsonError(PASSWORD_UNAVAILABLE_MESSAGE, 409);
  }

  const currentPasswordMatches = await verifyStudentPassword(
    body.currentPassword,
    student.password_hash,
  );
  if (!currentPasswordMatches) {
    return jsonError(CURRENT_PASSWORD_MESSAGE, 401);
  }

  const validation = validateStudentProfilePassword(body.newPassword);
  if (!validation.ok) {
    return jsonError(validation.message, 400);
  }

  let passwordHash: string;
  try {
    passwordHash = await hashStudentPassword(validation.value);
  } catch {
    console.error("Student self-service password hashing failed");
    return jsonError(UPDATE_FAILED_MESSAGE, 500);
  }

  const { data: updateResult, error: updateError } = await supabase.rpc(
    "admin_update_student_password_v1",
    {
      p_student_id: access.studentId,
      p_password_hash: passwordHash,
      p_password_hash_version: PASSWORD_HASH_VERSION,
    },
  );

  if (updateError || !Array.isArray(updateResult) || updateResult.length !== 1) {
    console.error("Student self-service password update RPC failed");
    return jsonError(UPDATE_FAILED_MESSAGE, 500);
  }

  const response = NextResponse.json(
    { success: true, requiresReauthentication: true },
    { headers: { "Cache-Control": "no-store" } },
  );
  clearStudentSessionCookie(response);
  return response;
}
