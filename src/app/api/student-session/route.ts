import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { createStudentSessionToken, getStudentSessionCookieOptions, STUDENT_SESSION_COOKIE_NAME } from "@/lib/auth/studentSession";
import { getSupabaseServerClient } from "@/lib/supabase/server";

const STUDENTS_TABLE = process.env.NEXT_PUBLIC_SUPABASE_STUDENTS_TABLE ?? "students";

type StudentLoginBody = {
  username?: unknown;
  password?: unknown;
};

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

  const supabase = getSupabaseServerClient();
  if (!supabase) {
    return NextResponse.json({ ok: false, message: "Supabase baglantisi bulunamadi." }, { status: 500 });
  }

  const { data, error } = await supabase.from(STUDENTS_TABLE).select("*");
  if (error || !Array.isArray(data)) {
    return NextResponse.json({ ok: false, message: "Ogrenci oturumu acilamadi." }, { status: 500 });
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

  const isActive = student.is_active !== false;
  if (!isActive) {
    return NextResponse.json({ ok: false, message: "Bu ogrenci hesabi pasif durumda." }, { status: 403 });
  }

  const token = createStudentSessionToken(String(student.id), String(student.username ?? username));
  if (!token) {
    return NextResponse.json({ ok: false, message: "Oturum guvenligi yapilandirilamadi." }, { status: 500 });
  }

  const response = NextResponse.json({
    ok: true,
    student: {
      id: String(student.id),
      name: String(student.name ?? ""),
      username: String(student.username ?? username),
      password: String(student.password ?? ""),
      className: typeof student.class_name === "string" ? student.class_name : undefined,
      classLevel: typeof student.class_level === "string" ? student.class_level : undefined,
      parentName: typeof student.parent_name === "string" ? student.parent_name : undefined,
      parentPhone: typeof student.parent_phone === "string" ? student.parent_phone : typeof student.phone === "string" ? student.phone : undefined,
      parentEmail: typeof student.parent_email === "string" ? student.parent_email : undefined,
      status: student.is_active === false ? "passive" : "active",
      isActive: student.is_active !== false,
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
