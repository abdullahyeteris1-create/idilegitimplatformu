import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import test from "node:test";

const root = resolve(process.cwd());

function read(relativePath) {
  return readFileSync(resolve(root, relativePath), "utf8");
}

test("reward notification provider is mounted in the app shell", () => {
  const source = read("src/app/layout.tsx");
  assert.match(source, /<RewardNotificationProvider>\{children\}<\/RewardNotificationProvider>/);
});

test("xp notification components are wired through a shared provider", () => {
  const providerSource = read("src/components/xp-notifications/RewardNotificationProvider.tsx");
  assert.match(providerSource, /XpRewardToast/);
  assert.match(providerSource, /LevelUpBanner/);
  assert.match(providerSource, /BadgeUnlockedToast/);
  assert.match(providerSource, /useXpRewardNotifications/);
});

test("xp notification runtime uses the existing reward helper", () => {
  const runtimeSource = read("src/components/xp-notifications/xpRewardNotifications.ts");
  assert.match(runtimeSource, /export type XpRewardEventType =/);
  assert.match(runtimeSource, /"exercise_completed"/);
  assert.match(runtimeSource, /"education_program_task_completed"/);
  assert.match(runtimeSource, /"reading_comprehension_completed"/);
  assert.match(runtimeSource, /"reading_speed_test_completed"/);
  assert.match(runtimeSource, /export function emitXpRewardNotification\(/);
});

test("student panel level card only shows a real last reward strip", () => {
  const source = read("src/components/student-panel-preview/StudentPanelPreview.tsx");
  const cssSource = read("src/components/student-panel-preview/student-panel-preview.module.css");

  assert.match(source, /useXpRewardNotifications/);
  assert.match(source, /lastReward/);
  assert.match(source, /rewardStrip/);
  assert.match(cssSource, /\.rewardStrip\{/);
  assert.doesNotMatch(source, /Yeni bir hedefe hazırsın/);
  assert.doesNotMatch(source, /Bir ödül kazandığında burada görünecek/);
});

test("exercise and program completions emit reward notifications without changing xp math", () => {
  const resultStorageSource = read("src/lib/results/secureResultStorage.ts");
  const programClientSource = read("src/lib/education-programs/completeEducationProgramTaskClient.ts");
  const resultRouteSource = read("src/app/api/student/results/route.ts");
  const programRouteSource = read("src/app/api/student/education-program-tasks/[taskId]/complete/route.ts");

  assert.match(resultStorageSource, /emitXpRewardNotification\(/);
  assert.match(programClientSource, /emitXpRewardNotification\(/);
  assert.match(resultRouteSource, /reward:\s*\{/);
  assert.match(programRouteSource, /reward:\s*\{/);
});
