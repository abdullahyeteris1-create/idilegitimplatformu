import assert from "node:assert/strict";
import { readdir, readFile, stat } from "node:fs/promises";
import path from "node:path";
import test from "node:test";

/**
 * Kelime Yarisi yalnizca gizli bir onizlemedir: hicbir egzersiz katalogunda,
 * atama listesinde, egitim programinda, XP/sonuc esleme tablosunda veya
 * navigasyonda gorunmemelidir.
 */

const ROOT = process.cwd();

// Onizleme kapisinin kendi dosyalari disinda hicbir kaynak dosya bu egzersizi
// tanimamali.
const ALLOWED_FILES = new Set(
  [
    "src/app/preview/kelime-yarisi/page.tsx",
    "src/app/preview/kelime-yarisi/content/route.ts",
    "src/lib/preview/wordRacePreview.ts",
  ].map((relativePath) => path.normalize(relativePath)),
);

const SCANNED_ROOTS = ["src"];
const SCANNED_EXTENSIONS = new Set([".ts", ".tsx", ".js", ".jsx", ".json", ".css"]);
const NEEDLE = /kelime[\s-]?yar[iı]ş?s?[iı]|word[\s_-]?race/i;

async function collectFiles(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  const files = [];

  for (const entry of entries) {
    const fullPath = path.join(directory, entry.name);

    if (entry.isDirectory()) {
      files.push(...(await collectFiles(fullPath)));
      continue;
    }

    if (SCANNED_EXTENSIONS.has(path.extname(entry.name))) {
      files.push(fullPath);
    }
  }

  return files;
}

test("hicbir katalog/route/navigasyon dosyasi Kelime Yarisi'ni tanimiyor", async () => {
  const offenders = [];

  for (const scannedRoot of SCANNED_ROOTS) {
    const files = await collectFiles(path.join(ROOT, scannedRoot));

    for (const file of files) {
      const relativePath = path.relative(ROOT, file);

      if (ALLOWED_FILES.has(path.normalize(relativePath))) {
        continue;
      }

      if (NEEDLE.test(await readFile(file, "utf8"))) {
        offenders.push(relativePath);
      }
    }
  }

  assert.deepEqual(offenders, []);
});

test("egzersiz kataloglari ve route allow-list'i temiz", async () => {
  const catalogFiles = [
    "src/lib/education-programs/exerciseCatalog.ts",
    "src/lib/education-programs/exerciseRouteCatalog.ts",
    "src/lib/assignments/exerciseCatalog.ts",
    "src/lib/assignments/assignmentExerciseCatalog.ts",
  ];

  for (const relativePath of catalogFiles) {
    const fullPath = path.join(ROOT, relativePath);

    // Katalog dosyasinin yeri degistiyse testin sessizce gecmesini istemiyoruz.
    await assert.doesNotReject(() => stat(fullPath), `Katalog dosyasi bulunamadi: ${relativePath}`);
    assert.doesNotMatch(await readFile(fullPath, "utf8"), NEEDLE, relativePath);
  }
});

test("egzersiz sayfasi olarak eklenmedi", async () => {
  const exerciseRoutes = await readdir(path.join(ROOT, "src", "app", "egzersizler"));

  for (const entry of exerciseRoutes) {
    assert.doesNotMatch(entry, NEEDLE);
  }
});
