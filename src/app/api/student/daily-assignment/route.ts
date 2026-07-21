import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { clearStudentSessionCookie } from "@/lib/auth/studentSession";
import { verifyStudentAccess } from "@/lib/auth/verifyStudentAccess";
import { generateDailyAssignment, getAssignmentDateForTimezone } from "@/lib/assignments/generateDailyAssignment";
import { getDailyAssignmentByDate } from "@/lib/assignments/assignmentRepository";
import { getSupabaseServerClient } from "@/lib/supabase/server";

export async function GET(request: NextRequest) {
  const access = await verifyStudentAccess(request);
  if (!access.ok) {
    const response = NextResponse.json({ ok: false, message: access.message }, { status: access.status });
    if (access.clearSessionCookie) {
      clearStudentSessionCookie(response);
    }
    return response;
  }

  const assignmentDate = request.nextUrl.searchParams.get("date")?.trim() || getAssignmentDateForTimezone("Europe/Istanbul");
  const readOnly = request.nextUrl.searchParams.get("readOnly")?.trim().toLowerCase() === "true";
  const supabase = getSupabaseServerClient();

  if (!supabase) {
    return NextResponse.json({ ok: false, message: "Supabase baglantisi bulunamadi." }, { status: 500 });
  }

  const existing = await getDailyAssignmentByDate(supabase, access.studentId, assignmentDate);
  if (existing) {
    return NextResponse.json({ ok: true, assignment: existing });
  }

  if (readOnly) {
    return NextResponse.json({ ok: true, assignment: null });
  }

  const assignment = await generateDailyAssignment({
    studentId: access.studentId,
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
