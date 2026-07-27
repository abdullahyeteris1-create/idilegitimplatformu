import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { isAdminSessionValid } from "@/lib/auth/adminSession";
import { duplicateEducationProgramTemplate } from "@/lib/education-programs/repository";
import { getSupabaseServerClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

/**
 * Bir Egitim Programi sablonunu (taslak veya yayinda) tum gunleri/gorevleriyle
 * birlikte, yeni bagimsiz bir taslak sablon olarak kopyalar. Cakismasiz ad
 * uretimi ve atomik kopyalama duplicateEducationProgramTemplate icinde
 * yapilir (bkz. duplicate_education_program_template_v1 RPC'si).
 */
export async function POST(request: NextRequest, context: { params: Promise<{ templateId: string }> }) {
  if (!isAdminSessionValid(request)) {
    return NextResponse.json({ ok: false, message: "Yetkisiz erişim." }, { status: 401 });
  }

  const { templateId } = await context.params;
  const supabase = getSupabaseServerClient();
  if (!supabase) {
    return NextResponse.json({ ok: false, message: "Supabase bağlantısı bulunamadı." }, { status: 500 });
  }

  const createdBy = process.env.ADMIN_USERNAME?.trim() || "teacher";
  const result = await duplicateEducationProgramTemplate(supabase, templateId, createdBy);

  if (!result.ok) {
    const status = result.code === "not_found" ? 404 : 500;
    return NextResponse.json({ ok: false, message: result.message }, { status });
  }

  return NextResponse.json({ ok: true, templateId: result.value.templateId }, { status: 201 });
}
