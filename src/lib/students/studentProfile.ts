import "server-only";

import { getSupabaseServiceRoleClient } from "@/lib/supabase/server";
import {
  loadStudentProfile,
  type StudentProfile,
  type StudentProfileQueryError,
} from "@/lib/students/studentProfileQuery";

export type { StudentProfile } from "@/lib/students/studentProfileQuery";

const STUDENTS_TABLE = process.env.NEXT_PUBLIC_SUPABASE_STUDENTS_TABLE ?? "students";

export type StudentProfileDetails = StudentProfile & {
  birth_date?: string | null;
  school_name?: string | null;
};

export async function getStudentProfileById(studentId: string): Promise<StudentProfile | null> {
  const supabase = getSupabaseServiceRoleClient();
  if (!supabase) return null;

  try {
    return await loadStudentProfile(
      async (columns, requestedStudentId) => {
        const { data, error } = await supabase
          .from(STUDENTS_TABLE)
          .select(columns)
          .eq("id", requestedStudentId)
          .maybeSingle();

        return {
          data: data as Record<string, unknown> | null,
          error,
        };
      },
      studentId,
      (stage, error: StudentProfileQueryError) => {
        console.error(`[student-profile] ${stage}`, {
          code: error.code,
          message: error.message,
        });
      },
    );
  } catch (error) {
    console.error("[student-profile] profile_query_failed", {
      code: "unexpected_error",
      message: error instanceof Error ? error.message : "Unknown profile query error",
    });
    return null;
  }
}

export async function getStudentProfileDetailsById(studentId: string): Promise<StudentProfileDetails | null> {
  const supabase = getSupabaseServiceRoleClient();
  if (!supabase) return null;

  try {
    const { data, error } = await supabase
      .from(STUDENTS_TABLE)
      .select("id,name,username,class_name,birth_date,school_name")
      .eq("id", studentId)
      .maybeSingle();

    if (error || !data) return null;

    return {
      id: String(data.id ?? ""),
      name: typeof data.name === "string" ? data.name : "",
      username: typeof data.username === "string" ? data.username : null,
      class_name: typeof data.class_name === "string" ? data.class_name : null,
      birth_date: typeof data.birth_date === "string" ? data.birth_date : null,
      school_name: typeof data.school_name === "string" ? data.school_name : null,
    };
  } catch {
    return null;
  }
}
