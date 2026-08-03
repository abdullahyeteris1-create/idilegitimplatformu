export type WordRaceCarId = "spor" | "viper" | "taksi" | "polis" | "minivan";

export type WordRaceCompletionReason =
  | "wrong_limit"
  | "all_levels_completed"
  | "user_exit";

export type WordRaceSnapshot = {
  phase: "menu" | "playing" | "paused" | "transition" | "ended";
  score: number;
  correct: number;
  wrong: number;
  level: number;
  lanes: number;
  speedMs: number;
  levelProgress: number;
  maxLevelProgress: number;
};

export type WordRaceResult = {
  score: number;
  correct: number;
  wrong: number;
  successRate: number;
  reachedLevel: number;
  reachedSpeedMs: number;
  startingLevel: number;
  startingSpeedMs: number;
  durationSeconds: number;
  completionReason: WordRaceCompletionReason;
  carId: WordRaceCarId;
  completedSpeedTiers: number;
};

export type WordRaceStartOptions = {
  level: number;
  speedMs: number;
  carId: WordRaceCarId;
};

export type WordRaceEngineCallbacks = {
  onSnapshot: (snapshot: WordRaceSnapshot) => void;
  onBanner: (title: string, message: string) => void;
  onSpeedTransition: (currentSpeedMs: number, nextSpeedMs: number) => void;
  onFinish: (result: WordRaceResult) => void;
};
