import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { isAdminSessionValid } from "@/lib/auth/adminSession";
import { generateDailyAssignment, getAssignmentDateForTimezone } from "@/lib/assignments/generateDailyAssignment";

type GenerateBody = {
  studentId?: unknown;
  date?: unknown;
  forceRegenerate?: unknown;
};

export async function POST(request: NextRequest) {
  if (!isAdminSessionValid(request)) {
    return NextResponse.json({ ok: false, message: "Yetkisiz erisim." }, { status: 401 });
  }

  let body: GenerateBody;
  try {
    body = (await request.json()) as GenerateBody;
  } catch {
    return NextResponse.json({ ok: false, message: "Gecersiz istek govdesi." }, { status: 400 });
  }

  const studentId = typeof body.studentId === "string" ? body.studentId.trim() : "";
  if (!studentId) {
    return NextResponse.json({ ok: false, message: "studentId zorunludur." }, { status: 400 });
  }

  const assignmentDate =
    typeof body.date === "string" && body.date.trim()
      ? body.date.trim()
      : getAssignmentDateForTimezone("Europe/Istanbul");

  const assignment = await generateDailyAssignment({
    studentId,
    assignmentDate,
    forceRegenerate: body.forceRegenerate === true,
    createdBy: "teacher",
  });

  if (!assignment) {
    return NextResponse.json(
      {
        ok: false,
        message: "Plan olusturulamadi. Ogrenci egitim duzeyi veya atama modu kontrol edilmeli.",
      },
      { status: 409 },
    );
  }

  return NextResponse.json({ ok: true, assignment });
}
