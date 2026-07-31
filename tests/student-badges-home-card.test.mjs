import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const homeCardSource = await readFile(
  "src/components/student-panel-preview/StudentPanelPreview.tsx",
  "utf8",
);
const badgesPageSource = await readFile(
  "src/app/ogrenci/rozetlerim/page.tsx",
  "utf8",
);

test("ana sayfa Rozetlerim kartı yalnızca ilk 3 rozeti gösterir", () => {
  assert.match(homeCardSource, /const badgeStates = getStudentXpBadges\(xpSnapshot\)/);
  assert.match(homeCardSource, /const earnedCount = badgeStates\.filter\(\(badge\) => badge\.isEarned\)\.length/);
  assert.match(homeCardSource, /const totalCount = badgeStates\.length/);
  assert.match(homeCardSource, /const visibleBadges = badgeStates\.slice\(0, 3\)/);
  assert.match(homeCardSource, /visibleBadges\.map\(\(badge\)/);
  assert.match(homeCardSource, /Link href="\/ogrenci\/rozetlerim"/);
});

test("Rozetlerim sayfası tam badge listesini korur", () => {
  assert.match(badgesPageSource, /badges\.map\(\(badge\)/);
  assert.doesNotMatch(badgesPageSource, /badges\.slice\(0, 3\)/);
});
