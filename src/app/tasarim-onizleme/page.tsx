"use client";

import { AccentPicker } from "@/components/theme/AccentPicker";
import { IdilThemeProvider, useIdilTheme } from "@/components/theme/IdilThemeProvider";
import { ThemeSwitcher } from "@/components/theme/ThemeSwitcher";
import { DashboardStatCard } from "@/components/ui/DashboardStatCard";
import { ExerciseCategoryCard } from "@/components/ui/ExerciseCategoryCard";
import { GlassCard } from "@/components/ui/GlassCard";

const topNavigationItems = ["Ana Sayfa", "Egzersizler", "Kategoriler"];
const filterItems = ["Tümü", "Odaklanma", "Algılama", "Metin", "Hafıza", "Hızlı Okuma", "Testler"];

const stats = [
  { label: "Bugünkü seri", value: "12", detail: "Tamamlanan egzersiz", icon: "•" },
  { label: "Ortalama hız", value: "312", detail: "Kelime / dakika", icon: "↗" },
  { label: "Başarı oranı", value: "%92", detail: "Son test ortalaması", icon: "★" },
  { label: "Aktif plan", value: "6", detail: "Kalan oturum", icon: "✓" },
];

const categories = [
  { title: "Odaklanma Çalışmaları", description: "Dikkatini artır", badge: "24 egzersiz", metric: "Odak", icon: "◉", sticker: "🧠", orbit: "✦", spark: "◌", trail: "Nefes", highlights: ["Dikkat", "Ritim"], tone: "accent" as const },
  { title: "Göz Algılama", description: "Görsel algını geliştir", badge: "18 egzersiz", metric: "Algılama", icon: "◐", sticker: "👀", orbit: "◎", spark: "↗", trail: "Tarama", highlights: ["Görsel hız", "Seçici dikkat"], tone: "orange" as const },
  { title: "Metin Çalışmaları", description: "Anlama becerini güçlendir", badge: "28 egzersiz", metric: "Metin", icon: "≣", sticker: "📘", orbit: "⋯", spark: "Aa", trail: "Akış", highlights: ["Akıcılık", "Takip"], tone: "blue" as const },
  { title: "Hafıza", description: "Kısa ve uzun süreli hafıza", badge: "16 egzersiz", metric: "Hafıza", icon: "✦", sticker: "🧩", orbit: "✺", spark: "▣", trail: "Eşleştir", highlights: ["Eşleştirme", "Hatırlama"], tone: "green" as const },
  { title: "Hızlı Okuma", description: "Okuma hızını artır", badge: "20 egzersiz", metric: "Hız", icon: "⚡", sticker: "🚀", orbit: "➜", spark: "»", trail: "Sprint", highlights: ["Kelime akışı", "Tempo"], tone: "accent" as const },
  { title: "Okuma Testleri", description: "Kendini test et", badge: "32 test", metric: "Test", icon: "🏆", sticker: "🎯", orbit: "★", spark: "✓", trail: "Skor", highlights: ["Puan", "Gelişim"], tone: "rose" as const },
];

const exercises = [
  { title: "Noktaya Odaklan", subtitle: "Dikkat süreni uzat", tags: ["Odaklanma", "Başlangıç"], duration: "5 dk", rating: "4.8", icon: "◎", tone: "accent" as const },
  { title: "Görsel Tarama", subtitle: "Göz hareketlerini geliştir", tags: ["Algılama", "Orta"], duration: "6 dk", rating: "4.7", icon: "✣", tone: "orange" as const },
  { title: "Paragrafı Anla", subtitle: "Okuduğunu anlama", tags: ["Metin", "Orta"], duration: "6 dk", rating: "4.9", icon: "☰", tone: "blue" as const },
  { title: "Hafıza Matrisi", subtitle: "Kısa süreli hafızanı güçlendir", tags: ["Hafıza", "Orta"], duration: "7 dk", rating: "4.6", icon: "✤", tone: "green" as const },
  { title: "Hızlı Kelime", subtitle: "Kelime tanıma hızını artır", tags: ["Hızlı Okuma", "Başlangıç"], duration: "5 dk", rating: "4.7", icon: "⚡", tone: "accent" as const },
  { title: "Anlama Testi", subtitle: "Okuduğunu test et", tags: ["Testler", "Orta"], duration: "10 dk", rating: "4.9", icon: "☷", tone: "rose" as const },
  { title: "Şekil Hafızası", subtitle: "Görsel hafızanı geliştir", tags: ["Hafıza", "Başlangıç"], duration: "6 dk", rating: "4.5", icon: "▦", tone: "orange" as const },
  { title: "Odak Süresi", subtitle: "Kesintisiz odaklanma", tags: ["Odaklanma", "Orta"], duration: "8 dk", rating: "4.8", icon: "◌", tone: "blue" as const },
];

const activities = [
  { title: "Paragrafı Anla", meta: "Metin Çalışmaları · Orta", time: "Bugün, 16:45", badge: "Başarı: %66", color: "blue" },
  { title: "Noktaya Odaklan", meta: "Odaklanma · Başlangıç", time: "Bugün, 15:20", badge: "Başarı: %92", color: "accent" },
  { title: "Görsel Tarama", meta: "Algılama · Orta", time: "Bugün, 14:00", badge: "Başarı: %78", color: "orange" },
  { title: "Hafıza Matrisi", meta: "Hafıza · Orta", time: "Dün, 19:30", badge: "Başarı: %88", color: "green" },
  { title: "Anlama Testi", meta: "Testler · Orta", time: "Dün, 18:10", badge: "Puan: %90", color: "rose" },
];

const favorites = [
  { title: "Paragrafı Anla", meta: "Metin Çalışmaları · Orta", color: "blue" },
  { title: "Noktaya Odaklan", meta: "Odaklanma · Başlangıç", color: "accent" },
  { title: "Hafıza Matrisi", meta: "Hafıza · Başlangıç", color: "green" },
];

const journeyCards = [
  {
    eyebrow: "Nerede Kaldın",
    title: "Kelime Hızlandırıcı - 3. adım",
    description: "Dün bıraktığın akışta 4 dakika kaldı. Aynı tempoyla devam edebilirsin.",
    cta: "Kaldığın Yerden Devam Et",
    badge: "%78 tamamlandı",
    icon: "⟲",
    metric: "4 dk kaldı",
    note: "Son bırakılan bölüm · periferik tarama",
    accentLabel: "Canlı oturum",
    tone: "accent" as const,
  },
  {
    eyebrow: "Önerilen Çalışmalar",
    title: "Bugün için kısa odak paketi",
    description: "Odaklanma + göz tarama + paragraf anlama seti senin ritmine göre hazırlandı.",
    cta: "3 Egzersizle Başla",
    badge: "12 dk toplam",
    icon: "⚡",
    metric: "3 egzersiz",
    note: "Düşük yoğunluklu başlangıç paketi",
    accentLabel: "Sana özel",
    tone: "blue" as const,
  },
  {
    eyebrow: "Geçmişim",
    title: "Son 7 günde istikrarlı ilerleme",
    description: "4 gün üst üste çalıştın, okuma hızında 26 wpm artış yakaladın.",
    cta: "Tüm Geçmişimi Gör",
    badge: "+26 wpm",
    icon: "↗",
    metric: "%92 anlama",
    note: "Bu hafta en iyi performans Perşembe",
    accentLabel: "Haftalık özet",
    tone: "green" as const,
  },
];

const readingPerformance = [
  { label: "Okuma Hızı", value: "312 wpm", delta: "+24", width: "78%", tone: "accent" as const },
  { label: "Anlama", value: "%92", delta: "+6", width: "92%", tone: "blue" as const },
  { label: "Odak Süresi", value: "18 dk", delta: "+3", width: "66%", tone: "green" as const },
];

const progressTimeline = [
  { day: "Pzt", score: 64 },
  { day: "Sal", score: 82 },
  { day: "Çrş", score: 71 },
  { day: "Per", score: 88 },
  { day: "Cum", score: 94 },
  { day: "Cts", score: 76 },
  { day: "Paz", score: 90 },
];

const historyMoments = [
  { title: "İlk 300 wpm eşiğini geçtin", meta: "2 gün önce" },
  { title: "Hafıza Matrisi serisini tamamladın", meta: "Dün" },
  { title: "Öğretmenin yeni plan ekledi", meta: "Bugün" },
];

export default function DesignPreviewPage() {
  return (
    <IdilThemeProvider className="min-h-screen bg-[var(--idil-page-bg)] text-[var(--idil-text)]">
      <PreviewCanvas />
    </IdilThemeProvider>
  );
}

function PreviewCanvas() {
  const { accent, mounted, theme } = useIdilTheme();
  const studentName = "Derin";

  return (
    <main className="relative isolate overflow-hidden bg-[var(--idil-page-bg)]">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,var(--idil-accent-soft),transparent_26%),radial-gradient(circle_at_top_right,var(--idil-accent-soft-strong),transparent_22%)]" />
      <div className="relative mx-auto flex min-h-screen w-full max-w-[1280px] flex-col gap-5 px-4 py-5 lg:px-6">
        <GlassCard className="border-white/6 bg-[var(--idil-header)] px-4 py-3">
          <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
            <div className="flex min-w-0 items-center gap-4">
              <div className="inline-flex items-center gap-3">
                <span className="text-2xl text-[var(--idil-brand)]">❦</span>
                <div>
                  <p className="text-2xl font-bold tracking-[-0.04em] text-[var(--idil-brand)]">İdil Hızlı Okuma</p>
                </div>
              </div>
            </div>

            <div className="flex flex-1 flex-col gap-3 xl:mx-8 xl:max-w-[430px]">
              <label className="flex min-h-[44px] items-center gap-3 rounded-2xl border border-[var(--idil-border)] bg-[var(--idil-soft-block)] px-4 text-sm text-[var(--idil-muted)]">
                <span>⌕</span>
                <input className="min-h-0 flex-1 border-0 bg-transparent p-0 text-sm text-[var(--idil-text)] outline-none" placeholder="Ara (egzersiz, kategori, konu...)" />
                <span className="rounded-lg border border-[var(--idil-border)] px-2 py-1 text-[11px]">⌘ K</span>
              </label>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <ThemeSwitcher />
              <AccentPicker />
              <button type="button" className="relative inline-flex h-10 w-10 items-center justify-center rounded-full border border-[var(--idil-border)] bg-[var(--idil-soft-block)] text-[var(--idil-text)]">◔<span className="absolute right-0 top-0 h-4 w-4 rounded-full bg-red-500 text-[10px] font-bold text-white">2</span></button>
              <div className="inline-flex items-center gap-3 rounded-full border border-[var(--idil-border)] bg-[var(--idil-soft-block)] px-3 py-2">
                <span className="inline-flex h-10 w-10 items-center justify-center rounded-full text-sm font-bold text-white" style={{ background: "linear-gradient(135deg,var(--idil-brand),var(--idil-accent-strong))" }}>D</span>
                <div className="pr-1">
                  <p className="text-sm font-semibold text-[var(--idil-text)]">Demo Öğrenci</p>
                  <p className="text-xs text-[var(--idil-muted)]">7. Sınıf</p>
                </div>
                <span className="text-[var(--idil-muted)]">⌄</span>
              </div>
            </div>
          </div>
        </GlassCard>

        <div className="flex flex-wrap items-center gap-2 px-1 text-sm text-[var(--idil-muted)]">
          {topNavigationItems.map((item, index) => (
            <div key={item} className="inline-flex items-center gap-2">
              <span className={`${index === 1 ? "font-semibold text-[var(--idil-accent)]" : ""}`}>{item}</span>
              {index < topNavigationItems.length - 1 ? <span>›</span> : null}
            </div>
          ))}
        </div>

        <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_320px]">
          <div className="space-y-4">
            <GlassCard className="relative overflow-hidden border-white/8 p-7" style={{ background: "linear-gradient(135deg,#33235d 0%, #5b2d83 45%, #302a68 100%)" }}>
              <div className="absolute inset-y-0 right-0 w-[42%] bg-[radial-gradient(circle_at_center,rgba(255,255,255,0.14),transparent_42%)]" />
              <div className="absolute right-16 top-1/2 hidden h-24 w-24 -translate-y-1/2 rounded-full border border-white/10 bg-pink-400/20 shadow-[0_0_60px_rgba(244,114,182,0.45)] lg:block" />
              <div className="absolute right-24 top-1/2 hidden -translate-y-1/2 text-7xl drop-shadow-[0_0_22px_rgba(244,114,182,0.45)] lg:block">🎯</div>
              <div className="relative z-10 max-w-2xl">
                <div className="inline-flex items-center gap-2 rounded-full border border-white/12 bg-white/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-white/75">
                  <span>●</span>
                  Hoş geldin, {studentName}
                </div>
                <h1 className="mt-4 text-[2.6rem] font-bold tracking-[-0.06em] text-white">Bugün ritmini yakala, {studentName}.</h1>
                <p className="mt-3 max-w-2xl text-[15px] leading-7 text-white/72">Kaldığın yerden devam et, önerilen çalışmalarını tamamla ve okuma performansındaki yükselişi canlı takip et.</p>
                <div className="mt-5 flex flex-wrap gap-2 text-sm text-white/78">
                  <span className="rounded-full border border-white/12 bg-white/10 px-3 py-1">Son giriş: Bugün 16:45</span>
                  <span className="rounded-full border border-white/12 bg-white/10 px-3 py-1">4 günlük seri aktif</span>
                  <span className="rounded-full border border-white/12 bg-white/10 px-3 py-1">Öğretmen planı güncel</span>
                </div>
                <div className="mt-6 flex flex-wrap gap-3">
                  <button type="button" className="inline-flex min-h-[46px] items-center gap-2 rounded-2xl bg-white px-5 py-2 text-sm font-semibold text-slate-950">Önerilen Egzersizlere Git <span>→</span></button>
                  <button type="button" className="inline-flex min-h-[46px] items-center gap-2 rounded-2xl border border-white/20 bg-white/8 px-5 py-2 text-sm font-semibold text-white">☐ Çalışma Planım</button>
                </div>
              </div>
            </GlassCard>

            <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
              {stats.map((stat) => (
                <DashboardStatCard key={stat.label} {...stat} />
              ))}
            </section>

            <section className="grid gap-4 xl:grid-cols-12">
              {journeyCards.map((card) => (
                <JourneyCard key={card.title} {...card} theme={theme} />
              ))}
            </section>

            <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
              <div className="flex flex-wrap gap-2">
                {filterItems.map((item, index) => (
                  <button key={item} type="button" className={`rounded-xl border px-3 py-2 text-sm font-medium transition ${index === 0 ? "border-[var(--idil-accent)] bg-[var(--idil-accent)]/18 text-white shadow-[0_12px_24px_var(--idil-shadow)]" : "border-[var(--idil-border)] bg-[var(--idil-soft-block)] text-[var(--idil-muted)] hover:text-[var(--idil-text)]"}`}>
                    {item}
                  </button>
                ))}
                <button type="button" className="rounded-xl border border-[var(--idil-border)] bg-[var(--idil-soft-block)] px-3 py-2 text-sm text-[var(--idil-muted)]">...</button>
              </div>

              <div className="flex flex-wrap gap-2">
                <label className="flex min-h-[42px] items-center gap-2 rounded-xl border border-[var(--idil-border)] bg-[var(--idil-soft-block)] px-4 text-sm text-[var(--idil-muted)]">
                  <input className="min-h-0 w-32 border-0 bg-transparent p-0 text-sm text-[var(--idil-text)] outline-none" placeholder="Egzersiz ara..." />
                  <span>⌕</span>
                </label>
                <button type="button" className="rounded-xl border border-[var(--idil-border)] bg-[var(--idil-soft-block)] px-4 py-2 text-sm text-[var(--idil-muted)]">Sırala: Önerilen ⌄</button>
                <button type="button" className="rounded-xl border border-[var(--idil-border)] bg-[var(--idil-soft-block)] px-3 py-2 text-sm text-[var(--idil-muted)]">◫</button>
                <button type="button" className="rounded-xl border border-[var(--idil-border)] bg-[var(--idil-soft-block)] px-3 py-2 text-sm text-[var(--idil-muted)]">☷</button>
              </div>
            </div>

            <section>
              <div className="mb-3 flex items-center justify-between gap-3">
                <div>
                  <p className="text-[11px] font-bold uppercase tracking-[0.22em] text-[var(--idil-muted)]">Kategoriler</p>
                </div>
                <button type="button" className="text-sm font-medium text-[var(--idil-accent)]">Tüm Kategorileri Gör →</button>
              </div>
              <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                {categories.map((category) => (
                  <ExerciseCategoryCard key={category.title} {...category} theme={theme} />
                ))}
              </div>
            </section>

            <section>
              <div className="mb-3 flex items-center justify-between gap-3">
                <div>
                  <p className="text-[11px] font-bold uppercase tracking-[0.22em] text-[var(--idil-muted)]">Egzersizler</p>
                </div>
                <button type="button" className="text-sm font-medium text-[var(--idil-accent)]">Tüm Egzersizleri Gör →</button>
              </div>
              <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
                {exercises.map((exercise) => (
                  <ExercisePreviewCard key={exercise.title} {...exercise} />
                ))}
              </div>
              <div className="mt-4 flex justify-center">
                <button type="button" className="rounded-xl border border-[var(--idil-border)] bg-[var(--idil-soft-block)] px-5 py-2 text-sm font-medium text-[var(--idil-muted)]">Daha Fazla Egzersiz Yükle ⌄</button>
              </div>
            </section>
          </div>

          <div className="space-y-4">
            <GlassCard className="p-4">
              <div className="flex items-center justify-between gap-3">
                <p className="text-[11px] font-bold uppercase tracking-[0.22em] text-[var(--idil-muted)]">Okuma Performansı</p>
                <span className="rounded-full bg-emerald-500/12 px-2.5 py-1 text-[11px] font-semibold text-emerald-300">Bu hafta yükselişte</span>
              </div>
              <div className="mt-4 space-y-4">
                {readingPerformance.map((item) => (
                  <ReadingPerformanceRow key={item.label} {...item} />
                ))}
              </div>
            </GlassCard>

            <GlassCard className="p-4">
              <div className="flex items-center justify-between gap-3">
                <p className="text-[11px] font-bold uppercase tracking-[0.22em] text-[var(--idil-muted)]">İlerleme Geçmişi</p>
                <button type="button" className="text-xs font-medium text-[var(--idil-accent)]">Detaylı Gör</button>
              </div>
              <div className="mt-4 flex items-end gap-2 rounded-2xl border border-[var(--idil-border)] bg-[var(--idil-soft-block)] px-3 pb-3 pt-5">
                {progressTimeline.map((item) => (
                  <div key={item.day} className="flex flex-1 flex-col items-center gap-2">
                    <div className="flex h-28 w-full items-end rounded-full bg-white/5 px-1 py-1">
                      <div className="w-full rounded-full" style={{ height: `${item.score}%`, background: "linear-gradient(180deg,var(--idil-accent),var(--idil-accent-strong))" }} />
                    </div>
                    <span className="text-[11px] text-[var(--idil-muted)]">{item.day}</span>
                  </div>
                ))}
              </div>
            </GlassCard>

            <GlassCard className="p-4">
              <div className="flex items-center justify-between gap-3">
                <p className="text-[11px] font-bold uppercase tracking-[0.22em] text-[var(--idil-muted)]">Görünüm ve Tema</p>
                <span className="text-[var(--idil-muted)]">⌄</span>
              </div>
              <div className="mt-4 space-y-4">
                <div className="flex items-center justify-between gap-3">
                  <span className="text-sm text-[var(--idil-muted)]">Tema</span>
                  <ThemeSwitcher />
                </div>
                <div className="space-y-2">
                  <span className="text-sm text-[var(--idil-muted)]">Renk Teması</span>
                  <AccentPicker />
                </div>
                <div className="rounded-2xl border border-[var(--idil-border)] bg-[var(--idil-soft-block)] px-3 py-2 text-xs text-[var(--idil-muted)]">
                  {mounted ? `Aktif görünüm: ${theme} / ${accent}` : "yükleniyor"}
                </div>
              </div>
            </GlassCard>

            <GlassCard className="p-4">
              <div className="flex items-center justify-between gap-3">
                <p className="text-[11px] font-bold uppercase tracking-[0.22em] text-[var(--idil-muted)]">Son Aktiviteler</p>
                <button type="button" className="text-xs font-medium text-[var(--idil-accent)]">Tümünü Gör</button>
              </div>
              <div className="mt-4 space-y-3">
                {activities.map((activity) => (
                  <ActivityRow key={activity.title} {...activity} />
                ))}
              </div>
            </GlassCard>

            <GlassCard className="p-4">
              <div className="flex items-center justify-between gap-3">
                <p className="text-[11px] font-bold uppercase tracking-[0.22em] text-[var(--idil-muted)]">Favori Egzersizler</p>
                <button type="button" className="text-xs font-medium text-[var(--idil-accent)]">Düzenle</button>
              </div>
              <div className="mt-4 space-y-3">
                {favorites.map((favorite) => (
                  <FavoriteRow key={favorite.title} {...favorite} />
                ))}
              </div>
            </GlassCard>

            <GlassCard className="p-4">
              <div className="flex items-center justify-between gap-3">
                <p className="text-[11px] font-bold uppercase tracking-[0.22em] text-[var(--idil-muted)]">Geçmişim</p>
                <button type="button" className="text-xs font-medium text-[var(--idil-accent)]">Arşive Git</button>
              </div>
              <div className="mt-4 space-y-3">
                {historyMoments.map((item) => (
                  <div key={item.title} className="rounded-2xl border border-[var(--idil-border)] bg-[var(--idil-soft-block)] p-3">
                    <p className="text-sm font-semibold text-[var(--idil-text)]">{item.title}</p>
                    <p className="mt-1 text-xs text-[var(--idil-muted)]">{item.meta}</p>
                  </div>
                ))}
              </div>
            </GlassCard>

            <GlassCard className="overflow-hidden p-4" style={{ background: "linear-gradient(135deg,rgba(96,41,150,0.85),rgba(68,29,120,0.96))" }}>
              <p className="text-sm font-semibold text-white">Günlük Hedefini Tamamla! 🎯</p>
              <p className="mt-2 text-sm text-white/72">Bugün 12 egzersiz kaldı.</p>
              <div className="mt-4 flex items-center justify-between gap-3 text-white">
                <span className="text-2xl font-semibold tracking-[-0.04em]">6 / 18</span>
                <span className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-white/10 bg-white/8">→</span>
              </div>
              <div className="mt-4 h-2 rounded-full bg-white/12">
                <div className="h-full w-1/3 rounded-full bg-pink-300" />
              </div>
            </GlassCard>
          </div>
        </div>
      </div>
    </main>
  );
}

function JourneyCard({
  eyebrow,
  title,
  description,
  cta,
  badge,
  icon,
  metric,
  note,
  accentLabel,
  theme,
  tone,
}: {
  eyebrow: string;
  title: string;
  description: string;
  cta: string;
  badge: string;
  icon: string;
  metric: string;
  note: string;
  accentLabel: string;
  theme: "light" | "dark";
  tone: "accent" | "blue" | "green";
}) {
  const toneClass = {
    accent: "from-[var(--idil-accent)]/18 via-[var(--idil-accent-strong)]/10 to-transparent",
    blue: "from-sky-500/18 via-blue-500/10 to-transparent",
    green: "from-emerald-500/18 via-lime-500/10 to-transparent",
  }[tone];

  const toneGlow = {
    accent: "radial-gradient(circle at 30% 30%, rgba(255,255,255,0.24), transparent 42%), linear-gradient(135deg, rgba(168,85,247,0.18), rgba(99,102,241,0.04))",
    blue: "radial-gradient(circle at 30% 30%, rgba(255,255,255,0.26), transparent 42%), linear-gradient(135deg, rgba(56,189,248,0.18), rgba(37,99,235,0.04))",
    green: "radial-gradient(circle at 30% 30%, rgba(255,255,255,0.26), transparent 42%), linear-gradient(135deg, rgba(16,185,129,0.18), rgba(132,204,22,0.04))",
  }[tone];

  const spanClass = {
    accent: "xl:col-span-5",
    blue: "xl:col-span-4",
    green: "xl:col-span-3",
  }[tone];

  const cinematicSurface =
    theme === "dark"
      ? "border-white/8 bg-[linear-gradient(180deg,rgba(10,16,30,0.96),rgba(15,23,42,0.9))] shadow-[0_30px_80px_rgba(2,6,23,0.55)]"
      : "border-white/20 bg-[linear-gradient(180deg,rgba(255,255,255,0.9),rgba(255,255,255,0.74))] shadow-[0_22px_55px_rgba(15,23,42,0.10)]";

  const metricTone = theme === "dark" ? "text-white" : "text-[var(--idil-text)]";

  return (
    <GlassCard className={`relative overflow-hidden p-6 ${spanClass} ${cinematicSurface}`}>
      <div className={`absolute inset-x-0 top-0 h-full bg-gradient-to-br ${toneClass}`} />
      <div className="absolute inset-y-0 right-0 w-[44%] opacity-90" style={{ background: toneGlow }} />
      {theme === "dark" ? <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(255,255,255,0.08),transparent_28%),radial-gradient(circle_at_bottom_right,rgba(255,255,255,0.04),transparent_26%)]" /> : null}
      <div className="absolute right-5 top-5 h-24 w-24 rounded-full border border-white/8 bg-white/6 blur-2xl" />
      <div className="relative z-10 flex h-full flex-col justify-between gap-6">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-[var(--idil-muted)]">{eyebrow}</p>
            <span className="mt-3 inline-flex rounded-full border border-[var(--idil-border)] bg-[var(--idil-soft-block)] px-3 py-1 text-xs font-medium text-[var(--idil-muted)]">
              {accentLabel}
            </span>
          </div>
          <div className="relative h-20 w-20 shrink-0">
            <span className="absolute inset-0 rounded-[28px] border border-white/10 bg-white/6 backdrop-blur-xl" />
            <span className="absolute left-3 top-3 text-3xl idil-float">{icon}</span>
            <span className="absolute -right-1 top-2 inline-flex h-7 min-w-7 items-center justify-center rounded-full border border-white/10 bg-white/12 px-2 text-[11px] font-semibold text-white/90 idil-drift">{badge}</span>
          </div>
        </div>

        <div className="max-w-[28rem] space-y-3">
          <h3 className="text-[1.55rem] font-semibold leading-8 tracking-[-0.04em] text-[var(--idil-text)]">{title}</h3>
          <p className="text-sm leading-7 text-[var(--idil-muted)]">{description}</p>
        </div>

        <div className="grid gap-3 sm:grid-cols-[1fr_auto] sm:items-end">
          <div className="space-y-3">
            <div className="flex items-center gap-3">
              <span className={`text-2xl font-semibold tracking-[-0.04em] ${metricTone}`}>{metric}</span>
              <span className="rounded-full border border-[var(--idil-border)] bg-[var(--idil-soft-block)] px-3 py-1 text-xs text-[var(--idil-muted)]">{badge}</span>
            </div>
            <p className="text-xs uppercase tracking-[0.18em] text-[var(--idil-muted)]">{note}</p>
          </div>
          <button type="button" className="inline-flex min-h-[46px] items-center justify-center rounded-2xl px-4 py-2 text-sm font-semibold text-white shadow-[0_18px_45px_var(--idil-shadow)]" style={{ background: "linear-gradient(135deg,var(--idil-accent),var(--idil-accent-strong))" }}>
            {cta} →
          </button>
        </div>
      </div>
    </GlassCard>
  );
}

function ReadingPerformanceRow({
  label,
  value,
  delta,
  width,
  tone,
}: {
  label: string;
  value: string;
  delta: string;
  width: string;
  tone: "accent" | "blue" | "green";
}) {
  const toneClass = {
    accent: "linear-gradient(135deg,var(--idil-accent),var(--idil-accent-strong))",
    blue: "linear-gradient(135deg,#38bdf8,#2563eb)",
    green: "linear-gradient(135deg,#10b981,#84cc16)",
  }[tone];

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-sm font-semibold text-[var(--idil-text)]">{label}</p>
          <p className="text-xs text-[var(--idil-muted)]">Son 7 güne göre {delta}</p>
        </div>
        <span className="text-sm font-semibold text-[var(--idil-text)]">{value}</span>
      </div>
      <div className="h-2 rounded-full bg-white/6">
        <div className="h-full rounded-full" style={{ width, background: toneClass }} />
      </div>
    </div>
  );
}

function ExercisePreviewCard({
  title,
  subtitle,
  tags,
  duration,
  rating,
  icon,
  tone,
}: {
  title: string;
  subtitle: string;
  tags: string[];
  duration: string;
  rating: string;
  icon: string;
  tone: "accent" | "orange" | "blue" | "green" | "rose";
}) {
  const toneClass = {
    accent: "from-[var(--idil-accent)]/18 to-[var(--idil-accent-strong)]/10",
    orange: "from-orange-500/18 to-amber-400/10",
    blue: "from-sky-500/18 to-blue-500/10",
    green: "from-emerald-500/18 to-lime-500/10",
    rose: "from-rose-500/18 to-pink-500/10",
  }[tone];

  return (
    <GlassCard className="relative overflow-hidden p-4">
      <div className={`absolute inset-x-0 top-0 h-full bg-gradient-to-br ${toneClass}`} />
      <div className="relative z-10">
        <div className="flex items-start justify-between gap-3">
          <span className="inline-flex h-12 w-12 items-center justify-center rounded-2xl text-lg text-white" style={{ background: "linear-gradient(135deg,var(--idil-accent),var(--idil-accent-strong))" }}>{icon}</span>
          <span className="text-[var(--idil-muted)]">⌑</span>
        </div>
        <h3 className="mt-4 text-lg font-semibold tracking-[-0.03em] text-[var(--idil-text)]">{title}</h3>
        <p className="mt-1 text-sm text-[var(--idil-muted)]">{subtitle}</p>
        <div className="mt-3 flex flex-wrap gap-1.5">
          {tags.map((tag) => (
            <span key={tag} className="rounded-full border border-[var(--idil-border)] bg-[var(--idil-soft-block)] px-2 py-1 text-[11px] text-[var(--idil-muted)]">{tag}</span>
          ))}
        </div>
        <div className="mt-4 flex items-center justify-between gap-3 text-sm text-[var(--idil-muted)]">
          <span>◷ {duration}</span>
          <span>★ {rating}</span>
        </div>
        <button type="button" className="mt-4 inline-flex min-h-[38px] w-full items-center justify-center rounded-xl text-sm font-semibold text-white" style={{ background: "linear-gradient(135deg,var(--idil-accent),var(--idil-accent-strong))" }}>Başlat</button>
      </div>
    </GlassCard>
  );
}

function ActivityRow({ title, meta, time, badge, color }: { title: string; meta: string; time: string; badge: string; color: string }) {
  const tone = {
    accent: "from-[var(--idil-accent)] to-[var(--idil-accent-strong)]",
    orange: "from-orange-500 to-amber-400",
    blue: "from-sky-500 to-blue-500",
    green: "from-emerald-500 to-lime-500",
    rose: "from-rose-500 to-pink-500",
  }[color as "accent" | "orange" | "blue" | "green" | "rose"];

  return (
    <div className="flex items-start gap-3 rounded-2xl border border-[var(--idil-border)] bg-[var(--idil-soft-block)] p-3">
      <span className={`mt-0.5 inline-flex h-8 w-8 items-center justify-center rounded-xl bg-gradient-to-br ${tone} text-sm text-white`}>•</span>
      <div className="min-w-0 flex-1">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-sm font-semibold text-[var(--idil-text)]">{title}</p>
            <p className="mt-0.5 text-xs text-[var(--idil-muted)]">{meta}</p>
          </div>
          <div className="text-right">
            <p className="text-xs text-[var(--idil-muted)]">{time}</p>
            <p className="mt-1 text-xs text-emerald-400">{badge}</p>
          </div>
        </div>
      </div>
    </div>
  );
}

function FavoriteRow({ title, meta, color }: { title: string; meta: string; color: string }) {
  const tone = {
    accent: "from-[var(--idil-accent)] to-[var(--idil-accent-strong)]",
    orange: "from-orange-500 to-amber-400",
    blue: "from-sky-500 to-blue-500",
    green: "from-emerald-500 to-lime-500",
    rose: "from-rose-500 to-pink-500",
  }[color as "accent" | "orange" | "blue" | "green" | "rose"];

  return (
    <div className="flex items-center gap-3 rounded-2xl border border-[var(--idil-border)] bg-[var(--idil-soft-block)] p-3">
      <span className="text-amber-300">★</span>
      <span className={`inline-flex h-8 w-8 items-center justify-center rounded-xl bg-gradient-to-br ${tone} text-sm text-white`}>•</span>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-semibold text-[var(--idil-text)]">{title}</p>
        <p className="truncate text-xs text-[var(--idil-muted)]">{meta}</p>
      </div>
      <span className="text-[var(--idil-muted)]">…</span>
    </div>
  );
}