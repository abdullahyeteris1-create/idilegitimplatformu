import { NextResponse, type NextRequest } from "next/server";
import { isAdminSessionValid } from "@/lib/auth/adminSession";
import {
  createQuestionsBulk,
  ParagraphQuestionDuplicateError,
  validateQuestionInput,
  type QuestionInput,
} from "@/lib/paragraph-exercises/paragraphQuestionAdminRepository";

export const runtime = "nodejs";

const inFlight = new Map<string, Promise<Awaited<ReturnType<typeof createQuestionsBulk>>>>();
const no = () => NextResponse.json({ ok: false, error: "Yetkisiz erişim." }, { status: 401 });

export async function POST(request: NextRequest) {
  if (!isAdminSessionValid(request)) return no();
  const idempotencyKey = request.headers.get("idempotency-key")?.trim() ?? "";
  if (!/^[A-Za-z0-9._:-]{8,200}$/u.test(idempotencyKey)) {
    return NextResponse.json({ ok: false, error: "İçe aktarma anahtarı geçersiz." }, { status: 400 });
  }
  try {
    const raw = await request.text();
    if (raw.length > 2_000_000) return NextResponse.json({ ok: false, error: "İçe aktarma önizlemesi çok büyük." }, { status: 413 });
    const body = JSON.parse(raw) as { questions?: unknown };
    if (!Array.isArray(body.questions) || body.questions.length === 0 || body.questions.length > 100) {
      return NextResponse.json({ ok: false, error: "İçe aktarılacak soru listesi geçersiz." }, { status: 400 });
    }
    const questions: QuestionInput[] = [];
    for (const [index, value] of body.questions.entries()) {
      const result = validateQuestionInput(value, { allowEmptyPassage: true, allowFourOptions: true });
      if (!result.ok) return NextResponse.json({ ok: false, error: `${index + 1}. soru: ${result.error}` }, { status: 400 });
      questions.push({ ...result.value, isActive: false });
    }
    const username = process.env.ADMIN_USERNAME?.trim() || "teacher";
    const key = `${username}:${idempotencyKey}`;
    const existing = inFlight.get(key);
    if (existing) return NextResponse.json({ ok: true, count: (await existing).length }, { status: 201 });
    const promise = createQuestionsBulk(questions, "manual");
    inFlight.set(key, promise);
    try {
      const created = await promise;
      return NextResponse.json({ ok: true, count: created.length, questions: created.map((question) => ({ id: question.id })) }, { status: 201 });
    } finally {
      inFlight.delete(key);
    }
  } catch (error) {
    if (error instanceof ParagraphQuestionDuplicateError) {
      return NextResponse.json({ ok: false, code: "duplicate", error: error.message, duplicates: error.matches }, { status: 409 });
    }
    console.error("paragraph_question_bank_import_create_failed", error);
    return NextResponse.json({ ok: false, error: "Sorular soru bankasına eklenemedi." }, { status: 500 });
  }
}
