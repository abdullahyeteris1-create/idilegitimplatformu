import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

async function read(relativePath) {
  return readFile(new URL(`../${relativePath}`, import.meta.url), "utf8");
}

const EXERCISES = [
  {
    name: "Aynı Olanı Yakala",
    slug: "ayni-olani-yakala",
    pagePath: "src/app/egzersizler/ayni-olani-yakala/page.tsx",
    clientImport: "CatchSameExerciseClient",
  },
  {
    name: "Benzer Kelimeler",
    slug: "benzer-kelimeler",
    pagePath: "src/app/egzersizler/benzer-kelimeler/page.tsx",
    clientImport: "SimilarWordsExerciseClient",
  },
  {
    name: "Kelime Bulma",
    slug: "kelime-bulma",
    pagePath: "src/app/egzersizler/kelime-bulma/page.tsx",
    clientImport: "WordFindingExerciseClient",
  },
  {
    name: "Göz Egzersizleri Kolonlar",
    slug: "goz-egzersizleri-kolonlar",
    pagePath: "src/app/egzersizler/goz-egzersizleri-kolonlar/page.tsx",
    clientImport: "ColumnEyeExerciseClient",
  },
];

for (const exercise of EXERCISES) {
  test(`${exercise.name}: dogru slug ile ortak helper'a delege eder`, async () => {
    const source = await read(exercise.pagePath);

    assert.match(source, new RegExp(`const EXERCISE_SLUG = "${exercise.slug}";`));
    assert.match(
      source,
      /import \{ resolveEducationProgramExerciseLaunch \} from "@\/lib\/education-programs\/exerciseLaunchValidation";/,
    );
    assert.match(
      source,
      /await resolveEducationProgramExerciseLaunch\(\s*params\[LAUNCH_QUERY_PARAM\],\s*EXERCISE_SLUG,?\s*\)/,
    );
  });

  test(`${exercise.name}: yalniz educationLaunch query parametresi okunur`, async () => {
    const source = await read(exercise.pagePath);

    assert.match(source, /searchParams: Promise<\{\s*\[LAUNCH_QUERY_PARAM\]\?: string;\s*\}>/);
    assert.match(source, /const LAUNCH_QUERY_PARAM = "educationLaunch";/);
  });

  test(`${exercise.name}: page.tsx kendi token/cookie/DB dogrulama mantigini kopyalamaz`, async () => {
    const source = await read(exercise.pagePath);

    assert.doesNotMatch(source, /await cookies\(\)/);
    assert.doesNotMatch(source, /verifyStudentAccessToken/);
    assert.doesNotMatch(source, /readEducationProgramLaunchToken/);
    assert.doesNotMatch(source, /getEducationProgramTaskLaunchContext/);
    assert.doesNotMatch(source, /getSupabaseServiceRoleClient/);
  });

  test(`${exercise.name}: client bilesenine educationProgramLaunch prop'u undefined fallback'iyle iletilir`, async () => {
    const source = await read(exercise.pagePath);

    assert.match(
      source,
      new RegExp(
        `<${exercise.clientImport} educationProgramLaunch=\\{educationProgramLaunch \\?\\? undefined\\} />`,
      ),
    );
  });

  test(`${exercise.name}: Assignment System V2'ye bagli degildir`, async () => {
    const source = await read(exercise.pagePath);

    assert.doesNotMatch(source, /@\/lib\/assignments\//);
    assert.doesNotMatch(source, /@\/components\/assignments\//);
  });
}
