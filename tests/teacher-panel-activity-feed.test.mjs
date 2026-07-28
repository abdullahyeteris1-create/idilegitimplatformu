import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const REPOSITORY = new URL("../src/lib/teachers/studentTrackingRepository.ts", import.meta.url);
const ACTIVITY_HELPER = new URL("../src/lib/teachers/studentTrackingActivity.ts", import.meta.url);
const DETAIL_TYPES = new URL("../src/lib/teachers/studentTrackingTypes.ts", import.meta.url);
const DETAIL_CLIENT = new URL("../src/components/teacher-panel/TeacherStudentDetailClient.tsx", import.meta.url);

async function read(path) {
  return readFile(path, "utf8");
}

test("activity helper builds a single bounded feed with dedupe and sort logic", async () => {
  const source = await read(ACTIVITY_HELPER);

  assert.match(source, /export function buildTeacherStudentActivityFeed\(/);
  assert.match(source, /const dedupeKey = submissionKey \? `result:\$\{submissionKey\}` : `result:\$\{result\.id\}`/);
  assert.match(source, /const dedupeKey = `program-task:\$\{task\.taskId\}`/);
  assert.match(source, /const dedupeKey = `login:\$\{studentId\}:\$\{dateKey\}`/);
  assert.match(source, /function dedupeActivities\(/);
  assert.match(source, /new Map<string, TeacherStudentActivity>\(\)/);
  assert.match(source, /sort\(compareActivities\)/);
  assert.match(source, /slice\(0, limit\)/);
  assert.doesNotMatch(source, /Promise\.all\(\[/);
});

test("repository wires activity feed without changing the public list api", async () => {
  const source = await read(REPOSITORY);

  assert.match(source, /buildTeacherStudentActivityFeed\(/);
  assert.match(source, /student_xp_events/);
  assert.match(source, /submission_key/);
  assert.match(source, /activityFeed: activityFeedResult\.activities/);
  assert.match(source, /activityFeedError: activityFeedResult\.error/);
  assert.match(source, /limit\(25\)/);
});

test("detail dto includes additive activity fields", async () => {
  const source = await read(DETAIL_TYPES);

  assert.match(source, /export type TeacherStudentActivityType/);
  assert.match(source, /export type TeacherStudentActivity =/);
  assert.match(source, /activityFeed: TeacherStudentActivity\[\];/);
  assert.match(source, /activityFeedError: string \| null;/);
});

test("detail client renders a responsive activity feed with empty and error states", async () => {
  const source = await read(DETAIL_CLIENT);

  assert.match(source, /Son Aktiviteler/);
  assert.match(source, /Henüz çalışma bulunmuyor\./);
  assert.match(source, /detail\.activityFeedError/);
  assert.match(source, /detail\.activityFeed\.length === 0/);
  assert.match(source, /ActivityCard/);
  assert.match(source, /md:hidden/);
  assert.match(source, /hidden md:block/);
  assert.match(source, /aria-hidden="true"/);
});
