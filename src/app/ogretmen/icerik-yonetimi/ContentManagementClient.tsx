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
      <section className="fx-fade-in overflow-hidden rounded-2xl border border-red-100 bg-[radial-gradient(circle_at_top_left,#ffe4e8_0%,#ffffff_48%,#fff7f4_100%)] p-4 shadow-[0_12px_38px_rgba(185,28,28,0.08)] md:p-5">
        <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_auto] xl:items-center">
          <div>
            <p className="text-[11px] font-black uppercase tracking-[0.2em] text-red-700">Yonetim Merkezi</p>
            <h2 className="mt-1 text-2xl font-black tracking-tight text-slate-950 md:text-3xl">Icerik Yonetimi</h2>
            <p className="mt-2 max-w-4xl text-sm leading-6 text-slate-600">
              Egzersizlerde kullanilacak metinleri, kelime havuzlarini, soru setlerini ve calisma ayarlarini buradan yonetin.
            </p>
          </div>

          <div className="grid grid-cols-3 gap-2 sm:min-w-[420px]">
            <article className="rounded-2xl border border-white/80 bg-white/88 p-3 text-center shadow-sm">
              <p className="text-[11px] font-black uppercase tracking-[0.1em] text-slate-500">Grup</p>
              <p className="mt-1 text-2xl font-black text-slate-950">{CONTENT_GROUPS.length}</p>
            </article>
            <article className="rounded-2xl border border-white/80 bg-white/88 p-3 text-center shadow-sm">
              <p className="text-[11px] font-black uppercase tracking-[0.1em] text-slate-500">Modul</p>
              <p className="mt-1 text-2xl font-black text-slate-950">{totalModules}</p>
            </article>
            <article className="rounded-2xl border border-white/80 bg-white/88 p-3 text-center shadow-sm">
              <p className="text-[11px] font-black uppercase tracking-[0.1em] text-slate-500">Bagli</p>
              <p className="mt-1 text-2xl font-black text-green-700">{activeModules}</p>
            </article>
          </div>
        </div>
      </section>

      <section className="grid min-h-[calc(100vh-250px)] gap-3 lg:grid-cols-[320px_minmax(0,1fr)] 2xl:grid-cols-[340px_minmax(0,1fr)]">
        <aside className="fx-slide-up rounded-2xl border border-red-100 bg-white/92 p-3 shadow-[0_14px_34px_rgba(15,23,42,0.08)] lg:sticky lg:top-4 lg:max-h-[calc(100vh-120px)] lg:self-start">
          <div className="flex items-center justify-between gap-3 px-2 py-2">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.18em] text-red-700">Menu</p>
              <h3 className="text-lg font-black text-slate-950">Egzersiz Gruplari</h3>
            </div>
            <span className="rounded-full border border-red-100 bg-red-50 px-3 py-1 text-xs font-bold text-red-700">
              {CONTENT_GROUPS.length}
            </span>
          </div>

          <div className="mt-2 flex gap-2 overflow-x-auto pb-2 lg:hidden">
            {CONTENT_GROUPS.map((group) => {
              const isActive = group.id === activeGroupId;

              return (
                <button
                  key={group.id}
                  type="button"
                  onClick={() => setActiveGroupId(group.id)}
                  className={`flex min-h-[44px] shrink-0 items-center gap-2 rounded-full border px-3 text-sm font-black transition active:scale-[0.98] ${
                    isActive ? `bg-gradient-to-r ${group.tone} text-white shadow-md` : group.softClass
                  }`}
                >
                  <span className="inline-flex h-7 min-w-7 items-center justify-center rounded-full bg-white/90 px-1 text-[11px] font-black text-slate-900">
                    {group.icon}
                  </span>
                  {group.shortTitle}
                </button>
              );
            })}
          </div>

          <div className="hidden gap-2 lg:grid">
            {CONTENT_GROUPS.map((group) => {
              const isActive = group.id === activeGroupId;

              return (
                <button
                  key={group.id}
                  type="button"
                  onClick={() => setActiveGroupId(group.id)}
                  className={`group flex min-h-[78px] w-full items-center gap-3 rounded-2xl border p-3 text-left transition hover:-translate-y-0.5 ${
                    isActive ? group.softClass : "border-slate-100 bg-white text-slate-700 hover:border-red-100 hover:bg-red-50"
                  }`}
                >
                  <span className={`inline-flex h-12 min-w-12 items-center justify-center rounded-2xl bg-gradient-to-br ${group.tone} px-2 text-sm font-black text-white shadow-md`}>
                    {group.icon}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block text-sm font-black text-slate-950">{group.shortTitle}</span>
                    <span className="mt-0.5 block text-xs font-semibold text-slate-500">{group.modules.length} yonetim alani</span>
                  </span>
                  <span className={`text-sm font-black ${isActive ? "text-current" : "text-slate-300 group-hover:text-red-700"}`}>{">"}</span>
                </button>
              );
            })}
          </div>
        </aside>

        <section className={`fx-slide-up min-w-0 rounded-2xl border ${activeGroup.panelClass} p-4 shadow-[0_14px_34px_rgba(15,23,42,0.07)] md:p-5`}>
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="flex min-w-0 items-start gap-3">
              <span className={`inline-flex h-16 min-w-16 items-center justify-center rounded-2xl bg-gradient-to-br ${activeGroup.tone} px-3 text-lg font-black text-white shadow-md`}>
                {activeGroup.icon}
              </span>
              <div className="min-w-0">
                <p className="text-[11px] font-black uppercase tracking-[0.18em] text-slate-500">Secili grup</p>
                <h3 className="mt-0.5 text-2xl font-black tracking-tight text-slate-950">{activeGroup.title}</h3>
                <p className="mt-1 max-w-4xl text-sm leading-6 text-slate-600">{activeGroup.description}</p>
              </div>
            </div>
            <span className={`rounded-full border px-3 py-1 text-xs font-black uppercase tracking-[0.12em] ${activeGroup.softClass}`}>
              {activeGroup.modules.length} modul
            </span>
          </div>

          <div className="mt-5 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            {activeGroup.modules.map((module, index) => {
              const canOpen = isActionable(module);

              return (
                <article
                  key={module.id}
                  className="fx-slide-up group flex min-h-[292px] flex-col rounded-2xl border border-white/90 bg-white/94 p-4 shadow-[0_10px_28px_rgba(15,23,42,0.08)] transition duration-200 hover:-translate-y-1 hover:shadow-[0_18px_42px_rgba(15,23,42,0.13)]"
                  style={{ animationDelay: `${index * 55}ms` }}
                >
                  <div className="flex items-start justify-between gap-3">
                    <span className={`inline-flex h-12 min-w-12 items-center justify-center rounded-2xl bg-gradient-to-br ${module.tone} px-2 text-sm font-black text-white shadow-md`}>
                      {module.icon}
                    </span>
                    <span className={`rounded-full border px-3 py-1 text-xs font-black ${STATUS_CLASSES[module.status]}`}>
                      {STATUS_LABELS[module.status]}
                    </span>
                  </div>

                  <h4 className="mt-4 text-xl font-black tracking-tight text-slate-950">{module.title}</h4>
                  <p className="mt-2 flex-1 text-sm leading-6 text-slate-600">{module.description}</p>

                  <div className="mt-3 flex flex-wrap gap-1.5">
                    {module.tags.map((tag) => (
                      <span key={tag} className={`rounded-full border px-2.5 py-1 text-[11px] font-bold ${activeGroup.softClass}`}>
                        {tag}
                      </span>
                    ))}
                  </div>

                  {canOpen ? (
                    <Link
                      href={module.href}
                      className={`mt-4 inline-flex min-h-[48px] items-center justify-center rounded-2xl bg-gradient-to-r ${module.tone} px-4 py-3 text-sm font-black text-white shadow-md transition duration-200 active:scale-[0.98] group-hover:brightness-110`}
                    >
                      {getActionLabel(module)}
                    </Link>
                  ) : (
                    <button
                      type="button"
                      disabled
                      className="mt-4 inline-flex min-h-[48px] cursor-not-allowed items-center justify-center rounded-2xl border border-slate-200 bg-slate-100 px-4 py-3 text-sm font-black text-slate-500"
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
