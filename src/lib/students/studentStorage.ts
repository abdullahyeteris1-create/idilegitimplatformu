import { clearCurrentStudent, getCurrentStudent, getCurrentUser, setCurrentStudent, setCurrentUser } from "@/lib/auth/auth";
import { normalizeEducationLevel } from "@/lib/assignments/educationLevels";
import { DEMO_STUDENT, MOCK_STUDENTS } from "@/lib/students/mockStudents";
import { supabase } from "@/lib/supabase/client";
import type { Student, WelcomeEmailStatus } from "@/lib/students/types";

const STUDENTS_STORAGE_KEY = "idil-students";
const STUDENTS_TABLE = process.env.NEXT_PUBLIC_SUPABASE_STUDENTS_TABLE ?? "students";

type StudentInput = {
  name: string;
  username: string;
  password: string;
  classLevel?: string;
  parentName?: string;
  parentPhone?: string;
  parentEmail?: string;
  /** @deprecated Use parentEmail. */
  email?: string;
  welcomeEmailSentAt?: string;
  welcomeEmailStatus?: WelcomeEmailStatus;
  birthDate?: string;
  profileImageUrl?: string;
  status?: "active" | "passive";
  educationStatus?: "general" | "speed-reading";
  educationLevel?: Student["educationLevel"];
  assignmentMode?: Student["assignmentMode"];
  notes?: string;
};

function hasWindow(): boolean {
  return typeof window !== "undefined";
}

function normalizeOptional(value: string | undefined): string | undefined {
  const trimmed = value?.trim();
  return trimmed ? trimmed : undefined;
}

function normalizeWelcomeEmailStatus(value: unknown): WelcomeEmailStatus | undefined {
  return value === "sent" || value === "failed" || value === "not_requested"
    ? value
    : undefined;
}

function isUuid(value?: string): boolean {
  return (
    typeof value === "string" &&
    /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value)
  );
}

function normalizeLookup(value: string | undefined): string {
  const trimmed = value?.trim();
  if (!trimmed) {
    return "";
  }

  return trimmed
    .toLocaleLowerCase("tr-TR")
    .replace(/ğ/g, "g")
    .replace(/ü/g, "u")
    .replace(/ş/g, "s")
    .replace(/ı/g, "i")
    .replace(/ö/g, "o")
    .replace(/ç/g, "c")
    .replace(/İ/g, "i")
    .replace(/[^a-z0-9]/g, "");
}

function normalizeStudentRecord(student: Student, fallbackIndex: number): Student {
  const name = normalizeOptional(student.name) ?? `Ogrenci ${fallbackIndex + 1}`;
  const username = normalizeOptional(student.username) ?? generateUsernameFromName(name);
  const password = normalizeOptional(student.password) ?? generateStudentPassword();
  const classLevel = normalizeOptional(student.classLevel) ?? normalizeOptional(student.className);
  const educationLevel =
    normalizeEducationLevel(student.educationLevel) ??
    normalizeEducationLevel(classLevel);
  const parentPhone = normalizeOptional(student.parentPhone) ?? normalizeOptional(student.phone);
  const parentEmail = normalizeOptional(student.parentEmail) ?? normalizeOptional(student.email);
  const status = student.isActive === true ? "active" : student.isActive === false ? "passive" : student.status ?? "active";

  return {
    ...student,
    id: normalizeOptional(student.id) ?? `legacy-student-${fallbackIndex}`,
    name,
    username,
    password,
    className: normalizeOptional(student.className) ?? classLevel,
    classLevel,
    educationLevel,
    parentName: normalizeOptional(student.parentName),
    phone: normalizeOptional(student.phone) ?? parentPhone,
    parentPhone,
    parentEmail,
    email: parentEmail,
    welcomeEmailSentAt: normalizeOptional(student.welcomeEmailSentAt),
    welcomeEmailStatus: normalizeWelcomeEmailStatus(student.welcomeEmailStatus),
    birthDate: normalizeOptional(student.birthDate),
    profileImageUrl: normalizeOptional(student.profileImageUrl),
    isActive: status === "active",
    status: status === "passive" ? "passive" : "active",
    educationStatus: student.educationStatus,
    assignmentMode:
      student.assignmentMode === "manual" ||
      student.assignmentMode === "ai_assisted" ||
      student.assignmentMode === "automatic"
        ? student.assignmentMode
        : "automatic",
    createdAt: normalizeOptional(student.createdAt) ?? new Date().toISOString(),
    notes: normalizeOptional(student.notes),
  };
}

function normalizeStudents(students: Student[]): Student[] {
  return students.map((student, index) => normalizeStudentRecord(student, index));
}

function normalizeStudentsWithDemo(students: Student[]): Student[] {
  const normalized = normalizeStudents(students);
  const hasDemo = normalized.some(
    (student) =>
      student.id === DEMO_STUDENT.id || normalizeLookup(student.username) === normalizeLookup(DEMO_STUDENT.username),
  );

  if (hasDemo) {
    return normalized;
  }

  return normalizeStudents([DEMO_STUDENT, ...normalized]);
}

function mapSupabaseRowToStudent(row: Record<string, unknown>): Student {
  const parentEmail =
    typeof row.parent_email === "string"
      ? row.parent_email
      : typeof row.parentEmail === "string"
        ? row.parentEmail
        : typeof row.email === "string"
          ? row.email
          : undefined;

  const mapped: Student = {
    id: String(row.id ?? ""),
    name: String(row.name ?? ""),
    username: String(row.username ?? ""),
    password: String(row.password ?? ""),
    className: typeof row.class_name === "string" ? row.class_name : typeof row.className === "string" ? row.className : undefined,
    classLevel: typeof row.class_level === "string" ? row.class_level : typeof row.classLevel === "string" ? row.classLevel : undefined,
    educationLevel: normalizeEducationLevel(row.education_level ?? row.educationLevel),
    parentName: typeof row.parent_name === "string" ? row.parent_name : typeof row.parentName === "string" ? row.parentName : undefined,
    phone: typeof row.phone === "string" ? row.phone : undefined,
    parentPhone: typeof row.parent_phone === "string" ? row.parent_phone : typeof row.parentPhone === "string" ? row.parentPhone : undefined,
    parentEmail,
    email: parentEmail,
    welcomeEmailSentAt:
      typeof row.welcome_email_sent_at === "string"
        ? row.welcome_email_sent_at
        : typeof row.welcomeEmailSentAt === "string"
          ? row.welcomeEmailSentAt
          : undefined,
    welcomeEmailStatus: normalizeWelcomeEmailStatus(
      row.welcome_email_status ?? row.welcomeEmailStatus,
    ),
    birthDate: typeof row.birth_date === "string" ? row.birth_date : typeof row.birthDate === "string" ? row.birthDate : undefined,
    profileImageUrl:
      typeof row.profile_image_url === "string"
        ? row.profile_image_url
        : typeof row.profileImageUrl === "string"
          ? row.profileImageUrl
          : undefined,
    isActive: typeof row.is_active === "boolean" ? row.is_active : typeof row.isActive === "boolean" ? row.isActive : undefined,
    status:
      row.status === "passive" || row.status === "active"
        ? row.status
        : (typeof row.is_active === "boolean" && !row.is_active) || (typeof row.isActive === "boolean" && !row.isActive)
          ? "passive"
          : "active",
    educationStatus:
      row.education_status === "general" || row.education_status === "speed-reading"
        ? row.education_status
        : row.educationStatus === "general" || row.educationStatus === "speed-reading"
          ? row.educationStatus
          : undefined,
    assignmentMode:
      row.assignment_mode === "manual" || row.assignment_mode === "ai_assisted" || row.assignment_mode === "automatic"
        ? row.assignment_mode
        : row.assignmentMode === "manual" || row.assignmentMode === "ai_assisted" || row.assignmentMode === "automatic"
          ? row.assignmentMode
          : "automatic",
    createdAt:
      typeof row.created_at === "string"
        ? row.created_at
        : typeof row.createdAt === "string"
          ? row.createdAt
          : new Date().toISOString(),
    notes: typeof row.notes === "string" ? row.notes : undefined,
  };

  return normalizeStudentRecord(mapped, 0);
}

function mapStudentToSupabaseRow(student: Student): Record<string, unknown> {
  const payload: Record<string, unknown> = {
    name: student.name,
    username: student.username,
    password: student.password,
    class_name: student.className ?? student.classLevel ?? null,
    parent_name: student.parentName ?? null,
    phone: student.phone ?? student.parentPhone ?? null,
    parent_email: student.parentEmail ?? student.email ?? null,
    education_level: student.educationLevel ?? null,
    assignment_mode: student.assignmentMode ?? "automatic",
    welcome_email_sent_at: student.welcomeEmailSentAt ?? null,
    welcome_email_status: student.welcomeEmailStatus ?? null,
    is_active: (student.isActive ?? student.status === "active") === true,
    notes: student.notes ?? null,
    updated_at: new Date().toISOString(),
  };

  if (isUuid(student.id)) {
    payload.id = student.id;
  }

  return payload;
}

function syncStudentInLocalCache(syncedStudent: Student, previousUsername?: string): void {
  const normalizedSyncedUsername = normalizeLookup(syncedStudent.username);
  const normalizedPreviousUsername = normalizeLookup(previousUsername);
  const currentStudents = getStudents();

  const existingIndex = currentStudents.findIndex((item) => {
    if (isUuid(item.id) && item.id === syncedStudent.id) {
      return true;
    }

    if (normalizeLookup(item.username) === normalizedSyncedUsername) {
      return true;
    }

    if (normalizedPreviousUsername && normalizeLookup(item.username) === normalizedPreviousUsername) {
      return true;
    }

    return false;
  });

  const nextStudents = [...currentStudents];

  if (existingIndex >= 0) {
    nextStudents[existingIndex] = {
      ...nextStudents[existingIndex],
      ...syncedStudent,
    };
  } else {
    nextStudents.unshift(syncedStudent);
  }

  writeStudents(normalizeStudentsWithDemo(nextStudents));

  const currentStudent = getCurrentStudent();
  if (
    currentStudent &&
    (currentStudent.id === syncedStudent.id ||
      normalizeLookup(currentStudent.username) === normalizedSyncedUsername ||
      (normalizedPreviousUsername && normalizeLookup(currentStudent.username) === normalizedPreviousUsername))
  ) {
    setCurrentStudent(syncedStudent);
  }

  const currentUser = getCurrentUser();
  if (
    currentUser?.role === "student" &&
    (normalizeLookup(currentUser.username) === normalizedSyncedUsername ||
      (normalizedPreviousUsername && normalizeLookup(currentUser.username) === normalizedPreviousUsername))
  ) {
    setCurrentUser({
      role: "student",
      username: syncedStudent.username,
      studentId: syncedStudent.id,
      studentName: syncedStudent.name,
    });
  }
}

async function fetchStudentsFromSupabase(): Promise<Student[] | null> {
  if (!supabase) {
    return null;
  }

  const { data, error } = await supabase
    .from(STUDENTS_TABLE)
    .select("*")
    .order("created_at", { ascending: false });

  if (error || !Array.isArray(data)) {
    return null;
  }

  return normalizeStudentsWithDemo(data.map((row) => mapSupabaseRowToStudent(row as Record<string, unknown>)));
}

function logStudentSyncFailure(operation: string, code?: string): void {
  console.error("Supabase student sync failed", {
    operation,
    code: code ?? "unknown",
  });
}

async function upsertStudentToSupabase(student: Student, previousUsername?: string): Promise<Student | null> {
  if (!supabase) {
    return null;
  }

  const payload = mapStudentToSupabaseRow(student);
  const normalizedPreviousUsername = normalizeOptional(previousUsername);

  if (isUuid(student.id)) {
    const { data, error } = await supabase
      .from(STUDENTS_TABLE)
      .update(payload)
      .eq("id", student.id)
      .select("*")
      .maybeSingle();

    if (!error && data) {
      const syncedStudent = mapSupabaseRowToStudent(data as Record<string, unknown>);
      syncStudentInLocalCache(syncedStudent, normalizedPreviousUsername);
      return syncedStudent;
    }

    if (error) {
      logStudentSyncFailure("update-by-id", error.code);
      return null;
    }
  }

  if (normalizedPreviousUsername && normalizeLookup(normalizedPreviousUsername) !== normalizeLookup(student.username)) {
    const { data, error } = await supabase
      .from(STUDENTS_TABLE)
      .update(payload)
      .eq("username", normalizedPreviousUsername)
      .select("*")
      .maybeSingle();

    if (!error && data) {
      const syncedStudent = mapSupabaseRowToStudent(data as Record<string, unknown>);
      syncStudentInLocalCache(syncedStudent, normalizedPreviousUsername);
      return syncedStudent;
    }

    if (error) {
      logStudentSyncFailure("update-by-username", error.code);
      return null;
    }
  }

  const { data, error } = await supabase
    .from(STUDENTS_TABLE)
    .upsert(payload, { onConflict: "username" })
    .select("*")
    .single();

  if (error) {
    logStudentSyncFailure("upsert-by-username", error.code);
    return null;
  }

  const syncedStudent = mapSupabaseRowToStudent(data as Record<string, unknown>);
  syncStudentInLocalCache(syncedStudent, normalizedPreviousUsername);
  return syncedStudent;
}

function isUsernameTaken(username: string, students: Student[], excludedStudentId?: string): boolean {
  const normalizedUsername = normalizeLookup(username);

  return students.some((student) => {
    if (excludedStudentId && student.id === excludedStudentId) {
      return false;
    }

    return normalizeLookup(student.username) === normalizedUsername;
  });
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
    return normalizeStudents(existing);
  }

  const seededStudents = [DEMO_STUDENT, ...MOCK_STUDENTS.filter((student) => student.id !== DEMO_STUDENT.id)];
  writeStudents(seededStudents);
  return [...seededStudents];
}

function createStudentId(): string {
  return `std-${Date.now()}-${Math.floor(Math.random() * 10000)}`;
}

export function getStudents(): Student[] {
  const students = normalizeStudentsWithDemo(ensureInitialStudents());
  return [...students].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

export async function getStudentsWithRemote(): Promise<Student[]> {
  const remoteStudents = await fetchStudentsFromSupabase();

  if (remoteStudents && remoteStudents.length > 0) {
    writeStudents(remoteStudents);
    return [...remoteStudents].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  }

  return getStudents();
}

export function getStudentById(id: string): Student | null {
  const students = getStudents();
  return students.find((student) => student.id === id) ?? null;
}

export function getStudentByUsername(username: string): Student | null {
  const students = getStudents();
  const normalizedUsername = normalizeLookup(username);

  return students.find((student) => normalizeLookup(student.username) === normalizedUsername) ?? null;
}

export async function getStudentByUsernameWithRemote(username: string): Promise<Student | null> {
  const normalizedUsername = normalizeLookup(username);

  if (supabase) {
    const { data, error } = await supabase.from(STUDENTS_TABLE).select("*").eq("username", username.trim()).limit(1);

    if (!error && Array.isArray(data) && data[0]) {
      const student = mapSupabaseRowToStudent(data[0] as Record<string, unknown>);
      const mergedStudents = normalizeStudentsWithDemo([student, ...getStudents().filter((item) => item.id !== student.id)]);
      writeStudents(mergedStudents);

      return student;
    }
  }

  return getStudents().find((student) => normalizeLookup(student.username) === normalizedUsername) ?? null;
}

export function isStudentUsernameAvailable(username: string, excludedStudentId?: string): boolean {
  return !isUsernameTaken(username, getStudents(), excludedStudentId);
}

function buildNewStudent(studentInput: StudentInput): Student {
  const username = studentInput.username.trim();
  const parentEmail =
    normalizeOptional(studentInput.parentEmail) ?? normalizeOptional(studentInput.email);

  return {
    id: createStudentId(),
    name: studentInput.name.trim(),
    username,
    password: studentInput.password.trim(),
    classLevel: normalizeOptional(studentInput.classLevel),
    parentName: normalizeOptional(studentInput.parentName),
    parentPhone: normalizeOptional(studentInput.parentPhone),
    parentEmail,
    email: parentEmail,
    welcomeEmailSentAt: normalizeOptional(studentInput.welcomeEmailSentAt),
    welcomeEmailStatus: normalizeWelcomeEmailStatus(studentInput.welcomeEmailStatus),
    birthDate: normalizeOptional(studentInput.birthDate),
    profileImageUrl: normalizeOptional(studentInput.profileImageUrl),
    status: studentInput.status ?? "active",
    isActive: (studentInput.status ?? "active") === "active",
    educationStatus: studentInput.educationStatus,
    educationLevel: normalizeEducationLevel(studentInput.educationLevel) ?? normalizeEducationLevel(studentInput.classLevel),
    assignmentMode: studentInput.assignmentMode ?? "automatic",
    createdAt: new Date().toISOString(),
    notes: normalizeOptional(studentInput.notes),
  };
}

export function createStudent(studentInput: StudentInput): Student | null {
  const students = getStudents();
  const username = studentInput.username.trim();

  if (isUsernameTaken(username, students)) {
    return null;
  }

  const newStudent = buildNewStudent(studentInput);

  writeStudents([newStudent, ...students]);
  void upsertStudentToSupabase(newStudent);
  return newStudent;
}

export async function createStudentWithRemote(studentInput: StudentInput): Promise<Student | null> {
  const students = getStudents();
  const username = studentInput.username.trim();

  if (isUsernameTaken(username, students)) {
    return null;
  }

  const newStudent = buildNewStudent(studentInput);

  if (!supabase) {
    writeStudents([newStudent, ...students]);
    return newStudent;
  }

  return upsertStudentToSupabase(newStudent);
}

export function updateStudent(id: string, updates: Partial<Omit<Student, "id" | "createdAt">>): Student | null {
  const students = getStudents();
  const studentIndex = students.findIndex((student) => student.id === id);

  if (studentIndex < 0) {
    return null;
  }

  const existingStudent = students[studentIndex];
  const nextUsername = updates.username !== undefined ? updates.username.trim() : existingStudent.username;

  if (isUsernameTaken(nextUsername, students, id)) {
    return null;
  }

  const nextParentEmail =
    updates.parentEmail !== undefined
      ? normalizeOptional(updates.parentEmail)
      : updates.email !== undefined
        ? normalizeOptional(updates.email)
        : existingStudent.parentEmail ?? existingStudent.email;

  const updatedStudent: Student = {
    ...existingStudent,
    ...updates,
    name: normalizeOptional(updates.name) ?? existingStudent.name,
    username: normalizeOptional(updates.username) ?? existingStudent.username,
    password: normalizeOptional(updates.password) ?? existingStudent.password,
    classLevel: updates.classLevel !== undefined ? normalizeOptional(updates.classLevel) : existingStudent.classLevel,
    parentName: updates.parentName !== undefined ? normalizeOptional(updates.parentName) : existingStudent.parentName,
    parentPhone: updates.parentPhone !== undefined ? normalizeOptional(updates.parentPhone) : existingStudent.parentPhone,
    parentEmail: nextParentEmail,
    email: nextParentEmail,
    welcomeEmailSentAt:
      updates.welcomeEmailSentAt !== undefined
        ? normalizeOptional(updates.welcomeEmailSentAt)
        : existingStudent.welcomeEmailSentAt,
    welcomeEmailStatus:
      updates.welcomeEmailStatus !== undefined
        ? normalizeWelcomeEmailStatus(updates.welcomeEmailStatus)
        : existingStudent.welcomeEmailStatus,
    birthDate: updates.birthDate !== undefined ? normalizeOptional(updates.birthDate) : existingStudent.birthDate,
    profileImageUrl:
      updates.profileImageUrl !== undefined ? normalizeOptional(updates.profileImageUrl) : existingStudent.profileImageUrl,
    isActive:
      updates.isActive !== undefined
        ? updates.isActive
        : updates.status !== undefined
          ? updates.status === "active"
          : existingStudent.isActive ?? existingStudent.status === "active",
    notes: updates.notes !== undefined ? normalizeOptional(updates.notes) : existingStudent.notes,
    educationLevel:
      updates.educationLevel !== undefined
        ? normalizeEducationLevel(updates.educationLevel)
        : existingStudent.educationLevel,
    assignmentMode:
      updates.assignmentMode !== undefined
        ? updates.assignmentMode
        : existingStudent.assignmentMode ?? "automatic",
  };

  const nextStudents = [...students];
  nextStudents[studentIndex] = updatedStudent;
  writeStudents(nextStudents);
  void upsertStudentToSupabase(updatedStudent, existingStudent.username);

  const currentStudent = getCurrentStudent();
  if (currentStudent?.id === id) {
    setCurrentStudent(updatedStudent);
  }

  return updatedStudent;
}

export async function updateStudentWelcomeEmailStatus(
  id: string,
  welcomeEmailStatus: WelcomeEmailStatus,
  welcomeEmailSentAt?: string,
): Promise<Student | null> {
  const students = getStudents();
  const studentIndex = students.findIndex((student) => student.id === id);

  if (studentIndex < 0) {
    return null;
  }

  const existingStudent = students[studentIndex];
  const normalizedSentAt =
    welcomeEmailStatus === "sent"
      ? normalizeOptional(welcomeEmailSentAt) ?? new Date().toISOString()
      : undefined;
  const updatedStudent: Student = {
    ...existingStudent,
    welcomeEmailSentAt: normalizedSentAt,
    welcomeEmailStatus,
  };
  const nextStudents = [...students];
  nextStudents[studentIndex] = updatedStudent;
  writeStudents(nextStudents);

  const currentStudent = getCurrentStudent();
  if (currentStudent?.id === id) {
    setCurrentStudent(updatedStudent);
  }

  if (!supabase) {
    return updatedStudent;
  }

  const statusPayload = {
    welcome_email_sent_at: normalizedSentAt ?? null,
    welcome_email_status: welcomeEmailStatus,
    updated_at: new Date().toISOString(),
  };
  const updateQuery = supabase.from(STUDENTS_TABLE).update(statusPayload);
  const { data, error } = isUuid(existingStudent.id)
    ? await updateQuery.eq("id", existingStudent.id).select("*").maybeSingle()
    : await updateQuery.eq("username", existingStudent.username).select("*").maybeSingle();

  if (error) {
    logStudentSyncFailure("update-welcome-email-status", error.code);
    return updatedStudent;
  }

  if (!data) {
    logStudentSyncFailure("update-welcome-email-status");
    return updatedStudent;
  }

  const syncedStudent = mapSupabaseRowToStudent(data as Record<string, unknown>);
  syncStudentInLocalCache(syncedStudent);
  return syncedStudent;
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

export function removeStudentFromLocalCache(studentId: string): void {
  const nextStudents = getStudents().filter((student) => student.id !== studentId);
  writeStudents(normalizeStudentsWithDemo(nextStudents));

  const currentStudent = getCurrentStudent();
  if (currentStudent?.id === studentId) {
    clearCurrentStudent();
  }
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
