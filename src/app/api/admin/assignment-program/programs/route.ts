import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { isAssignmentReadyExerciseSlug } from "@/lib/assignments/assignmentExerciseCatalog";
import { mapAssignmentProgramRpcError } from "@/lib/assignments/assignmentProgramErrors";
import { mapEducationLevelToClassGroup } from "@/lib/assignments/classGroups";
import { generateProgramPreview } from "@/lib/assignments/programPreview";
import { getProgramClassTemplateById } from "@/lib/assignments/programTemplateRepository";
import { isAdminSessionValid } from "@/lib/auth/adminSession";
import { getSupabaseServerClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

const STUDENTS_TABLE = process.env.NEXT_PUBLIC_SUPABASE_STUDENTS_TABLE ?? "students";
const MAX_SEED_LENGTH = 200;
const TEMPLATE_SNAPSHOT_SCHEMA_VERSION = 1;

// Gercek per-ogretmen kimligi sistemde YOK (isAdminSessionValid yalniz
// cookie uzunlugunu kontrol eder, hicbir kimlik tasimaz - bkz.
// src/lib/auth/adminSession.ts). Mevcut emsalle (assignments/generate/route.ts
// -> createdBy: "teacher") tutarli, sabit/teknik bir deger kullanilir;
// client'tan gelen HICBIR assignedBy degeri asla okunmaz/kullanilmaz.
const ASSIGNED_BY_VALUE = "teacher";

type CreateProgramRequestBody = {
  studentId?: unknown;
  templateId?: unknown;
  generationSeed?: unknown;
};

type CreateProgramRpcRow = {
  program_id: string;
  student_id: string;
  class_group: string;
  status: string;
  total_days: number;
  tasks_per_day: number;
  generation_seed: string;
  created_at: string;
};

type RpcTaskPayload = {
  taskOrder: number;
  exerciseSlug: string;
  category: string;
  startingLevel: number;
  durationSeconds: number;
  settings: Record<string, string | number | boolean>;
};

type RpcDayPayload = {
  dayNumber: number;
  tasks: RpcTaskPayload[];
};

function errorResponse(message: string, status: number) {
  return NextResponse.json({ ok: false, message }, { status });
}

/**
 * Bir ogrenciye gercek, kilitli 20x5 odev programi atar.
 *
 * Client'tan YALNIZ studentId/templateId/generationSeed (istege bagli)
 * okunur. classGroup, assigned_by, template_snapshot ve p_days DEGERLERI
 * HICBIR ZAMAN client'tan okunmaz - hepsi burada, DB'den TAZE okunan
 * ogrenci/sablon/egzersiz-ayari satirlarindan sunucu tarafinda uretilir.
 * RPC yalniz service-role Supabase client'i (getSupabaseServerClient) ile,
 * yalniz bu server route'undan cagrilir.
 */
export async function POST(request: NextRequest) {
  if (!isAdminSessionValid(request)) {
    return errorResponse("Yetkisiz erisim.", 401);
  }

  let body: CreateProgramRequestBody;
  try {
    body = (await request.json()) as CreateProgramRequestBody;
  } catch {
    return errorResponse("Gecersiz istek govdesi.", 400);
  }

  const studentId = typeof body.studentId === "string" ? body.studentId.trim() : "";
  if (!studentId) {
    return errorResponse("studentId zorunludur.", 400);
  }

  const templateId = typeof body.templateId === "string" ? body.templateId.trim() : "";
  if (!templateId) {
    return errorResponse("templateId zorunludur.", 400);
  }

  let generationSeed: string;
  if (body.generationSeed !== undefined) {
    if (
      typeof body.generationSeed !== "string" ||
      !body.generationSeed.trim() ||
      body.generationSeed.length > MAX_SEED_LENGTH
    ) {
      return errorResponse(
        `generationSeed en fazla ${MAX_SEED_LENGTH} karakterli, bos olmayan bir metin olmalidir.`,
        400,
      );
    }
    generationSeed = body.generationSeed.trim();
  } else {
    generationSeed = crypto.randomUUID();
  }

  const supabase = getSupabaseServerClient();
  if (!supabase) {
    return errorResponse("Supabase baglantisi bulunamadi.", 500);
  }

  // 1) Ogrenciyi DB'den TAZE getir - client'in gonderdigi hicbir aktiflik
  // veya egitim-seviyesi bilgisine guvenilmez.
  const { data: studentData, error: studentError } = await supabase
    .from(STUDENTS_TABLE)
    .select("id, education_level, is_active, status")
    .eq("id", studentId)
    .maybeSingle();

  if (studentError) {
    console.error("Student lookup failed for program assignment", {
      code: studentError.code,
      message: studentError.message,
    });
    return errorResponse("Öğrenci bilgisi alınamadı. Lütfen tekrar deneyin.", 500);
  }

  if (!studentData) {
    return errorResponse("Öğrenci bulunamadı.", 404);
  }

  const studentRow = studentData as Record<string, unknown>;
  const isStudentActive = studentRow.is_active === true && studentRow.status === "active";
  if (!isStudentActive) {
    return errorResponse("Öğrenci pasif durumda, program atanamaz.", 400);
  }

  // 2) class_group YALNIZ ogrencinin education_level'inden turetilir -
  // client bir classGroup gondermis olsa bile bu deger hic okunmaz.
  const classGroupResult = mapEducationLevelToClassGroup(studentRow.education_level);
  if (!classGroupResult.ok) {
    return errorResponse(classGroupResult.message, 400);
  }
  const classGroup = classGroupResult.value;

  // 3) Sablonu ve egzersiz ayarlarini DB'den TAZE getir.
  const templateWithSettings = await getProgramClassTemplateById(supabase, templateId);
  if (!templateWithSettings) {
    return errorResponse("Şablon bulunamadı.", 404);
  }
  if (!templateWithSettings.template.isActive) {
    return errorResponse("Şablon pasif durumda.", 400);
  }
  if (templateWithSettings.template.classGroup !== classGroup) {
    return errorResponse("Şablonun sınıf grubu öğrenciyle uyuşmuyor.", 400);
  }

  // 4) Mevcut, test edilmis generator'i sunucu tarafinda YENIDEN calistir -
  // client'in daha once gordugu onizlemeye guvenilmez, yalniz ayni seed ile
  // burada TAZE uretilen sonuc kullanilir.
  const previewResult = generateProgramPreview({
    classGroup,
    generationSeed,
    exerciseSettings: templateWithSettings.exerciseSettings,
  });

  if (!previewResult.ok) {
    return errorResponse(previewResult.message, 422);
  }

  // 5) p_days - RPC'nin okudugu alanlarla BIREBIR (fazladan/istenmeyen alan yok).
  const days: RpcDayPayload[] = previewResult.preview.days.map((day) => ({
    dayNumber: day.dayNumber,
    tasks: day.tasks.map((task) => ({
      taskOrder: task.taskOrder,
      exerciseSlug: task.exerciseSlug,
      category: task.category,
      startingLevel: task.startingLevel,
      durationSeconds: task.durationSeconds,
      settings: task.settings,
    })),
  }));

  // 6) template_snapshot - sunucu tarafinda, gercek sablon + kullanilan
  // egzersiz ayarlarindan. RPC schemaVersion=1 zorunlu kilar.
  const usedExerciseSettings = templateWithSettings.exerciseSettings.filter(
    (setting) => setting.enabled && setting.dailyWeight > 0 && isAssignmentReadyExerciseSlug(setting.exerciseSlug),
  );

  const templateSnapshot = {
    templateId: templateWithSettings.template.id,
    classGroup,
    templateName: templateWithSettings.template.name,
    description: templateWithSettings.template.description,
    totalDays: previewResult.preview.totalDays,
    tasksPerDay: previewResult.preview.tasksPerDay,
    defaultTaskDurationSeconds: templateWithSettings.template.defaultTaskDurationSeconds,
    generationSeed,
    generatedAt: new Date().toISOString(),
    exerciseSettings: usedExerciseSettings,
    schemaVersion: TEMPLATE_SNAPSHOT_SCHEMA_VERSION,
  };

  // 7) RPC'yi YALNIZ service-role server client ile cagir. Parametre adlari
  // migration'daki gercek adlarla (p_student_id, p_template_id, p_class_group,
  // p_generation_seed, p_template_snapshot, p_days, p_assigned_by) birebir aynidir.
  let rpcRow: CreateProgramRpcRow | undefined;
  try {
    const { data: rpcData, error: rpcError } = await supabase.rpc("create_student_assignment_program", {
      p_student_id: studentId,
      p_template_id: templateId,
      p_class_group: classGroup,
      p_generation_seed: generationSeed,
      p_template_snapshot: templateSnapshot,
      p_days: days,
      p_assigned_by: ASSIGNED_BY_VALUE,
    });

    if (rpcError) {
      console.error("create_student_assignment_program RPC failed", {
        code: rpcError.code,
        message: rpcError.message,
      });
      const mapped = mapAssignmentProgramRpcError(rpcError.message ?? "");
      return errorResponse(mapped.message, mapped.status);
    }

    const rows = Array.isArray(rpcData) ? (rpcData as CreateProgramRpcRow[]) : [];
    rpcRow = rows[0];
  } catch (unexpectedError) {
    console.error("create_student_assignment_program RPC threw unexpectedly", {
      message: unexpectedError instanceof Error ? unexpectedError.message : "unknown error",
    });
    return errorResponse("Program oluşturulamadı, lütfen tekrar deneyin.", 500);
  }

  if (!rpcRow) {
    console.error("create_student_assignment_program RPC returned no row");
    return errorResponse("Program oluşturulamadı, lütfen tekrar deneyin.", 500);
  }

  return NextResponse.json({
    ok: true,
    program: {
      id: rpcRow.program_id,
      studentId: rpcRow.student_id,
      classGroup: rpcRow.class_group,
      status: rpcRow.status,
      totalDays: rpcRow.total_days,
      tasksPerDay: rpcRow.tasks_per_day,
      generationSeed: rpcRow.generation_seed,
      createdAt: rpcRow.created_at,
    },
    summary: { totalDays: 20, totalTasks: 100 },
  });
}
