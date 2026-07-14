import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { isAdminSessionValid } from "@/lib/auth/adminSession";

export const runtime = "nodejs";

const STUDENTS_TABLE = process.env.NEXT_PUBLIC_SUPABASE_STUDENTS_TABLE ?? "students";
const EXERCISE_RESULTS_TABLE = process.env.NEXT_PUBLIC_SUPABASE_RESULTS_TABLE ?? "exercise_results";
const LESSONS_TABLE = process.env.NEXT_PUBLIC_SUPABASE_LESSONS_TABLE ?? "lessons";
const SCHEDULES_TABLE = process.env.NEXT_PUBLIC_SUPABASE_SCHEDULES_TABLE ?? "schedules";

const VALID_STUDENT_ID = /^[a-zA-Z0-9-]{1,128}$/;

function errorResponse(message: string, status: number) {
  return NextResponse.json({ ok: false, message }, { status });
}

function getSupabaseClient(): SupabaseClient | null {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim();

  if (!url || !key) {
    return null;
  }

  return createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

function parseStudentId(rawStudentId: string): string | null {
  const studentId = rawStudentId.trim();
  if (!VALID_STUDENT_ID.test(studentId)) {
    return null;
  }

  return studentId;
}

function isMissingSchemaError(code: string | null | undefined): boolean {
  return code === "42P01" || code === "42703" || code === "PGRST204";
}

async function deleteByStudentId(
  supabase: SupabaseClient,
  tableName: string,
  studentId: string,
): Promise<void> {
  const { error } = await supabase.from(tableName).delete().eq("student_id", studentId);

  if (!error) {
    return;
  }

  if (isMissingSchemaError(error.code)) {
    return;
  }

  throw error;
}

export async function DELETE(
  request: NextRequest,
  context: { params: Promise<{ studentId: string }> },
) {
  if (!isAdminSessionValid(request)) {
    return errorResponse("Yetkisiz erisim.", 401);
  }

  const params = await context.params;
  const studentId = parseStudentId(params.studentId);

  if (!studentId) {
    return errorResponse("Gecersiz ogrenci kimligi.", 400);
  }

  const supabase = getSupabaseClient();
  if (!supabase) {
    return errorResponse("Sunucu yapilandirmasi eksik.", 500);
  }

  const { data: existingStudent, error: studentLookupError } = await supabase
    .from(STUDENTS_TABLE)
    .select("id")
    .eq("id", studentId)
    .maybeSingle();

  if (studentLookupError) {
    console.error("Student lookup failed", {
      code: studentLookupError.code,
      message: studentLookupError.message,
    });
    return errorResponse("Ogrenci silinemedi. Lutfen yeniden deneyin.", 500);
  }

  if (!existingStudent) {
    return errorResponse("Ogrenci bulunamadi.", 404);
  }

  try {
    // FK cascade bilinmedigi icin bagli kayitlar kontrollu sekilde silinir.
    await deleteByStudentId(supabase, EXERCISE_RESULTS_TABLE, studentId);
    await deleteByStudentId(supabase, LESSONS_TABLE, studentId);
    await deleteByStudentId(supabase, SCHEDULES_TABLE, studentId);

    const { error: studentDeleteError } = await supabase
      .from(STUDENTS_TABLE)
      .delete()
      .eq("id", studentId);

    if (studentDeleteError) {
      console.error("Student deletion failed", {
        code: studentDeleteError.code,
        message: studentDeleteError.message,
      });
      return errorResponse("Ogrenci silinemedi. Lutfen yeniden deneyin.", 500);
    }
  } catch (error) {
    if (error && typeof error === "object" && "code" in error && "message" in error) {
      const typedError = error as { code?: string; message?: string };
      console.error("Student deletion failed", {
        code: typedError.code,
        message: typedError.message,
      });
    } else {
      console.error("Student deletion failed");
    }

    return errorResponse("Ogrenci silinemedi. Lutfen yeniden deneyin.", 500);
  }

  return NextResponse.json({
    ok: true,
    message: "Ogrenci basariyla silindi.",
  });
}
