import { NextResponse, type NextRequest } from "next/server";
import { clearStudentSessionCookie } from "@/lib/auth/studentSession";
import { verifyStudentAccess } from "@/lib/auth/verifyStudentAccess";
import { getExam } from "@/lib/paragraph-exams/repository";
import { repositoryErrorResponse } from "@/lib/paragraph-exams/http";
import { toExamSummaryDto } from "@/lib/paragraph-exams/dto";
import { isUuid } from "@/lib/paragraph-exams/validation";

export const runtime = "nodejs";

export async function GET(request: NextRequest, context: { params: Promise<{ examId: string }> }) {
  const access = await verifyStudentAccess(request);
  if (!access.ok) {
    const response = NextResponse.json({ ok: false, error: access.message }, { status: access.status });
    if (access.clearSessionCookie) clearStudentSessionCookie(response);
    return response;
  }
  if (!access.paragraphExercisesEnabled) return NextResponse.json({ ok: false, error: "Paragraf erişimi kapalı." }, { status: 403 });
  try {
    const { examId } = await context.params;
    if (!isUuid(examId)) return NextResponse.json({ ok: false, error: "Sınav kimliği geçersiz." }, { status: 400 });
    return NextResponse.json({ ok: true, exam: toExamSummaryDto(await getExam(examId, { publishedOnly: true })) });
  } catch (error) { return repositoryErrorResponse(error, "Deneme alınamadı."); }
}
