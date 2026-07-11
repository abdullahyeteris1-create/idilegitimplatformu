export type StudentStatus = "active" | "passive";

export type EducationStatus = "general" | "speed-reading";

export type WelcomeEmailStatus = "sent" | "failed" | "not_requested";

export type Student = {
  id: string;
  name: string;
  username: string;
  password: string;
  className?: string;
  classLevel?: string;
  parentName?: string;
  phone?: string;
  parentPhone?: string;
  parentEmail?: string;
  /** @deprecated Use parentEmail. Retained for existing local records. */
  email?: string;
  welcomeEmailSentAt?: string;
  welcomeEmailStatus?: WelcomeEmailStatus;
  birthDate?: string;
  profileImageUrl?: string;
  isActive?: boolean;
  status: StudentStatus;
  educationStatus?: EducationStatus;
  createdAt: string;
  notes?: string;
};
