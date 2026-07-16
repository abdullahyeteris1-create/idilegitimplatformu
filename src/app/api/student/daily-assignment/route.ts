import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { readStudentSessionFromRequest } from "@/lib/auth/studentSession";
import { generateDailyAssignment, getAssignmentDateForTimezone } from "@/lib/assignments/generateDailyAssignment";
import { getDailyAssignmentByDate } from "@/lib/assignments/assignmentRepository";
import { getSupabaseServerClient } from "@/lib/supabase/server";

export async function GET(request: NextRequest) {
  const session = readStudentSessionFromRequest(request);
  if (!session?.studentId) {
    return NextResponse.json({ ok: false, message: "Ogrenci oturumu dogrulanamadi." }, { status: 401 });
  }

  const assignmentDate = request.nextUrl.searchParams.get("date")?.trim() || getAssignmentDateForTimezone("Europe/Istanbul");
  const supabase = getSupabaseServerClient();

  if (!supabase) {
    return NextResponse.json({ ok: false, message: "Supabase baglantisi bulunamadi." }, { status: 500 });
  }

  const existing = await getDailyAssignmentByDate(supabase, session.studentId, assignmentDate);
  if (existing) {
    return NextResponse.json({ ok: true, assignment: existing });
  }

  const assignment = await generateDailyAssignment({
    studentId: session.studentId,
    assignmentDate,
  });

  if (!assignment) {
    return NextResponse.json(
      {
        ok: false,
        message:
          "Gunluk odev olusturulamadi. Egitim duzeyi atanmis olmayabilir veya ogrenci manuel moda alinmis olabilir.",
      },
      { status: 409 },
    );
  }

  return NextResponse.json({ ok: true, assignment });
}
