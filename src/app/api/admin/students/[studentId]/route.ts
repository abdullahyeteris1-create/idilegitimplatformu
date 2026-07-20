import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { isEducationLevel } from "@/lib/assignments/educationLevels";
import { isAdminSessionValid } from "@/lib/auth/adminSession";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import {
  isEducationDateRangeValid,
  isValidDateOnlyString,
} from "@/lib/students/studentAccessDates";

export const runtime = "nodejs";

const STUDENTS_TABLE = process.env.NEXT_PUBLIC_SUPABASE_STUDENTS_TABLE ?? "students";
const EXERCISE_RESULTS_TABLE = process.env.NEXT_PUBLIC_SUPABASE_RESULTS_TABLE ?? "exercise_results";
const LESSONS_TABLE = process.env.NEXT_PUBLIC_SUPABASE_LESSONS_TABLE ?? "lessons";
const SCHEDULES_TABLE = process.env.NEXT_PUBLIC_SUPABASE_SCHEDULES_TABLE ?? "schedules";

const VALID_STUDENT_ID = /^[a-zA-Z0-9-]{1,128}$/;
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PATCH_ALLOWED_FIELDS = new Set([
  "name",
  "username",
  "password",
  "classLevel",
  "parentName",
  "parentPhone",
  "parentEmail",
  "birthDate",
  "status",
  "educationStatus",
  "educationLevel",
  "notes",
  "educationStartDate",
  "accessEndDate",
  "welcomeEmailStatus",
  "welcomeEmailSentAt",
]);

function errorResponse(message: string, status: number) {
  return NextResponse.json({ ok: false, message }, { status });
}

function optionalString(value: unknown): string | null {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function dateOnlyString(value: unknown): string | null {
  return typeof value === "string" && value !== "" ? value : null;
}

function mapStudentResponse(row: Record<string, unknown>) {
  const status = row.status === "passive" || row.is_active === false ? "passive" : "active";

  return {
    id: String(row.id ?? ""),
    name: String(row.name ?? ""),
    username: String(row.username ?? ""),
    classLevel: optionalString(row.class_name),
    parentName: optionalString(row.parent_name),
    parentPhone: optionalString(row.parent_phone) ?? optionalString(row.phone),
    parentEmail: optionalString(row.parent_email),
    birthDate: optionalString(row.birth_date),
    status,
    isActive: status === "active",
    educationStatus: row.education_status === "speed-reading" ? "speed-reading" : "general",
    educationLevel: isEducationLevel(row.education_level) ? row.education_level : undefined,
    assignmentMode:
      row.assignment_mode === "manual" || row.assignment_mode === "ai_assisted"
        ? row.assignment_mode
        : "automatic",
    welcomeEmailStatus:
      row.welcome_email_status === "sent" ||
      row.welcome_email_status === "failed" ||
      row.welcome_email_status === "not_requested"
        ? row.welcome_email_status
        : undefined,
    welcomeEmailSentAt: optionalString(row.welcome_email_sent_at) ?? undefined,
    educationStartDate: optionalString(row.education_start_date),
    accessEndDate: optionalString(row.access_end_date),
    createdAt: optionalString(row.created_at) ?? new Date().toISOString(),
    notes: optionalString(row.notes) ?? undefined,
  };
}

function getSupabaseClient(): SupabaseClient | null {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim();

  if (!url || !key) {
    return null;
  }

  return createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

function parseStudentId(rawStudentId: string): string | null {
  const studentId = rawStudentId.trim();
  if (!VALID_STUDENT_ID.test(studentId)) {
    return null;
  }

  return studentId;
}

function isMissingSchemaError(code: string | null | undefined): boolean {
  return code === "42P01" || code === "42703" || code === "PGRST204";
}

async function deleteByStudentId(
  supabase: SupabaseClient,
  tableName: string,
  studentId: string,
): Promise<void> {
  const { error } = await supabase.from(tableName).delete().eq("student_id", studentId);

  if (!error) {
    return;
  }

  if (isMissingSchemaError(error.code)) {
    return;
  }

  throw error;
}

export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ studentId: string }> },
) {
  if (!isAdminSessionValid(request)) {
    return errorResponse("Yetkisiz erişim.", 401);
  }

  const params = await context.params;
  const studentId = parseStudentId(params.studentId);
  if (!studentId) {
    return errorResponse("Geçersiz öğrenci kimliği.", 400);
  }

  let body: Record<string, unknown>;
  try {
    const parsed = (await request.json()) as unknown;
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
      return errorResponse("Geçersiz istek gövdesi.", 400);
    }
    body = parsed as Record<string, unknown>;
  } catch {
    return errorResponse("Geçersiz istek gövdesi.", 400);
  }

  const bodyFields = Object.keys(body);
  if (bodyFields.length === 0) {
    return errorResponse("Güncellenecek öğrenci alanı bulunamadı.", 400);
  }

  const unsupportedField = bodyFields.find((field) => !PATCH_ALLOWED_FIELDS.has(field));
  if (unsupportedField) {
    return errorResponse(`'${unsupportedField}' alanı istemciden gönderilemez.`, 400);
  }

  const invalidStringField = bodyFields.find((field) => typeof body[field] !== "string");
  if (invalidStringField) {
    return errorResponse(`'${invalidStringField}' alanı string olmalıdır.`, 400);
  }

  const supabase = getSupabaseServerClient();
  if (!supabase) {
    return errorResponse("Sunucu yapılandırması eksik.", 500);
  }

  const { data: existingData, error: lookupError } = await supabase
    .from(STUDENTS_TABLE)
    .select("*")
    .eq("id", studentId)
    .maybeSingle();

  if (lookupError) {
    console.error("Student lookup failed", {
      code: lookupError.code,
      message: lookupError.message,
    });
    return errorResponse("Öğrenci kaydı doğrulanamadı. Lütfen tekrar deneyin.", 500);
  }

  if (!existingData) {
    return errorResponse("Öğrenci bulunamadı.", 404);
  }

  const existing = existingData as Record<string, unknown>;
  const hasStartDate = Object.hasOwn(body, "educationStartDate");
  const hasEndDate = Object.hasOwn(body, "accessEndDate");
  const educationStartDate = hasStartDate
    ? dateOnlyString(body.educationStartDate)
    : dateOnlyString(existing.education_start_date);
  const accessEndDate = hasEndDate
    ? dateOnlyString(body.accessEndDate)
    : dateOnlyString(existing.access_end_date);
  const dateRange = isEducationDateRangeValid(educationStartDate, accessEndDate);

  if (!dateRange.valid) {
    return errorResponse(dateRange.message, 400);
  }

  for (const requiredField of ["name", "username", "password"] as const) {
    if (Object.hasOwn(body, requiredField) && !optionalString(body[requiredField])) {
      return errorResponse("Ad soyad, kullanıcı adı ve şifre boş bırakılamaz.", 400);
    }
  }

  if (Object.hasOwn(body, "educationLevel") && !isEducationLevel(body.educationLevel)) {
    return errorResponse("Geçerli bir eğitim düzeyi seçin.", 400);
  }

  if (Object.hasOwn(body, "status") && body.status !== "active" && body.status !== "passive") {
    return errorResponse("Geçersiz öğrenci durumu.", 400);
  }

  if (
    Object.hasOwn(body, "educationStatus") &&
    body.educationStatus !== "general" &&
    body.educationStatus !== "speed-reading"
  ) {
    return errorResponse("Geçersiz eğitim durumu.", 400);
  }

  if (
    Object.hasOwn(body, "welcomeEmailStatus") &&
    body.welcomeEmailStatus !== "sent" &&
    body.welcomeEmailStatus !== "failed" &&
    body.welcomeEmailStatus !== "not_requested"
  ) {
    return errorResponse("Geçersiz e-posta durumu.", 400);
  }

  const parentEmail = optionalString(body.parentEmail);
  if (Object.hasOwn(body, "parentEmail") && parentEmail && !EMAIL_PATTERN.test(parentEmail)) {
    return errorResponse("Geçerli bir veli e-posta adresi girin.", 400);
  }

  const birthDate = dateOnlyString(body.birthDate);
  if (Object.hasOwn(body, "birthDate") && birthDate && !isValidDateOnlyString(birthDate)) {
    return errorResponse("Geçerli bir doğum tarihi seçin.", 400);
  }

  const welcomeEmailSentAt = optionalString(body.welcomeEmailSentAt);
  if (
    Object.hasOwn(body, "welcomeEmailSentAt") &&
    welcomeEmailSentAt &&
    Number.isNaN(Date.parse(welcomeEmailSentAt))
  ) {
    return errorResponse("Geçersiz e-posta gönderim zamanı.", 400);
  }

  const nextUsername = optionalString(body.username);
  if (nextUsername && nextUsername !== existing.username) {
    const { data: usernameOwner, error: usernameError } = await supabase
      .from(STUDENTS_TABLE)
      .select("id")
      .eq("username", nextUsername)
      .maybeSingle();

    if (usernameError) {
      console.error("Student username lookup failed", {
        code: usernameError.code,
        message: usernameError.message,
      });
      return errorResponse("Kullanıcı adı doğrulanamadı. Lütfen tekrar deneyin.", 500);
    }

    if (usernameOwner && String(usernameOwner.id) !== studentId) {
      return errorResponse("Bu kullanıcı adı zaten kullanılıyor.", 409);
    }
  }

  const payload: Record<string, unknown> = {};
  if (Object.hasOwn(body, "name")) payload.name = optionalString(body.name);
  if (Object.hasOwn(body, "username")) payload.username = nextUsername;
  if (Object.hasOwn(body, "password")) payload.password = optionalString(body.password);
  if (Object.hasOwn(body, "classLevel")) payload.class_name = optionalString(body.classLevel);
  if (Object.hasOwn(body, "parentName")) payload.parent_name = optionalString(body.parentName);
  if (Object.hasOwn(body, "parentPhone")) payload.phone = optionalString(body.parentPhone);
  if (Object.hasOwn(body, "parentEmail")) payload.parent_email = parentEmail;
  if (Object.hasOwn(body, "birthDate")) payload.birth_date = birthDate;
  if (Object.hasOwn(body, "notes")) payload.notes = optionalString(body.notes);
  if (Object.hasOwn(body, "educationLevel")) payload.education_level = body.educationLevel;
  if (Object.hasOwn(body, "educationStatus")) payload.education_status = body.educationStatus;
  if (Object.hasOwn(body, "status")) {
    payload.status = body.status;
    payload.is_active = body.status === "active";
  }
  if (hasStartDate) payload.education_start_date = educationStartDate;
  if (hasEndDate) payload.access_end_date = accessEndDate;
  if (Object.hasOwn(body, "welcomeEmailStatus")) {
    payload.welcome_email_status = body.welcomeEmailStatus;
  }
  if (Object.hasOwn(body, "welcomeEmailSentAt")) {
    payload.welcome_email_sent_at = welcomeEmailSentAt;
  }
  payload.updated_at = new Date().toISOString();

  const { data, error } = await supabase
    .from(STUDENTS_TABLE)
    .update(payload)
    .eq("id", studentId)
    .select("*")
    .maybeSingle();

  if (error) {
    console.error("Student update failed", {
      code: error.code,
      message: error.message,
    });

    if (error.code === "23505") {
      return errorResponse("Bu kullanıcı adı zaten kullanılıyor.", 409);
    }

    return errorResponse("Öğrenci Supabase'te güncellenemedi. Lütfen tekrar deneyin.", 500);
  }

  if (!data) {
    return errorResponse("Öğrenci bulunamadı.", 404);
  }

  return NextResponse.json({
    ok: true,
    student: mapStudentResponse(data as Record<string, unknown>),
  });
}

export async function DELETE(
  request: NextRequest,
  context: { params: Promise<{ studentId: string }> },
) {
  if (!isAdminSessionValid(request)) {
    return errorResponse("Yetkisiz erisim.", 401);
  }

  const params = await context.params;
  const studentId = parseStudentId(params.studentId);

  if (!studentId) {
    return errorResponse("Gecersiz ogrenci kimligi.", 400);
  }

  const supabase = getSupabaseClient();
  if (!supabase) {
    return errorResponse("Sunucu yapilandirmasi eksik.", 500);
  }

  const { data: existingStudent, error: studentLookupError } = await supabase
    .from(STUDENTS_TABLE)
    .select("id")
    .eq("id", studentId)
    .maybeSingle();

  if (studentLookupError) {
    console.error("Student lookup failed", {
      code: studentLookupError.code,
      message: studentLookupError.message,
    });
    return errorResponse("Ogrenci silinemedi. Lutfen yeniden deneyin.", 500);
  }

  if (!existingStudent) {
    return errorResponse("Ogrenci bulunamadi.", 404);
  }

  try {
    // FK cascade bilinmedigi icin bagli kayitlar kontrollu sekilde silinir.
    await deleteByStudentId(supabase, EXERCISE_RESULTS_TABLE, studentId);
    await deleteByStudentId(supabase, LESSONS_TABLE, studentId);
    await deleteByStudentId(supabase, SCHEDULES_TABLE, studentId);

    const { error: studentDeleteError } = await supabase
      .from(STUDENTS_TABLE)
      .delete()
      .eq("id", studentId);

    if (studentDeleteError) {
      console.error("Student deletion failed", {
        code: studentDeleteError.code,
        message: studentDeleteError.message,
      });
      return errorResponse("Ogrenci silinemedi. Lutfen yeniden deneyin.", 500);
    }
  } catch (error) {
    if (error && typeof error === "object" && "code" in error && "message" in error) {
      const typedError = error as { code?: string; message?: string };
      console.error("Student deletion failed", {
        code: typedError.code,
        message: typedError.message,
      });
    } else {
      console.error("Student deletion failed");
    }

    return errorResponse("Ogrenci silinemedi. Lutfen yeniden deneyin.", 500);
  }

  return NextResponse.json({
    ok: true,
    message: "Ogrenci basariyla silindi.",
  });
}
