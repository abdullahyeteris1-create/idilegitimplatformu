import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { isAdminSessionValid } from "@/lib/auth/adminSession";
import { deleteEducationProgramTemplate } from "@/lib/education-programs/repository";
import { getSupabaseServerClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

/**
 * Bir Egitim Programi sablonunu kalici olarak siler (hard delete - kasitli
 * bir tasarim karari, kullanicinin "Kalici Olarak Sil"/"geri alinamaz" acik
 * talebi dogrultusunda). education_program_template_days/_tasks ON DELETE
 * CASCADE ile otomatik temizlenir. student_education_programs.source_template_id
 * ON DELETE SET NULL oldugundan, bu sablondan daha once atanmis ogrenci
 * programlari (tamamen bagimsiz snapshot) HICBIR SEKILDE etkilenmez.
 */
export async function DELETE(request: NextRequest, context: { params: Promise<{ templateId: string }> }) {
  if (!isAdminSessionValid(request)) {
    return NextResponse.json({ ok: false, message: "Yetkisiz erişim." }, { status: 401 });
  }

  const { templateId } = await context.params;
  const supabase = getSupabaseServerClient();
  if (!supabase) {
    return NextResponse.json({ ok: false, message: "Supabase bağlantısı bulunamadı." }, { status: 500 });
  }

  const result = await deleteEducationProgramTemplate(supabase, templateId);

  if (!result.ok) {
    const status = result.code === "not_found" ? 404 : 500;
    return NextResponse.json({ ok: false, message: result.message }, { status });
  }

  return NextResponse.json({ ok: true });
}
