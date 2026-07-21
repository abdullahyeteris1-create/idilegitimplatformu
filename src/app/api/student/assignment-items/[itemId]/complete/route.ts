import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { clearStudentSessionCookie } from "@/lib/auth/studentSession";
import { verifyStudentAccess } from "@/lib/auth/verifyStudentAccess";
import { ASSIGNMENT_EXERCISE_BY_SLUG } from "@/lib/assignments/exerciseCatalog";
import {
  completeAssignmentItem,
  getAssignmentItemById,
  getResultById,
  recomputeAssignmentStatus,
} from "@/lib/assignments/assignmentRepository";
import { getSupabaseServerClient } from "@/lib/supabase/server";

type CompletePayload = {
  resultId?: unknown;
};

function badRequest(message: string) {
  return NextResponse.json({ ok: false, message }, { status: 400 });
}

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ itemId: string }> },
) {
  let payload: CompletePayload;
  try {
    payload = (await request.json()) as CompletePayload;
  } catch {
    return badRequest("Gecersiz istek govdesi.");
  }

  const access = await verifyStudentAccess(request);
  const resultId = typeof payload.resultId === "string" ? payload.resultId.trim() : "";

  if (!access.ok) {
    const response = NextResponse.json({ ok: false, message: access.message }, { status: access.status });
    if (access.clearSessionCookie) {
      clearStudentSessionCookie(response);
    }
    return response;
  }

  const studentId = access.studentId;

  if (!resultId) {
    return badRequest("resultId zorunludur.");
  }

  const { itemId } = await context.params;
  if (!itemId) {
    return badRequest("itemId gecersiz.");
  }

  const supabase = getSupabaseServerClient();
  if (!supabase) {
    return NextResponse.json({ ok: false, message: "Supabase baglantisi bulunamadi." }, { status: 500 });
  }

  const item = await getAssignmentItemById(supabase, itemId);
  if (!item) {
    return NextResponse.json({ ok: false, message: "Odev item bulunamadi." }, { status: 404 });
  }

  if (item.studentId !== studentId) {
    return NextResponse.json({ ok: false, message: "Bu item ogrenciye ait degil." }, { status: 403 });
  }

  if (item.status === "completed") {
    return NextResponse.json({ ok: true, idempotent: true });
  }

  const result = await getResultById(supabase, resultId);
  if (!result) {
    return NextResponse.json({ ok: false, message: "Sonuc bulunamadi." }, { status: 404 });
  }

  if (String(result.student_id ?? "") !== studentId) {
    return NextResponse.json({ ok: false, message: "Sonuc ogrenciye ait degil." }, { status: 403 });
  }

  const mapped = ASSIGNMENT_EXERCISE_BY_SLUG.get(item.exerciseSlug);
  if (!mapped || mapped.resultExerciseType !== String(result.exercise_type ?? "")) {
    return NextResponse.json({ ok: false, message: "Sonuc egzersiz turu ile item uyusmuyor." }, { status: 409 });
  }

  await completeAssignmentItem(supabase, itemId, resultId);
  await recomputeAssignmentStatus(supabase, item.assignmentId);

  return NextResponse.json({ ok: true });
}
