export type StudentStatus = "active" | "passive";

export type EducationStatus = "general" | "speed-reading";

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
  email?: string;
  birthDate?: string;
  profileImageUrl?: string;
  isActive?: boolean;
  status: StudentStatus;
  educationStatus?: EducationStatus;
  createdAt: string;
  notes?: string;
};
