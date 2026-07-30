import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { clearStudentSessionCookie } from "@/lib/auth/studentSession";
import { verifyStudentAccess } from "@/lib/auth/verifyStudentAccess";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import { getStudentProfileDetailsById } from "@/lib/students/studentProfile";
import { validateStudentProfileInput } from "@/lib/students/studentProfileValidation";

export const runtime = "nodejs";

const STUDENTS_TABLE = process.env.NEXT_PUBLIC_SUPABASE_STUDENTS_TABLE ?? "students";
const ALLOWED_FIELDS = new Set(["name", "birthDate", "classLevel", "schoolName"]);

function accessError(access: Exclude<Awaited<ReturnType<typeof verifyStudentAccess>>, { ok: true }>) {
  const response = NextResponse.json({ ok: false, message: access.message }, { status: access.status });
  if (access.clearSessionCookie) clearStudentSessionCookie(response);
  return response;
}

function profileResponse(profile: Awaited<ReturnType<typeof getStudentProfileDetailsById>>, username: string) {
  if (!profile) {
    return NextResponse.json({ ok: false, message: "Profil bilgileri alınamadı." }, { status: 404 });
  }

  return NextResponse.json({
    ok: true,
    profile: {
      name: profile.name,
      birthDate: profile.birth_date ?? "",
      classLevel: profile.class_name ?? "",
      schoolName: profile.school_name ?? "",
      username,
    },
  }, { headers: { "Cache-Control": "no-store" } });
}

export async function GET(request: NextRequest) {
  const access = await verifyStudentAccess(request);
  if (!access.ok) return accessError(access);

  const profile = await getStudentProfileDetailsById(access.studentId);
  return profileResponse(profile, access.username);
}

export async function PATCH(request: NextRequest) {
  const access = await verifyStudentAccess(request);
  if (!access.ok) return accessError(access);

  let body: Record<string, unknown>;
  try {
    const parsed = await request.json();
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
      return NextResponse.json({ ok: false, message: "Geçersiz istek gövdesi." }, { status: 400 });
    }
    body = parsed as Record<string, unknown>;
  } catch {
    return NextResponse.json({ ok: false, message: "Geçersiz istek gövdesi." }, { status: 400 });
  }

  const unknownField = Object.keys(body).find((field) => !ALLOWED_FIELDS.has(field));
  if (unknownField) {
    return NextResponse.json({ ok: false, message: "Bu profil alanı güncellenemez." }, { status: 400 });
  }

  const validation = validateStudentProfileInput(body);
  if (!validation.ok) {
    return NextResponse.json({ ok: false, message: validation.message }, { status: 400 });
  }

  const supabase = getSupabaseServerClient();
  if (!supabase) {
    return NextResponse.json({ ok: false, message: "Profil servisi şu anda kullanılamıyor." }, { status: 500 });
  }

  const { value } = validation;
  const { data, error } = await supabase
    .from(STUDENTS_TABLE)
    .update({
      name: value.name,
      birth_date: value.birthDate,
      class_name: value.classLevel,
      school_name: value.schoolName || null,
      updated_at: new Date().toISOString(),
    })
    .eq("id", access.studentId)
    .select("id,name,username,class_name,birth_date,school_name")
    .maybeSingle();

  if (error) {
    console.error("Student self profile update failed", { code: error.code, message: error.message });
    return NextResponse.json({ ok: false, message: "Profil bilgileriniz güncellenemedi." }, { status: 500 });
  }
  if (!data || String(data.id) !== access.studentId) {
    return NextResponse.json({ ok: false, message: "Profil bulunamadı." }, { status: 404 });
  }

  return profileResponse({
    id: String(data.id),
    name: String(data.name ?? ""),
    username: typeof data.username === "string" ? data.username : null,
    class_name: typeof data.class_name === "string" ? data.class_name : null,
    birth_date: typeof data.birth_date === "string" ? data.birth_date : null,
    school_name: typeof data.school_name === "string" ? data.school_name : null,
  }, access.username);
}
