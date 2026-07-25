// Egitim Programi gorev baslatma/tuketme akisinda ogrenciye gosterilebilecek
// GUVENLI hata kodlari - ham RPC/repository hata mesaji asla URL'e veya
// istemciye tasinmaz, yalniz bu sabit, allow-list'lenmis kodlardan biri
// tasinir. Yeni bir kod eklemek icin hem listeye hem mesaj tablosuna eklemek
// gerekir - tanimsiz bir kod hicbir mesaj uretmez (guvenli varsayilan).
export const EDUCATION_PROGRAM_LAUNCH_ERROR_CODES = [
  "invalid_launch",
  "expired_launch",
  "unauthorized_task",
  "task_not_in_progress",
  "exercise_mismatch",
  "program_not_active",
] as const;

export type EducationProgramLaunchErrorCode =
  (typeof EDUCATION_PROGRAM_LAUNCH_ERROR_CODES)[number];

const MESSAGE_BY_CODE: Record<EducationProgramLaunchErrorCode, string> = {
  invalid_launch:
    "Bu çalışma bağlantısı artık geçerli değil. Eğitim Programım sayfasından tekrar deneyiniz.",
  expired_launch:
    "Bu çalışma bağlantısının süresi doldu. Eğitim Programım sayfasından tekrar deneyiniz.",
  unauthorized_task:
    "Bu çalışma bağlantısı size ait değil. Eğitim Programım sayfasından tekrar deneyiniz.",
  task_not_in_progress:
    "Bu görev şu anda başlatılmamış görünüyor. Eğitim Programım sayfasından tekrar deneyiniz.",
  exercise_mismatch:
    "Bu bağlantı başka bir çalışma için üretilmiş. Eğitim Programım sayfasından tekrar deneyiniz.",
  program_not_active:
    "Programınız artık aktif değil. Lütfen öğretmeninizle iletişime geçiniz.",
};

export function isEducationProgramLaunchErrorCode(
  value: unknown,
): value is EducationProgramLaunchErrorCode {
  return (
    typeof value === "string" &&
    (EDUCATION_PROGRAM_LAUNCH_ERROR_CODES as readonly string[]).includes(value)
  );
}

export function getEducationProgramLaunchErrorMessage(
  code: unknown,
): string | null {
  return isEducationProgramLaunchErrorCode(code) ? MESSAGE_BY_CODE[code] : null;
}
