import { createHmac, timingSafeEqual } from "node:crypto";

// Egitim Programi gorev baslatma sonrasi egzersiz route'una tasinan, imzali
// ve kisa omurlu baglam. Query parametresinin ham degerine (task id) hicbir
// yetki anlami yuklenmez - bu token, o degerin kim tarafindan ve ne zaman
// uretildigini kanitlar; tuketen taraf (FAZ 3A-2) yine de DB'den sahiplik
// dogrulamasi yapar. Assignment System V2'ye veya src/lib/auth'a hicbir
// bagimliligi yoktur - Egitim Programi bounded context'i icinde kalir.
export const EDUCATION_PROGRAM_LAUNCH_QUERY_PARAM = "educationLaunch";
export const EDUCATION_PROGRAM_LAUNCH_TOKEN_MAX_AGE_SECONDS = 5 * 60;

export type EducationProgramLaunchContext = {
  taskId: string;
  studentId: string;
  exerciseSlug: string;
  issuedAt: number;
};

function toBase64Url(value: string): string {
  return Buffer.from(value, "utf8").toString("base64url");
}

function fromBase64Url(value: string): string {
  return Buffer.from(value, "base64url").toString("utf8");
}

function getEducationProgramLaunchSecret(): string | null {
  return (
    process.env.EDUCATION_PROGRAM_LAUNCH_SECRET?.trim() ||
    process.env.STUDENT_SESSION_SECRET?.trim() ||
    process.env.ADMIN_PASSWORD?.trim() ||
    null
  );
}

function signPayload(encodedPayload: string, secret: string): string {
  return createHmac("sha256", secret).update(encodedPayload).digest("base64url");
}

export function createEducationProgramLaunchToken(
  context: Pick<EducationProgramLaunchContext, "taskId" | "studentId" | "exerciseSlug">,
): string | null {
  const secret = getEducationProgramLaunchSecret();
  if (
    !secret ||
    !context.taskId.trim() ||
    !context.studentId.trim() ||
    !context.exerciseSlug.trim()
  ) {
    return null;
  }

  const encodedPayload = toBase64Url(
    JSON.stringify({
      taskId: context.taskId,
      studentId: context.studentId,
      exerciseSlug: context.exerciseSlug,
      issuedAt: Date.now(),
    } satisfies EducationProgramLaunchContext),
  );
  const signature = signPayload(encodedPayload, secret);
  return `${encodedPayload}.${signature}`;
}

export function readEducationProgramLaunchToken(
  token: string,
): EducationProgramLaunchContext | null {
  const secret = getEducationProgramLaunchSecret();
  if (!secret || typeof token !== "string" || !token) {
    return null;
  }

  const [encodedPayload, providedSignature] = token.split(".");
  if (!encodedPayload || !providedSignature) {
    return null;
  }

  const expectedSignature = signPayload(encodedPayload, secret);
  const providedBuffer = Buffer.from(providedSignature);
  const expectedBuffer = Buffer.from(expectedSignature);

  if (
    providedBuffer.length !== expectedBuffer.length ||
    !timingSafeEqual(providedBuffer, expectedBuffer)
  ) {
    return null;
  }

  try {
    const parsed = JSON.parse(fromBase64Url(encodedPayload)) as Partial<EducationProgramLaunchContext>;
    if (
      typeof parsed.taskId !== "string" ||
      !parsed.taskId.trim() ||
      typeof parsed.studentId !== "string" ||
      !parsed.studentId.trim() ||
      typeof parsed.exerciseSlug !== "string" ||
      !parsed.exerciseSlug.trim() ||
      typeof parsed.issuedAt !== "number" ||
      !Number.isFinite(parsed.issuedAt) ||
      parsed.issuedAt > Date.now() ||
      Date.now() - parsed.issuedAt > EDUCATION_PROGRAM_LAUNCH_TOKEN_MAX_AGE_SECONDS * 1000
    ) {
      return null;
    }

    return {
      taskId: parsed.taskId.trim(),
      studentId: parsed.studentId.trim(),
      exerciseSlug: parsed.exerciseSlug.trim(),
      issuedAt: parsed.issuedAt,
    };
  } catch {
    return null;
  }
}
