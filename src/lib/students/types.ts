export type StudentStatus = "active" | "passive";

export type EducationStatus = "general" | "speed-reading";

export type Student = {
  id: string;
  name: string;
  username: string;
  password: string;
  classLevel?: string;
  parentName?: string;
  parentPhone?: string;
  email?: string;
  birthDate?: string;
  profileImageUrl?: string;
  status: StudentStatus;
  educationStatus?: EducationStatus;
  createdAt: string;
  notes?: string;
};
