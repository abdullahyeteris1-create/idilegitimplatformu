"use client";

import type { ReactNode } from "react";
import { BadgeUnlockedToast } from "./BadgeUnlockedToast";
import { LevelUpBanner } from "./LevelUpBanner";
import styles from "./xp-notifications.module.css";
import {
  XP_BADGE_DEFINITIONS,
  type StudentXpBadgeId,
} from "@/lib/xp/xpBadges";
import {
  XpRewardProvider,
  useXpRewardNotifications,
  type XpRewardNotification,
} from "./xpRewardNotifications";
import { XpRewardToast } from "./XpRewardToast";

export function RewardNotificationProvider({ children }: { children: ReactNode }) {
  return (
    <XpRewardProvider>
      {children}
      <RewardNotificationViewport />
    </XpRewardProvider>
  );
}

function getRewardTitle(notification: XpRewardNotification): string {
  if (notification.sourceLabel.trim()) {
    return notification.sourceLabel;
  }

  switch (notification.eventType) {
    case "exercise_completed":
      return "Egzersiz tamamlandı";
    case "education_program_task_completed":
      return "Görev tamamlandı";
    case "reading_comprehension_completed":
      return "Anlama testi tamamlandı";
    case "reading_speed_test_completed":
      return "Okuma hızı testi tamamlandı";
    default:
      return "Harika!";
  }
}

function getBadgeTitles(badgeIds: StudentXpBadgeId[]): string[] {
  return badgeIds
    .map((badgeId) => XP_BADGE_DEFINITIONS.find((badge) => badge.id === badgeId)?.title)
    .filter((title): title is string => Boolean(title));
}

function RewardNotificationViewport() {
  const { activeRewards, lastReward } = useXpRewardNotifications();

  if (activeRewards.length === 0) {
    return null;
  }

  return (
    <div className={styles.viewport} aria-label="Ödül bildirimleri">
      {activeRewards.map((reward) => {
        const badgeTitles = getBadgeTitles(reward.newlyEarnedBadgeIds);

        return (
          <div key={reward.id} className={styles.notificationGroup}>
            <XpRewardToast
              title={getRewardTitle(reward)}
              awardedXp={reward.awardedXp}
              subtitle={reward.sourceLabel}
              totalXpLabel={`Toplam XP: ${reward.currentTotalXp.toLocaleString("tr-TR")}`}
            />
            {reward.leveledUp ? (
              <LevelUpBanner
                currentLevel={reward.currentLevel}
                currentTitle={reward.currentSnapshot.title}
                previousLevel={reward.previousLevel}
              />
            ) : null}
            {badgeTitles.length > 0 ? (
              <BadgeUnlockedToast badgeNames={badgeTitles} badgeLinkHref={reward.badgeLinkHref} />
            ) : null}
          </div>
        );
      })}
      {lastReward ? <span className={styles.srOnly}>Son ödül: {lastReward.sourceLabel}</span> : null}
    </div>
  );
}
