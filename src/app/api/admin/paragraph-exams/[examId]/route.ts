import { NextResponse, type NextRequest } from "next/server";
import { isAdminSessionValid } from "@/lib/auth/adminSession";
import { deleteExam, getDeleteExamImpact, getExam, getPassages, getQuestions, updateDraftExam } from "@/lib/paragraph-exams/repository";
import { repositoryErrorResponse } from "@/lib/paragraph-exams/http";
import { isUuid, validateExamInput } from "@/lib/paragraph-exams/validation";

export const runtime = "nodejs";

type Context = { params: Promise<{ examId: string }> };

function unauthorized(): NextResponse {
  return NextResponse.json({ ok: false, error: "Yetkisiz erişim." }, { status: 401 });
}

export async function GET(request: NextRequest, context: Context) {
  if (!isAdminSessionValid(request)) return unauthorized();
  try {
    const { examId } = await context.params;
    if (!isUuid(examId)) return NextResponse.json({ ok: false, error: "Sınav kimliği geçersiz." }, { status: 400 });
    if (request.nextUrl.searchParams.get("view") === "delete-impact") {
      return NextResponse.json({ ok: true, impact: await getDeleteExamImpact(examId) });
    }
    const [exam, passages, questions] = await Promise.all([getExam(examId), getPassages(examId), getQuestions(examId)]);
    return NextResponse.json({ ok: true, exam, passages, questions });
  } catch (error) {
    return repositoryErrorResponse(error, "Sınav alınamadı.");
  }
}

export async function PATCH(request: NextRequest, context: Context) {
  if (!isAdminSessionValid(request)) return unauthorized();
  try {
    const { examId } = await context.params;
    if (!isUuid(examId)) return NextResponse.json({ ok: false, error: "Sınav kimliği geçersiz." }, { status: 400 });
    const validated = validateExamInput(await request.json());
    if (!validated.ok) return NextResponse.json({ ok: false, error: validated.error }, { status: 400 });
    return NextResponse.json({ ok: true, exam: await updateDraftExam(examId, validated.value) });
  } catch (error) {
    return repositoryErrorResponse(error, "Taslak sınav güncellenemedi.");
  }
}

export async function DELETE(request: NextRequest, context: Context) {
  if (!isAdminSessionValid(request)) return unauthorized();
  try {
    const { examId } = await context.params;
    if (!isUuid(examId)) return NextResponse.json({ ok: false, error: "Sınav kimliği geçersiz." }, { status: 400 });
    const deleted = await deleteExam(examId);
    return NextResponse.json({ ok: true, deleted, message: "Deneme ve bağlı öğrenci sonuçları kalıcı olarak silindi." });
  } catch (error) {
    return repositoryErrorResponse(error, "Deneme silinemedi.");
  }
}