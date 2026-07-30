export const TURKISH_ALPHABET = [
  "A", "B", "C", "Ç", "D", "E", "F", "G", "Ğ", "H",
  "I", "İ", "J", "K", "L", "M", "N", "O", "Ö", "P",
  "R", "S", "Ş", "T", "U", "Ü", "V", "Y", "Z",
] as const;

export function normalizeTurkishText(value: string): string {
  return value.trim().toLocaleUpperCase("tr-TR").normalize("NFC");
}

export function isValidTurkishWord(value: string): boolean {
  return /^[ABCÇDEFGĞHIİJKLMNOÖPRSŞTUÜVYZ]+$/u.test(value)
    && value === normalizeTurkishText(value)
    && !value.includes(" ");
}
