"use client";

import Image from "next/image";
import Link from "next/link";
import { useMemo, useState } from "react";

type ExerciseCard = {
  title: string;
  description: string;
  href: string;
  icon: string;
  image: string;
  tags: string[];
};

type ExerciseGroup = {
  id: string;
  title: string;
  shortTitle: string;
  description: string;
  icon: string;
  image: string;
  softClass: string;
  textClass: string;
  exercises: ExerciseCard[];
};

const DEFAULT_GROUP_ID = "attention";

const EXERCISE_GROUPS: ExerciseGroup[] = [
  {
    id: "eye",
    title: "Göz Egzersizleri",
    shortTitle: "Göz Egzersizleri",
    description: "Göz takip ve odaklanma çalışmaları.",
    icon: "👁️",
    image: "/exercise-visuals/categories/eye.svg",
    softClass: "border-emerald-200 bg-emerald-50 text-emerald-800",
    textClass: "text-emerald-700",
    exercises: [
      {
        title: "Göz Beyin Çalışması",
        description: "Simgeleri gözlerinle takip ederek göz-beyin koordinasyonunu geliştir.",
        href: "/egzersizler/goz-beyin",
        icon: "👁️",
        image: "/eye-symbols/target.svg",
        tags: ["Takip", "Odak"],
      },
      {
        title: "Göz Kaslarını Geliştirme",
        description: "Noktasal takip çalışmalarıyla göz kaslarını ve odak sürekliliğini destekle.",
        href: "/egzersizler/goz-kaslari",
        icon: "GK",
        image: "/exercise-visuals/exercises/eye-muscle.svg",
        tags: ["Göz", "Takip", "Odak"],
      },
    ],
  },
  {
    id: "attention",
    title: "Göz Algılama Çalışmaları",
    shortTitle: "Göz Algılama",
    description: "Görsel algı, hızlı fark etme ve dikkat becerilerini geliştiren çalışmalar.",
    icon: "🎯",
    image: "/exercise-visuals/categories/attention.svg",
    softClass: "border-rose-200 bg-rose-50 text-rose-800",
    textClass: "text-rose-700",
    exercises: [
      {
        title: "Takistoskop",
        description: "Kısa süreli kelime gösterimiyle algı hızını geliştir.",
        href: "/egzersizler/takistoskop",
        icon: "TK",
        image: "/exercise-visuals/exercises/tachistoscope.svg",
        tags: ["Algı", "Dikkat"],
      },
      {
        title: "Benzer Kelimeler",
        description: "Benzer kelimeleri karşılaştır ve farkları hızlı yakala.",
        href: "/egzersizler/benzer-kelimeler",
        icon: "BK",
        image: "/exercise-visuals/exercises/similar-words.svg",
        tags: ["Ayırt Etme", "Dikkat"],
      },
    ],
  },
  {
    id: "focus",
    title: "Odaklanma Çalışmaları",
    shortTitle: "Odaklanma",
    description: "Odaklanma, hızlı karar verme ve dikkat sürekliliğini güçlendiren çalışmalar.",
    icon: "🧠",
    image: "/exercise-visuals/categories/attention.svg",
    softClass: "border-amber-200 bg-amber-50 text-amber-900",
    textClass: "text-amber-700",
    exercises: [
      {
        title: "Çift Taraflı Odak",
        description: "İki tarafı aynı anda takip ederek karar verme hızını güçlendir.",
        href: "/egzersizler/cift-tarafli-odak",
        icon: "CO",
        image: "/exercise-visuals/exercises/two-side-focus.svg",
        tags: ["Odak", "Hız"],
      },
      {
        title: "Harf / Rakam Sayma Odak Çalışması",
        description: "Dağınık karakterler arasından hedef harf veya rakamı hızla say.",
        href: "/egzersizler/harf-rakam-sayma",
        icon: "HR",
        image: "/exercise-visuals/exercises/letter-number-counting.svg",
        tags: ["Sayma", "Odak"],
      },
    ],
  },
  {
    id: "fluency",
    title: "Metin Çalışmaları",
    shortTitle: "Metin Çalışmaları",
    description: "Okuma akıcılığı ve metin takip çalışmaları.",
    icon: "📚",
    image: "/exercise-visuals/categories/fluency.svg",
    softClass: "border-indigo-200 bg-indigo-50 text-indigo-800",
    textClass: "text-indigo-700",
    exercises: [
      {
        title: "Blok Okuma",
        description: "Kelimeleri bloklar halinde görerek okuma alanını genişlet.",
        href: "/egzersizler/blok-okuma",
        icon: "BO",
        image: "/exercise-visuals/exercises/block-reading.svg",
        tags: ["Okuma", "Ritim"],
      },
      {
        title: "Gölgeleme",
        description: "Aktif kelime gruplarını takip ederek ritimli okuma alışkanlığı kazan.",
        href: "/egzersizler/golgeleme",
        icon: "GL",
        image: "/exercise-visuals/exercises/shadowing.svg",
        tags: ["Takip", "Ritim"],
      },
      {
        title: "Odaklı Okuma",
        description: "Seçilen metni odak alanında kelime grupları halinde oku.",
        href: "/egzersizler/odakli-okuma",
        icon: "OO",
        image: "/exercise-visuals/exercises/focused-reading.svg",
        tags: ["Odak", "Metin"],
      },
      {
        title: "Kelime Bulma",
        description: "Metin içindeki hedef kelimeyi hızla bul.",
        href: "/egzersizler/kelime-bulma",
        icon: "KB",
        image: "/exercise-visuals/exercises/word-finding.svg",
        tags: ["Tarama", "Kelime"],
      },
    ],
  },
  {
    id: "memory",
    title: "Hafıza Teknikleri",
    shortTitle: "Hafıza Teknikleri",
    description: "Görsel hafıza, eşleştirme ve parça-bütün algısını geliştiren çalışmalar.",
    icon: "🧠",
    image: "/exercise-visuals/categories/memory.svg",
    softClass: "border-amber-200 bg-amber-50 text-amber-900",
    textClass: "text-amber-700",
    exercises: [
      {
        title: "Hafıza Geliştirme",
        description: "Kısa süre görünen kutuları aklında tut ve doğru kutuları seç.",
        href: "/egzersizler/hafiza-gelistirme",
        icon: "HG",
        image: "/exercise-visuals/exercises/memory.svg",
        tags: ["Hafıza", "Takip"],
      },
      {
        title: "Kart Eşleştirme Çalışması",
        description: "Aynı görselleri bul ve görsel hafızayı güçlendir.",
        href: "/egzersizler/kart-eslestirme",
        icon: "KE",
        image: "/exercise-visuals/exercises/card-matching.svg",
        tags: ["Eşleştirme", "Hafıza"],
      },
      {
        title: "Görsel Puzzle Çalışması",
        description: "Parçalara ayrılmış görselleri tamamlayarak parça-bütün algını geliştir.",
        href: "/egzersizler/gorsel-puzzle",
        icon: "GP",
        image: "/exercise-visuals/exercises/visual-puzzle.svg",
        tags: ["Puzzle", "Görsel"],
      },
    ],
  },
  {
    id: "assessment",
    title: "Okuma ve Anlama Testleri",
    shortTitle: "Anlama Testleri",
    description: "Hız ve anlama ölçümleri.",
    icon: "📝",
    image: "/exercise-visuals/categories/assessment.svg",
    softClass: "border-slate-200 bg-slate-50 text-slate-800",
    textClass: "text-slate-700",
    exercises: [
      {
        title: "Anlama Testi",
        description: "Metni oku, hızını ölç ve sorularla anlama oranını gör.",
        href: "/egzersizler/anlama-testi",
        icon: "AT",
        image: "/exercise-visuals/exercises/comprehension.svg",
        tags: ["Anlama", "Hiz"],
      },
      {
        title: "Sonuç",
        description: "Son çalışma performansını ve genel sonuç özetini incele.",
        href: "/sonuc",
        icon: "SN",
        image: "/exercise-visuals/exercises/results.svg",
        tags: ["Rapor", "Takip"],
      },
    ],
  },
];

export function ExercisesCenterClient() {
  const [activeGroupId, setActiveGroupId] = useState(DEFAULT_GROUP_ID);

  const activeGroup = useMemo(() => {
    return EXERCISE_GROUPS.find((group) => group.id === activeGroupId) ?? EXERCISE_GROUPS[0];
  }, [activeGroupId]);

  return (
    <section className="grid min-h-[calc(100vh-220px)] gap-4 lg:grid-cols-[360px_minmax(0,1fr)] 2xl:grid-cols-[380px_minmax(0,1fr)]">
      <aside className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm lg:sticky lg:top-4 lg:max-h-[calc(100vh-120px)] lg:self-start lg:overflow-y-auto">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-red-700">Calisma Kategorileri</p>
            <h3 className="mt-0.5 text-[20px] font-semibold tracking-tight text-slate-950">Kategoriler</h3>
            <p className="mt-1 max-w-sm text-sm leading-5 text-slate-600">Bir kategori secerek calismalari goruntule.</p>
          </div>
          <span className="rounded-full border border-red-100 bg-red-50 px-3 py-1 text-[11px] font-semibold text-red-700">
            {EXERCISE_GROUPS.length} kategori
          </span>
        </div>

        <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-1">
          {EXERCISE_GROUPS.map((group) => {
            const isActive = group.id === activeGroupId;

            return (
              <button
                key={group.id}
                type="button"
                onClick={() => setActiveGroupId(group.id)}
                className={`group flex min-h-[118px] w-full items-start gap-4 rounded-2xl border bg-white p-4 text-left shadow-sm transition duration-200 ${
                  isActive
                    ? "border-red-200 bg-red-50 ring-2 ring-red-100"
                    : "border-slate-200 hover:-translate-y-0.5 hover:border-red-200 hover:shadow-md"
                }`}
              >
                <span className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl text-2xl ${isActive ? "bg-white text-red-600" : "bg-slate-50 text-slate-700"}`}>
                  {group.icon}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block text-[15px] font-semibold tracking-tight text-slate-950">{group.title}</span>
                  <span className="mt-1 block text-sm leading-5 text-slate-600">{group.description}</span>
                  <span className={`mt-2 inline-flex rounded-full border px-2.5 py-1 text-[11px] font-semibold ${isActive ? "border-red-200 bg-white text-red-700" : group.softClass}`}>
                    {group.exercises.length} calisma
                  </span>
                </span>
                <span className={`mt-1 text-lg font-semibold ${isActive ? "text-red-600" : "text-slate-300"}`}>{">"}</span>
              </button>
            );
          })}
        </div>
      </aside>

      <section className="min-w-0 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm md:p-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0">
            <p className={`text-[10px] font-bold uppercase tracking-[0.2em] ${activeGroup.textClass}`}>{activeGroup.shortTitle}</p>
            <h3 className="mt-0.5 text-[20px] font-semibold tracking-tight text-slate-950">{activeGroup.title}</h3>
            <p className="mt-0.5 max-w-3xl text-sm leading-5 text-slate-600">{activeGroup.description}</p>
          </div>
          <span className={`rounded-full border px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.1em] ${activeGroup.softClass}`}>
            {activeGroup.exercises.length} calisma
          </span>
        </div>

        <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
          {activeGroup.exercises.map((exercise, index) => (
            <article
              key={exercise.href}
              className="group flex min-h-[220px] flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm transition duration-200 hover:-translate-y-0.5 hover:border-red-200 hover:shadow-md"
              style={{ animationDelay: `${index * 55}ms` }}
            >
              <div className="relative h-[88px] border-b border-slate-100 bg-slate-50">
                <Image src={exercise.image} alt="" fill sizes="(min-width: 1440px) 25vw, (min-width: 1280px) 33vw, (min-width: 640px) 50vw, 100vw" className="object-contain p-3.5" />
              </div>

              <div className="flex flex-1 flex-col p-4">
                <div className="flex items-start justify-between gap-3">
                  <span className="inline-flex h-8 min-w-8 items-center justify-center rounded-lg bg-red-50 px-2 text-[11px] font-semibold text-red-700">
                    {exercise.icon}
                  </span>
                  <div className="flex flex-wrap justify-end gap-1.5">
                    {exercise.tags.slice(0, 2).map((tag) => (
                      <span key={tag} className={`rounded-full border px-2.5 py-0.5 text-[11px] font-semibold ${activeGroup.softClass}`}>
                        {tag}
                      </span>
                    ))}
                  </div>
                </div>

                <h4 className="mt-2.5 text-[18px] font-semibold tracking-tight text-slate-950">{exercise.title}</h4>
                <p className="mt-1.5 flex-1 text-sm leading-5 text-slate-600">{exercise.description}</p>

                <Link
                  href={exercise.href}
                  className="mt-3.5 inline-flex min-h-[40px] w-full items-center justify-center rounded-xl bg-[var(--brand)] px-4 py-2 text-sm font-semibold text-white transition duration-200 active:scale-[0.98] hover:bg-[var(--brand-strong)]"
                >
                  Calismaya Basla
                </Link>
              </div>
            </article>
          ))}
        </div>
      </section>
    </section>
  );
}
