import type { Metadata } from "next";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { StudentPanelPreview } from "@/components/student-panel-preview/StudentPanelPreview";
import { readStudentSessionToken, STUDENT_SESSION_COOKIE_NAME } from "@/lib/auth/studentSession";
import { getSupabaseServerClient } from "@/lib/supabase/server";

export const metadata: Metadata = {
  title: "Öğrenci Paneli Önizleme | İDİL Hızlı Okuma",
  description: "İDİL Hızlı Okuma öğrenci paneli tasarım prototipi",
};

const STUDENTS_TABLE = process.env.NEXT_PUBLIC_SUPABASE_STUDENTS_TABLE ?? "students";

async function getVerifiedStudent(studentId: string) {
  const supabase = getSupabaseServerClient();
  if (!supabase) return null;

  try {
    const { data, error } = await supabase
      .from(STUDENTS_TABLE)
      .select("id,name,username,class_name,is_active")
      .eq("id", studentId)
      .maybeSingle();

    return error ? null : data;
  } catch {
    return null;
  }
}

export default async function StudentPanelPreviewPage() {
  const cookieStore = await cookies();
  const session = readStudentSessionToken(cookieStore.get(STUDENT_SESSION_COOKIE_NAME)?.value ?? "");
  if (!session) {
    redirect("/giris");
  }

  const student = await getVerifiedStudent(session.studentId);
  const studentName = typeof student?.name === "string" ? student.name.trim() : "";

  if (!student || student.is_active === false || String(student.id) !== session.studentId || !studentName) {
    redirect("/giris");
  }

  const username = typeof student.username === "string" && student.username.trim()
    ? student.username.trim()
    : session.username;
  const classLevel = typeof student.class_name === "string" && student.class_name.trim()
    ? student.class_name.trim()
    : null;

  return (
    <StudentPanelPreview
      authenticatedStudent={{
        id: session.studentId,
        name: studentName,
        username,
        classLevel,
      }}
    />
  );
}
