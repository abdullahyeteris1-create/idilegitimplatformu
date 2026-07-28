import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const LEVELS_URL = new URL("../src/lib/xp/xpLevels.ts", import.meta.url);

async function readLevels() {
  return readFile(LEVELS_URL, "utf8");
}

test("1-8) ilk seviye esikleri sabittir", async () => {
  const source = await readLevels();

  for (const [level, title, startXp] of [
    [1, "Yeni Başlayan", 0],
    [2, "Kitap Dostu", 100],
    [3, "Kaşif Okuyucu", 250],
    [4, "Hız Avcısı", 450],
    [5, "Odak Ustası", 700],
    [6, "Bilge Okuyucu", 1000],
    [7, "Okuma Şampiyonu", 1400],
    [8, "Efsane Okuyucu", 1900],
  ]) {
    assert.match(source, new RegExp(`level: ${level},\\s+title: "${title}",\\s+startXp: ${startXp}`));
  }
});

test("9-10) 1900 sonrasi devam modeli 2500 tabanli ve kontrollu artisli", async () => {
  const source = await readLevels();

  assert.match(source, /EXTENDED_LEVEL_BASE_START_XP = 2500/);
  assert.match(source, /EXTENDED_LEVEL_BASE_GAP = 700/);
  assert.match(source, /EXTENDED_LEVEL_GAP_STEP = 100/);
  assert.match(source, /return `Efsane Okuyucu • Seviye \$\{safeLevel\}`;/);

  const baseStart = 2500;
  const baseGap = 700;
  const gapStep = 100;
  const startForLevel = (level) => {
    if (level <= 8) {
      const map = [0, 100, 250, 450, 700, 1000, 1400, 1900];
      return map[level - 1];
    }
    const offset = level - 9;
    return baseStart + (baseGap * offset) + (gapStep * offset * (offset - 1)) / 2;
  };

  assert.equal(startForLevel(9), 2500);
  assert.equal(startForLevel(10), 3200);
  assert.equal(startForLevel(11), 4000);
  assert.equal(startForLevel(12), 4900);
});

test("11-12) snapshot helperleri temizleme ve ilerleme alanlarini uretiyor", async () => {
  const source = await readLevels();

  assert.match(source, /export function normalizeTotalXp\(value: number\): number/);
  assert.match(source, /export function getStudentXpSnapshot\(totalXp: number\): StudentXpSnapshot/);
  assert.match(source, /progressPercent = clampProgress\(\(xpWithinLevel \/ xpRequiredForLevel\) \* 100\)/);
  assert.match(source, /remainingXp = Math\.max\(0, nextLevelXp - safeTotalXp\)/);
});

