export type StudentProfilePasswordValidationResult =
  | { ok: true; value: string }
  | { ok: false; message: string };

export function validateStudentProfilePassword(
  password: unknown,
): StudentProfilePasswordValidationResult {
  if (typeof password !== "string" || password.length === 0) {
    return { ok: false, message: "Geçerli bir parola girin." };
  }

  if (Array.from(password).length > 128) {
    return { ok: false, message: "Parola en fazla 128 karakter olabilir." };
  }

  if (password !== password.trim()) {
    return { ok: false, message: "Parola başında veya sonunda boşluk içeremez." };
  }

  return { ok: true, value: password };
}
