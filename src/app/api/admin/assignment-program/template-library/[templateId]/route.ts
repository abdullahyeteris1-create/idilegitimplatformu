import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { isAdminSessionValid } from "@/lib/auth/adminSession";
import { ASSIGNMENT_EXERCISE_CATALOG } from "@/lib/assignments/assignmentExerciseCatalog";
import {
  deactivateTemplate,
  getTemplateWithSlots,
  updateTemplateMeta,
} from "@/lib/assignments/programTemplateRepository";
import { getSupabaseServerClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

const MAX_NAME_LENGTH = 200;
const MAX_DESCRIPTION_LENGTH = 2000;

function unauthorized() {
  return NextResponse.json({ ok: false, message: "Yetkisiz erisim." }, { status: 401 });
}

/** Sablon basligi + tum gun/slot satirlari (editor ekrani icin). */
export async function GET(request: NextRequest, context: { params: Promise<{ templateId: string }> }) {
  if (!isAdminSessionValid(request)) {
    return unauthorized();
  }

  const { templateId } = await context.params;
  const supabase = getSupabaseServerClient();
  if (!supabase) {
    return NextResponse.json({ ok: false, message: "Supabase baglantisi bulunamadi." }, { status: 500 });
  }

  const result = await getTemplateWithSlots(supabase, templateId);
  if (!result) {
    return NextResponse.json({ ok: false, message: "Sablon bulunamadi." }, { status: 404 });
  }

  return NextResponse.json({ ok: true, ...result, catalog: ASSIGNMENT_EXERCISE_CATALOG });
}

/** Sablon basligini gunceller (ad / aciklama). */
export async function PATCH(request: NextRequest, context: { params: Promise<{ templateId: string }> }) {
  if (!isAdminSessionValid(request)) {
    return unauthorized();
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
      { ok: false, message: `Sablon adi zorunludur ve en fazla ${MAX_NAME_LENGTH} karakter olmalidir.` },
      { status: 400 },
    );
  }

  let description: string | null = null;
  if (body.description !== undefined && body.description !== null) {
    if (typeof body.description !== "string" || body.description.length > MAX_DESCRIPTION_LENGTH) {
      return NextResponse.json(
        { ok: false, message: `Aciklama en fazla ${MAX_DESCRIPTION_LENGTH} karakter olmalidir.` },
        { status: 400 },
      );
    }
    description = body.description.trim() || null;
  }

  const { templateId } = await context.params;
  const supabase = getSupabaseServerClient();
  if (!supabase) {
    return NextResponse.json({ ok: false, message: "Supabase baglantisi bulunamadi." }, { status: 500 });
  }

  const updated = await updateTemplateMeta(supabase, templateId, { name, description });
  if (!updated) {
    return NextResponse.json({ ok: false, message: "Sablon guncellenemedi." }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}

/**
 * Sablonu pasiflestirir. Kalici silme KASITLI olarak yapilmaz - bu sablondan
 * atanmis programlarin koken bilgisi (template_id) korunmalidir.
 */
export async function DELETE(request: NextRequest, context: { params: Promise<{ templateId: string }> }) {
  if (!isAdminSessionValid(request)) {
    return unauthorized();
  }

  const { templateId } = await context.params;
  const supabase = getSupabaseServerClient();
  if (!supabase) {
    return NextResponse.json({ ok: false, message: "Supabase baglantisi bulunamadi." }, { status: 500 });
  }

  const deactivated = await deactivateTemplate(supabase, templateId);
  if (!deactivated) {
    return NextResponse.json({ ok: false, message: "Sablon pasiflestirilemedi." }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
