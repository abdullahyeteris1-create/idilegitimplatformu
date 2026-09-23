export const LISTEN_THEN_READ_SPEECH_RATE_MODES = ["slow", "normal"] as const;
export type ListenThenReadSpeechRateMode = (typeof LISTEN_THEN_READ_SPEECH_RATE_MODES)[number];

export const LISTEN_THEN_READ_SPEECH_RATES: Record<ListenThenReadSpeechRateMode, number> = {
  slow: 0.82,
  normal: 1,
};

export type ListenThenReadVoiceStatus = "unsupported" | "loading" | "turkish" | "default";

export function canUseSpeechSynthesis(): boolean {
  return typeof window !== "undefined"
    && "speechSynthesis" in window
    && typeof SpeechSynthesisUtterance !== "undefined";
}

export function isTurkishSpeechVoice(voice: Pick<SpeechSynthesisVoice, "lang">): boolean {
  const language = voice.lang.trim().toLowerCase();
  return language === "tr" || language.startsWith("tr-");
}

export function chooseTurkishSpeechVoice(
  voices: readonly Pick<SpeechSynthesisVoice, "lang">[],
): Pick<SpeechSynthesisVoice, "lang"> | null {
  return voices.find(isTurkishSpeechVoice) ?? null;
}

export function getListenThenReadVoiceStatus(
  supported: boolean,
  voices: readonly Pick<SpeechSynthesisVoice, "lang">[],
): ListenThenReadVoiceStatus {
  if (!supported) return "unsupported";
  if (voices.length === 0) return "loading";
  return chooseTurkishSpeechVoice(voices) ? "turkish" : "default";
}
