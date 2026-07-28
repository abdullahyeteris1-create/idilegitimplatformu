import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { StudentPanelPreview } from "@/components/student-panel-preview/StudentPanelPreview";
import { STUDENT_SESSION_COOKIE_NAME } from "@/lib/auth/studentSession";
import { verifyStudentAccessToken } from "@/lib/auth/verifyStudentAccess";
import { getStudentProfile } from "@/lib/students/studentProfile";
import { getStudentXpSnapshotByStudentId } from "@/lib/xp/xpRepository";

export default async function StudentDashboardPage() {
  const cookieStore = await cookies();
  const access = await verifyStudentAccessToken(cookieStore.get(STUDENT_SESSION_COOKIE_NAME)?.value ?? "");
  if (!access.ok) redirect("/giris");

  const [student, xpSnapshot] = await Promise.all([
    getStudentProfile(access.studentId),
    getStudentXpSnapshotByStudentId(access.studentId),
  ]);
  const studentName = typeof student?.name === "string" ? student.name.trim() : "";
  if (!student || String(student.id) !== access.studentId || !studentName) {
    redirect("/giris");
  }

  return (
    <div className="min-h-screen bg-[var(--idil-page-bg)] text-[var(--idil-text)]">
      <StudentPanelPreview
        showReadingTestsCard={true}
        showStatisticsCard={true}
        xpSnapshot={xpSnapshot}
        authenticatedStudent={{
          id: access.studentId,
          name: studentName,
          username: student.username ?? access.username,
          classLevel: student.className,
        }}
      />
    </div>
  );
}
