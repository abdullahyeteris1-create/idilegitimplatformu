import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { isAdminSessionValid } from "@/lib/auth/adminSession";
import { validateClassGroup } from "@/lib/assignments/assignmentValidation";
import { generateProgramPreview } from "@/lib/assignments/programPreview";
import { getProgramClassTemplateById, listProgramClassTemplates } from "@/lib/assignments/programTemplateRepository";
import type { ProgramPreviewRequestInput } from "@/lib/assignments/types";
import { getSupabaseServerClient } from "@/lib/supabase/server";

const MAX_SEED_LENGTH = 200;

/**
 * Salt-okunur program onizleme uc noktasi.
 *
 * BU UC NOKTA HICBIR TABLOYA YAZMAZ: student_assignment_programs,
 * student_assignment_program_days, student_assignment_program_tasks
 * tablolarina hicbir insert/update yapilmaz - yalniz zaten var olan
 * program_class_templates / program_class_exercise_settings satirlari
 * okunur ve saf bir JSON onizleme uretilip dondurulur.
 */
export async function POST(request: NextRequest) {
  if (!isAdminSessionValid(request)) {
    return NextResponse.json({ ok: false, message: "Yetkisiz erisim." }, { status: 401 });
  }

  let body: ProgramPreviewRequestInput;
  try {
    body = (await request.json()) as ProgramPreviewRequestInput;
  } catch {
    return NextResponse.json({ ok: false, message: "Gecersiz istek govdesi." }, { status: 400 });
  }

  const templateId = typeof body.templateId === "string" && body.templateId.trim() ? body.templateId.trim() : undefined;
  const classGroupParam = typeof body.classGroup === "string" ? body.classGroup.trim() : "";

  if (!templateId && !classGroupParam) {
    return NextResponse.json({ ok: false, message: "templateId veya classGroup belirtilmelidir." }, { status: 400 });
  }

  let classGroupValue: ReturnType<typeof validateClassGroup> | undefined;
  if (classGroupParam) {
    classGroupValue = validateClassGroup(classGroupParam);
    if (!classGroupValue.ok) {
      return NextResponse.json({ ok: false, message: classGroupValue.message }, { status: 400 });
    }
  }

  let generationSeed: string;
  if (body.generationSeed !== undefined) {
    if (typeof body.generationSeed !== "string" || !body.generationSeed.trim() || body.generationSeed.length > MAX_SEED_LENGTH) {
      return NextResponse.json({ ok: false, message: `generationSeed en fazla ${MAX_SEED_LENGTH} karakterli, bos olmayan bir metin olmalidir.` }, { status: 400 });
    }
    generationSeed = body.generationSeed.trim();
  } else {
    generationSeed = crypto.randomUUID();
  }

  const supabase = getSupabaseServerClient();
  if (!supabase) {
    return NextResponse.json({ ok: false, message: "Supabase baglantisi bulunamadi." }, { status: 500 });
  }

  const templateWithSettings = templateId
    ? await getProgramClassTemplateById(supabase, templateId)
    : (await listProgramClassTemplates(supabase, classGroupValue && classGroupValue.ok ? classGroupValue.value : undefined)).find(
        (entry) => entry.template.isActive,
      ) ?? null;

  if (!templateWithSettings) {
    return NextResponse.json({ ok: false, message: "Sablon bulunamadi." }, { status: 404 });
  }

  if (classGroupValue && classGroupValue.ok && templateWithSettings.template.classGroup !== classGroupValue.value) {
    return NextResponse.json({ ok: false, message: "templateId, belirtilen classGroup'a ait degil." }, { status: 400 });
  }

  const result = generateProgramPreview({
    classGroup: templateWithSettings.template.classGroup,
    generationSeed,
    exerciseSettings: templateWithSettings.exerciseSettings,
  });

  if (!result.ok) {
    return NextResponse.json({ ok: false, message: result.message }, { status: 422 });
  }

  return NextResponse.json({ ok: true, preview: result.preview });
}
