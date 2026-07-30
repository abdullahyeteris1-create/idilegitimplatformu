import { getIstanbulDateString, isValidDateOnlyString } from "./studentAccessDates";

const MAX_NAME_LENGTH = 120;
const MAX_CLASS_LENGTH = 80;
const MAX_SCHOOL_LENGTH = 200;
const CLASS_VALUE_PATTERN = /^[\p{L}\p{N} .\-/]+$/u;

export type StudentProfileInput = {
  name: string;
  birthDate: string;
  classLevel: string;
  schoolName: string;
};

export type StudentProfileValidation =
  | { ok: true; value: StudentProfileInput }
  | { ok: false; message: string };

function normalizedString(value: unknown): string | null {
  return typeof value === "string" ? value.trim().replace(/\s+/g, " ") : null;
}

export function validateStudentProfileInput(input: Record<string, unknown>): StudentProfileValidation {
  const name = normalizedString(input.name);
  const birthDate = normalizedString(input.birthDate);
  const classLevel = normalizedString(input.classLevel);
  const schoolName = normalizedString(input.schoolName);

  if (!name || name.length < 2 || name.length > MAX_NAME_LENGTH) {
    return { ok: false, message: "Ad soyad 2 ile 120 karakter arasında olmalıdır." };
  }

  if (!birthDate || !isValidDateOnlyString(birthDate)) {
    return { ok: false, message: "Geçerli bir doğum tarihi seçin." };
  }
  const validBirthDate = birthDate;

  const today = getIstanbulDateString();
  const minimumDate = `${Number(today.slice(0, 4)) - 100}${today.slice(4)}`;
  if (validBirthDate > today) {
    return { ok: false, message: "Doğum tarihi gelecekte olamaz." };
  }
  if (validBirthDate < minimumDate) {
    return { ok: false, message: "Doğum tarihi gerçekçi bir aralıkta olmalıdır." };
  }

  if (!classLevel || classLevel.length > MAX_CLASS_LENGTH || !CLASS_VALUE_PATTERN.test(classLevel)) {
    return { ok: false, message: "Geçerli bir sınıf bilgisi girin." };
  }

  if (schoolName && schoolName.length > MAX_SCHOOL_LENGTH) {
    return { ok: false, message: "Okul adı en fazla 200 karakter olabilir." };
  }

  return {
    ok: true,
    value: { name, birthDate: validBirthDate, classLevel, schoolName: schoolName ?? "" },
  };
}
