import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { isAdminSessionValid } from "@/lib/auth/adminSession";
import { ASSIGNMENT_EXERCISE_CATALOG } from "@/lib/assignments/assignmentExerciseCatalog";
import {
  validateClassGroup,
  validateDurationSeconds,
} from "@/lib/assignments/assignmentValidation";
import { validateProgramDays } from "@/lib/assignments/templateSlotValidation";
import { createTemplate, listTemplateLibrary } from "@/lib/assignments/programTemplateRepository";
import { getSupabaseServerClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

const MAX_NAME_LENGTH = 200;
const MAX_DESCRIPTION_LENGTH = 2000;
const DEFAULT_PROGRAM_DAYS = 20;
const DEFAULT_TASK_DURATION_SECONDS = 300;

function unauthorized() {
  return NextResponse.json({ ok: false, message: "Yetkisiz erisim." }, { status: 401 });
}

/** Sablon kutuphanesi listesi + secilebilir egzersiz katalogu. */
export async function GET(request: NextRequest) {
  if (!isAdminSessionValid(request)) {
    return unauthorized();
  }

  const supabase = getSupabaseServerClient();
  if (!supabase) {
    return NextResponse.json({ ok: false, message: "Supabase baglantisi bulunamadi." }, { status: 500 });
  }

  const includeInactive = request.nextUrl.searchParams.get("includeInactive") === "true";
  const templates = await listTemplateLibrary(supabase, { includeInactive });

  return NextResponse.json({ ok: true, templates, catalog: ASSIGNMENT_EXERCISE_CATALOG });
}

/** Bos bir sablon olusturur; gun/slot satirlari editorde doldurulur. */
export async function POST(request: NextRequest) {
  if (!isAdminSessionValid(request)) {
    return unauthorized();
  }

  let body: Record<string, unknown>;
  try {
    const parsed = (await request.json()) as unknown;
    if (typeof parsed !== "object" || parsed === null || Array.isArray(parsed)) {
      return NextResponse.json({ ok: false, message: "Gecersiz istek govdesi." }, { status: 400 });
    }
    body = parsed as Record<string, unknown>;
  } catch {
    return NextResponse.json({ ok: false, message: "Gecersiz istek govdesi." }, { status: 400 });
  }

  const classGroupResult = validateClassGroup(body.classGroup);
  if (!classGroupResult.ok) {
    return NextResponse.json({ ok: false, message: classGroupResult.message }, { status: 400 });
  }

  const name = typeof body.name === "string" ? body.name.trim() : "";
  if (!name || name.length > MAX_NAME_LENGTH) {
    return NextResponse.json(
      { ok: false, message: `Sablon adi zorunludur ve en fazla ${MAX_NAME_LENGTH} karakter olmalidir.` },
      { status: 400 },
    );
  }

  let description: string | null = null;
  if (body.description !== undefined && body.description !== null) {
    if (typeof body.description !== "string" || body.description.length > MAX_DESCRIPTION_LENGTH) {
      return NextResponse.json(
        { ok: false, message: `Aciklama en fazla ${MAX_DESCRIPTION_LENGTH} karakter olmalidir.` },
        { status: 400 },
      );
    }
    description = body.description.trim() || null;
  }

  const programDaysResult = validateProgramDays(body.programDays ?? DEFAULT_PROGRAM_DAYS);
  if (!programDaysResult.ok) {
    return NextResponse.json({ ok: false, message: programDaysResult.message }, { status: 400 });
  }

  const durationResult = validateDurationSeconds(body.defaultTaskDurationSeconds ?? DEFAULT_TASK_DURATION_SECONDS);
  if (!durationResult.ok) {
    return NextResponse.json({ ok: false, message: durationResult.message }, { status: 400 });
  }

  const supabase = getSupabaseServerClient();
  if (!supabase) {
    return NextResponse.json({ ok: false, message: "Supabase baglantisi bulunamadi." }, { status: 500 });
  }

  const created = await createTemplate(supabase, {
    classGroup: classGroupResult.value,
    name,
    description,
    programDays: programDaysResult.value,
    defaultTaskDurationSeconds: durationResult.value,
    createdBy: "ogretmen-paneli",
  });

  if (!created.ok) {
    return NextResponse.json({ ok: false, message: created.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true, templateId: created.templateId }, { status: 201 });
}
