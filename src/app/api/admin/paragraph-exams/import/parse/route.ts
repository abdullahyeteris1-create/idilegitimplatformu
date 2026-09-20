import { NextResponse, type NextRequest } from "next/server";
import { isAdminSessionValid } from "@/lib/auth/adminSession";
import { parseDocxFile } from "@/lib/paragraph-exams/importer";
export const runtime = "nodejs";
export async function POST(request: NextRequest) {
  if (!isAdminSessionValid(request)) return NextResponse.json({ ok: false, error: "Yetkisiz erişim." }, { status: 401 });
  try {
    const form = await request.formData(); const file = form.get("file");
    if (!(file instanceof File)) return NextResponse.json({ ok: false, error: "Bir DOCX dosyası seçin." }, { status: 400 });
    return NextResponse.json({ ok: true, preview: await parseDocxFile(file) });
  } catch (error) {
    return NextResponse.json({ ok: false, error: error instanceof Error ? error.message : "DOCX dosyası işlenemedi." }, { status: 400 });
  }
}