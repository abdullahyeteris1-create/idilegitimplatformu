import "server-only";

import { getSupabaseServiceRoleClient } from "@/lib/supabase/server";

const STUDENTS_TABLE = process.env.NEXT_PUBLIC_SUPABASE_STUDENTS_TABLE ?? "students";

export type StudentProfile = {
  id: string;
  name: string;
  username?: string | null;
  class_name?: string | null;
};

export type StudentProfileDetails = StudentProfile & {
  birth_date?: string | null;
  school_name?: string | null;
};

export async function getStudentProfileById(studentId: string): Promise<StudentProfile | null> {
  const supabase = getSupabaseServiceRoleClient();
  if (!supabase) return null;

  try {
    const { data, error } = await supabase
      .from(STUDENTS_TABLE)
      .select("id,name,username,class_name")
      .eq("id", studentId)
      .maybeSingle();

    if (error || !data) {
      return null;
    }

    return {
      id: String(data.id ?? ""),
      name: typeof data.name === "string" ? data.name : "",
      username: typeof data.username === "string" ? data.username : null,
      class_name: typeof data.class_name === "string" ? data.class_name : null,
    };
  } catch {
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
