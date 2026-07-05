import { clearCurrentStudent, getCurrentStudent, setCurrentStudent } from "@/lib/auth/auth";
import { MOCK_STUDENTS } from "@/lib/students/mockStudents";
import type { Student } from "@/lib/students/types";

const STUDENTS_STORAGE_KEY = "idil-students";

type StudentInput = {
  name: string;
  username: string;
  password: string;
  classLevel?: string;
  parentName?: string;
  parentPhone?: string;
  email?: string;
  birthDate?: string;
  profileImageUrl?: string;
  status?: "active" | "passive";
  educationStatus?: "general" | "speed-reading";
  notes?: string;
};

function hasWindow(): boolean {
  return typeof window !== "undefined";
}

function normalizeOptional(value: string | undefined): string | undefined {
  const trimmed = value?.trim();
  return trimmed ? trimmed : undefined;
}

function readStudentsRaw(): Student[] {
  if (!hasWindow()) {
    return [];
  }

  const raw = localStorage.getItem(STUDENTS_STORAGE_KEY);
  if (!raw) {
    return [];
  }

  try {
    const parsed = JSON.parse(raw) as Student[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function writeStudents(students: Student[]): void {
  if (!hasWindow()) {
    return;
  }

  localStorage.setItem(STUDENTS_STORAGE_KEY, JSON.stringify(students));
}

function ensureInitialStudents(): Student[] {
  const existing = readStudentsRaw();
  if (existing.length > 0) {
    return existing;
  }

  writeStudents(MOCK_STUDENTS);
  return [...MOCK_STUDENTS];
}

function createStudentId(): string {
  return `std-${Date.now()}-${Math.floor(Math.random() * 10000)}`;
}

export function getStudents(): Student[] {
  const students = ensureInitialStudents();
  return [...students].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

export function getStudentById(id: string): Student | null {
  const students = getStudents();
  return students.find((student) => student.id === id) ?? null;
}

export function createStudent(studentInput: StudentInput): Student {
  const students = getStudents();

  const newStudent: Student = {
    id: createStudentId(),
    name: studentInput.name.trim(),
    username: studentInput.username.trim(),
    password: studentInput.password.trim(),
    classLevel: normalizeOptional(studentInput.classLevel),
    parentName: normalizeOptional(studentInput.parentName),
    parentPhone: normalizeOptional(studentInput.parentPhone),
    email: normalizeOptional(studentInput.email),
    birthDate: normalizeOptional(studentInput.birthDate),
    profileImageUrl: normalizeOptional(studentInput.profileImageUrl),
    status: studentInput.status ?? "active",
    educationStatus: studentInput.educationStatus,
    createdAt: new Date().toISOString(),
    notes: normalizeOptional(studentInput.notes),
  };

  writeStudents([newStudent, ...students]);
  return newStudent;
}

export function updateStudent(id: string, updates: Partial<Omit<Student, "id" | "createdAt">>): Student | null {
  const students = getStudents();
  const studentIndex = students.findIndex((student) => student.id === id);

  if (studentIndex < 0) {
    return null;
  }

  const existingStudent = students[studentIndex];
  const updatedStudent: Student = {
    ...existingStudent,
    ...updates,
    name: normalizeOptional(updates.name) ?? existingStudent.name,
    username: normalizeOptional(updates.username) ?? existingStudent.username,
    password: normalizeOptional(updates.password) ?? existingStudent.password,
    classLevel: updates.classLevel !== undefined ? normalizeOptional(updates.classLevel) : existingStudent.classLevel,
    parentName: updates.parentName !== undefined ? normalizeOptional(updates.parentName) : existingStudent.parentName,
    parentPhone: updates.parentPhone !== undefined ? normalizeOptional(updates.parentPhone) : existingStudent.parentPhone,
    email: updates.email !== undefined ? normalizeOptional(updates.email) : existingStudent.email,
    birthDate: updates.birthDate !== undefined ? normalizeOptional(updates.birthDate) : existingStudent.birthDate,
    profileImageUrl:
      updates.profileImageUrl !== undefined ? normalizeOptional(updates.profileImageUrl) : existingStudent.profileImageUrl,
    notes: updates.notes !== undefined ? normalizeOptional(updates.notes) : existingStudent.notes,
  };

  const nextStudents = [...students];
  nextStudents[studentIndex] = updatedStudent;
  writeStudents(nextStudents);

  const currentStudent = getCurrentStudent();
  if (currentStudent?.id === id) {
    setCurrentStudent(updatedStudent);
  }

  return updatedStudent;
}

export function deactivateStudent(id: string): Student | null {
  const updated = updateStudent(id, { status: "passive" });
  if (!updated) {
    return null;
  }

  const currentStudent = getCurrentStudent();
  if (currentStudent?.id === id) {
    clearCurrentStudent();
  }

  return updated;
}

export function activateStudent(id: string): Student | null {
  return updateStudent(id, { status: "active" });
}

export function deleteStudent(id: string): boolean {
  return deactivateStudent(id) !== null;
}

export function generateStudentPassword(): string {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789";
  return Array.from({ length: 10 }, () => alphabet[Math.floor(Math.random() * alphabet.length)]).join("");
}

export function generateUsernameFromName(name: string): string {
  const normalized = name
    .toLocaleLowerCase("tr-TR")
    .replace(/ğ/g, "g")
    .replace(/ü/g, "u")
    .replace(/ş/g, "s")
    .replace(/ı/g, "i")
    .replace(/ö/g, "o")
    .replace(/ç/g, "c")
    .replace(/[^a-z0-9\s]/g, "")
    .trim()
    .replace(/\s+/g, ".");

  if (!normalized) {
    return `ogrenci.${Math.floor(Math.random() * 9000 + 1000)}`;
  }

  return normalized;
}
