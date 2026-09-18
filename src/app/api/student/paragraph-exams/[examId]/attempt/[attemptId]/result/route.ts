import { NextResponse, type NextRequest } from "next/server";
import { clearStudentSessionCookie } from "@/lib/auth/studentSession";
import { verifyStudentAccess } from "@/lib/auth/verifyStudentAccess";
import { toResultDto } from "@/lib/paragraph-exams/dto";
import { repositoryErrorResponse } from "@/lib/paragraph-exams/http";
import { getStudentAttempt } from "@/lib/paragraph-exams/studentRepository";
import { isUuid } from "@/lib/paragraph-exams/validation";

export const runtime = "nodejs";

export async function GET(request: NextRequest, context: { params: Promise<{ examId: string; attemptId: string }> }) {
  const access = await verifyStudentAccess(request);
  if (!access.ok) {
    const response = NextResponse.json({ ok: false, error: access.message }, { status: access.status });
    if (access.clearSessionCookie) clearStudentSessionCookie(response);
    return response;
  }
  if (!access.paragraphExercisesEnabled) return NextResponse.json({ ok: false, error: "Paragraf erişimi kapalı." }, { status: 403 });
  try {
    const { examId, attemptId } = await context.params;
    if (!isUuid(examId) || !isUuid(attemptId)) return NextResponse.json({ ok: false, error: "Attempt kimliği geçersiz." }, { status: 400 });
    const bundle = await getStudentAttempt(attemptId, access.studentId);
    if (bundle.attempt.examId !== examId) return NextResponse.json({ ok: false, error: "Sonuç bulunamadı." }, { status: 404 });
    const result = toResultDto(bundle.exam, bundle.attempt, bundle.passages, bundle.questions, bundle.answers);
    if (!result) return NextResponse.json({ ok: false, error: "Attempt henüz sonuçlandırılmadı." }, { status: 409 });
    return NextResponse.json({ ok: true, result });
  } catch (error) { return repositoryErrorResponse(error, "Sonuç alınamadı."); }
}
