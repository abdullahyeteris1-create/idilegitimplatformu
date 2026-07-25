import type { Metadata } from "next";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import {
  StudentEducationProgramEmptyState,
  StudentEducationProgramErrorState,
  StudentEducationProgramStudentView,
} from "@/components/education-programs/StudentEducationProgramStudentView";
import { EducationProgramLaunchErrorBanner } from "@/components/education-programs/EducationProgramLaunchErrorBanner";
import { STUDENT_SESSION_COOKIE_NAME } from "@/lib/auth/studentSession";
import { verifyStudentAccessToken } from "@/lib/auth/verifyStudentAccess";
import { getActiveEducationProgramForStudent } from "@/lib/education-programs/studentProgramRepository";
import { getSupabaseServiceRoleClient } from "@/lib/supabase/server";

function LaunchErrorBanner() {
  return (
    <Suspense fallback={null}>
      <EducationProgramLaunchErrorBanner />
    </Suspense>
  );
}

export const metadata: Metadata = {
  title: "Eğitim Programım",
};

export default async function StudentEducationProgramPage() {
  const cookieStore = await cookies();
  const access = await verifyStudentAccessToken(
    cookieStore.get(STUDENT_SESSION_COOKIE_NAME)?.value ?? "",
  );

  if (!access.ok) {
    redirect("/giris");
  }

  const supabase = getSupabaseServiceRoleClient();

  if (!supabase) {
    return (
      <>
        <LaunchErrorBanner />
        <StudentEducationProgramErrorState />
      </>
    );
  }

  const result = await getActiveEducationProgramForStudent(supabase, access.studentId);

  if (!result.ok) {
    return (
      <>
        <LaunchErrorBanner />
        <StudentEducationProgramErrorState />
      </>
    );
  }

  if (!result.value) {
    return (
      <>
        <LaunchErrorBanner />
        <StudentEducationProgramEmptyState />
      </>
    );
  }

  return (
    <>
      <LaunchErrorBanner />
      <StudentEducationProgramStudentView program={result.value} />
    </>
  );
}
