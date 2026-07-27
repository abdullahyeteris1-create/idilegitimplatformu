// Egitim Programi coklu-metin sure modeli icin saf (side-effect'siz) yardimci
// fonksiyonlar. Blok Okuma'nin blockReading.ts ve Golgeleme'nin
// shadowReading.ts icindeki esdeger fonksiyonlarindan BILEREK bagimsiz
// tutulur (bu turda ortak/genel bir helper'a cikarilmadi - her egzersizin
// davranisi once ayri ayri kanitlansin).
export function calculateGroupingReadingTotalActiveSeconds(
  cumulativeActiveSeconds: number,
  currentTextActiveSeconds: number,
): number {
  return Math.max(0, cumulativeActiveSeconds) + Math.max(0, currentTextActiveSeconds);
}

export function calculateGroupingReadingRemainingActiveSeconds(
  assignedDurationSeconds: number,
  cumulativeActiveSeconds: number,
  currentTextActiveSeconds: number,
): number {
  if (!Number.isFinite(assignedDurationSeconds)) {
    return Number.POSITIVE_INFINITY;
  }

  const totalActiveSeconds = calculateGroupingReadingTotalActiveSeconds(
    cumulativeActiveSeconds,
    currentTextActiveSeconds,
  );
  return Math.max(assignedDurationSeconds - totalActiveSeconds, 0);
}

export function hasGroupingReadingReachedAssignedDuration(
  assignedDurationSeconds: number,
  cumulativeActiveSeconds: number,
  currentTextActiveSeconds: number,
): boolean {
  if (!Number.isFinite(assignedDurationSeconds)) {
    return false;
  }

  return (
    calculateGroupingReadingTotalActiveSeconds(cumulativeActiveSeconds, currentTextActiveSeconds) >=
    assignedDurationSeconds
  );
}
