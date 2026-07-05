"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { CONTENT_GROUPS, type ContentModule, type ContentModuleStatus } from "@/lib/content-management/modules";

const STATUS_LABELS: Record<ContentModuleStatus, string> = {
  active: "Aktif",
  "coming-soon": "Yakinda",
  "text-library": "Metin Kutuphanesi",
  preparing: "Hazirlaniyor",
  linked: "Bagli",
};

const STATUS_CLASSES: Record<ContentModuleStatus, string> = {
  active: "border-green-200 bg-green-50 text-green-700",
  "coming-soon": "border-amber-200 bg-amber-50 text-amber-800",
  "text-library": "border-indigo-200 bg-indigo-50 text-indigo-800",
  preparing: "border-orange-200 bg-orange-50 text-orange-800",
  linked: "border-blue-200 bg-blue-50 text-blue-800",
};

function isActionable(module: ContentModule): boolean {
  return module.href !== "#" && module.status !== "coming-soon" && module.status !== "preparing";
}

function getActionLabel(module: ContentModule): string {
  if (module.actionLabel) {
    return module.actionLabel;
  }

  return isActionable(module) ? "Yonet" : "Yakinda";
}

export function ContentManagementClient() {
  const [activeGroupId, setActiveGroupId] = useState(CONTENT_GROUPS[0].id);

  const activeGroup = useMemo(() => {
    return CONTENT_GROUPS.find((group) => group.id === activeGroupId) ?? CONTENT_GROUPS[0];
  }, [activeGroupId]);

  const totalModules = CONTENT_GROUPS.reduce((total, group) => total + group.modules.length, 0);
  const activeModules = CONTENT_GROUPS.flatMap((group) => group.modules).filter(isActionable).length;

  return (
    <>
      <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
        <div className="grid gap-3 xl:grid-cols-[minmax(0,1fr)_auto] xl:items-center">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-red-700">Yonetim Merkezi</p>
            <h2 className="mt-0.5 text-[24px] font-semibold tracking-tight text-slate-950 md:text-[28px]">Icerik Yonetimi</h2>
            <p className="mt-0.5 max-w-4xl text-sm leading-5 text-slate-600">
              Metinleri, kelime havuzlarini ve soru setlerini yonetin.
            </p>
            <p className="mt-2 text-sm text-slate-500">
              Blok Okuma, Golgeleme, Odakli Okuma ve Anlama Testi icin metin ekleyin.
            </p>
            <div className="mt-3 flex flex-wrap gap-2">
              <Link
                href="/ogretmen/icerik-yonetimi/metin-kutuphanesi"
                className="inline-flex min-h-[48px] items-center justify-center rounded-xl border border-red-900/25 bg-[var(--brand)] px-4 py-2.5 text-sm font-bold text-white shadow-sm transition hover:bg-[var(--brand-strong)]"
              >
                Metin Ekle
              </Link>
              <Link
                href="/ogretmen/icerik-yonetimi/metin-kutuphanesi"
                className="inline-flex min-h-[48px] items-center justify-center rounded-xl border border-red-200 bg-white px-4 py-2.5 text-sm font-semibold text-red-800 transition hover:bg-red-50"
              >
                + Metin Ekle
              </Link>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Link
              href="/ogretmen/icerik-yonetimi/puzzle-gorselleri"
              className="inline-flex min-h-[42px] items-center justify-center rounded-xl border border-red-200 bg-white px-4 py-2.5 text-sm font-semibold text-red-800 transition duration-200 hover:bg-red-50"
            >
              Puzzle Gorselleri
            </Link>
          </div>

          <div className="grid grid-cols-3 gap-2 sm:min-w-[320px]">
            <article className="rounded-xl border border-slate-200 bg-white p-2.5 text-center">
              <p className="text-[11px] font-medium text-slate-500">Grup</p>
              <p className="mt-0.5 text-lg font-semibold text-slate-950">{CONTENT_GROUPS.length}</p>
            </article>
            <article className="rounded-xl border border-slate-200 bg-white p-2.5 text-center">
              <p className="text-[11px] font-medium text-slate-500">Modul</p>
              <p className="mt-0.5 text-lg font-semibold text-slate-950">{totalModules}</p>
            </article>
            <article className="rounded-xl border border-slate-200 bg-white p-2.5 text-center">
              <p className="text-[11px] font-medium text-slate-500">Bagli</p>
              <p className="mt-0.5 text-lg font-semibold text-green-700">{activeModules}</p>
            </article>
          </div>
        </div>
      </section>

      <section className="grid min-h-[calc(100vh-240px)] gap-3 lg:grid-cols-[260px_minmax(0,1fr)] 2xl:grid-cols-[280px_minmax(0,1fr)]">
        <aside className="rounded-2xl border border-slate-200 bg-white p-3 shadow-sm lg:sticky lg:top-4 lg:max-h-[calc(100vh-120px)] lg:self-start">
          <div className="flex items-center justify-between gap-3 px-1 py-1.5">
            <div>
              <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-red-700">Menu</p>
              <h3 className="text-sm font-semibold text-slate-950">Egzersiz Gruplari</h3>
            </div>
            <span className="rounded-full border border-red-100 bg-red-50 px-2.5 py-1 text-[11px] font-semibold text-red-700">
              {CONTENT_GROUPS.length}
            </span>
          </div>

          <div className="mt-1.5 flex gap-2 overflow-x-auto pb-2 lg:hidden">
            {CONTENT_GROUPS.map((group) => {
              const isActive = group.id === activeGroupId;

              return (
                <button
                  key={group.id}
                  type="button"
                  onClick={() => setActiveGroupId(group.id)}
                  className={`flex min-h-[40px] shrink-0 items-center gap-2 rounded-full border px-3 text-[13px] font-semibold transition active:scale-[0.98] ${
                    isActive ? `bg-gradient-to-r ${group.tone} text-white shadow-md` : group.softClass
                  }`}
                >
                  <span className="inline-flex h-6 min-w-6 items-center justify-center rounded-full bg-white/90 px-1 text-[10px] font-semibold text-slate-900">
                    {group.icon}
                  </span>
                  {group.shortTitle}
                </button>
              );
            })}
          </div>

          <div className="hidden gap-1.5 lg:grid">
            {CONTENT_GROUPS.map((group) => {
              const isActive = group.id === activeGroupId;

              return (
                <button
                  key={group.id}
                  type="button"
                  onClick={() => setActiveGroupId(group.id)}
                  className={`group flex min-h-[48px] w-full items-center gap-3 rounded-xl border p-3 text-left transition ${
                    isActive ? "border-red-200 bg-red-50 text-red-800" : "border-slate-100 bg-white text-slate-700 hover:border-red-100 hover:bg-red-50"
                  }`}
                >
                  <span className={`inline-flex h-8 min-w-8 items-center justify-center rounded-lg bg-gradient-to-br ${group.tone} px-2 text-[11px] font-semibold text-white`}>
                    {group.icon}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block text-[13px] font-semibold text-slate-950">{group.shortTitle}</span>
                    <span className="mt-0.5 block text-[11px] font-medium text-slate-500">{group.modules.length} alan</span>
                  </span>
                  <span className={`text-sm font-semibold ${isActive ? "text-current" : "text-slate-300 group-hover:text-red-700"}`}>{">"}</span>
                </button>
              );
            })}
          </div>
        </aside>

        <section className="min-w-0 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="flex min-w-0 items-start gap-3">
              <span className={`inline-flex h-10 min-w-10 items-center justify-center rounded-xl bg-gradient-to-br ${activeGroup.tone} px-2 text-[11px] font-semibold text-white`}>
                {activeGroup.icon}
              </span>
              <div className="min-w-0">
                <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-slate-500">Secili grup</p>
                <h3 className="mt-0.5 text-[18px] font-semibold tracking-tight text-slate-950">{activeGroup.title}</h3>
                <p className="mt-0.5 max-w-4xl text-sm leading-5 text-slate-600">{activeGroup.description}</p>
              </div>
            </div>
            <span className={`rounded-full border px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.1em] ${activeGroup.softClass}`}>
              {activeGroup.modules.length} modul
            </span>
          </div>

          <div className="mt-3 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            {activeGroup.modules.map((module, index) => {
              const canOpen = isActionable(module);

              return (
                <article
                  key={module.id}
                  className="group flex min-h-[220px] flex-col rounded-2xl border border-slate-200 bg-white p-4 shadow-sm transition duration-200 hover:-translate-y-0.5 hover:border-red-200 hover:shadow-md"
                  style={{ animationDelay: `${index * 55}ms` }}
                >
                  <div className="flex items-start justify-between gap-3">
                    <span className={`inline-flex h-8 min-w-8 items-center justify-center rounded-lg bg-gradient-to-br ${module.tone} px-2 text-[11px] font-semibold text-white`}>
                      {module.icon}
                    </span>
                    <span className={`rounded-full border px-2.5 py-1 text-[11px] font-semibold ${STATUS_CLASSES[module.status]}`}>
                      {STATUS_LABELS[module.status]}
                    </span>
                  </div>

                  <h4 className="mt-2.5 text-[18px] font-semibold tracking-tight text-slate-950">{module.title}</h4>
                  <p className="mt-1.5 flex-1 text-sm leading-5 text-slate-600">{module.description}</p>

                  <div className="mt-2.5 flex flex-wrap gap-1.5">
                    {module.tags.slice(0, 2).map((tag) => (
                      <span key={tag} className={`rounded-full border px-2.5 py-0.5 text-[11px] font-semibold ${activeGroup.softClass}`}>
                        {tag}
                      </span>
                    ))}
                  </div>

                  {canOpen ? (
                    <Link
                      href={module.href}
                      className="mt-3.5 inline-flex min-h-[40px] items-center justify-center rounded-xl bg-[var(--brand)] px-4 py-2 text-sm font-semibold text-white transition duration-200 active:scale-[0.98] hover:bg-[var(--brand-strong)]"
                    >
                      {getActionLabel(module)}
                    </Link>
                  ) : (
                    <button
                      type="button"
                      disabled
                      className="mt-3.5 inline-flex min-h-[40px] cursor-not-allowed items-center justify-center rounded-xl border border-slate-200 bg-slate-100 px-4 py-2 text-sm font-semibold text-slate-500"
                    >
                      {getActionLabel(module)}
                    </button>
                  )}
                </article>
              );
            })}
          </div>
        </section>
      </section>
    </>
  );
}
