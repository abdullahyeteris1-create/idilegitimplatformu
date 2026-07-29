import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

async function read(relativePath) {
  return readFile(new URL(`../${relativePath}`, import.meta.url), "utf8");
}

const EXERCISES = [
  {
    name: "Aynı Olanı Yakala",
    clientPath: "src/app/egzersizler/ayni-olani-yakala/CatchSameExerciseClient.tsx",
    functionName: "CatchSameExerciseClient",
    durationHookStyle: "assignmentTaskDirect",
  },
  {
    name: "Benzer Kelimeler",
    clientPath: "src/app/egzersizler/benzer-kelimeler/SimilarWordsExerciseClient.tsx",
    functionName: "SimilarWordsExerciseClient",
    durationHookStyle: "assignmentTaskDirect",
  },
  {
    name: "Kelime Bulma",
    clientPath: "src/app/egzersizler/kelime-bulma/WordFindingExerciseClient.tsx",
    functionName: "WordFindingExerciseClient",
    durationHookStyle: "assignedDurationHook",
  },
  {
    name: "Göz Egzersizleri Kolonlar",
    clientPath: "src/app/egzersizler/goz-egzersizleri-kolonlar/ColumnEyeExerciseClient.tsx",
    functionName: "ColumnEyeExerciseClient",
    durationHookStyle: "assignedDurationHook",
  },
];

for (const exercise of EXERCISES) {
  test(`${exercise.name}: educationProgramLaunch prop'u opsiyonel ve tipli olarak tanimlanir`, async () => {
    const source = await read(exercise.clientPath);

    assert.match(
      source,
      /import type \{ EducationProgramExerciseLaunchProps \} from "@\/lib\/education-programs\/exerciseLaunchProps"/,
    );
    if (exercise.functionName === "SimilarWordsExerciseClient") {
      assert.match(
        source,
        /import type \{ SimilarWordPools, SimilarWordTemplate \} from "@\/lib\/data\/similarWordPools"/,
      );
      assert.match(
        source,
        /export function SimilarWordsExerciseClient\(\{[\s\S]*?educationProgramLaunch,\s*[\s\S]*?similarWordPools,\s*[\s\S]*?\}: \{[\s\S]*?educationProgramLaunch\?: EducationProgramExerciseLaunchProps;[\s\S]*?similarWordPools: SimilarWordPools;[\s\S]*?\}\)/,
      );
      return;
    }

    if (exercise.functionName === "TachistoscopeExerciseClient") {
      assert.match(
        source,
        /import type \{ TachistoscopeWords \} from "@\/lib\/tachistoscope\/tachistoscopeShared"/,
      );
      assert.match(
        source,
        /export function TachistoscopeExerciseClient\(\{\s*educationProgramLaunch,\s*tachistoscopeWords,\s*\}: \{\s*educationProgramLaunch\?: EducationProgramExerciseLaunchProps;\s*tachistoscopeWords: TachistoscopeWords;\s*\}\)/,
      );
      return;
    }

    assert.match(
      source,
      new RegExp(
        `export function ${exercise.functionName}\\(\\{\\s*educationProgramLaunch,\\s*\\}: \\{\\s*educationProgramLaunch\\?: EducationProgramExerciseLaunchProps;\\s*\\} = \\{\\}\\)`,
      ),
    );
  });

  test(`${exercise.name}: durationSeconds snapshot degeri fallback zincirine baglanir`, async () => {
    const source = await read(exercise.clientPath);

    if (exercise.durationHookStyle === "assignedDurationHook") {
      assert.match(
        source,
        /useAssignedDurationSeconds\(\s*educationProgramLaunch\?\.durationSeconds \?\? durationM\w+ \* 60,?\s*\)/,
      );
    } else {
      assert.match(source, /educationProgramLaunch\?\.durationSeconds \?\? (selectedDuration|durationSeconds)/);
    }
  });

  test(`${exercise.name}: Egitim Programi modunda sure secici gizlenir`, async () => {
    const source = await read(exercise.clientPath);

    assert.match(source, /isEducationProgramMode/);
    assert.match(source, /isAssignmentMode \|\| isEducationProgramMode/);
  });

  test(`${exercise.name}: studentId/service-role/secret/token hicbir sekilde okunmaz`, async () => {
    const source = await read(exercise.clientPath);

    assert.doesNotMatch(source, /studentId/);
    assert.doesNotMatch(source, /SUPABASE_SERVICE_ROLE/);
    assert.doesNotMatch(source, /LAUNCH_SECRET/);
    assert.doesNotMatch(source, /signedToken|launchToken/i);
  });

  test(`${exercise.name}: URL/query parametresi dogrudan okunmaz (duration/level query'den gelmez)`, async () => {
    const source = await read(exercise.clientPath);

    assert.doesNotMatch(source, /window\.location\.search/);
    assert.doesNotMatch(source, /useSearchParams/);
  });

  test(`${exercise.name}: settings dogrudan spread edilmez, dereference edilmez`, async () => {
    const source = await read(exercise.clientPath);

    assert.doesNotMatch(source, /\.\.\.\s*educationProgramLaunch\.settings/);
    assert.doesNotMatch(source, /educationProgramLaunch\.settings\./);
    assert.doesNotMatch(source, /educationProgramLaunch\?\.settings\?\./);
  });
}

test("Aynı Olanı Yakala: Assignment System V2 baglamina hala izin veriliyor", async () => {
  const source = await read("src/app/egzersizler/ayni-olani-yakala/CatchSameExerciseClient.tsx");

  assert.match(source, /@\/components\/assignments\/AssignmentTaskProvider/);
  assert.doesNotMatch(source, /@\/lib\/assignments\//);
});

test("Benzer Kelimeler: Assignment System V2 baglamina hala izin veriliyor", async () => {
  const source = await read("src/app/egzersizler/benzer-kelimeler/SimilarWordsExerciseClient.tsx");

  assert.match(source, /@\/components\/assignments\/AssignmentTaskProvider/);
  assert.doesNotMatch(source, /@\/lib\/assignments\//);
});

test("Kelime Bulma: Assignment System V2 baglamina hala izin veriliyor", async () => {
  const source = await read("src/app/egzersizler/kelime-bulma/WordFindingExerciseClient.tsx");

  assert.match(source, /@\/components\/assignments\/AssignmentTaskProvider/);
  assert.doesNotMatch(source, /@\/lib\/assignments\//);
});

test("Göz Egzersizleri Kolonlar: Assignment System V2 baglamina hala izin veriliyor", async () => {
  const source = await read("src/app/egzersizler/goz-egzersizleri-kolonlar/ColumnEyeExerciseClient.tsx");

  assert.match(source, /@\/components\/assignments\/AssignmentTaskProvider/);
  assert.doesNotMatch(source, /@\/lib\/assignments\//);
});
