import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { isAdminSessionValid } from "@/lib/auth/adminSession";
import {
  deleteTemplateSlot,
  getTemplateWithSlots,
  replaceTemplateSlots,
  upsertTemplateSlot,
} from "@/lib/assignments/programTemplateRepository";
import { validateTemplateSlotInput, validateTemplateSlotList } from "@/lib/assignments/templateSlotValidation";
import { getSupabaseServerClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

/**
 * TEK SLOT ISLEMLERI NEDEN BU DOSYADA (ayri bir .../slots/[gun]/[sira]/route.ts
 * DEGIL): Next.js App Router'da bir segmentin kendi `route.ts` dosyasi varsa
 * (burada `.../slots`), o segmentin ALTINDAKI daha derin route handler'lar
 * eslesmiyor - istekler framework'un kendi 404'une dusuyor. Bu dogrulandi:
 * `.../slots` ve `.../[templateId]` 401 (yani eslesip auth'a takiliyor)
 * donerken `.../slots/1/1` 404 donuyordu. Bu yuzden tek-slot yazma/silme
 * ayni segment uzerinde farkli HTTP metotlariyla sunulur:
 *   PUT    .../slots  -> tum slotlari degistir (govde: { slots: [...] })
 *   PATCH  .../slots  -> tek slot yaz/guncelle (govde: slot + dayNumber/taskOrder)
 *   DELETE .../slots?dayNumber=1&taskOrder=2 -> tek slotu bosalt
 */

function unauthorized() {
  return NextResponse.json({ ok: false, message: "Yetkisiz erisim." }, { status: 401 });
}

async function readJsonBody(request: NextRequest): Promise<Record<string, unknown> | null> {
  try {
    const parsed = (await request.json()) as unknown;
    if (typeof parsed !== "object" || parsed === null || Array.isArray(parsed)) {
      return null;
    }
    return parsed as Record<string, unknown>;
  } catch {
    return null;
  }
}

/**
 * Bir sablonun TUM slotlarini degistirir (tam degisim). Sil+yaz islemi
 * replace_program_template_tasks RPC'si icinde tek transaction olarak
 * yapildigi icin yarim kaydedilmis bir sablon olusamaz.
 *
 * Eksik sablon kaydetmek SERBESTTIR (ör. 60/100 slot) - ogretmen sablonu
 * birden fazla oturumda doldurabilir. Tam doluluk yalniz ATAMA aninda
 * (create_student_assignment_program_from_template RPC'si) zorunlu tutulur.
 */
export async function PUT(request: NextRequest, context: { params: Promise<{ templateId: string }> }) {
  if (!isAdminSessionValid(request)) {
    return unauthorized();
  }

  const body = await readJsonBody(request);
  if (!body) {
    return NextResponse.json({ ok: false, message: "Gecersiz istek govdesi." }, { status: 400 });
  }

  const { templateId } = await context.params;
  const supabase = getSupabaseServerClient();
  if (!supabase) {
    return NextResponse.json({ ok: false, message: "Supabase baglantisi bulunamadi." }, { status: 500 });
  }

  // programDays sablonun KENDI kaydindan okunur - client'tan gelen bir gun
  // sayisina asla guvenilmez.
  const existing = await getTemplateWithSlots(supabase, templateId);
  if (!existing) {
    return NextResponse.json({ ok: false, message: "Sablon bulunamadi." }, { status: 404 });
  }

  const slotsResult = validateTemplateSlotList(body.slots, existing.template.programDays);
  if (!slotsResult.ok) {
    return NextResponse.json({ ok: false, message: slotsResult.message }, { status: 400 });
  }

  const replaced = await replaceTemplateSlots(supabase, templateId, slotsResult.value);
  if (!replaced.ok) {
    return NextResponse.json({ ok: false, message: replaced.message }, { status: 500 });
  }

  return NextResponse.json({
    ok: true,
    slotCount: replaced.slotCount,
    expectedSlotCount: existing.expectedSlotCount,
  });
}

/** Grid'de tek bir hucreyi kaydeder (tum sablonu gondermeden). */
export async function PATCH(request: NextRequest, context: { params: Promise<{ templateId: string }> }) {
  if (!isAdminSessionValid(request)) {
    return unauthorized();
  }

  const body = await readJsonBody(request);
  if (!body) {
    return NextResponse.json({ ok: false, message: "Gecersiz istek govdesi." }, { status: 400 });
  }

  const { templateId } = await context.params;
  const supabase = getSupabaseServerClient();
  if (!supabase) {
    return NextResponse.json({ ok: false, message: "Supabase baglantisi bulunamadi." }, { status: 500 });
  }

  const existing = await getTemplateWithSlots(supabase, templateId);
  if (!existing) {
    return NextResponse.json({ ok: false, message: "Sablon bulunamadi." }, { status: 404 });
  }

  const slotResult = validateTemplateSlotInput(body, existing.template.programDays);
  if (!slotResult.ok) {
    return NextResponse.json({ ok: false, message: slotResult.message }, { status: 400 });
  }

  const slot = slotResult.value;

  // Ayni gun icinde ayni egzersiz tekrar edemez. DB'deki unique constraint son
  // savunma katmanidir; burada erken yakalayip anlasilir mesaj donulur.
  const conflict = existing.slots.some(
    (candidate) =>
      candidate.dayNumber === slot.dayNumber &&
      candidate.taskOrder !== slot.taskOrder &&
      candidate.exerciseSlug === slot.exerciseSlug,
  );
  if (conflict) {
    return NextResponse.json(
      { ok: false, message: "Bu çalışma bu gün içinde zaten kullanılıyor." },
      { status: 409 },
    );
  }

  const saved = await upsertTemplateSlot(supabase, templateId, slot);
  if (!saved.ok) {
    return NextResponse.json({ ok: false, message: saved.message }, { status: 409 });
  }

  return NextResponse.json({ ok: true, slot });
}

/** Tek bir hucreyi bosaltir: DELETE .../slots?dayNumber=1&taskOrder=2 */
export async function DELETE(request: NextRequest, context: { params: Promise<{ templateId: string }> }) {
  if (!isAdminSessionValid(request)) {
    return unauthorized();
  }

  const dayNumber = Number(request.nextUrl.searchParams.get("dayNumber"));
  const taskOrder = Number(request.nextUrl.searchParams.get("taskOrder"));
  if (!Number.isInteger(dayNumber) || !Number.isInteger(taskOrder)) {
    return NextResponse.json({ ok: false, message: "Gecersiz slot konumu." }, { status: 400 });
  }

  const { templateId } = await context.params;
  const supabase = getSupabaseServerClient();
  if (!supabase) {
    return NextResponse.json({ ok: false, message: "Supabase baglantisi bulunamadi." }, { status: 500 });
  }

  const removed = await deleteTemplateSlot(supabase, templateId, dayNumber, taskOrder);
  if (!removed) {
    return NextResponse.json({ ok: false, message: "Slot silinemedi." }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
