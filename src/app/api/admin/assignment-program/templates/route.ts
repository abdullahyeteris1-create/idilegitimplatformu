import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { isAdminSessionValid } from "@/lib/auth/adminSession";
import {
  ASSIGNMENT_EXERCISE_CATALOG,
  getAssignmentExerciseDefinition,
  isAssignmentCatalogExerciseSlug,
  isAssignmentReadyExerciseSlug,
} from "@/lib/assignments/assignmentExerciseCatalog";
import type { AssignmentClassGroup } from "@/lib/assignments/classGroups";
import {
  validateClassGroup,
  validateDailyWeight,
  validateDisplayOrder,
  validateDurationSeconds,
  validateExerciseSettings,
  validateMaxOccurrencesPerProgram,
  validateRepeatCooldownDays,
  validateStartingLevel,
} from "@/lib/assignments/assignmentValidation";
import {
  listProgramClassTemplates,
  upsertProgramClassTemplate,
  type UpsertExerciseSettingInput,
} from "@/lib/assignments/programTemplateRepository";
import type { ProgramClassTemplateUpsertInput } from "@/lib/assignments/types";
import { getSupabaseServerClient } from "@/lib/supabase/server";

const MAX_EXERCISES_PER_REQUEST = 50;
const MAX_NAME_LENGTH = 200;
const MAX_DESCRIPTION_LENGTH = 2000;
const MINIMUM_ELIGIBLE_EXERCISES_FOR_PROGRAM = 5;

export async function GET(request: NextRequest) {
  if (!isAdminSessionValid(request)) {
    return NextResponse.json({ ok: false, message: "Yetkisiz erisim." }, { status: 401 });
  }

  const classGroupParam = request.nextUrl.searchParams.get("classGroup")?.trim() ?? "";
  let classGroupFilter: AssignmentClassGroup | undefined;

  if (classGroupParam) {
    const validated = validateClassGroup(classGroupParam);
    if (!validated.ok) {
      return NextResponse.json({ ok: false, message: validated.message }, { status: 400 });
    }
    classGroupFilter = validated.value;
  }

  const supabase = getSupabaseServerClient();
  if (!supabase) {
    return NextResponse.json({ ok: false, message: "Supabase baglantisi bulunamadi." }, { status: 500 });
  }

  const templates = await listProgramClassTemplates(supabase, classGroupFilter);

  // `catalog` BUTUN gorunur egzersizleri (ready olsun olmasin) integrationStatus
  // ile birlikte dondurur - boylece ogretmen ekrani hazir egzersizleri
  // secilebilir, hazir olmayanlari (ör. Okuma/Anlama) "Entegrasyon gerekli"
  // gibi gosterebilir. Bu uc nokta henuz bir UI tarafindan tuketilmiyor.
  return NextResponse.json({
    ok: true,
    templates,
    catalog: ASSIGNMENT_EXERCISE_CATALOG,
  });
}

export async function PUT(request: NextRequest) {
  if (!isAdminSessionValid(request)) {
    return NextResponse.json({ ok: false, message: "Yetkisiz erisim." }, { status: 401 });
  }

  let body: ProgramClassTemplateUpsertInput;
  try {
    body = (await request.json()) as ProgramClassTemplateUpsertInput;
  } catch {
    return NextResponse.json({ ok: false, message: "Gecersiz istek govdesi." }, { status: 400 });
  }

  const classGroupResult = validateClassGroup(body.classGroup);
  if (!classGroupResult.ok) {
    return NextResponse.json({ ok: false, message: classGroupResult.message }, { status: 400 });
  }

  const name = typeof body.name === "string" ? body.name.trim() : "";
  if (!name || name.length > MAX_NAME_LENGTH) {
    return NextResponse.json({ ok: false, message: `name zorunludur ve en fazla ${MAX_NAME_LENGTH} karakter olmalidir.` }, { status: 400 });
  }

  let description: string | null = null;
  if (body.description !== undefined && body.description !== null) {
    if (typeof body.description !== "string" || body.description.length > MAX_DESCRIPTION_LENGTH) {
      return NextResponse.json({ ok: false, message: `description en fazla ${MAX_DESCRIPTION_LENGTH} karakter olmalidir.` }, { status: 400 });
    }
    description = body.description;
  }

  const durationResult = validateDurationSeconds(body.defaultTaskDurationSeconds ?? 300);
  if (!durationResult.ok) {
    return NextResponse.json({ ok: false, message: `defaultTaskDurationSeconds: ${durationResult.message}` }, { status: 400 });
  }

  const templateId = typeof body.templateId === "string" && body.templateId.trim() ? body.templateId.trim() : undefined;

  const rawExercises = Array.isArray(body.exercises) ? body.exercises : [];
  if (rawExercises.length > MAX_EXERCISES_PER_REQUEST) {
    return NextResponse.json({ ok: false, message: `exercises listesi en fazla ${MAX_EXERCISES_PER_REQUEST} kayit icerebilir.` }, { status: 400 });
  }

  const exercises: UpsertExerciseSettingInput[] = [];
  const seenSlugs = new Set<string>();

  for (const rawExercise of rawExercises) {
    if (typeof rawExercise !== "object" || rawExercise === null || Array.isArray(rawExercise)) {
      return NextResponse.json({ ok: false, message: "exercises icindeki her kayit bir nesne olmalidir." }, { status: 400 });
    }

    const item = rawExercise as Record<string, unknown>;
    const exerciseSlug = typeof item.exerciseSlug === "string" ? item.exerciseSlug.trim() : "";

    if (!isAssignmentCatalogExerciseSlug(exerciseSlug)) {
      return NextResponse.json({ ok: false, message: `Gecersiz veya odev sistemine uygun olmayan egzersiz: ${exerciseSlug || "(bos)"}.` }, { status: 400 });
    }

    // Katalogda GORUNEN ama henuz "ready" olmayan bir egzersiz (ör.
    // Okuma/Anlama grubundakiler) sablona KAYDEDILEMEZ - raw internal
    // integrationStatus degeri veya baska ic detay sizdirilmadan, sabit ve
    // guvenli bir mesajla reddedilir.
    if (!isAssignmentReadyExerciseSlug(exerciseSlug)) {
      return NextResponse.json({ ok: false, message: "Bu çalışma henüz 20 günlük ödev programına hazır değil." }, { status: 400 });
    }

    if (seenSlugs.has(exerciseSlug)) {
      return NextResponse.json({ ok: false, message: `Ayni exerciseSlug istek icinde birden fazla kez bulunamaz: ${exerciseSlug}.` }, { status: 400 });
    }
    seenSlugs.add(exerciseSlug);

    // category/title/resultExerciseType HICBIR ZAMAN client'tan okunmaz -
    // AssignmentExerciseSettingInput tipinde bu alanlar zaten yok. Yalniz
    // sunucu allowlist tanimindan (`definition`) turetilir.
    const definition = getAssignmentExerciseDefinition(exerciseSlug);
    if (!definition) {
      return NextResponse.json({ ok: false, message: `Gecersiz egzersiz: ${exerciseSlug}.` }, { status: 400 });
    }

    const startingLevelResult = validateStartingLevel(
      item.startingLevel ?? 1,
      definition.supportsLevel ? (definition.levelMin ?? 1) : 1,
      definition.supportsLevel ? definition.levelMax : undefined,
    );
    if (!startingLevelResult.ok) {
      return NextResponse.json({ ok: false, message: `${exerciseSlug}.startingLevel: ${startingLevelResult.message}` }, { status: 400 });
    }

    const exerciseDurationResult = validateDurationSeconds(item.durationSeconds ?? 300);
    if (!exerciseDurationResult.ok) {
      return NextResponse.json({ ok: false, message: `${exerciseSlug}.durationSeconds: ${exerciseDurationResult.message}` }, { status: 400 });
    }

    const dailyWeightResult = validateDailyWeight(item.dailyWeight ?? 1);
    if (!dailyWeightResult.ok) {
      return NextResponse.json({ ok: false, message: `${exerciseSlug}.dailyWeight: ${dailyWeightResult.message}` }, { status: 400 });
    }

    const cooldownResult = validateRepeatCooldownDays(item.repeatCooldownDays ?? 0);
    if (!cooldownResult.ok) {
      return NextResponse.json({ ok: false, message: `${exerciseSlug}.repeatCooldownDays: ${cooldownResult.message}` }, { status: 400 });
    }

    const maxOccurrencesResult = validateMaxOccurrencesPerProgram(item.maxOccurrencesPerProgram ?? null);
    if (!maxOccurrencesResult.ok) {
      return NextResponse.json({ ok: false, message: `${exerciseSlug}.maxOccurrencesPerProgram: ${maxOccurrencesResult.message}` }, { status: 400 });
    }

    const displayOrderResult = validateDisplayOrder(item.displayOrder ?? 0);
    if (!displayOrderResult.ok) {
      return NextResponse.json({ ok: false, message: `${exerciseSlug}.displayOrder: ${displayOrderResult.message}` }, { status: 400 });
    }

    const settingsResult = validateExerciseSettings(item.settings, definition.settingsSchema);
    if (!settingsResult.ok) {
      return NextResponse.json({ ok: false, message: `${exerciseSlug}.settings: ${settingsResult.message}` }, { status: 400 });
    }

    exercises.push({
      exerciseSlug,
      enabled: item.enabled !== false,
      startingLevel: startingLevelResult.value,
      durationSeconds: exerciseDurationResult.value,
      dailyWeight: dailyWeightResult.value,
      repeatCooldownDays: cooldownResult.value,
      maxOccurrencesPerProgram: maxOccurrencesResult.value,
      displayOrder: displayOrderResult.value,
      settings: settingsResult.value,
    });
  }

  const supabase = getSupabaseServerClient();
  if (!supabase) {
    return NextResponse.json({ ok: false, message: "Supabase baglantisi bulunamadi." }, { status: 500 });
  }

  const upsertResult = await upsertProgramClassTemplate(supabase, {
    templateId,
    classGroup: classGroupResult.value,
    name,
    description,
    defaultTaskDurationSeconds: durationResult.value,
    exercises,
  });

  if (!upsertResult.ok) {
    return NextResponse.json({ ok: false, message: upsertResult.message }, { status: 500 });
  }

  const eligibleForProgramCount = exercises.filter((exercise) => exercise.enabled && exercise.dailyWeight > 0).length;
  const warning =
    eligibleForProgramCount < MINIMUM_ELIGIBLE_EXERCISES_FOR_PROGRAM
      ? `Etkin ve dailyWeight>0 olan egzersiz sayisi (${eligibleForProgramCount}) 5'in altinda - sablon kaydedildi ancak program onizlemesi su an uretilemeyebilir.`
      : null;

  return NextResponse.json({ ok: true, ...upsertResult.result, warning });
}
