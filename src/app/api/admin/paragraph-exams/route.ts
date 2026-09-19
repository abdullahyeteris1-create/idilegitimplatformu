import { NextResponse, type NextRequest } from "next/server";
import { isAdminSessionValid } from "@/lib/auth/adminSession";
import { createDraftExam, listExams } from "@/lib/paragraph-exams/repository";
import { repositoryErrorResponse } from "@/lib/paragraph-exams/http";
import { isExamStatus, validateExamInput } from "@/lib/paragraph-exams/validation";

export const runtime = "nodejs";

function unauthorized(): NextResponse {
  return NextResponse.json({ ok: false, error: "Yetkisiz erişim." }, { status: 401 });
}

export async function GET(request: NextRequest) {
  if (!isAdminSessionValid(request)) return unauthorized();
  try {
    const status = new URL(request.url).searchParams.get("status") || undefined;
    if (status && !isExamStatus(status)) return NextResponse.json({ ok: false, error: "Sınav durumu geçersiz." }, { status: 400 });
    return NextResponse.json({ ok: true, exams: await listExams(status) });
  } catch (error) {
    return repositoryErrorResponse(error, "Sınavlar alınamadı.");
  }
}

export async function POST(request: NextRequest) {
  if (!isAdminSessionValid(request)) return unauthorized();
  try {
    const validated = validateExamInput(await request.json());
    if (!validated.ok) return NextResponse.json({ ok: false, error: validated.error }, { status: 400 });
    const createdBy = process.env.ADMIN_USERNAME?.trim() || "teacher";
    return NextResponse.json({ ok: true, exam: await createDraftExam(validated.value, createdBy) }, { status: 201 });
  } catch (error) {
    return repositoryErrorResponse(error, "Taslak sınav oluşturulamadı.");
  }
}
