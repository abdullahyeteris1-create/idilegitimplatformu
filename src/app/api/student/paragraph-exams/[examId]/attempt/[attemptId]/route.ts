import { NextResponse, type NextRequest } from "next/server";
import { clearStudentSessionCookie } from "@/lib/auth/studentSession";
import { verifyStudentAccess } from "@/lib/auth/verifyStudentAccess";
import { toAttemptDto, toResultDto } from "@/lib/paragraph-exams/dto";
import { repositoryErrorResponse } from "@/lib/paragraph-exams/http";
import { getStudentAttemptForPlay, saveStudentAnswer, finalizeStudentAttempt } from "@/lib/paragraph-exams/studentRepository";
import { isSelectedOption, isUuid } from "@/lib/paragraph-exams/validation";

export const runtime = "nodejs";

type Context = { params: Promise<{ examId: string; attemptId: string }> };

async function accessResponse(request: NextRequest): Promise<NextResponse | null> {
  const access = await verifyStudentAccess(request);
  if (access.ok) {
    if (!access.paragraphExercisesEnabled) return NextResponse.json({ ok: false, error: "Paragraf erişimi kapalı." }, { status: 403 });
    return null;
  }
  const response = NextResponse.json({ ok: false, error: access.message }, { status: access.status });
  if (access.clearSessionCookie) clearStudentSessionCookie(response);
  return response;
}

export async function GET(request: NextRequest, context: Context) {
  const denied = await accessResponse(request);
  if (denied) return denied;
  try {
    const { examId, attemptId } = await context.params;
    if (!isUuid(examId) || !isUuid(attemptId)) return NextResponse.json({ ok: false, error: "Attempt kimliği geçersiz." }, { status: 400 });
    const access = await verifyStudentAccess(request);
    if (!access.ok) return NextResponse.json({ ok: false, error: access.message }, { status: access.status });
    let bundle = await getStudentAttemptForPlay(attemptId, access.studentId);
    if (bundle.attempt.examId !== examId) return NextResponse.json({ ok: false, error: "Attempt sınavla eşleşmiyor." }, { status: 404 });
    if (bundle.attempt.status === "in_progress" && Date.parse(bundle.attempt.expiresAt) <= Date.now()) {
      bundle = await finalizeStudentAttempt(examId, attemptId, access.studentId);
    }
    return NextResponse.json({ ok: true, attempt: toAttemptDto(bundle.exam, bundle.attempt, bundle.passages, bundle.questions, bundle.answers) });
  } catch (error) { return repositoryErrorResponse(error, "Attempt alınamadı."); }
}

export async function PATCH(request: NextRequest, context: Context) {
  const denied = await accessResponse(request);
  if (denied) return denied;
  try {
    const { examId, attemptId } = await context.params;
    if (!isUuid(examId) || !isUuid(attemptId)) return NextResponse.json({ ok: false, error: "Attempt kimliği geçersiz." }, { status: 400 });
    const access = await verifyStudentAccess(request);
    if (!access.ok) return NextResponse.json({ ok: false, error: access.message }, { status: access.status });
    const body = await request.json() as Record<string, unknown>;
    const questionId = typeof body.questionId === "string" ? body.questionId : "";
    const selectedOption = body.selectedOption === undefined ? null : body.selectedOption;
    if (!isUuid(questionId) || !isSelectedOption(selectedOption)) return NextResponse.json({ ok: false, error: "Cevap verisi geçersiz." }, { status: 400 });
    const saved = await saveStudentAnswer(examId, attemptId, access.studentId, questionId, selectedOption);
    return NextResponse.json({ ok: true, answer: { questionId: saved.answer.examQuestionId, selectedOption: saved.answer.selectedOption, savedAt: saved.answer.savedAt } });
  } catch (error) { return repositoryErrorResponse(error, "Cevap kaydedilemedi."); }
}

export async function POST(request: NextRequest, context: Context) {
  const denied = await accessResponse(request);
  if (denied) return denied;
  try {
    const { examId, attemptId } = await context.params;
    if (!isUuid(examId) || !isUuid(attemptId)) return NextResponse.json({ ok: false, error: "Attempt kimliği geçersiz." }, { status: 400 });
    const access = await verifyStudentAccess(request);
    if (!access.ok) return NextResponse.json({ ok: false, error: access.message }, { status: access.status });
    const result = await finalizeStudentAttempt(examId, attemptId, access.studentId);
    const dto = toResultDto(result.exam, result.attempt, result.passages, result.questions, result.answers);
    if (!dto) return NextResponse.json({ ok: false, error: "Attempt sonuçlandırılamadı." }, { status: 409 });
    return NextResponse.json({ ok: true, result: dto });
  } catch (error) { return repositoryErrorResponse(error, "Deneme sonuçlandırılamadı."); }
}
