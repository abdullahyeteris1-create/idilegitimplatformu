// Çift Taraflı Odak egzersizinin süre/timer mantığının saf (React'tan bağımsız)
// kısmı. TwoSideFocusExerciseClient.tsx bu fonksiyonları kullanır; burada
// tutulmasının amacı gerçek davranış testleri yazılabilmesidir (DOM/React
// render ortamı olmadan doğrudan çağrılıp doğrulanabilirler).

export type TwoSideFocusDurationModeInput = {
  isEducationProgramMode: boolean;
  isAssignmentMode: boolean;
  educationProgramDurationSeconds?: number | null;
  assignmentDurationSeconds?: number | null;
};

const EXPECTED_RESULT_EXERCISE_TYPE = "two-side-focus";
const EXERCISE_TITLE = "Çift Taraflı Odak";

/**
 * Serbest kullanımda (ikisi de false) süre kavramı yoktur - 1 döner ama bu
 * değer hiçbir zaman UI'da gösterilmez/kullanılmaz (bkz. isTwoSideFocusTimedMode).
 * Education Program modunda sunucudan gelen durationSeconds, Assignment
 * modunda öğretmenin sablonda belirlediği durationSeconds esas alınır -
 * öğrenci tarafından değiştirilemez.
 */
export function resolveTwoSideFocusDurationSeconds(input: TwoSideFocusDurationModeInput): number {
  const raw = input.isAssignmentMode
    ? input.assignmentDurationSeconds
    : input.isEducationProgramMode
      ? input.educationProgramDurationSeconds
      : 0;

  return Math.max(1, Math.round(raw ?? 0));
}

/** Sayaç/geri sayım yalnız Education Program veya Assignment modunda etkindir. */
export function isTwoSideFocusTimedMode(isEducationProgramMode: boolean, isAssignmentMode: boolean): boolean {
  return isEducationProgramMode || isAssignmentMode;
}

/** Geri sayımda gösterilecek kalan saniye - asla negatif olmaz. */
export function getTwoSideFocusRemainingSeconds(totalDurationSeconds: number, elapsedSeconds: number): number {
  return Math.max(0, totalDurationSeconds - elapsedSeconds);
}

export type TwoSideFocusResultPayload = {
  exerciseType: string;
  exerciseTitle: string;
  durationSeconds: number;
  correctCount: number;
  wrongCount: number;
  score: number;
  successRate: number;
};

/** Doğal süre bitişinde (tek seferlik) sunucuya gönderilecek sonuç payload'ı. */
export function buildTwoSideFocusResultPayload(params: {
  durationSeconds: number;
  correctCount: number;
  wrongCount: number;
}): TwoSideFocusResultPayload {
  const { durationSeconds, correctCount, wrongCount } = params;
  const answeredCount = correctCount + wrongCount;
  const successRate = answeredCount > 0 ? Math.round((correctCount / answeredCount) * 100) : 0;
  const netCount = correctCount - wrongCount;

  return {
    exerciseType: EXPECTED_RESULT_EXERCISE_TYPE,
    exerciseTitle: EXERCISE_TITLE,
    durationSeconds,
    correctCount,
    wrongCount,
    score: Math.max(0, netCount),
    successRate,
  };
}
