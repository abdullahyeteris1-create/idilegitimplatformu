export const HECELE_SPEECH_RATES = {
  verySlow: 0.76,
  slow: 0.86,
  wordByWord: 0.92,
} as const;

export type HeceleVoiceStatus = "unsupported" | "loading" | "turkish" | "default";

export function canUseHeceleSpeech(): boolean {
  return typeof window !== "undefined"
    && "speechSynthesis" in window
    && typeof SpeechSynthesisUtterance !== "undefined";
}

export function isTurkishSpeechVoice(voice: Pick<SpeechSynthesisVoice, "lang">): boolean {
  const language = voice.lang.trim().toLocaleLowerCase("tr-TR");
  return language === "tr" || language.startsWith("tr-");
}

export function chooseHeceleTurkishVoice(
  voices: readonly Pick<SpeechSynthesisVoice, "lang">[],
): Pick<SpeechSynthesisVoice, "lang"> | null {
  return voices.find(isTurkishSpeechVoice) ?? null;
}

export function getHeceleVoiceStatus(
  supported: boolean,
  voices: readonly Pick<SpeechSynthesisVoice, "lang">[],
): HeceleVoiceStatus {
  if (!supported) return "unsupported";
  if (voices.length === 0) return "loading";
  return chooseHeceleTurkishVoice(voices) ? "turkish" : "default";
}

/**
 * Isolated Turkish syllable speech is intentionally not used in V1. Some
 * browser voices pronounce a standalone syllable unnaturally. The visual
 * tracker still steps through syllables, followed by a reliable whole-word
 * or whole-sentence utterance.
 */
export const ISOLATED_SYLLABLE_TTS_STRATEGY = "visual-syllables-whole-word-fallback" as const;
export const ISOLATED_SYLLABLE_TTS_RELIABILITY = "limited" as const;
