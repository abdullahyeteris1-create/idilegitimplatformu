import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { StudentPanelPreview } from "@/components/student-panel-preview/StudentPanelPreview";
import { STUDENT_SESSION_COOKIE_NAME } from "@/lib/auth/studentSession";
import { verifyStudentAccessToken } from "@/lib/auth/verifyStudentAccess";
import { getStudentProfileById } from "@/lib/students/studentProfile";
import { getStudentXpSnapshotByStudentId } from "@/lib/xp/xpRepository";

export default async function StudentDashboardPage() {
  console.info("[student-page] request_received");
  const cookieStore = await cookies();
  const access = await verifyStudentAccessToken(cookieStore.get(STUDENT_SESSION_COOKIE_NAME)?.value ?? "");
  if (!access.ok) {
    if (access.status >= 500) {
      console.warn(`[student-page] access_temporarily_unavailable reason=${access.reason}`);
      return <StudentAccessUnavailable />;
    }

    console.info(`[student-page] redirect_giris reason=${access.reason}`);
    redirect("/giris");
  }
  console.info("[student-page] access_pass");

  const [student, xpSnapshot] = await Promise.all([
    getStudentProfileById(access.studentId),
    getStudentXpSnapshotByStudentId(access.studentId),
  ]);
  const studentName = typeof student?.name === "string" ? student.name.trim() : "";
  if (!student || String(student.id) !== access.studentId || !studentName) {
    console.info("[student-page] redirect_giris reason=profile_unavailable");
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
          classLevel: typeof student.class_name === "string" && student.class_name.trim() ? student.class_name.trim() : null,
        }}
      />
    </div>
  );
}

function StudentAccessUnavailable() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-[var(--idil-page-bg)] px-6 text-[var(--idil-text)]">
      <section className="w-full max-w-lg rounded-3xl border border-[var(--idil-border)] bg-[var(--idil-surface-strong)] p-8 text-center shadow-xl" role="alert">
        <h1 className="text-2xl font-semibold">Hesabın şu anda doğrulanamadı</h1>
        <p className="mt-3 text-sm leading-6 text-[var(--idil-muted)]">
          Şu anda hesabın doğrulanırken geçici bir bağlantı sorunu oluştu. Lütfen birazdan tekrar dene.
        </p>
        <a
          className="mt-6 inline-flex min-h-11 items-center justify-center rounded-xl bg-[var(--idil-accent)] px-5 py-3 font-semibold text-[var(--idil-strong-contrast)]"
          href="/ogrenci"
        >
          Tekrar Dene
        </a>
      </section>
    </main>
  );
}
