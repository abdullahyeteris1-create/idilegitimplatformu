import { NextResponse, type NextRequest } from "next/server";
import { clearStudentSessionCookie } from "@/lib/auth/studentSession";
import { verifyStudentAccess } from "@/lib/auth/verifyStudentAccess";
import { getStudentExamStates } from "@/lib/paragraph-exams/studentRepository";
import { listExams } from "@/lib/paragraph-exams/repository";
import { repositoryErrorResponse } from "@/lib/paragraph-exams/http";
import { toStudentExamSummaryDto } from "@/lib/paragraph-exams/dto";

export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  const access = await verifyStudentAccess(request);
  if (!access.ok) {
    const response = NextResponse.json({ ok: false, error: access.message }, { status: access.status });
    if (access.clearSessionCookie) clearStudentSessionCookie(response);
    return response;
  }
  if (!access.paragraphExercisesEnabled) return NextResponse.json({ ok: false, error: "Paragraf erişimi kapalı." }, { status: 403 });
  try {
    const exams = await listExams("published");
    const states = await getStudentExamStates(access.studentId, exams.map((exam) => exam.id));
    return NextResponse.json({ ok: true, exams: exams.map((exam) => toStudentExamSummaryDto(exam, states.get(exam.id)!)) });
  } catch (error) {
    return repositoryErrorResponse(error, "Denemeler alınamadı.");
  }
}
