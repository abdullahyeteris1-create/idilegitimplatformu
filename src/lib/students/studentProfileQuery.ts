export type StudentProfile = {
  id: string;
  name: string;
  username?: string | null;
  class_name?: string | null;
  profile_image_url?: string | null;
};

export type StudentProfileQueryError = {
  code?: unknown;
  message?: unknown;
};

type StudentProfileQueryResult = {
  data: Record<string, unknown> | null;
  error: StudentProfileQueryError | null;
};

export type StudentProfileQuery = (
  columns: "id,name,username,class_name" | "profile_image_url",
  studentId: string,
) => Promise<StudentProfileQueryResult>;

type StudentProfileErrorReporter = (
  stage: "profile_query_failed" | "optional_avatar_query_failed",
  error: StudentProfileQueryError,
) => void;

export async function loadStudentProfile(
  query: StudentProfileQuery,
  studentId: string,
  reportError: StudentProfileErrorReporter,
): Promise<StudentProfile | null> {
  const profileResult = await query("id,name,username,class_name", studentId);
  if (profileResult.error) {
    reportError("profile_query_failed", profileResult.error);
    return null;
  }
  if (!profileResult.data) return null;

  const avatarResult = await query("profile_image_url", studentId);
  if (avatarResult.error) {
    reportError("optional_avatar_query_failed", avatarResult.error);
  }

  const profile = profileResult.data;
  return {
    id: String(profile.id ?? ""),
    name: typeof profile.name === "string" ? profile.name : "",
    username: typeof profile.username === "string" ? profile.username : null,
    class_name: typeof profile.class_name === "string" ? profile.class_name : null,
    profile_image_url:
      !avatarResult.error && typeof avatarResult.data?.profile_image_url === "string"
        ? avatarResult.data.profile_image_url
        : null,
  };
}
