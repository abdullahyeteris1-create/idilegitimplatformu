import { notFound } from "next/navigation";
import { AppShell } from "@/components/layout/AppShell";
import { TeacherStudentDetailClient } from "@/components/teacher-panel/TeacherStudentDetailClient";
import { requireTeacherSession } from "@/lib/auth/teacherSession";
import { TEACHER_NAV_ITEMS } from "@/lib/constants/teacherNavigation";
import {
  getTeacherStudentDetail,
  isTeacherStudentId,
} from "@/lib/teachers/studentTrackingRepository";

type StudentDetailPageProps = {
  params: Promise<{
    studentId: string;
  }>;
};

export default async function StudentDetailPage({ params }: StudentDetailPageProps) {
  await requireTeacherSession();

  const { studentId } = await params;
  if (!isTeacherStudentId(studentId)) {
    notFound();
  }

  const detail = await getTeacherStudentDetail(studentId);
  if (!detail) {
    notFound();
  }

  return (
    <AppShell
      title="Ogrenci Detayi"
      subtitle="Gamification ozeti, program durumu ve egzersiz gecmisi"
      navItems={TEACHER_NAV_ITEMS}
      wide
    >
      <TeacherStudentDetailClient detail={detail} />
    </AppShell>
  );
}
