import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { IdilThemeProvider } from "@/components/theme/IdilThemeProvider";
import { StudentPanelPreview } from "@/components/student-panel-preview/StudentPanelPreview";
import { STUDENT_SESSION_COOKIE_NAME } from "@/lib/auth/studentSession";
import { verifyStudentAccessToken } from "@/lib/auth/verifyStudentAccess";
import { getSupabaseServiceRoleClient } from "@/lib/supabase/server";

const STUDENTS_TABLE = process.env.NEXT_PUBLIC_SUPABASE_STUDENTS_TABLE ?? "students";

async function getStudentProfile(studentId: string) {
  const supabase = getSupabaseServiceRoleClient();
  if (!supabase) return null;

  try {
    const { data, error } = await supabase
      .from(STUDENTS_TABLE)
      .select("id,name,username,class_name")
      .eq("id", studentId)
      .maybeSingle();

    return error ? null : data;
  } catch {
    return null;
  }
}

export default async function StudentDashboardPage() {
  const cookieStore = await cookies();
  const access = await verifyStudentAccessToken(cookieStore.get(STUDENT_SESSION_COOKIE_NAME)?.value ?? "");
  if (!access.ok) redirect("/giris");

  const student = await getStudentProfile(access.studentId);
  const studentName = typeof student?.name === "string" ? student.name.trim() : "";
  if (!student || String(student.id) !== access.studentId || !studentName) {
    redirect("/giris");
  }

  return (
    <IdilThemeProvider className="min-h-screen bg-[var(--idil-page-bg)] text-[var(--idil-text)]">
      <StudentPanelPreview
        authenticatedStudent={{
          id: access.studentId,
          name: studentName,
          username: typeof student.username === "string" && student.username.trim() ? student.username.trim() : access.username,
          classLevel: typeof student.class_name === "string" && student.class_name.trim() ? student.class_name.trim() : null,
        }}
      />
    </IdilThemeProvider>
  );
}
