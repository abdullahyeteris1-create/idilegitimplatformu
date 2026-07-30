export type StudentPasswordValidationResult =
  | { ok: true; value: string }
  | { ok: false; message: string };

function normalizeComparisonValue(value: unknown): string {
  return typeof value === "string" ? value.trim().toLocaleLowerCase("tr-TR") : "";
}

export function validateStudentPassword(
  password: unknown,
  context: { username?: unknown; name?: unknown } = {},
): StudentPasswordValidationResult {
  if (typeof password !== "string") {
    return { ok: false, message: "Geçerli bir parola girin." };
  }

  const codePointLength = Array.from(password).length;
  if (codePointLength < 8 || codePointLength > 128) {
    return { ok: false, message: "Parola 8-128 karakter arasında olmalıdır." };
  }

  if (password !== password.trim()) {
    return { ok: false, message: "Parola başında veya sonunda boşluk içeremez." };
  }

  if (!/\p{L}/u.test(password) || !/\p{N}/u.test(password)) {
    return { ok: false, message: "Parola en az bir harf ve bir rakam içermelidir." };
  }

  const normalizedPassword = normalizeComparisonValue(password);
  if (
    normalizedPassword &&
    [context.username, context.name].some(
      (value) => normalizeComparisonValue(value) === normalizedPassword,
    )
  ) {
    return { ok: false, message: "Parola kullanıcı adı veya ad soyad ile aynı olamaz." };
  }

  return { ok: true, value: password };
}
