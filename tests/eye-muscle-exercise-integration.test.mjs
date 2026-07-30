import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

async function read(relativePath) {
  return readFile(new URL(`../${relativePath}`, import.meta.url), "utf8");
}

test("Goz Kaslari (goz-kaslari) catalog kaydi title/slug/resultExerciseType uyumlu", async () => {
  const assignmentCatalog = await read("src/lib/assignments/exerciseCatalog.ts");
  const educationCatalog = await read("src/lib/education-programs/exerciseCatalog.ts");

  assert.match(assignmentCatalog, /slug: "goz-kaslari"/);
  assert.match(assignmentCatalog, /title: "Göz Kaslarını Geliştirme Çalışması"/);
  assert.match(assignmentCatalog, /resultExerciseType: "eye-muscle"/);

  assert.match(educationCatalog, /slug: "goz-kaslari"/);
  assert.match(educationCatalog, /title: "Göz Kaslarını Geliştirme Çalışması"/);
  assert.match(educationCatalog, /resultExerciseType: "eye-muscle"/);
});

test("Goz Kaslari route/kategori ve level ayarlari dogru", async () => {
  const assignmentCatalog = await read("src/lib/assignments/exerciseCatalog.ts");
  const routeCatalog = await read("src/lib/education-programs/exerciseRouteCatalog.ts");
  const educationCatalog = await read("src/lib/education-programs/exerciseCatalog.ts");
  const visuals = await read("src/lib/education-programs/studentProgramTaskVisuals.ts");

  assert.match(assignmentCatalog, /route: "\/egzersizler\/goz-kaslari"/);
  assert.match(routeCatalog, /"goz-kaslari": "\/egzersizler\/goz-kaslari"/);
  assert.match(assignmentCatalog, /category: "eye"/);

  assert.match(educationCatalog, /supportsLevel: true/);
  assert.match(educationCatalog, /levelMin: 1/);
  assert.match(educationCatalog, /levelMax: 5/);
  assert.match(educationCatalog, /defaultDurationSeconds: 300/);
  assert.match(visuals, /"goz-kaslari": \{ icon: "eye", tone: "purple" \}/);
});

test("Goz Kaslari migration whitelist ve eski migration guvenli", async () => {
  const oldMigration = await read(
    "supabase/migrations/20260729220000_add_cift_tarafli_odak_to_exercise_whitelist.sql",
  );
  const newMigration = await read(
    "supabase/migrations/20260729230000_add_goz_kaslari_to_exercise_whitelist.sql",
  );

  assert.doesNotMatch(oldMigration, /'goz-kaslari'/);
  assert.match(oldMigration, /Add cift-tarafli-odak to assign_education_program_template_v1 whitelist/);

  assert.match(newMigration, /create or replace function public\.assign_education_program_template_v1/);
  assert.match(newMigration, /security definer/);
  assert.match(newMigration, /set search_path = public, pg_temp/);
  assert.match(newMigration, /grant execute on function public\.assign_education_program_template_v1/);
  assert.match(newMigration, /'goz-kaslari'/);
  assert.match(newMigration, /'cift-tarafli-odak'/);
  assert.match(newMigration, /2026-07-29: added goz-kaslari/);
  assert.doesNotMatch(newMigration, /create table|alter table|policy|grant select/i);
});

test("Goz Kaslari component assignment/EP entegrasyonu kullaniliyor", async () => {
  const source = await read("src/app/egzersizler/goz-kaslari/EyeMuscleExerciseClient.tsx");
  const page = await read("src/app/egzersizler/goz-kaslari/page.tsx");

  assert.match(source, /import \{ useAssignmentTask \} from "@\/components\/assignments\/AssignmentTaskProvider"/);
  assert.match(source, /import \{ saveExerciseResultSecure, type SecureExerciseResultInput \} from "@\/lib\/results\/secureResultStorage"/);
  assert.match(source, /useEducationProgramTaskCompletion\(educationProgramTaskId, EXPECTED_RESULT_EXERCISE_TYPE\)/);
  assert.match(source, /const isAssignmentMode = !isEducationProgramMode && assignmentTask !== null;/);
  assert.match(source, /const educationProgramTaskId = isEducationProgramMode \? educationProgramLaunch\?\.taskId : undefined;/);
  assert.match(page, /educationProgramLaunch/);
});

test("Goz Kaslari assignment modunda level ve duration kilitleniyor", async () => {
  const source = await read("src/app/egzersizler/goz-kaslari/EyeMuscleExerciseClient.tsx");

  assert.match(source, /disabled=\{status === "running" \|\| status === "paused" \|\| isAssignmentMode \|\| isEducationProgramMode\}/);
  assert.match(source, /!isAssignmentMode && !isEducationProgramMode \? \(/);
  assert.match(source, /formatDuration\(resolvedDurationSeconds\)/);
  assert.match(source, /value=\{resolvedLevel\}/);
});

test("Goz Kaslari sonuc payload'i eye-muscle, level, duration ve assignment task bilgisi tasiyor", async () => {
  const source = await read("src/app/egzersizler/goz-kaslari/EyeMuscleExerciseClient.tsx");

  assert.match(source, /exerciseType:\s*(?:EXPECTED_RESULT_EXERCISE_TYPE|"eye-muscle")/);
  assert.match(source, /exerciseTitle:\s*"Göz Kaslarını Geliştirme Çalışması"/);
  assert.match(source, /correctCount:\s*flashes/);
  assert.match(source, /wrongCount:\s*0/);
  assert.match(source, /score:\s*flashes/);
  assert.match(source, /successRate:\s*flashes > 0 \? 100 : 0/);
  assert.match(source, /level:\s*resolvedLevel/);
  assert.match(source, /durationSeconds:\s*resolvedDurationSeconds/);
  assert.match(source, /totalFlashes:\s*flashes/);
  assert.match(source, /roundCount:\s*flashes/);
  assert.match(source, /assignmentTask:\s*assignmentTask\s*\?/);
});

test("Goz Kaslari timer ve completion dedup guard kullaniyor", async () => {
  const source = await read("src/app/egzersizler/goz-kaslari/EyeMuscleExerciseClient.tsx");

  assert.match(source, /const clockIntervalRef = useRef<number \| null>\(null\);/);
  assert.match(source, /const flashTimeoutRef = useRef<number \| null>\(null\);/);
  assert.match(source, /const hasFinalizedRef = useRef\(false\);/);
  assert.match(source, /const saveInFlightRef = useRef\(false\);/);
  assert.match(source, /const saveCompletedRef = useRef\(false\);/);
  assert.match(source, /if \(hasFinalizedRef\.current\) \{/);
  assert.match(source, /if \(saveInFlightRef\.current \|\| saveCompletedRef\.current\) \{/);
});

test("Goz Kaslari 14 desen kullaniyor ve arti deseni yok", async () => {
  const source = await read("src/app/egzersizler/goz-kaslari/EyeMuscleExerciseClient.tsx");
  const patterns = [...source.matchAll(/{ id: "([^"]+)", name:/g)];

  assert.equal(patterns.length, 14);
  assert.doesNotMatch(source, /id: "plus"/);
  assert.doesNotMatch(source, /name: "Artı"/);
  assert.match(source, /{ level: 1, patterns: \[PATTERNS\[0\], PATTERNS\[1\]\] }/);
  assert.match(source, /{ level: 5, patterns: \[PATTERNS\[10\], PATTERNS\[11\], PATTERNS\[12\], PATTERNS\[13\]\] }/);
});

test("Goz Kaslari tema dosyasi ve render siniflari mevcut", async () => {
  const themeCss = await read("src/components/exercises/eye-muscle-theme.module.css");
  const source = await read("src/app/egzersizler/goz-kaslari/EyeMuscleExerciseClient.tsx");

  assert.match(themeCss, /\.lightTheme/);
  assert.match(themeCss, /\.darkTheme/);
  assert.match(themeCss, /\.gridLine/);
  assert.match(themeCss, /\.infoPanel/);
  assert.match(themeCss, /\.introOverlay/);
  assert.match(themeCss, /\.startButton/);
  assert.match(themeCss, /\.stopButton/);
  assert.match(source, /showGrid/);
  assert.match(source, /toggleFullscreen/);
  assert.match(source, /soundEnabled/);
});
