import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

async function read(relativePath) {
  return readFile(new URL(`../${relativePath}`, import.meta.url), "utf8");
}

const EXERCISES = [
  {
    name: "Anlama Testi",
    slug: "anlama-testi",
    pagePath: "src/app/egzersizler/anlama-testi/page.tsx",
    clientImport: "ReadingComprehensionTestClient",
  },
  {
    name: "Okuma Hızı Testi",
    slug: "okuma-hizi-testi",
    pagePath: "src/app/egzersizler/okuma-hizi-testi/page.tsx",
    clientImport: "ReadingSpeedTestClient",
  },
];

for (const exercise of EXERCISES) {
  // 9) page ortak launch helper kullanir / 10) dogru slug
  test(`${exercise.name}: dogru slug ile ortak launch helper'a delege eder`, async () => {
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
    assert.match(source, /searchParams: Promise<\{\s*\[LAUNCH_QUERY_PARAM\]\?: string;\s*\}>/);
    assert.match(source, /const LAUNCH_QUERY_PARAM = "educationLaunch";/);
  });

  // 11) launch prop aktarilir
  test(`${exercise.name}: client bilesenine educationProgramLaunch prop'u undefined fallback'iyle iletilir`, async () => {
    const source = await read(exercise.pagePath);

    assert.match(
      source,
      new RegExp(
        `<${exercise.clientImport} educationProgramLaunch=\\{educationProgramLaunch \\?\\? undefined\\} />`,
      ),
    );
  });

  test(`${exercise.name}: page.tsx kendi token/cookie/DB dogrulama mantigini kopyalamaz, Assignment V2'ye bagli degildir`, async () => {
    const source = await read(exercise.pagePath);

    assert.doesNotMatch(source, /await cookies\(\)/);
    assert.doesNotMatch(source, /verifyStudentAccessToken/);
    assert.doesNotMatch(source, /getEducationProgramTaskLaunchContext/);
    assert.doesNotMatch(source, /getSupabaseServiceRoleClient/);
    assert.doesNotMatch(source, /@\/lib\/assignments\//);
    assert.doesNotMatch(source, /@\/components\/assignments\//);
  });
}
