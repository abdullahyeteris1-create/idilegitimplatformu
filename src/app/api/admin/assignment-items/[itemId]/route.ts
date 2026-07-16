import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { isAdminSessionValid } from "@/lib/auth/adminSession";
import { ASSIGNMENT_EXERCISE_BY_SLUG } from "@/lib/assignments/exerciseCatalog";
import { deleteDailyAssignmentItem, getAssignmentItemById, updateDailyAssignmentItem, getDailyAssignmentById } from "@/lib/assignments/assignmentRepository";
import { getSupabaseServerClient } from "@/lib/supabase/server";

type PatchBody = {
  exerciseSlug?: unknown;
  sortOrder?: unknown;
  status?: unknown;
  settingsJson?: unknown;
  targetType?: unknown;
  targetValue?: unknown;
  assignedTextId?: unknown;
  assignedTextTitle?: unknown;
  isRepeat?: unknown;
  teacherNote?: unknown;
};

export async function PATCH(request: NextRequest, context: { params: Promise<{ itemId: string }> }) {
  if (!isAdminSessionValid(request)) {
    return NextResponse.json({ ok: false, message: "Yetkisiz erisim." }, { status: 401 });
  }

  const { itemId } = await context.params;
  const supabase = getSupabaseServerClient();
  if (!supabase) {
    return NextResponse.json({ ok: false, message: "Supabase baglantisi bulunamadi." }, { status: 500 });
  }

  const item = await getAssignmentItemById(supabase, itemId);
  if (!item) {
    return NextResponse.json({ ok: false, message: "Item bulunamadi." }, { status: 404 });
  }

  let body: PatchBody;
  try {
    body = (await request.json()) as PatchBody;
  } catch {
    return NextResponse.json({ ok: false, message: "Gecersiz istek govdesi." }, { status: 400 });
  }

  const nextSlug = typeof body.exerciseSlug === "string" ? body.exerciseSlug.trim() : item.exerciseSlug;
  const definition = ASSIGNMENT_EXERCISE_BY_SLUG.get(nextSlug);
  if (!definition) {
    return NextResponse.json({ ok: false, message: "Gecersiz egzersiz secimi." }, { status: 400 });
  }

  const updatedItem = await updateDailyAssignmentItem(supabase, itemId, {
    exerciseSlug: nextSlug,
    exerciseTitle: definition.title,
    category: definition.category,
    sortOrder: typeof body.sortOrder === "number" ? body.sortOrder : item.sortOrder,
    status:
      body.status === "pending" || body.status === "started" || body.status === "completed" || body.status === "skipped"
        ? body.status
        : item.status,
    settingsJson:
      body.settingsJson && typeof body.settingsJson === "object" && !Array.isArray(body.settingsJson)
        ? (body.settingsJson as Record<string, number | string | boolean>)
        : item.settingsJson,
    targetType: typeof body.targetType === "string" ? body.targetType as never : item.targetType,
    targetValue: typeof body.targetValue === "number" ? body.targetValue : item.targetValue,
    assignedTextId: typeof body.assignedTextId === "string" ? body.assignedTextId || null : item.assignedTextId,
    assignedTextTitle: typeof body.assignedTextTitle === "string" ? body.assignedTextTitle || null : item.assignedTextTitle,
    isRepeat: body.isRepeat === true,
    teacherNote: typeof body.teacherNote === "string" ? body.teacherNote.trim() || null : item.teacherNote,
  });

  if (!updatedItem) {
    return NextResponse.json({ ok: false, message: "Item guncellenemedi." }, { status: 500 });
  }

  const assignment = await getDailyAssignmentById(supabase, updatedItem.assignmentId);
  return NextResponse.json({ ok: true, item: updatedItem, assignment });
}

export async function DELETE(request: NextRequest, context: { params: Promise<{ itemId: string }> }) {
  if (!isAdminSessionValid(request)) {
    return NextResponse.json({ ok: false, message: "Yetkisiz erisim." }, { status: 401 });
  }

  const { itemId } = await context.params;
  const supabase = getSupabaseServerClient();
  if (!supabase) {
    return NextResponse.json({ ok: false, message: "Supabase baglantisi bulunamadi." }, { status: 500 });
  }

  const item = await getAssignmentItemById(supabase, itemId);
  if (!item) {
    return NextResponse.json({ ok: false, message: "Item bulunamadi." }, { status: 404 });
  }

  if (item.status !== "pending") {
    return NextResponse.json({ ok: false, message: "Baslanmis veya tamamlanmis item silinemez." }, { status: 409 });
  }

  const deleted = await deleteDailyAssignmentItem(supabase, itemId);
  if (!deleted) {
    return NextResponse.json({ ok: false, message: "Item silinemedi." }, { status: 500 });
  }

  return NextResponse.json({ ok: true, assignmentId: item.assignmentId });
}
