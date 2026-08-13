import assert from "node:assert/strict";
import { readdir, readFile } from "node:fs/promises";
import { join } from "node:path";
import { test } from "node:test";

const CATALOG_PATH = "src/lib/education-programs/exerciseCatalog.ts";
const EXERCISES_ROOT = "src/app/egzersizler";

async function findClientFile(slug) {
  const entries = await readdir(join(EXERCISES_ROOT, slug), { withFileTypes: true });
  const client = entries.find((entry) => entry.isFile() && entry.name.endsWith("Client.tsx"));
  if (client) return join(EXERCISES_ROOT, slug, client.name);
  if (slug === "takistoskop") return "src/components/exercises/TachistoscopeExerciseClient.tsx";
  return null;
}

test("Education Program duration route coverage: ortak Chrome ve running state eksikleri yakalanır", async () => {
  const catalog = await readFile(CATALOG_PATH, "utf8");
  const routeSlugs = [...catalog.matchAll(/slug:\s*"([^"]+)"/g)].map((match) => match[1]);
  assert.equal(routeSlugs.length, 23, "Education Program katalog route sayısı değişti; tabloyu bilinçli güncelleyin");

  for (const slug of routeSlugs) {
    const pagePath = join(EXERCISES_ROOT, slug, "page.tsx");
    const page = await readFile(pagePath, "utf8");
    const clientPath = await findClientFile(slug);
    assert.ok(clientPath, `${slug}: client component bulunamadı`);
    const client = await readFile(clientPath, "utf8");
    const durationlessSlugs = ["anlama-testi", "okuma-hizi-testi"];
    const supportsDuration = !durationlessSlugs.includes(slug);

    assert.match(page, /EducationProgramExerciseChrome/, `${slug}: Chrome eksik`);
    if (supportsDuration) {
      assert.doesNotMatch(page, /showCountdown=\{false\}/, `${slug}: ortak countdown gizlenmiş`);
      assert.match(client, /useEducationProgramExerciseRunning/, `${slug}: running state Chrome'a bağlanmamış`);
      assert.match(client, /educationProgramLaunch\?\.durationSeconds|educationProgramLaunch/, `${slug}: launch duration bağlantısı eksik`);
    } else {
      assert.match(page, /showCountdown=\{false\}/, `${slug}: duration olmayan route countdown göstermemeli`);
    }
  }
});

test("ortak countdown badge warning responsive ve tek timer kaynağını kullanır", async () => {
  const badge = await readFile("src/components/education-programs/EducationProgramCountdownBadge.tsx", "utf8");
  const chrome = await readFile("src/components/education-programs/EducationProgramExerciseChrome.tsx", "utf8");

  assert.match(badge, /safeRemainingSeconds <= 60/);
  assert.match(badge, /safeRemainingSeconds <= 10/);
  assert.match(badge, /max-w-\[calc\(100vw-1rem\)\]/);
  assert.match(chrome, /EducationProgramCountdownBadge/);
  assert.doesNotMatch(chrome, /Date\.now\(\)|sessionStorage/);
});
