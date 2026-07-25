import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { mapAssignmentProgramRpcError } from "@/lib/assignments/assignmentProgramErrors";
import { isAdminSessionValid } from "@/lib/auth/adminSession";
import { getSupabaseServerClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

const CREATE_FROM_TEMPLATE_RPC = "create_student_assignment_program_from_template";

// Gercek per-ogretmen kimligi sistemde YOK (isAdminSessionValid yalniz
// cookie uzunlugunu kontrol eder, hicbir kimlik tasimaz - bkz.
// src/lib/auth/adminSession.ts). Mevcut emsalle (assignments/generate/route.ts
// -> createdBy: "teacher") tutarli, sabit/teknik bir deger kullanilir;
// client'tan gelen HICBIR assignedBy degeri asla okunmaz/kullanilmaz.
const ASSIGNED_BY_VALUE = "teacher";

type CreateProgramRequestBody = {
  studentId?: unknown;
  templateId?: unknown;
};

type CreateProgramRpcResult = {
  programId?: string;
  templateId?: string;
  totalDays?: number;
  tasksPerDay?: number;
  dayCount?: number;
  taskCount?: number;
};

function errorResponse(message: string, status: number) {
  return NextResponse.json({ ok: false, message }, { status });
}

/**
 * Elle kurulmus bir sablonu bir ogrenciye atar.
 *
 * Client'tan YALNIZ studentId ve templateId okunur. Gorev verisi hicbir
 * sekilde client'tan gelmez - RPC tum gun/slot satirlarini sunucuda
 * program_template_tasks tablosundan okur, boylece "onizleme ile atama
 * arasinda sablon degisti" sinifi tutarsizliklar yapisal olarak imkansizdir.
 *
 * SINIF GRUBU ESLESMESI ARANMAZ: ogretmen daha once hazirladigi HERHANGI bir
 * sablonu HERHANGI bir aktif ogrenciye atayabilir (ör. 4. sinif ogrencisine
 * 2. sinif sablonu). Ogrencinin kendi egitim seviyesi bu akista hic
 * kullanilmaz; sablonun sinif grubu programa yalniz koken bilgisi olarak
 * yazilir ve ogrenci tarafindaki hicbir API bu alani dondurmez.
 *
 * Ogrenci aktifligi, sablon aktifligi, sablonun tam dolulugu ve "ogrencinin
 * zaten aktif programi var mi" kontrollerinin TAMAMI RPC icinde, ayni
 * transaction'da yapilir.
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

  const supabase = getSupabaseServerClient();
  if (!supabase) {
    return errorResponse("Supabase baglantisi bulunamadi.", 500);
  }

  let result: CreateProgramRpcResult | null = null;
  try {
    const { data, error } = await supabase.rpc(CREATE_FROM_TEMPLATE_RPC, {
      p_student_id: studentId,
      p_template_id: templateId,
      p_assigned_by: ASSIGNED_BY_VALUE,
    });

    if (error) {
      console.error("create_student_assignment_program_from_template RPC failed", {
        code: error.code,
        message: error.message,
      });
      const mapped = mapAssignmentProgramRpcError(error.message ?? "");
      return errorResponse(mapped.message, mapped.status);
    }

    result = (typeof data === "object" && data ? data : null) as CreateProgramRpcResult | null;
  } catch (unexpectedError) {
    console.error("create_student_assignment_program_from_template RPC threw unexpectedly", {
      message: unexpectedError instanceof Error ? unexpectedError.message : "unknown error",
    });
    return errorResponse("Program oluşturulamadı, lütfen tekrar deneyin.", 500);
  }

  if (!result?.programId) {
    console.error("create_student_assignment_program_from_template RPC returned no program id");
    return errorResponse("Program oluşturulamadı, lütfen tekrar deneyin.", 500);
  }

  return NextResponse.json({
    ok: true,
    program: {
      id: result.programId,
      studentId,
      templateId: result.templateId ?? templateId,
      totalDays: result.totalDays ?? 0,
      tasksPerDay: result.tasksPerDay ?? 5,
    },
    summary: {
      totalDays: result.dayCount ?? result.totalDays ?? 0,
      totalTasks: result.taskCount ?? 0,
    },
  });
}
