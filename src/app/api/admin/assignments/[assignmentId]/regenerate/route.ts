import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { isAdminSessionValid } from "@/lib/auth/adminSession";
import { deleteDailyAssignment, getDailyAssignmentById, hasStartedAssignment } from "@/lib/assignments/assignmentRepository";
import { generateDailyAssignment } from "@/lib/assignments/generateDailyAssignment";
import { getSupabaseServerClient } from "@/lib/supabase/server";

export async function POST(request: NextRequest, context: { params: Promise<{ assignmentId: string }> }) {
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

  if (await hasStartedAssignment(supabase, assignmentId)) {
    return NextResponse.json(
      { ok: false, message: "Baslanmis veya tamamlanmis plan dogrudan yeniden olusturulamaz." },
      { status: 409 },
    );
  }

  const deleted = await deleteDailyAssignment(supabase, assignmentId);
  if (!deleted) {
    return NextResponse.json({ ok: false, message: "Plan silinip yeniden olusturulamadi." }, { status: 500 });
  }

  const assignment = await generateDailyAssignment({
    studentId: existing.studentId,
    assignmentDate: existing.assignmentDate,
    forceRegenerate: true,
    createdBy: "teacher",
  });

  if (!assignment) {
    return NextResponse.json({ ok: false, message: "Plan yeniden olusturulamadi." }, { status: 500 });
  }

  return NextResponse.json({ ok: true, assignment });
}
