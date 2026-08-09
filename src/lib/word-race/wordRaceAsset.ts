import { readFile } from "node:fs/promises";
import path from "node:path";
import {
  WORD_RACE_BRIDGE_MESSAGE_SOURCE,
  WORD_RACE_HOST_MESSAGE_SOURCE,
} from "@/lib/word-race/wordRaceBridge";

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
          completionReason: reason === "wrongLimit"
            ? "wrong_limit"
            : reason === "allLevelsCompleted"
              ? "all_levels_completed"
              : "user_exit",
          maxWrong: MAX_TOTAL_WRONG
        }
      }, "*");
    } catch (__idilError) {}`;

// Liderlik tablosu prototipin KENDI sonuc ekranina (#veilOver .sheet) eklenir
// ama prototip dosyasi degistirilmez: asagidaki blok </body> oncesine eklenen
// bagimsiz bir style+script'tir. Oyun kodunun hicbir satirina dokunmaz.
//
// Isimler DAIMA textContent ile yazilir (innerHTML degil) - API'den gelen ad
// hicbir kosulda HTML olarak yorumlanmaz.
const LEADERBOARD_ANCHOR = "</body>";

const LEADERBOARD_BLOCK = `
<style>
  #idilWordRaceLeaderboard { margin: 16px 0 4px; text-align: left; }
  #idilWordRaceLeaderboard h2 { margin: 0 0 8px; font-size: 14px; letter-spacing: -.01em; }
  #idilWordRaceLeaderboard ol { margin: 0; padding: 0; list-style: none; }
  #idilWordRaceLeaderboard li {
    display: flex; align-items: center; gap: 8px;
    padding: 6px 8px; border-radius: 8px; font-size: 13px;
  }
  #idilWordRaceLeaderboard li + li { margin-top: 2px; }
  #idilWordRaceLeaderboard li.me { background: rgba(34,197,94,.14); }
  #idilWordRaceLeaderboard .r { width: 22px; color: var(--muted); font-variant-numeric: tabular-nums; }
  #idilWordRaceLeaderboard .n { flex: 1; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
  #idilWordRaceLeaderboard .s { font-weight: 600; font-variant-numeric: tabular-nums; }
  #idilWordRaceLeaderboard .empty { color: var(--muted); font-size: 12.5px; margin: 0; }
</style>
<script>
(function () {
  "use strict";

  function container() {
    var sheet = document.querySelector("#veilOver .sheet");
    if (!sheet) return null;

    var box = document.getElementById("idilWordRaceLeaderboard");
    if (!box) {
      box = document.createElement("div");
      box.id = "idilWordRaceLeaderboard";
      var again = document.getElementById("btnAgain");
      if (again && again.parentNode === sheet) sheet.insertBefore(box, again);
      else sheet.appendChild(box);
    }
    return box;
  }

  function render(entries) {
    var box = container();
    if (!box) return;

    box.textContent = "";

    var heading = document.createElement("h2");
    heading.textContent = "Sınıf Sıralaması";
    box.appendChild(heading);

    if (!entries.length) {
      var empty = document.createElement("p");
      empty.className = "empty";
      empty.textContent = "Sınıfında henüz sıralama oluşmadı.";
      box.appendChild(empty);
      return;
    }

    var list = document.createElement("ol");
    for (var i = 0; i < entries.length; i++) {
      var entry = entries[i];
      var row = document.createElement("li");
      if (entry.isCurrentStudent) row.className = "me";

      var rank = document.createElement("span");
      rank.className = "r";
      rank.textContent = String(entry.rank) + ".";

      var name = document.createElement("span");
      name.className = "n";
      name.textContent = String(entry.displayName);

      var score = document.createElement("span");
      score.className = "s";
      score.textContent = String(entry.score);

      row.appendChild(rank);
      row.appendChild(name);
      row.appendChild(score);
      list.appendChild(row);
    }
    box.appendChild(list);
  }

  window.addEventListener("message", function (event) {
    if (event.source !== window.parent) return;

    var data = event.data;
    if (!data || data.source !== "${WORD_RACE_HOST_MESSAGE_SOURCE}" || data.type !== "leaderboard") return;

    render(Array.isArray(data.entries) ? data.entries.slice(0, 10) : []);
  });
})();
</script>
`;

function assertUniqueAnchor(html: string, anchor: string, label: string): void {
  const occurrences = html.split(anchor).length - 1;

  if (occurrences !== 1) {
    throw new Error(
      `Kelime Yarisi kanca noktasi bulunamadi veya benzersiz degil (${label}): ${occurrences} eslesme.`,
    );
  }
}

function injectAfter(html: string, anchor: string, hook: string, label: string): string {
  assertUniqueAnchor(html, anchor, label);
  return html.replace(anchor, `${anchor}${hook}`);
}

function injectBefore(html: string, anchor: string, block: string, label: string): string {
  assertUniqueAnchor(html, anchor, label);
  return html.replace(anchor, `${block}${anchor}`);
}

/**
 * Prototip HTML'ine sonuc koprusunu ve liderlik tablosu bolumunu ekler.
 * Girdi degistirilmez; donen string yalnizca EKLENMIS bloklar icerir.
 */
export function injectWordRaceResultBridge(html: string): string {
  const withStartHook = injectAfter(html, START_ANCHOR, START_HOOK, "startGame");
  const withFinishHook = injectAfter(withStartHook, FINISH_ANCHOR, FINISH_HOOK, "finish");

  return injectBefore(withFinishHook, LEADERBOARD_ANCHOR, LEADERBOARD_BLOCK, "leaderboard");
}

export async function readWordRaceHtml(): Promise<string> {
  return readFile(WORD_RACE_ASSET_PATH, "utf8");
}

/** Egzersiz sayfasinin iframe'inin yukledigi, koprusu eklenmis HTML. */
export async function readWordRaceGameHtml(): Promise<string> {
  return injectWordRaceResultBridge(await readWordRaceHtml());
}
