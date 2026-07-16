import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { isAdminSessionValid } from "@/lib/auth/adminSession";
import { getDailyAssignmentByDate, listComprehensionTextCandidates } from "@/lib/assignments/assignmentRepository";
import { getSupabaseServerClient } from "@/lib/supabase/server";

export async function GET(request: NextRequest) {
  if (!isAdminSessionValid(request)) {
    return NextResponse.json({ ok: false, message: "Yetkisiz erisim." }, { status: 401 });
  }

  const studentId = request.nextUrl.searchParams.get("studentId")?.trim() ?? "";
  const assignmentDate = request.nextUrl.searchParams.get("date")?.trim() ?? "";

  if (!studentId || !assignmentDate) {
    return NextResponse.json({ ok: false, message: "studentId ve date zorunludur." }, { status: 400 });
  }

  const supabase = getSupabaseServerClient();
  if (!supabase) {
    return NextResponse.json({ ok: false, message: "Supabase baglantisi bulunamadi." }, { status: 500 });
  }

  const assignment = await getDailyAssignmentByDate(supabase, studentId, assignmentDate);
  const textCandidates = await listComprehensionTextCandidates(supabase);

  return NextResponse.json({
    ok: true,
    assignment,
    textCandidates: textCandidates.map((item) => ({
      id: String(item.id ?? ""),
      title: String(item.title ?? ""),
      educationLevel: typeof item.education_level === "string" ? item.education_level : null,
    })),
  });
}
