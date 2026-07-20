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
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const ALLOWED_FIELDS = new Set([
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
  "welcomeEmailStatus",
  "educationStartDate",
  "accessEndDate",
]);
const STRING_FIELDS = [
  "name",
  "username",
  "password",
  "classLevel",
  "parentName",
  "parentPhone",
  "parentEmail",
  "birthDate",
  "notes",
  "educationStartDate",
  "accessEndDate",
] as const;

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

export async function POST(request: NextRequest) {
  if (!isAdminSessionValid(request)) {
    return errorResponse("Yetkisiz erişim.", 401);
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

  const unsupportedField = Object.keys(body).find((field) => !ALLOWED_FIELDS.has(field));
  if (unsupportedField) {
    return errorResponse(`'${unsupportedField}' alanı istemciden gönderilemez.`, 400);
  }

  const invalidStringField = STRING_FIELDS.find(
    (field) => Object.hasOwn(body, field) && typeof body[field] !== "string",
  );
  if (invalidStringField) {
    return errorResponse(`'${invalidStringField}' alanı string olmalıdır.`, 400);
  }

  const name = optionalString(body.name);
  const username = optionalString(body.username);
  const password = optionalString(body.password);
  const educationStartDate = dateOnlyString(body.educationStartDate);
  const accessEndDate = dateOnlyString(body.accessEndDate);

  if (!name || !username || !password) {
    return errorResponse("Ad soyad, kullanıcı adı ve şifre zorunludur.", 400);
  }

  if (!educationStartDate || !accessEndDate) {
    return errorResponse("Başlangıç ve bitiş tarihlerini seçin.", 400);
  }

  const dateRange = isEducationDateRangeValid(educationStartDate, accessEndDate);
  if (!dateRange.valid) {
    return errorResponse(dateRange.message, 400);
  }

  if (!isEducationLevel(body.educationLevel)) {
    return errorResponse("Eğitim düzeyi seçimi zorunludur.", 400);
  }

  if (body.status !== undefined && body.status !== "active" && body.status !== "passive") {
    return errorResponse("Geçersiz öğrenci durumu.", 400);
  }

  if (
    body.educationStatus !== undefined &&
    body.educationStatus !== "general" &&
    body.educationStatus !== "speed-reading"
  ) {
    return errorResponse("Geçersiz eğitim durumu.", 400);
  }

  if (body.welcomeEmailStatus !== undefined && body.welcomeEmailStatus !== "not_requested") {
    return errorResponse("Geçersiz e-posta durumu.", 400);
  }

  const parentEmail = optionalString(body.parentEmail);
  if (parentEmail && !EMAIL_PATTERN.test(parentEmail)) {
    return errorResponse("Geçerli bir veli e-posta adresi girin.", 400);
  }

  const birthDate = dateOnlyString(body.birthDate);
  if (birthDate && !isValidDateOnlyString(birthDate)) {
    return errorResponse("Geçerli bir doğum tarihi seçin.", 400);
  }

  const supabase = getSupabaseServerClient();
  if (!supabase) {
    return errorResponse("Sunucu yapılandırması eksik.", 500);
  }

  const { data: existingStudent, error: lookupError } = await supabase
    .from(STUDENTS_TABLE)
    .select("id")
    .eq("username", username)
    .maybeSingle();

  if (lookupError) {
    console.error("Student username lookup failed", {
      code: lookupError.code,
      message: lookupError.message,
    });
    return errorResponse("Öğrenci kaydı doğrulanamadı. Lütfen tekrar deneyin.", 500);
  }

  if (existingStudent) {
    return errorResponse("Bu kullanıcı adı zaten kullanılıyor.", 409);
  }

  const status = body.status === "passive" ? "passive" : "active";
  const payload = {
    name,
    username,
    password,
    class_name: optionalString(body.classLevel),
    parent_name: optionalString(body.parentName),
    phone: optionalString(body.parentPhone),
    parent_email: parentEmail,
    birth_date: birthDate,
    is_active: status === "active",
    status,
    education_status: body.educationStatus === "speed-reading" ? "speed-reading" : "general",
    education_level: body.educationLevel,
    assignment_mode: "automatic",
    welcome_email_status: body.welcomeEmailStatus === "not_requested" ? "not_requested" : null,
    notes: optionalString(body.notes),
    education_start_date: educationStartDate,
    access_end_date: accessEndDate,
    updated_at: new Date().toISOString(),
  };

  const { data, error } = await supabase
    .from(STUDENTS_TABLE)
    .insert(payload)
    .select("*")
    .single();

  if (error) {
    console.error("Student creation failed", {
      code: error.code,
      message: error.message,
    });

    if (error.code === "23505") {
      return errorResponse("Bu kullanıcı adı zaten kullanılıyor.", 409);
    }

    return errorResponse("Öğrenci Supabase'e kaydedilemedi. Lütfen tekrar deneyin.", 500);
  }

  return NextResponse.json(
    {
      ok: true,
      student: mapStudentResponse(data as Record<string, unknown>),
    },
    { status: 201 },
  );
}
