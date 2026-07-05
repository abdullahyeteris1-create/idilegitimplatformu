import Link from "next/link";
import { AppShell } from "@/components/layout/AppShell";
import { TEACHER_NAV_ITEMS } from "@/lib/constants/teacherNavigation";
import { BLOCK_READING_TEXTS } from "@/lib/data/blockReadingTexts";
import { FOCUSED_READING_TEXTS } from "@/lib/data/focusedReadingTexts";
import { READING_COMPREHENSION_TEXTS } from "@/lib/data/readingComprehensionTexts";

type TextLibraryItem = {
  id: string;
  title: string;
  category: string;
  source: string;
  text: string;
};

function getWordCount(text: string): number {
  return text.trim().match(/\S+/g)?.length ?? 0;
}

const TEXT_LIBRARY_ITEMS: TextLibraryItem[] = [
  ...BLOCK_READING_TEXTS.map((item) => ({
    id: `block-${item.id}`,
    title: item.title,
    category: item.category,
    source: "Blok Okuma / Golgeleme",
    text: item.text,
  })),
  ...FOCUSED_READING_TEXTS.map((item) => ({
    id: `focused-${item.id}`,
    title: item.title,
    category: item.category,
    source: "Odakli Okuma",
    text: item.text,
  })),
  ...READING_COMPREHENSION_TEXTS.map((item) => ({
    id: `comprehension-${item.id}`,
    title: item.title,
    category: item.category,
    source: "Anlama Testi",
    text: item.text,
  })),
];

export default function TextLibraryPage() {
  return (
    <AppShell
      title="Metin Kutuphanesi"
      subtitle="Okuma egzersizlerinde kullanilan metin kaynaklarini incele ve ileride yonet."
      navItems={TEACHER_NAV_ITEMS}
    >
      <section className="idil-card p-5 md:p-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.18em] text-red-700">Aktif Modul</p>
            <h2 className="mt-2 text-2xl font-black tracking-tight text-slate-950 md:text-3xl">Metin Kutuphanesi</h2>
            <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600">
              Blok Okuma, Golgeleme, Odakli Okuma ve Anlama Testi metinleri burada tek merkezden izlenir.
            </p>
          </div>
          <Link
            href="/ogretmen/icerik-yonetimi"
            className="inline-flex min-h-[44px] items-center justify-center rounded-xl border border-red-200 bg-red-50 px-4 py-2 text-sm font-bold text-red-800 transition hover:bg-red-100"
          >
            Icerik Yonetimine Don
          </Link>
        </div>

        <div className="mt-5 grid gap-3 sm:grid-cols-3">
          <article className="rounded-2xl border border-red-100 bg-red-50 p-4">
            <p className="text-xs font-black uppercase tracking-[0.1em] text-slate-500">Toplam Metin</p>
            <p className="mt-2 text-3xl font-black text-slate-950">{TEXT_LIBRARY_ITEMS.length}</p>
          </article>
          <article className="rounded-2xl border border-red-100 bg-red-50 p-4">
            <p className="text-xs font-black uppercase tracking-[0.1em] text-slate-500">Bagli Alanlar</p>
            <p className="mt-2 text-3xl font-black text-slate-950">4</p>
          </article>
          <article className="rounded-2xl border border-green-100 bg-green-50 p-4">
            <p className="text-xs font-black uppercase tracking-[0.1em] text-slate-500">Durum</p>
            <p className="mt-2 text-2xl font-black text-green-700">Aktif</p>
          </article>
        </div>

        <div className="mt-5 grid gap-3">
          {TEXT_LIBRARY_ITEMS.map((item) => (
            <article key={item.id} className="rounded-2xl border border-red-100 bg-white p-4 shadow-sm">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <h3 className="text-lg font-black text-red-700">{item.title}</h3>
                  <p className="mt-1 text-sm font-semibold text-slate-500">{item.category} - {item.source}</p>
                </div>
                <span className="rounded-full border border-red-100 bg-red-50 px-3 py-1 text-xs font-black text-red-700">
                  {getWordCount(item.text)} kelime
                </span>
              </div>
              <p className="mt-3 line-clamp-3 text-sm leading-6 text-slate-600">{item.text}</p>
            </article>
          ))}
        </div>
      </section>
    </AppShell>
  );
}
