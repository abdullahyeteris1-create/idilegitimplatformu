import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { isAdminSessionValid } from "@/lib/auth/adminSession";
import { deleteStudentEducationProgram } from "@/lib/education-programs/studentProgramRepository";
import { isEducationProgramUuid } from "@/lib/education-programs/studentProgramValidation";
import { getSupabaseServerClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

/**
 * Ogrenciye atanmis bir Egitim Programi kaydini (student_education_programs)
 * kalici olarak siler (hard delete - kullanicinin acikca istedigi "Kalici
 * Olarak Sil"/"geri alinamaz" davranisi). student_education_program_days/
 * _tasks ON DELETE CASCADE ile otomatik temizlenir. Ogrenci hesabi, kaynak
 * sablon ve exercise_results/okuma testi gecmisi bu tabloya hicbir FK ile
 * bagli olmadigindan HICBIR SEKILDE etkilenmez.
 */
export async function DELETE(
  request: NextRequest,
  context: { params: Promise<{ programId: string }> },
) {
  if (!isAdminSessionValid(request)) {
    return NextResponse.json({ ok: false, message: "Yetkisiz erişim." }, { status: 401 });
  }

  const { programId } = await context.params;
  if (!isEducationProgramUuid(programId)) {
    return NextResponse.json({ ok: false, message: "Geçersiz program kimliği." }, { status: 400 });
  }

  const supabase = getSupabaseServerClient();
  if (!supabase) {
    return NextResponse.json({ ok: false, message: "Supabase bağlantısı bulunamadı." }, { status: 500 });
  }

  const result = await deleteStudentEducationProgram(supabase, programId);

  if (!result.ok) {
    const status = result.code === "not_found" ? 404 : result.code === "conflict" ? 409 : 500;
    return NextResponse.json({ ok: false, message: result.message }, { status });
  }

  return NextResponse.json({ ok: true });
}
