import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

async function read(relativePath) {
  return readFile(new URL(`../${relativePath}`, import.meta.url), "utf8");
}

test("Çift Taraflı Odak öğrenci route'u repository-backed ve force-dynamic çalışır", async () => {
  const pageSource = await read("src/app/egzersizler/cift-tarafli-odak/page.tsx");
  const clientSource = await read("src/app/egzersizler/cift-tarafli-odak/TwoSideFocusExerciseClient.tsx");

  assert.match(pageSource, /export const dynamic = "force-dynamic";/);
  assert.match(
    pageSource,
    /import \{ loadTwoSideFocusWordSets \} from "@\/lib\/two-side-focus\/twoSideFocusRepository";/,
  );
  assert.match(
    pageSource,
    /import \{ resolveEducationProgramExerciseLaunch \} from "@\/lib\/education-programs\/exerciseLaunchValidation";/,
  );
  assert.match(pageSource, /const \{ wordSets \} = await loadTwoSideFocusWordSets\(\);/);
  assert.match(pageSource, /const educationProgramLaunch = await resolveEducationProgramExerciseLaunch\(/);
  assert.match(pageSource, /educationProgramLaunch=\{educationProgramLaunch \?\? undefined\}/);
  assert.match(pageSource, /initialWordSets=\{wordSets\}/);
  assert.doesNotMatch(pageSource, /twoSideFocusStaticData/);

  assert.doesNotMatch(clientSource, /twoSideFocusRepository/);
  assert.doesNotMatch(clientSource, /twoSideFocusStaticData/);
  assert.doesNotMatch(clientSource, /getSupabaseServiceRoleClient/);
  assert.match(clientSource, /type TwoSideFocusStudentWordSet = \{/);
  assert.match(
    clientSource,
    /export function TwoSideFocusExerciseClient\(\{\s*educationProgramLaunch,\s*initialWordSets = \[\],/,
  );
  assert.match(
    clientSource,
    /educationProgramLaunch\?: EducationProgramExerciseLaunchProps;/,
  );
  assert.match(clientSource, /initialWordSets\?: TwoSideFocusStudentWordSet\[\];/);
  assert.match(
    clientSource,
    /function createRound\(\s*level: ExerciseLevel,\s*wordSets: readonly TwoSideFocusStudentWordSet\[\],\s*\): RoundData \{/,
  );
  assert.match(clientSource, /createRound\(initialLevel, wordSets\)/);
});
