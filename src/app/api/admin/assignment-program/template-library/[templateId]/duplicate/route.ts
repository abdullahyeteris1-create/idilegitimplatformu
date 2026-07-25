import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { isAdminSessionValid } from "@/lib/auth/adminSession";
import { validateClassGroup } from "@/lib/assignments/assignmentValidation";
import { duplicateTemplate } from "@/lib/assignments/programTemplateRepository";
import { getSupabaseServerClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

const MAX_NAME_LENGTH = 200;

/**
 * Bir sablonu tum gun/slot satirlariyla birlikte kopyalar - ogretmenin tek
 * hizlandiricisi. Hedef sinif grubu verilmezse kaynak sablonunki kullanilir.
 */
export async function POST(request: NextRequest, context: { params: Promise<{ templateId: string }> }) {
  if (!isAdminSessionValid(request)) {
    return NextResponse.json({ ok: false, message: "Yetkisiz erisim." }, { status: 401 });
  }

  let body: Record<string, unknown>;
  try {
    const parsed = (await request.json()) as unknown;
    if (typeof parsed !== "object" || parsed === null || Array.isArray(parsed)) {
      return NextResponse.json({ ok: false, message: "Gecersiz istek govdesi." }, { status: 400 });
    }
    body = parsed as Record<string, unknown>;
  } catch {
    return NextResponse.json({ ok: false, message: "Gecersiz istek govdesi." }, { status: 400 });
  }

  const name = typeof body.name === "string" ? body.name.trim() : "";
  if (!name || name.length > MAX_NAME_LENGTH) {
    return NextResponse.json(
      { ok: false, message: `Yeni sablon adi zorunludur ve en fazla ${MAX_NAME_LENGTH} karakter olmalidir.` },
      { status: 400 },
    );
  }

  let classGroup;
  if (body.classGroup !== undefined && body.classGroup !== null && body.classGroup !== "") {
    const classGroupResult = validateClassGroup(body.classGroup);
    if (!classGroupResult.ok) {
      return NextResponse.json({ ok: false, message: classGroupResult.message }, { status: 400 });
    }
    classGroup = classGroupResult.value;
  }

  const { templateId } = await context.params;
  const supabase = getSupabaseServerClient();
  if (!supabase) {
    return NextResponse.json({ ok: false, message: "Supabase baglantisi bulunamadi." }, { status: 500 });
  }

  const duplicated = await duplicateTemplate(supabase, templateId, {
    name,
    classGroup,
    createdBy: "ogretmen-paneli",
  });

  if (!duplicated.ok) {
    return NextResponse.json({ ok: false, message: duplicated.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true, templateId: duplicated.templateId }, { status: 201 });
}
