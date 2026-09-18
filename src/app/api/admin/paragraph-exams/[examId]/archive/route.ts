import { NextResponse, type NextRequest } from "next/server";
import { isAdminSessionValid } from "@/lib/auth/adminSession";
import { archiveExam } from "@/lib/paragraph-exams/repository";
import { repositoryErrorResponse } from "@/lib/paragraph-exams/http";
import { isUuid } from "@/lib/paragraph-exams/validation";

export const runtime = "nodejs";

export async function POST(request: NextRequest, context: { params: Promise<{ examId: string }> }) {
  if (!isAdminSessionValid(request)) return NextResponse.json({ ok: false, error: "Yetkisiz erişim." }, { status: 401 });
  try {
    const { examId } = await context.params;
    if (!isUuid(examId)) return NextResponse.json({ ok: false, error: "Sınav kimliği geçersiz." }, { status: 400 });
    return NextResponse.json({ ok: true, exam: await archiveExam(examId) });
  } catch (error) { return repositoryErrorResponse(error, "Sınav arşivlenemedi."); }
}
