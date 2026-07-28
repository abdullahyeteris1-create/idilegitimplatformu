"use client";

import {
  createContext,
  createElement,
  type Dispatch,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type MutableRefObject,
  type ReactNode,
  type SetStateAction,
} from "react";
import { getStudentXpBadges, type StudentXpBadgeId } from "@/lib/xp/xpBadges";
import { getStudentXpSnapshot, type StudentXpSnapshot } from "@/lib/xp/xpLevels";

export type XpRewardEventType =
  | "login_first_of_day"
  | "exercise_completed"
  | "education_program_task_completed"
  | "reading_comprehension_completed"
  | "reading_speed_test_completed";

export type XpRewardTrigger = {
  eventType: XpRewardEventType;
  awardedXp: number;
  currentTotalXp: number;
  replayed?: boolean;
  rewardKey?: string;
  sourceLabel?: string;
  badgeLinkHref?: string;
};

export type XpRewardNotification = {
  id: string;
  rewardKey: string;
  eventType: XpRewardEventType;
  sourceLabel: string;
  awardedXp: number;
  currentTotalXp: number;
  previousTotalXp: number;
  previousLevel: number;
  currentLevel: number;
  previousSnapshot: StudentXpSnapshot;
  currentSnapshot: StudentXpSnapshot;
  leveledUp: boolean;
  levelGainCount: number;
  newlyEarnedBadgeIds: StudentXpBadgeId[];
  replayed: boolean;
  badgeLinkHref: string;
};

type XpRewardContextValue = {
  lastReward: XpRewardNotification | null;
  activeRewards: XpRewardNotification[];
  dispatchReward: (reward: XpRewardTrigger) => void;
};

type XpRewardDispatcher = (reward: XpRewardTrigger) => void;

const XpRewardContext = createContext<XpRewardContextValue | null>(null);
let rewardDispatcher: XpRewardDispatcher | null = null;

function buildRewardKey(reward: XpRewardTrigger): string {
  return reward.rewardKey ?? `${reward.eventType}:${reward.currentTotalXp}:${reward.awardedXp}:${reward.sourceLabel ?? ""}`;
}

function buildSourceLabel(reward: XpRewardTrigger): string {
  if (reward.sourceLabel?.trim()) {
    return reward.sourceLabel.trim();
  }

  switch (reward.eventType) {
    case "exercise_completed":
      return "Egzersiz tamamlandı";
    case "education_program_task_completed":
      return "Görev tamamlandı";
    case "reading_comprehension_completed":
      return "Anlama testi tamamlandı";
    case "reading_speed_test_completed":
      return "Okuma hızı testi tamamlandı";
    case "login_first_of_day":
      return "Günlük giriş ödülü";
    default:
      return "Harika!";
  }
}

function buildNotification(trigger: XpRewardTrigger): XpRewardNotification | null {
  const awardedXp = Math.max(0, Math.floor(trigger.awardedXp));
  const currentTotalXp = Math.max(0, Math.floor(trigger.currentTotalXp));
  if (awardedXp <= 0 || trigger.replayed || !Number.isFinite(currentTotalXp)) {
    return null;
  }

  const previousTotalXp = Math.max(0, currentTotalXp - awardedXp);
  const previousSnapshot = getStudentXpSnapshot(previousTotalXp);
  const currentSnapshot = getStudentXpSnapshot(currentTotalXp);
  const previousBadges = getStudentXpBadges(previousSnapshot);
  const currentBadges = getStudentXpBadges(currentSnapshot);
  const previousBadgeIds = new Set(previousBadges.filter((badge) => badge.isEarned).map((badge) => badge.id));
  const newlyEarnedBadgeIds = currentBadges
    .filter((badge) => badge.isEarned && !previousBadgeIds.has(badge.id))
    .map((badge) => badge.id);

  return {
    id: `${buildRewardKey(trigger)}:${currentTotalXp}`,
    rewardKey: buildRewardKey(trigger),
    eventType: trigger.eventType,
    sourceLabel: buildSourceLabel(trigger),
    awardedXp,
    currentTotalXp,
    previousTotalXp,
    previousLevel: previousSnapshot.level,
    currentLevel: currentSnapshot.level,
    previousSnapshot,
    currentSnapshot,
    leveledUp: currentSnapshot.level > previousSnapshot.level,
    levelGainCount: Math.max(0, currentSnapshot.level - previousSnapshot.level),
    newlyEarnedBadgeIds,
    replayed: Boolean(trigger.replayed),
    badgeLinkHref: trigger.badgeLinkHref?.trim() || "/ogrenci/rozetlerim",
  };
}

function enqueueReward(
  reward: XpRewardTrigger,
  setLastReward: (reward: XpRewardNotification) => void,
  setActiveRewards: Dispatch<SetStateAction<XpRewardNotification[]>>,
  seenRewardKeys: MutableRefObject<Set<string>>,
) {
  const notification = buildNotification(reward);
  if (!notification || seenRewardKeys.current.has(notification.rewardKey)) {
    return;
  }

  seenRewardKeys.current.add(notification.rewardKey);
  setLastReward(notification);
  setActiveRewards((current) => [...current, notification]);
}

export function emitXpRewardNotification(reward: XpRewardTrigger): void {
  rewardDispatcher?.(reward);
}

export function XpRewardProvider({ children }: { children: ReactNode }) {
  const [activeRewards, setActiveRewards] = useState<XpRewardNotification[]>([]);
  const [lastReward, setLastReward] = useState<XpRewardNotification | null>(null);
  const seenRewardKeys = useRef(new Set<string>());

  useEffect(() => {
    rewardDispatcher = (reward: XpRewardTrigger) => {
      enqueueReward(reward, setLastReward, setActiveRewards, seenRewardKeys);
    };

    return () => {
      if (rewardDispatcher) {
        rewardDispatcher = null;
      }
    };
  }, []);

  useEffect(() => {
    if (activeRewards.length === 0) {
      return undefined;
    }

    const timers = activeRewards.map((reward) => {
      const duration = reward.leveledUp ? 4_500 : reward.newlyEarnedBadgeIds.length > 0 ? 3_800 : 3_000;

      return window.setTimeout(() => {
        setActiveRewards((current) => current.filter((item) => item.id !== reward.id));
      }, duration);
    });

    return () => {
      for (const timer of timers) {
        window.clearTimeout(timer);
      }
    };
  }, [activeRewards]);

  const value = useMemo<XpRewardContextValue>(
    () => ({
      lastReward,
      activeRewards,
      dispatchReward: emitXpRewardNotification,
    }),
    [activeRewards, lastReward],
  );

  return createElement(XpRewardContext.Provider, { value }, children);
}

export function useXpRewardNotifications() {
  const context = useContext(XpRewardContext);
  if (!context) {
    throw new Error("useXpRewardNotifications must be used within XpRewardProvider");
  }

  return context;
}
