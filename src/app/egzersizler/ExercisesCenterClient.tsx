"use client";

import Image from "next/image";
import Link from "next/link";
import { useMemo } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";

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
  exercises: ExerciseCard[];
};

type CategoryTheme = {
  menuActive: string;
  menuInactiveHover: string;
  menuActiveIcon: string;
  menuInactiveIcon: string;
  menuCountBadge: string;
  menuChevronActive: string;
  headerLabel: string;
  headerBadge: string;
  headerIcon: string;
  cardHover: string;
  cardImage: string;
  cardCode: string;
  cardTag: string;
  cardButton: string;
  cardAccent: string;
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
    title: "Algı ve Dikkat",
    shortTitle: "Algı ve Dikkat",
    description: "Görsel algı, hızlı fark etme ve dikkat becerilerini geliştiren çalışmalar.",
    icon: "🎯",
    image: "/exercise-visuals/categories/attention.svg",
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
      {
        title: "Kelime Bulma",
        description: "Metin içindeki hedef kelimeyi hızla bul.",
        href: "/egzersizler/kelime-bulma",
        icon: "KB",
        image: "/exercise-visuals/exercises/word-finding.svg",
        tags: ["Tarama", "Kelime"],
      },
      {
        title: "Göz Egzersizleri: Kolonlar",
        description: "Farklı kelimeleri kolonlar boyunca ritmik göz hareketleriyle takip et.",
        href: "/egzersizler/goz-egzersizleri-kolonlar",
        icon: "GK",
        image: "/exercise-visuals/exercises/eye-columns.svg",
        tags: ["Göz Hareketi", "Kolonlar"],
      },
      {
        title: "KAREL: Kare Görme Alanı",
        description: "Merkez noktaya odaklanırken çevredeki iki harfi gör ve aynı mı farklı mı olduğunu belirle.",
        href: "/egzersizler/kare-gorme-alani",
        icon: "KG",
        image: "/exercise-visuals/exercises/square-vision.svg",
        tags: ["Görme Alanı", "Odak"],
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
        title: "Dikkat Labirenti",
        description: "Yolu gözlerinle takip et, doğru çıkışı bul ve dikkatini güçlendir.",
        href: "/egzersizler/dikkat-labirenti",
        icon: "DL",
        image: "/exercise-visuals/categories/attention.svg",
        tags: ["Takip", "Odak"],
      },
      {
        title: "Harf / Rakam Sayma Odak Çalışması",
        description: "Dağınık karakterler arasından hedef harf veya rakamı hızla say.",
        href: "/egzersizler/harf-rakam-sayma",
        icon: "HR",
        image: "/exercise-visuals/exercises/letter-number-counting.svg",
        tags: ["Sayma", "Odak"],
      },
      {
        title: "Ayni Olani Yakala",
        description: "Arka arkaya ayni gelen kelime, harf, sembol veya rakami yakala; dikkat ve tepki hizini guclendir.",
        href: "/egzersizler/ayni-olani-yakala",
        icon: "AO",
        image: "/exercise-visuals/exercises/similar-words.svg",
        tags: ["Dikkat", "Hiz"],
      },
    ],
  },
  {
    id: "word-games",
    title: "Kelime Oyunlari",
    shortTitle: "Kelime Oyunlari",
    description: "Kelime bilgisi, dikkat, hafiza ve hizli karar verme becerilerini gelistiren oyunlar.",
    icon: "🔤",
    image: "/exercise-visuals/categories/attention.svg",
    exercises: [
      {
        title: "Kelime Tahmin",
        description: "Gizli kelimeyi tahmin et, harflerin yerini bul ve kelime farkindaligini gelistir.",
        href: "/egzersizler/kelime-tahmin",
        icon: "KT",
        image: "/exercise-visuals/exercises/word-finding.svg",
        tags: ["Kelime", "Tahmin"],
      },
      {
        title: "Adam Asmaca",
        description: "Gizli kelimeyi harf tahminleriyle bul, kelime hafizani gelistir.",
        href: "/egzersizler/adam-asmaca",
        icon: "AA",
        image: "/exercise-visuals/exercises/focused-reading.svg",
        tags: ["Hafiza", "Kelime"],
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
        title: "Gruplama Çalışması",
        description: "Kelime gruplarını tek bakışta algılama ve okuma alanını geliştirme çalışması.",
        href: "/egzersizler/gruplama-calismasi",
        icon: "GR",
        image: "/exercise-visuals/exercises/grouping.svg",
        tags: ["Gruplama", "Okuma Alanı"],
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
        title: "Kart Hafıza",
        description: "Gördüğün kartları aklında tut, sonra gelen kartın daha önce gösterilip gösterilmediğini seç.",
        href: "/egzersizler/kart-hafiza",
        icon: "🃏",
        image: "/exercise-visuals/exercises/memory.svg",
        tags: ["Hafıza", "Odak"],
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
    title: "Ölçme",
    shortTitle: "Ölçme",
    description: "Hız ve anlama ölçümleri.",
    icon: "📝",
    image: "/exercise-visuals/categories/assessment.svg",
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

const CATEGORY_THEMES: Record<string, CategoryTheme> = {
  attention: {
    menuActive: "border-rose-200 bg-rose-50 ring-2 ring-rose-100",
    menuInactiveHover: "hover:border-rose-200 hover:shadow-rose-100/70",
    menuActiveIcon: "bg-white text-rose-600",
    menuInactiveIcon: "bg-rose-100 text-rose-700",
    menuCountBadge: "border-rose-200 bg-white text-rose-700",
    menuChevronActive: "text-rose-600",
    headerLabel: "text-rose-700",
    headerBadge: "border-rose-200 bg-rose-50 text-rose-800",
    headerIcon: "bg-rose-100 text-rose-700",
    cardHover: "hover:border-rose-200",
    cardImage: "bg-rose-50 border-rose-100",
    cardCode: "bg-rose-100 text-rose-700",
    cardTag: "border-rose-200 bg-rose-50 text-rose-700",
    cardButton: "bg-rose-600 hover:bg-rose-700",
    cardAccent: "from-rose-500 to-red-600",
  },
  fluency: {
    menuActive: "border-sky-200 bg-sky-50 ring-2 ring-sky-100",
    menuInactiveHover: "hover:border-sky-200 hover:shadow-sky-100/70",
    menuActiveIcon: "bg-white text-sky-600",
    menuInactiveIcon: "bg-sky-100 text-sky-700",
    menuCountBadge: "border-sky-200 bg-white text-sky-700",
    menuChevronActive: "text-sky-600",
    headerLabel: "text-sky-700",
    headerBadge: "border-sky-200 bg-sky-50 text-sky-800",
    headerIcon: "bg-sky-100 text-sky-700",
    cardHover: "hover:border-sky-200",
    cardImage: "bg-sky-50 border-sky-100",
    cardCode: "bg-sky-100 text-sky-700",
    cardTag: "border-sky-200 bg-sky-50 text-sky-700",
    cardButton: "bg-sky-600 hover:bg-sky-700",
    cardAccent: "from-sky-500 to-blue-600",
  },
  memory: {
    menuActive: "border-amber-200 bg-amber-50 ring-2 ring-amber-100",
    menuInactiveHover: "hover:border-amber-200 hover:shadow-amber-100/70",
    menuActiveIcon: "bg-white text-amber-600",
    menuInactiveIcon: "bg-amber-100 text-amber-700",
    menuCountBadge: "border-amber-200 bg-white text-amber-700",
    menuChevronActive: "text-amber-600",
    headerLabel: "text-amber-700",
    headerBadge: "border-amber-200 bg-amber-50 text-amber-900",
    headerIcon: "bg-amber-100 text-amber-700",
    cardHover: "hover:border-amber-200",
    cardImage: "bg-amber-50 border-amber-100",
    cardCode: "bg-amber-100 text-amber-700",
    cardTag: "border-amber-200 bg-amber-50 text-amber-700",
    cardButton: "bg-amber-500 hover:bg-amber-600",
    cardAccent: "from-amber-500 to-orange-600",
  },
  eye: {
    menuActive: "border-emerald-200 bg-emerald-50 ring-2 ring-emerald-100",
    menuInactiveHover: "hover:border-emerald-200 hover:shadow-emerald-100/70",
    menuActiveIcon: "bg-white text-emerald-600",
    menuInactiveIcon: "bg-emerald-100 text-emerald-700",
    menuCountBadge: "border-emerald-200 bg-white text-emerald-700",
    menuChevronActive: "text-emerald-600",
    headerLabel: "text-emerald-700",
    headerBadge: "border-emerald-200 bg-emerald-50 text-emerald-800",
    headerIcon: "bg-emerald-100 text-emerald-700",
    cardHover: "hover:border-emerald-200",
    cardImage: "bg-emerald-50 border-emerald-100",
    cardCode: "bg-emerald-100 text-emerald-700",
    cardTag: "border-emerald-200 bg-emerald-50 text-emerald-700",
    cardButton: "bg-emerald-600 hover:bg-emerald-700",
    cardAccent: "from-emerald-500 to-teal-600",
  },
  focus: {
    menuActive: "border-violet-200 bg-violet-50 ring-2 ring-violet-100",
    menuInactiveHover: "hover:border-violet-200 hover:shadow-violet-100/70",
    menuActiveIcon: "bg-white text-violet-600",
    menuInactiveIcon: "bg-violet-100 text-violet-700",
    menuCountBadge: "border-violet-200 bg-white text-violet-700",
    menuChevronActive: "text-violet-600",
    headerLabel: "text-violet-700",
    headerBadge: "border-violet-200 bg-violet-50 text-violet-800",
    headerIcon: "bg-violet-100 text-violet-700",
    cardHover: "hover:border-violet-200",
    cardImage: "bg-violet-50 border-violet-100",
    cardCode: "bg-violet-100 text-violet-700",
    cardTag: "border-violet-200 bg-violet-50 text-violet-700",
    cardButton: "bg-violet-600 hover:bg-violet-700",
    cardAccent: "from-violet-500 to-purple-600",
  },
  "word-games": {
    menuActive: "border-lime-200 bg-lime-50 ring-2 ring-lime-100",
    menuInactiveHover: "hover:border-lime-200 hover:shadow-lime-100/70",
    menuActiveIcon: "bg-white text-emerald-700",
    menuInactiveIcon: "bg-emerald-100 text-emerald-700",
    menuCountBadge: "border-lime-200 bg-white text-emerald-700",
    menuChevronActive: "text-emerald-700",
    headerLabel: "text-emerald-700",
    headerBadge: "border-lime-200 bg-lime-50 text-emerald-700",
    headerIcon: "bg-lime-100 text-emerald-700",
    cardHover: "hover:border-lime-200",
    cardImage: "bg-lime-50 border-lime-100",
    cardCode: "bg-lime-100 text-emerald-700",
    cardTag: "border-lime-200 bg-lime-50 text-emerald-700",
    cardButton: "bg-emerald-600 hover:bg-emerald-700",
    cardAccent: "from-lime-500 to-cyan-600",
  },
  assessment: {
    menuActive: "border-indigo-200 bg-indigo-50 ring-2 ring-indigo-100",
    menuInactiveHover: "hover:border-indigo-200 hover:shadow-indigo-100/70",
    menuActiveIcon: "bg-white text-indigo-600",
    menuInactiveIcon: "bg-indigo-100 text-indigo-700",
    menuCountBadge: "border-indigo-200 bg-white text-indigo-700",
    menuChevronActive: "text-indigo-600",
    headerLabel: "text-indigo-700",
    headerBadge: "border-indigo-200 bg-indigo-50 text-indigo-800",
    headerIcon: "bg-indigo-100 text-indigo-700",
    cardHover: "hover:border-indigo-200",
    cardImage: "bg-indigo-50 border-indigo-100",
    cardCode: "bg-indigo-100 text-indigo-700",
    cardTag: "border-indigo-200 bg-indigo-50 text-indigo-700",
    cardButton: "bg-indigo-600 hover:bg-indigo-700",
    cardAccent: "from-indigo-500 to-purple-600",
  },
};

const FALLBACK_THEME = CATEGORY_THEMES.attention;

function buildDeterministicGroups(groups: ExerciseGroup[]): ExerciseGroup[] {
  const usedHrefs = new Set<string>();

  return groups.map((group) => {
    const uniqueExercises = group.exercises.filter((exercise) => {
      if (usedHrefs.has(exercise.href)) {
        return false;
      }

      usedHrefs.add(exercise.href);
      return true;
    });

    return {
      ...group,
      exercises: uniqueExercises,
    };
  });
}

const DETERMINISTIC_EXERCISE_GROUPS = buildDeterministicGroups(EXERCISE_GROUPS);
const EXERCISE_COUNT_BY_GROUP_ID = DETERMINISTIC_EXERCISE_GROUPS.reduce<Record<string, number>>((accumulator, group) => {
  accumulator[group.id] = group.exercises.length;
  return accumulator;
}, {});
const EXERCISE_GROUP_ID_SET = new Set(DETERMINISTIC_EXERCISE_GROUPS.map((group) => group.id));

function resolveGroupId(value: string | null): string {
  if (value && EXERCISE_GROUP_ID_SET.has(value)) {
    return value;
  }

  return DEFAULT_GROUP_ID;
}

export function ExercisesCenterClient() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const activeGroupId = useMemo(() => {
    return resolveGroupId(searchParams.get("category"));
  }, [searchParams]);

  const activeGroup = useMemo(() => {
    return DETERMINISTIC_EXERCISE_GROUPS.find((group) => group.id === activeGroupId) ?? DETERMINISTIC_EXERCISE_GROUPS[0];
  }, [activeGroupId]);

  const activeTheme = CATEGORY_THEMES[activeGroup.id] ?? FALLBACK_THEME;

  const handleCategorySelect = (groupId: string) => {
    const nextGroupId = resolveGroupId(groupId);

    if (nextGroupId === activeGroupId) {
      return;
    }

    const nextSearchParams = new URLSearchParams(searchParams.toString());
    nextSearchParams.set("category", nextGroupId);
    router.replace(`${pathname}?${nextSearchParams.toString()}`, { scroll: false });
  };

  return (
    <section className="grid min-h-[calc(100vh-220px)] gap-4 lg:grid-cols-[360px_minmax(0,1fr)] 2xl:grid-cols-[380px_minmax(0,1fr)]">
      <aside className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm lg:sticky lg:top-4 lg:max-h-[calc(100vh-120px)] lg:self-start lg:overflow-y-auto">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-slate-700">Calisma Kategorileri</p>
            <h3 className="mt-0.5 text-[20px] font-semibold tracking-tight text-slate-950">Kategoriler</h3>
            <p className="mt-1 max-w-sm text-sm leading-5 text-slate-600">Bir kategori secerek calismalari goruntule.</p>
          </div>
          <span className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-[11px] font-semibold text-slate-700">
            {DETERMINISTIC_EXERCISE_GROUPS.length} kategori
          </span>
        </div>

        <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-1">
          {DETERMINISTIC_EXERCISE_GROUPS.map((group) => {
            const isActive = group.id === activeGroupId;
            const groupTheme = CATEGORY_THEMES[group.id] ?? FALLBACK_THEME;

            return (
              <button
                key={group.id}
                type="button"
                onClick={() => handleCategorySelect(group.id)}
                aria-pressed={isActive}
                className={`group flex min-h-[118px] w-full items-start gap-4 rounded-2xl border bg-white p-4 text-left shadow-sm transition duration-200 ${
                  isActive
                    ? groupTheme.menuActive
                    : `border-slate-200 hover:-translate-y-0.5 hover:shadow-md ${groupTheme.menuInactiveHover}`
                }`}
              >
                <span
                  className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl text-2xl ${
                    isActive ? groupTheme.menuActiveIcon : groupTheme.menuInactiveIcon
                  }`}
                >
                  {group.icon}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block text-[10px] font-semibold tracking-tight text-slate-950">{group.title}</span>
                  <span className="mt-1 block text-sm leading-5 text-slate-600">{group.description}</span>
                  <span
                    className={`mt-2 inline-flex rounded-full border px-2.5 py-1 text-[11px] font-semibold ${
                      isActive ? groupTheme.menuCountBadge : groupTheme.headerBadge
                    }`}
                  >
                    {EXERCISE_COUNT_BY_GROUP_ID[group.id] ?? 0} calisma
                  </span>
                </span>
                <span className={`mt-1 text-lg font-semibold ${isActive ? groupTheme.menuChevronActive : "text-slate-300"}`}>{">"}</span>
              </button>
            );
          })}
        </div>
      </aside>

      <section className="min-w-0 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm md:p-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="flex min-w-0 items-start gap-3">
            <span className={`inline-flex h-10 min-w-10 items-center justify-center rounded-xl text-lg ${activeTheme.headerIcon}`}>
              {activeGroup.icon}
            </span>
            <div className="min-w-0">
              <p className={`text-[10px] font-bold uppercase tracking-[0.2em] ${activeTheme.headerLabel}`}>{activeGroup.shortTitle}</p>
              <h3 className="mt-0.5 text-[20px] font-semibold tracking-tight text-slate-950">{activeGroup.title}</h3>
              <p className="mt-0.5 max-w-3xl text-sm leading-5 text-slate-600">{activeGroup.description}</p>
            </div>
          </div>
          <span className={`rounded-full border px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.1em] ${activeTheme.headerBadge}`}>
            {EXERCISE_COUNT_BY_GROUP_ID[activeGroup.id] ?? 0} calisma
          </span>
        </div>

        <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
          {activeGroup.exercises.map((exercise, index) => (
            <article
              key={exercise.href}
              className={`group flex min-h-[220px] flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm transition duration-200 hover:-translate-y-0.5 hover:shadow-md ${activeTheme.cardHover}`}
              style={{ animationDelay: `${index * 55}ms` }}
            >
              <div className={`relative h-[88px] border-b ${activeTheme.cardImage}`}>
                <div className={`absolute inset-x-0 top-0 h-1 bg-gradient-to-r ${activeTheme.cardAccent}`} />
                <Image src={exercise.image} alt="" fill sizes="(min-width: 1440px) 25vw, (min-width: 1280px) 33vw, (min-width: 640px) 50vw, 100vw" className="object-contain p-3.5" />
              </div>

              <div className="flex flex-1 flex-col p-4">
                <div className="flex items-start justify-between gap-3">
                  <span className={`inline-flex h-8 min-w-8 items-center justify-center rounded-lg px-2 text-[11px] font-semibold ${activeTheme.cardCode}`}>
                    {exercise.icon}
                  </span>
                  <div className="flex flex-wrap justify-end gap-1.5">
                    {exercise.tags.slice(0, 2).map((tag) => (
                      <span key={tag} className={`rounded-full border px-2.5 py-0.5 text-[11px] font-semibold ${activeTheme.cardTag}`}>
                        {tag}
                      </span>
                    ))}
                  </div>
                </div>

                <h4 className="mt-2.5 text-[18px] font-semibold tracking-tight text-slate-950">{exercise.title}</h4>
                <p className="mt-1.5 flex-1 text-sm leading-5 text-slate-600">{exercise.description}</p>

                <Link
                  href={exercise.href}
                  className={`mt-3.5 inline-flex min-h-[40px] w-full items-center justify-center rounded-xl px-4 py-2 text-sm font-semibold text-white transition duration-200 active:scale-[0.98] ${activeTheme.cardButton}`}
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


