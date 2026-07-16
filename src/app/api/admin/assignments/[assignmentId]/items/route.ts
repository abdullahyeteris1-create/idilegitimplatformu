import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { isAdminSessionValid } from "@/lib/auth/adminSession";
import { ASSIGNMENT_EXERCISE_BY_SLUG } from "@/lib/assignments/exerciseCatalog";
import { createDailyAssignmentItem, getDailyAssignmentById } from "@/lib/assignments/assignmentRepository";
import { getSupabaseServerClient } from "@/lib/supabase/server";

type CreateBody = {
  exerciseSlug?: unknown;
  sortOrder?: unknown;
  settingsJson?: unknown;
  targetType?: unknown;
  targetValue?: unknown;
  assignedTextId?: unknown;
  assignedTextTitle?: unknown;
  isRepeat?: unknown;
  teacherNote?: unknown;
};

export async function POST(request: NextRequest, context: { params: Promise<{ assignmentId: string }> }) {
  if (!isAdminSessionValid(request)) {
    return NextResponse.json({ ok: false, message: "Yetkisiz erisim." }, { status: 401 });
  }

  const { assignmentId } = await context.params;
  const supabase = getSupabaseServerClient();
  if (!supabase) {
    return NextResponse.json({ ok: false, message: "Supabase baglantisi bulunamadi." }, { status: 500 });
  }

  const assignment = await getDailyAssignmentById(supabase, assignmentId);
  if (!assignment) {
    return NextResponse.json({ ok: false, message: "Plan bulunamadi." }, { status: 404 });
  }

  let body: CreateBody;
  try {
    body = (await request.json()) as CreateBody;
  } catch {
    return NextResponse.json({ ok: false, message: "Gecersiz istek govdesi." }, { status: 400 });
  }

  const exerciseSlug = typeof body.exerciseSlug === "string" ? body.exerciseSlug.trim() : "";
  const definition = ASSIGNMENT_EXERCISE_BY_SLUG.get(exerciseSlug);
  if (!definition) {
    return NextResponse.json({ ok: false, message: "Gecersiz egzersiz secimi." }, { status: 400 });
  }

  const item = await createDailyAssignmentItem(supabase, {
    assignmentId,
    studentId: assignment.studentId,
    exerciseSlug,
    exerciseTitle: definition.title,
    category: definition.category,
    sortOrder: typeof body.sortOrder === "number" ? body.sortOrder : assignment.items.length + 1,
    settingsJson:
      body.settingsJson && typeof body.settingsJson === "object" && !Array.isArray(body.settingsJson)
        ? (body.settingsJson as Record<string, number | string | boolean>)
        : {},
    status: "pending",
    targetType: typeof body.targetType === "string" ? body.targetType as never : undefined,
    targetValue: typeof body.targetValue === "number" ? body.targetValue : undefined,
    assignedTextId: typeof body.assignedTextId === "string" ? body.assignedTextId : undefined,
    assignedTextTitle: typeof body.assignedTextTitle === "string" ? body.assignedTextTitle : undefined,
    isRepeat: body.isRepeat === true,
    teacherNote: typeof body.teacherNote === "string" ? body.teacherNote.trim() : undefined,
  });

  if (!item) {
    return NextResponse.json({ ok: false, message: "Item eklenemedi." }, { status: 500 });
  }

  const updatedAssignment = await getDailyAssignmentById(supabase, assignmentId);
  return NextResponse.json({ ok: true, item, assignment: updatedAssignment });
}
