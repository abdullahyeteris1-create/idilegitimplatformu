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
  assert.match(homeCardSource, /TodaysProgramTasksCard/);
  assert.match(homeCardSource, /const recentResults = useMemo\(\(\) => resultsState\.results\.slice\(0, 3\)/);
  assert.doesNotMatch(homeCardSource, /getStudentXpBadges|const badgeStates/);
});

test("Rozetlerim sayfası tam badge listesini korur", () => {
  assert.match(badgesPageSource, /badges\.map\(\(badge\)/);
  assert.doesNotMatch(badgesPageSource, /badges\.slice\(0, 3\)/);
});
