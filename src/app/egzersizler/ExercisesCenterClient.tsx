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
  panelClass: string;
  accentClass: string;
  softClass: string;
  textClass: string;
  exercises: ExerciseCard[];
};

const HERO_BADGES = ["Mobil Uyumlu", "Ogrenci Takibi", "Hiz Olcumu", "Anlama Orani", "Raporlama"];

const EXERCISE_GROUPS: ExerciseGroup[] = [
  {
    id: "attention",
    title: "Algi ve Dikkat Calismalari",
    shortTitle: "Algi ve Dikkat",
    description: "Hizli algilama, dikkat, gorsel ayirt etme ve kelime farkindaligini gelistiren calismalar.",
    icon: "AD",
    image: "/exercise-visuals/categories/attention.svg",
    panelClass: "border-rose-200 bg-[linear-gradient(135deg,#fff1f2_0%,#ffffff_48%,#fdf2f8_100%)]",
    accentClass: "from-rose-500 to-red-600",
    softClass: "border-rose-200 bg-rose-50 text-rose-800",
    textClass: "text-rose-700",
    exercises: [
      {
        title: "Takistoskop",
        description: "Kisa sureli kelime gosterimiyle algi hizini ve odaklanmayi gelistir.",
        href: "/egzersizler/takistoskop",
        icon: "TK",
        image: "/exercise-visuals/exercises/tachistoscope.svg",
        tags: ["Algi", "Dikkat", "Hiz"],
      },
      {
        title: "Benzer Kelimeler",
        description: "Benzer kelimeleri karsilastir, farklari hizli ve dogru yakala.",
        href: "/egzersizler/benzer-kelimeler",
        icon: "BK",
        image: "/exercise-visuals/exercises/similar-words.svg",
        tags: ["Gorsel", "Ayirt Etme", "Odak"],
      },
      {
        title: "Cift Tarafli Odak",
        description: "Iki tarafi ayni anda takip ederek karar verme hizini guclendir.",
        href: "/egzersizler/cift-tarafli-odak",
        icon: "CO",
        image: "/exercise-visuals/exercises/two-side-focus.svg",
        tags: ["Odak", "Karsilastirma", "Hiz"],
      },
      {
        title: "Kelime Bulma",
        description: "Metin icindeki hedef kelimeyi bul ve kelime farkindaligini artir.",
        href: "/egzersizler/kelime-bulma",
        icon: "KB",
        image: "/exercise-visuals/exercises/word-finding.svg",
        tags: ["Tarama", "Kelime", "Dikkat"],
      },
      {
        title: "Harf / Rakam Sayma",
        description: "Daginik karakterler arasindan hedef harf veya rakamin kac tane oldugunu hizlica say.",
        href: "/egzersizler/harf-rakam-sayma",
        icon: "HR",
        image: "/exercise-visuals/exercises/letter-number-counting.svg",
        tags: ["Odak", "Sayma", "Dikkat"],
      },
    ],
  },
  {
    id: "fluency",
    title: "Okuma Akiciligi Calismalari",
    shortTitle: "Okuma Akiciligi",
    description: "Kelime gruplariyla okuma, ritim, takip ve akici okuma becerilerini gelistirir.",
    icon: "OA",
    image: "/exercise-visuals/categories/fluency.svg",
    panelClass: "border-indigo-200 bg-[linear-gradient(135deg,#eef2ff_0%,#ffffff_48%,#eff6ff_100%)]",
    accentClass: "from-indigo-500 to-sky-600",
    softClass: "border-indigo-200 bg-indigo-50 text-indigo-800",
    textClass: "text-indigo-700",
    exercises: [
      {
        title: "Blok Okuma",
        description: "Kelimeleri bloklar halinde gorerek okuma alanini genislet.",
        href: "/egzersizler/blok-okuma",
        icon: "BO",
        image: "/exercise-visuals/exercises/block-reading.svg",
        tags: ["Okuma", "Grup", "Ritim"],
      },
      {
        title: "Golgeleme",
        description: "Aktif kelime gruplarini takip ederek ritimli okuma aliskanligi kazan.",
        href: "/egzersizler/golgeleme",
        icon: "GL",
        image: "/exercise-visuals/exercises/shadowing.svg",
        tags: ["Takip", "Ritim", "Metin"],
      },
      {
        title: "Odakli Okuma",
        description: "Secilen metni odak alaninda kelime gruplari halinde oku.",
        href: "/egzersizler/odakli-okuma",
        icon: "OO",
        image: "/exercise-visuals/exercises/focused-reading.svg",
        tags: ["Odak", "Akicilik", "Metin"],
      },
    ],
  },
  {
    id: "memory",
    title: "Hafiza ve Zihinsel Takip",
    shortTitle: "Hafiza",
    description: "Kisa sureli gorsel hafiza ve dikkat takibini guclendirir.",
    icon: "HZ",
    image: "/exercise-visuals/categories/memory.svg",
    panelClass: "border-amber-200 bg-[linear-gradient(135deg,#fffbeb_0%,#ffffff_48%,#fff7ed_100%)]",
    accentClass: "from-amber-500 to-orange-600",
    softClass: "border-amber-200 bg-amber-50 text-amber-900",
    textClass: "text-amber-700",
    exercises: [
      {
        title: "Hafiza Gelistirme",
        description: "Kisa sure gorunen kutulari aklinda tut ve dogru kutulari sec.",
        href: "/egzersizler/hafiza-gelistirme",
        icon: "HG",
        image: "/exercise-visuals/exercises/memory.svg",
        tags: ["Hafiza", "Dikkat", "Takip"],
      },
    ],
  },
  {
    id: "eye",
    title: "Goz Egzersizleri",
    shortTitle: "Goz Egzersizleri",
    description: "Goz kaslarini, takip becerisini ve odaklanmayi destekleyen calismalar.",
    icon: "GE",
    image: "/exercise-visuals/categories/eye.svg",
    panelClass: "border-emerald-200 bg-[linear-gradient(135deg,#ecfdf5_0%,#ffffff_48%,#f0fdfa_100%)]",
    accentClass: "from-emerald-500 to-teal-600",
    softClass: "border-emerald-200 bg-emerald-50 text-emerald-800",
    textClass: "text-emerald-700",
    exercises: [
      {
        title: "Goz Kaslarini Gelistirme",
        description: "Noktasal takip calismalariyla goz kaslarini ve odak surekliligini destekle.",
        href: "/egzersizler/goz-kaslari",
        icon: "GK",
        image: "/exercise-visuals/exercises/eye-muscle.svg",
        tags: ["Goz", "Takip", "Odak"],
      },
    ],
  },
  {
    id: "assessment",
    title: "Olcme ve Degerlendirme",
    shortTitle: "Olcme",
    description: "Okuma hizi, anlama orani ve ogrenci gelisimini olcer.",
    icon: "OD",
    image: "/exercise-visuals/categories/assessment.svg",
    panelClass: "border-slate-200 bg-[linear-gradient(135deg,#f8fafc_0%,#ffffff_48%,#eef2ff_100%)]",
    accentClass: "from-slate-700 to-indigo-700",
    softClass: "border-slate-200 bg-slate-50 text-slate-800",
    textClass: "text-slate-700",
    exercises: [
      {
        title: "Anlama Testi",
        description: "Metni oku, hizini olc ve sorularla anlama oranini gor.",
        href: "/egzersizler/anlama-testi",
        icon: "AT",
        image: "/exercise-visuals/exercises/comprehension.svg",
        tags: ["Olcme", "Anlama", "Hiz"],
      },
      {
        title: "Sonuc",
        description: "Son calisma performansini ve genel sonuc ozetini incele.",
        href: "/sonuc",
        icon: "SN",
        image: "/exercise-visuals/exercises/results.svg",
        tags: ["Rapor", "Puan", "Takip"],
      },
    ],
  },
];

function toggleItem(items: string[], item: string): string[] {
  return items.includes(item) ? items.filter((value) => value !== item) : [...items, item];
}

export function ExercisesCenterClient() {
  const [activeGroupId, setActiveGroupId] = useState(EXERCISE_GROUPS[0].id);
  const [openGroupIds, setOpenGroupIds] = useState<string[]>([EXERCISE_GROUPS[0].id]);

  const activeGroup = useMemo(() => {
    return EXERCISE_GROUPS.find((group) => group.id === activeGroupId) ?? EXERCISE_GROUPS[0];
  }, [activeGroupId]);

  const handleGroupClick = (groupId: string) => {
    setActiveGroupId(groupId);
    setOpenGroupIds((prev) => (prev.includes(groupId) ? prev : [...prev, groupId]));
  };

  const handleToggleClick = (groupId: string) => {
    setActiveGroupId(groupId);
    setOpenGroupIds((prev) => toggleItem(prev, groupId));
  };

  return (
    <>
      <section className="fx-fade-in overflow-hidden rounded-2xl border border-red-100 bg-[radial-gradient(circle_at_top_left,#ffe4e8_0%,#ffffff_46%,#fff7f4_100%)] p-3 shadow-[0_12px_38px_rgba(185,28,28,0.08)] md:p-4">
        <div className="grid gap-3 xl:grid-cols-[1fr_auto] xl:items-center">
          <div>
            <p className="text-[11px] font-black uppercase tracking-[0.2em] text-red-700">Egzersiz Merkezi</p>
            <h2 className="mt-1 max-w-3xl text-2xl font-black tracking-tight text-slate-950 md:text-3xl">
              Idil Hizli Okuma Egzersiz Merkezi
            </h2>
            <p className="mt-1 max-w-3xl text-sm leading-6 text-slate-600">
              Dikkat, algi, okuma akiciligi, hafiza, goz egzersizleri ve anlama testlerini tek merkezden baslat.
            </p>
          </div>

          <div className="flex flex-wrap gap-2 xl:max-w-xl xl:justify-end">
            {HERO_BADGES.map((badge) => (
              <span key={badge} className="rounded-full border border-white/80 bg-white/86 px-3 py-2 text-center text-[11px] font-black uppercase tracking-[0.08em] text-red-700 shadow-sm shadow-red-100/70 backdrop-blur">
                {badge}
              </span>
            ))}
          </div>
        </div>
      </section>

      <section className="grid min-h-[calc(100vh-245px)] gap-3 lg:grid-cols-[320px_minmax(0,1fr)] 2xl:grid-cols-[340px_minmax(0,1fr)]">
        <aside className="fx-slide-up rounded-2xl border border-red-100 bg-white/92 p-3 shadow-[0_14px_34px_rgba(15,23,42,0.08)] lg:sticky lg:top-4 lg:max-h-[calc(100vh-120px)] lg:self-start lg:overflow-y-auto">
          <div className="flex items-center justify-between gap-3 px-2 py-2">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.18em] text-red-700">Menu</p>
              <h3 className="text-lg font-black text-slate-950">Kategoriler</h3>
            </div>
            <span className="rounded-full border border-red-100 bg-red-50 px-3 py-1 text-xs font-bold text-red-700">
              {EXERCISE_GROUPS.length}
            </span>
          </div>

          <div className="mt-2 flex gap-2 overflow-x-auto pb-2 lg:hidden">
            {EXERCISE_GROUPS.map((group) => {
              const isActive = group.id === activeGroupId;

              return (
                <button
                  key={group.id}
                  type="button"
                  onClick={() => handleGroupClick(group.id)}
                  className={`flex min-h-[44px] shrink-0 items-center gap-2 rounded-full border px-3 text-sm font-black transition active:scale-[0.98] ${
                    isActive ? `bg-gradient-to-r ${group.accentClass} text-white shadow-md` : group.softClass
                  }`}
                >
                  <span className="relative h-7 w-7 overflow-hidden rounded-full bg-white/90">
                    <Image src={group.image} alt="" fill sizes="28px" className="object-contain p-1" />
                  </span>
                  {group.shortTitle}
                </button>
              );
            })}
          </div>

          <div className="hidden gap-2 lg:grid">
            {EXERCISE_GROUPS.map((group) => {
              const isOpen = openGroupIds.includes(group.id);
              const isActive = group.id === activeGroupId;

              return (
                <div key={group.id} className={`rounded-2xl border transition ${isActive ? group.softClass : "border-slate-100 bg-white"}`}>
                  <button
                    type="button"
                    onClick={() => handleToggleClick(group.id)}
                    className="flex min-h-[58px] w-full items-center gap-3 px-3 py-2 text-left"
                  >
                    <span className="relative inline-flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-white shadow-sm">
                      <Image src={group.image} alt="" fill sizes="44px" className="object-contain p-1" />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-black text-slate-950">{group.shortTitle}</span>
                      <span className="block text-xs font-semibold text-slate-500">{group.exercises.length} calisma</span>
                    </span>
                    <span className={`text-sm font-black transition ${isOpen ? "rotate-90" : ""}`}>{">"}</span>
                  </button>

                  <div className={`grid transition-all duration-200 ${isOpen ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0"}`}>
                    <div className="overflow-hidden">
                      <div className="grid gap-1 px-3 pb-3">
                        {group.exercises.map((exercise) => (
                          <Link
                            key={exercise.href}
                            href={exercise.href}
                            className="rounded-xl border border-transparent px-3 py-2 text-sm font-bold text-slate-700 transition hover:border-red-100 hover:bg-white hover:text-red-700"
                          >
                            {exercise.title}
                          </Link>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </aside>

        <section className={`fx-slide-up min-w-0 rounded-2xl border ${activeGroup.panelClass} p-3 shadow-[0_14px_34px_rgba(15,23,42,0.07)] md:p-4`}>
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="flex min-w-0 items-start gap-3">
              <span className="relative inline-flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-2xl border border-white/80 bg-white shadow-md">
                <Image src={activeGroup.image} alt="" fill sizes="64px" className="object-contain p-2" />
              </span>
              <div className="min-w-0">
                <p className={`text-[11px] font-black uppercase tracking-[0.18em] ${activeGroup.textClass}`}>Secili kategori</p>
                <h3 className="mt-0.5 text-2xl font-black tracking-tight text-slate-950">{activeGroup.title}</h3>
                <p className="mt-1 max-w-4xl text-sm leading-6 text-slate-600">{activeGroup.description}</p>
              </div>
            </div>
            <span className={`rounded-full border px-3 py-1 text-xs font-black uppercase tracking-[0.12em] ${activeGroup.softClass}`}>
              {activeGroup.exercises.length} calisma
            </span>
          </div>

          <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
            {activeGroup.exercises.map((exercise, index) => (
              <article
                key={exercise.href}
                className="fx-slide-up group flex min-h-[318px] flex-col overflow-hidden rounded-2xl border border-white/90 bg-white/94 shadow-[0_10px_28px_rgba(15,23,42,0.08)] transition duration-200 hover:-translate-y-1 hover:shadow-[0_18px_42px_rgba(15,23,42,0.13)]"
                style={{ animationDelay: `${index * 55}ms` }}
              >
                <div className={`relative h-[118px] border-b border-white/80 bg-gradient-to-br ${activeGroup.accentClass}`}>
                  <div className="absolute inset-0 bg-white/18" />
                  <div className="absolute inset-3 rounded-2xl bg-white/88 shadow-inner" />
                  <Image src={exercise.image} alt="" fill sizes="(min-width: 1536px) 25vw, (min-width: 1280px) 33vw, (min-width: 768px) 50vw, 100vw" className="object-contain p-5 transition duration-300 group-hover:scale-105" />
                </div>

                <div className="flex flex-1 flex-col p-4">
                  <div className="flex items-start justify-between gap-3">
                    <span className={`inline-flex h-9 min-w-9 items-center justify-center rounded-xl bg-gradient-to-br ${activeGroup.accentClass} px-2 text-xs font-black text-white shadow-md`}>
                      {exercise.icon}
                    </span>
                    <div className="flex flex-wrap justify-end gap-1.5">
                      {exercise.tags.map((tag) => (
                        <span key={tag} className={`rounded-full border px-2.5 py-1 text-[11px] font-bold ${activeGroup.softClass}`}>
                          {tag}
                        </span>
                      ))}
                    </div>
                  </div>

                  <h4 className="mt-3 text-xl font-black tracking-tight text-slate-950">{exercise.title}</h4>
                  <p className="mt-2 flex-1 text-sm leading-6 text-slate-600">{exercise.description}</p>

                  <Link
                    href={exercise.href}
                    className={`mt-4 inline-flex min-h-[46px] w-full items-center justify-center rounded-2xl bg-gradient-to-r ${activeGroup.accentClass} px-4 py-3 text-sm font-black text-white shadow-md shadow-slate-300/70 transition duration-200 active:scale-[0.98] group-hover:brightness-110 group-hover:shadow-lg`}
                  >
                    Calismaya Basla
                  </Link>
                </div>
              </article>
            ))}
          </div>
        </section>
      </section>
    </>
  );
}
