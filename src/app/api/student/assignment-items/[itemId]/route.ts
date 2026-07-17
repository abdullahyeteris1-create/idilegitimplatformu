import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { getAssignmentItemById } from "@/lib/assignments/assignmentRepository";
import { readStudentSessionFromRequest } from "@/lib/auth/studentSession";
import { getSupabaseServerClient } from "@/lib/supabase/server";

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ itemId: string }> },
) {
  const session = readStudentSessionFromRequest(request);
  if (!session?.studentId) {
    return NextResponse.json(
      { ok: false, message: "Ogrenci oturumu dogrulanamadi." },
      { status: 401 },
    );
  }

  const { itemId } = await context.params;
  const supabase = getSupabaseServerClient();
  if (!itemId || !supabase) {
    return NextResponse.json(
      { ok: false, message: "Odev maddesi getirilemedi." },
      { status: 400 },
    );
  }

  const item = await getAssignmentItemById(supabase, itemId);
  if (!item) {
    return NextResponse.json(
      { ok: false, message: "Odev maddesi bulunamadi." },
      { status: 404 },
    );
  }

  if (item.studentId !== session.studentId) {
    return NextResponse.json(
      { ok: false, message: "Bu odev maddesine erisim yetkiniz yok." },
      { status: 403 },
    );
  }

  return NextResponse.json({
    ok: true,
    exerciseSlug: item.exerciseSlug,
    settingsJson: item.settingsJson,
    status: item.status,
  });
}
