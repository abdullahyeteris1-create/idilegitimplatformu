/**
 * iframe icindeki prototip ile egzersiz sayfasi arasindaki postMessage
 * sozlesmesi. Bu dosya bilincli olarak bagimliliksizdir: hem sunucu tarafinda
 * HTML'e kanca enjekte eden `wordRaceAsset.ts` hem de client bileseni ayni
 * sabitleri buradan alir (client bundle'a `node:fs` sizmasin diye).
 */
export const WORD_RACE_BRIDGE_MESSAGE_SOURCE = "idil-word-race";

/** Platform -> iframe yonu (liderlik tablosu verisi). */
export const WORD_RACE_HOST_MESSAGE_SOURCE = "idil-word-race-host";

export type WordRaceLeaderboardEntryView = {
  rank: number;
  displayName: string;
  score: number;
  isCurrentStudent: boolean;
};

export const WORD_RACE_RESULT_EXERCISE_TYPE = "word-race";

export const WORD_RACE_EXERCISE_SLUG = "kelime-yarisi";

export const WORD_RACE_EXERCISE_TITLE = "Kelime Yarışı";

export type WordRaceFinishedPayload = {
  score: number;
  correctCount: number;
  wrongCount: number;
  durationSeconds: number;
  reachedLevel: number;
  lanes: number;
  reachedSpeedMs: number;
  carId: string;
  completionReason: string;
  maxWrong: number;
};
