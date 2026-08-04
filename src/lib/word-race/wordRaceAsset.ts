import { readFile } from "node:fs/promises";
import path from "node:path";
import { WORD_RACE_BRIDGE_MESSAGE_SOURCE } from "@/lib/word-race/wordRaceBridge";

/**
 * Kelime Yarisi prototipi platforma REACT'E CEVRILMEDEN entegre edilir:
 * `src/exercise-assets/kelime-yarisi.html` bayt bayt korunur ve egzersiz
 * sayfasinin icinde bir iframe'de calisir. Bu modul HTML'i okur ve platformun
 * sonuc/XP akisina baglanmasi icin iki KUCUK, TAMAMEN EKLEMELI kanca enjekte
 * eder. Hicbir mevcut satir degistirilmez veya silinmez; oyun davranisi aynen
 * kalir.
 *
 * Enjeksiyon "anchor" tabanlidir: prototip degisip de kanca noktasi kayarsa
 * yukleme sessizce bozulmaz, hata firlatir (bkz. tests/word-race-*).
 */

export const WORD_RACE_ASSET_PATH = path.join(
  process.cwd(),
  "src",
  "exercise-assets",
  "kelime-yarisi.html",
);

// Oyunun kendi kodundaki iki benzersiz satir. Testler bu iki anchor'in
// prototipte hala tek olarak bulundugunu dogrular.
const START_ANCHOR = "  function startGame(level, { preserveTotals = false } = {}) {";
const FINISH_ANCHOR = '    el("veilOver").classList.remove("hidden");';

// Oyun kodu bir IIFE icinde oldugu icin disaridan `S`'ye erisilemez; kancalar
// bu yuzden fonksiyonlarin ICINE eklenir. Degiskenler `window.` uzerinde
// tutulur ki IIFE'deki hicbir isimle cakismasin.
const START_HOOK = `
    if (!window.__idilWordRaceStartedAt) window.__idilWordRaceStartedAt = Date.now();`;

const FINISH_HOOK = `
    try {
      var __idilStart = window.__idilWordRaceStartedAt || Date.now();
      window.__idilWordRaceStartedAt = null;
      window.parent.postMessage({
        source: "${WORD_RACE_BRIDGE_MESSAGE_SOURCE}",
        type: "finished",
        payload: {
          score: S.score,
          correctCount: S.right,
          wrongCount: S.wrong,
          durationSeconds: Math.max(0, Math.round((Date.now() - __idilStart) / 1000)),
          reachedLevel: S.level,
          lanes: S.lanes,
          reachedSpeedMs: S.car.speedMs,
          carId: S.car.id,
          completionReason: reason === "wrongLimit" ? "wrong_limit" : "user_exit",
          maxWrong: MAX_TOTAL_WRONG
        }
      }, "*");
    } catch (__idilError) {}`;

function injectOnce(html: string, anchor: string, hook: string, label: string): string {
  const occurrences = html.split(anchor).length - 1;

  if (occurrences !== 1) {
    throw new Error(
      `Kelime Yarisi kanca noktasi bulunamadi veya benzersiz degil (${label}): ${occurrences} eslesme.`,
    );
  }

  return html.replace(anchor, `${anchor}${hook}`);
}

/**
 * Prototip HTML'ine sonuc koprusunu ekler. Girdi degistirilmez; donen string
 * yalnizca iki ek satir blogu icerir.
 */
export function injectWordRaceResultBridge(html: string): string {
  return injectOnce(
    injectOnce(html, START_ANCHOR, START_HOOK, "startGame"),
    FINISH_ANCHOR,
    FINISH_HOOK,
    "finish",
  );
}

export async function readWordRaceHtml(): Promise<string> {
  return readFile(WORD_RACE_ASSET_PATH, "utf8");
}

/** Egzersiz sayfasinin iframe'inin yukledigi, koprusu eklenmis HTML. */
export async function readWordRaceGameHtml(): Promise<string> {
  return injectWordRaceResultBridge(await readWordRaceHtml());
}
