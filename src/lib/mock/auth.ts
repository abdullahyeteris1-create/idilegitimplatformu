export type UserRole = "student" | "teacher";

export type PlatformUser = {
  id: string;
  fullName: string;
  schoolNumber: string;
  role: UserRole;
};

const AUTH_STORAGE_KEY = "idil-platform-user";

function hasWindow(): boolean {
  return typeof window !== "undefined";
}

export function mockLoginStudent(payload: {
  fullName: string;
  schoolNumber: string;
}): PlatformUser {
  const user: PlatformUser = {
    id: `${Date.now()}`,
    fullName: payload.fullName.trim(),
    schoolNumber: payload.schoolNumber.trim(),
    role: "student",
  };

  if (hasWindow()) {
    localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(user));
  }

  return user;
}

export function getCurrentUser(): PlatformUser | null {
  if (!hasWindow()) {
    return null;
  }

  const rawUser = localStorage.getItem(AUTH_STORAGE_KEY);
  if (!rawUser) {
    return null;
  }

  try {
    return JSON.parse(rawUser) as PlatformUser;
  } catch {
    return null;
  }
}

export function mockLogout(): void {
  if (hasWindow()) {
    localStorage.removeItem(AUTH_STORAGE_KEY);
  }
}
