import type { Metadata } from "next";
import Link from "next/link";
import { MEMORY_RACE_EXERCISE_TITLE } from "@/lib/memory-race/memoryRaceAsset";

/**
 * Hafiza Yarisi SERBEST OYUNDUR.
 *
 * Bilincli olarak client bileseni YOKTUR: bu sayfanin sonuc kaydetmesi, oyundan
 * mesaj dinlemesi veya XP tetiklemesi gerekmez, o yuzden hicbir client-side
 * sonuc kodu bundle'a girmez. Iframe icindeki oyun kendi skorlarini yalniz
 * oturum boyunca bellekte tutar.
 *
 * Karistirilmasin: `/egzersizler/kart-eslestirme` TEK ogrencilik bir performans
 * calismasidir ve sonuc/XP uretir. Bu sayfa onun yerine gecmez.
 */

const GAME_SRC = "/egzersizler/hafiza-yarisi/oyun";

export const metadata: Metadata = {
  title: `${MEMORY_RACE_EXERCISE_TITLE} | İdil Eğitim Platformu`,
  description: "İki veya üç kişilik eğlenceli kart eşleştirme yarışı.",
};

export default function MemoryRacePage() {
  return (
    <main className="flex min-h-screen w-full flex-col overflow-x-hidden bg-slate-950">
      <div className="flex shrink-0 flex-wrap items-center justify-between gap-2 px-3 py-2 text-xs text-slate-300">
        <div className="flex flex-wrap items-center gap-2">
          <span className="font-semibold text-slate-100">{MEMORY_RACE_EXERCISE_TITLE}</span>
          <span className="text-slate-400">Serbest oyun — sonuç kaydedilmez.</span>
        </div>
        <Link href="/egzersizler" className="underline underline-offset-2 hover:text-white">
          Egzersizler
        </Link>
      </div>
      <iframe
        title={MEMORY_RACE_EXERCISE_TITLE}
        src={GAME_SRC}
        sandbox="allow-scripts"
        className="w-full flex-1 border-0"
        style={{ minHeight: "calc(100dvh - 2.5rem)" }}
      />
    </main>
  );
}
