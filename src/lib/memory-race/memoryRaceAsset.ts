import { readFile } from "node:fs/promises";
import path from "node:path";

/**
 * Hafiza Yarisi SERBEST OYUNDUR: Kelime Yarisi'ndan farkli olarak platformun
 * sonuc/XP akisina HIC baglanmaz. Bu yuzden burada postMessage koprusu,
 * anchor enjeksiyonu veya sonuc payload'i YOKTUR - HTML diskten okunup oldugu
 * gibi servis edilir.
 *
 * Oyunun kendi skorlari yalniz iframe icinde, oyun oturumu boyunca bellekte
 * yasar; ne `exercise_results`'a ne de XP tablolarina hicbir sey yazilir.
 */
export const MEMORY_RACE_ASSET_PATH = path.join(
  process.cwd(),
  "src",
  "exercise-assets",
  "hafiza-yarisi.html",
);

export const MEMORY_RACE_EXERCISE_SLUG = "hafiza-yarisi";

export const MEMORY_RACE_EXERCISE_TITLE = "Hafıza Yarışı";

export async function readMemoryRaceHtml(): Promise<string> {
  return readFile(MEMORY_RACE_ASSET_PATH, "utf8");
}
