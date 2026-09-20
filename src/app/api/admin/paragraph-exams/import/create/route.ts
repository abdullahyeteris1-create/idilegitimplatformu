import { NextResponse, type NextRequest } from "next/server";
import { isAdminSessionValid } from "@/lib/auth/adminSession";
import { createImportedDraftExam } from "@/lib/paragraph-exams/repository";
import { validateImportCreateInput } from "@/lib/paragraph-exams/importer";
import { repositoryErrorResponse } from "@/lib/paragraph-exams/http";
export const runtime = "nodejs";
const inFlight = new Map<string, Promise<Awaited<ReturnType<typeof createImportedDraftExam>>>>();
export async function POST(request: NextRequest) {
  if (!isAdminSessionValid(request)) return NextResponse.json({ ok: false, error: "Yetkisiz erişim." }, { status: 401 });
  const idempotencyKey = request.headers.get("idempotency-key")?.trim() ?? "";
  if (!/^[A-Za-z0-9._:-]{8,200}$/.test(idempotencyKey)) return NextResponse.json({ ok: false, error: "İçe aktarma anahtarı geçersiz." }, { status: 400 });
  try {
    const raw = await request.text(); if (raw.length > 2_000_000) return NextResponse.json({ ok: false, error: "İçe aktarma önizlemesi çok büyük." }, { status: 413 });
    const validated = validateImportCreateInput(JSON.parse(raw));
    if (!validated.ok) return NextResponse.json({ ok: false, error: validated.error }, { status: 400 });
    const username = process.env.ADMIN_USERNAME?.trim() || "teacher"; const key = username + ":" + idempotencyKey;
    const existing = inFlight.get(key); if (existing) return NextResponse.json({ ok: true, exam: await existing }, { status: 201 });
    const promise = createImportedDraftExam(validated.value.exam, validated.value.questions, username); inFlight.set(key, promise);
    try { return NextResponse.json({ ok: true, exam: await promise }, { status: 201 }); } finally { inFlight.delete(key); }
  } catch (error) { return repositoryErrorResponse(error, "Taslak deneme oluşturulamadı."); }
}