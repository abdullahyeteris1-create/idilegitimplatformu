import { NextResponse, type NextRequest } from "next/server";
import { isAdminSessionValid } from "@/lib/auth/adminSession";
import { deletePassage, getPassages, upsertPassage } from "@/lib/paragraph-exams/repository";
import { repositoryErrorResponse } from "@/lib/paragraph-exams/http";
import { isUuid, validatePassageInput } from "@/lib/paragraph-exams/validation";

export const runtime = "nodejs";
type Context = { params: Promise<{ examId: string }> };

function unauthorized(): NextResponse { return NextResponse.json({ ok: false, error: "Yetkisiz erişim." }, { status: 401 }); }

export async function GET(request: NextRequest, context: Context) {
  if (!isAdminSessionValid(request)) return unauthorized();
  try {
    const { examId } = await context.params;
    if (!isUuid(examId)) return NextResponse.json({ ok: false, error: "Sınav kimliği geçersiz." }, { status: 400 });
    return NextResponse.json({ ok: true, passages: await getPassages(examId) });
  } catch (error) { return repositoryErrorResponse(error, "Pasajlar alınamadı."); }
}

export async function POST(request: NextRequest, context: Context) {
  if (!isAdminSessionValid(request)) return unauthorized();
  try {
    const { examId } = await context.params;
    if (!isUuid(examId)) return NextResponse.json({ ok: false, error: "Sınav kimliği geçersiz." }, { status: 400 });
    const body = await request.json() as Record<string, unknown>;
    const validated = validatePassageInput(body);
    if (!validated.ok) return NextResponse.json({ ok: false, error: validated.error }, { status: 400 });
    const passageId = typeof body.id === "string" ? body.id : null;
    return NextResponse.json({ ok: true, passage: await upsertPassage(examId, passageId, validated.value) }, { status: passageId ? 200 : 201 });
  } catch (error) { return repositoryErrorResponse(error, "Pasaj kaydedilemedi."); }
}

export async function DELETE(request: NextRequest, context: Context) {
  if (!isAdminSessionValid(request)) return unauthorized();
  try {
    const { examId } = await context.params;
    const passageId = new URL(request.url).searchParams.get("id") ?? "";
    if (!isUuid(examId) || !isUuid(passageId)) return NextResponse.json({ ok: false, error: "Pasaj kimliği geçersiz." }, { status: 400 });
    await deletePassage(examId, passageId);
    return NextResponse.json({ ok: true });
  } catch (error) { return repositoryErrorResponse(error, "Pasaj silinemedi."); }
}
