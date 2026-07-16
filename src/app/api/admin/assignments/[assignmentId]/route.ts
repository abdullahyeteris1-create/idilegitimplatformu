import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { isAdminSessionValid } from "@/lib/auth/adminSession";
import { getDailyAssignmentById, updateDailyAssignment } from "@/lib/assignments/assignmentRepository";
import { getSupabaseServerClient } from "@/lib/supabase/server";

type PatchBody = {
  title?: unknown;
  status?: unknown;
  teacherNote?: unknown;
};

export async function PATCH(request: NextRequest, context: { params: Promise<{ assignmentId: string }> }) {
  if (!isAdminSessionValid(request)) {
    return NextResponse.json({ ok: false, message: "Yetkisiz erisim." }, { status: 401 });
  }

  const { assignmentId } = await context.params;
  const supabase = getSupabaseServerClient();
  if (!supabase) {
    return NextResponse.json({ ok: false, message: "Supabase baglantisi bulunamadi." }, { status: 500 });
  }

  const existing = await getDailyAssignmentById(supabase, assignmentId);
  if (!existing) {
    return NextResponse.json({ ok: false, message: "Plan bulunamadi." }, { status: 404 });
  }

  let body: PatchBody;
  try {
    body = (await request.json()) as PatchBody;
  } catch {
    return NextResponse.json({ ok: false, message: "Gecersiz istek govdesi." }, { status: 400 });
  }

  const assignment = await updateDailyAssignment(supabase, assignmentId, {
    title: typeof body.title === "string" ? body.title.trim() : undefined,
    status:
      body.status === "pending" || body.status === "in_progress" || body.status === "completed" || body.status === "skipped"
        ? body.status
        : undefined,
    teacherNote: typeof body.teacherNote === "string" ? body.teacherNote.trim() || null : undefined,
  });

  if (!assignment) {
    return NextResponse.json({ ok: false, message: "Plan guncellenemedi." }, { status: 500 });
  }

  return NextResponse.json({ ok: true, assignment });
}
