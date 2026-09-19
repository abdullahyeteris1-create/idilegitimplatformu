import { NextResponse, type NextRequest } from "next/server";
import { isAdminSessionValid } from "@/lib/auth/adminSession";
import { deleteQuestion, getQuestions, reorderQuestions, upsertQuestion } from "@/lib/paragraph-exams/repository";
import { repositoryErrorResponse } from "@/lib/paragraph-exams/http";
import { isUuid, validateQuestionInput } from "@/lib/paragraph-exams/validation";

export const runtime = "nodejs";
type Context = { params: Promise<{ examId: string }> };

function unauthorized(): NextResponse { return NextResponse.json({ ok: false, error: "Yetkisiz erişim." }, { status: 401 }); }

export async function GET(request: NextRequest, context: Context) {
  if (!isAdminSessionValid(request)) return unauthorized();
  try {
    const { examId } = await context.params;
    if (!isUuid(examId)) return NextResponse.json({ ok: false, error: "Sınav kimliği geçersiz." }, { status: 400 });
    return NextResponse.json({ ok: true, questions: await getQuestions(examId) });
  } catch (error) { return repositoryErrorResponse(error, "Sorular alınamadı."); }
}

export async function POST(request: NextRequest, context: Context) {
  if (!isAdminSessionValid(request)) return unauthorized();
  try {
    const { examId } = await context.params;
    if (!isUuid(examId)) return NextResponse.json({ ok: false, error: "Sınav kimliği geçersiz." }, { status: 400 });
    const body = await request.json() as Record<string, unknown>;
    if (Array.isArray(body.orderedQuestionIds)) {
      if (body.orderedQuestionIds.some((id) => typeof id !== "string")) return NextResponse.json({ ok: false, error: "Soru sırası geçersiz." }, { status: 400 });
      return NextResponse.json({ ok: true, questions: await reorderQuestions(examId, body.orderedQuestionIds as string[]) });
    }
    const validated = validateQuestionInput(body);
    if (!validated.ok) return NextResponse.json({ ok: false, error: validated.error }, { status: 400 });
    const questionId = typeof body.id === "string" ? body.id : null;
    return NextResponse.json({ ok: true, question: await upsertQuestion(examId, questionId, validated.value) }, { status: questionId ? 200 : 201 });
  } catch (error) { return repositoryErrorResponse(error, "Soru kaydedilemedi."); }
}

export async function DELETE(request: NextRequest, context: Context) {
  if (!isAdminSessionValid(request)) return unauthorized();
  try {
    const { examId } = await context.params;
    const questionId = new URL(request.url).searchParams.get("id") ?? "";
    if (!isUuid(examId) || !isUuid(questionId)) return NextResponse.json({ ok: false, error: "Soru kimliği geçersiz." }, { status: 400 });
    await deleteQuestion(examId, questionId);
    return NextResponse.json({ ok: true });
  } catch (error) { return repositoryErrorResponse(error, "Soru silinemedi."); }
}
