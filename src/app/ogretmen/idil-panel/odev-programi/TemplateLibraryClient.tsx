"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { TeacherOnly } from "@/components/auth/TeacherOnly";
import { AppShell } from "@/components/layout/AppShell";
import { PanelCard } from "@/components/ui/PanelCard";
import {
  ASSIGNMENT_CLASS_GROUPS,
  ASSIGNMENT_CLASS_GROUP_LABELS,
  type AssignmentClassGroup,
} from "@/lib/assignments/classGroups";
import { TEACHER_NAV_ITEMS } from "@/lib/constants/teacherNavigation";
import type { ProgramTemplateSummary } from "@/lib/assignments/types";
import {
  CARD_SURFACE_CLASS,
  INPUT_CLASS,
  MUTED_TEXT_CLASS,
  PRIMARY_BUTTON_CLASS,
  SECONDARY_BUTTON_CLASS,
} from "./templateUi";

type AssignableStudent = {
  id: string;
  name: string;
  educationLevel: string;
  hasActiveProgram: boolean;
};

const LIBRARY_ENDPOINT = "/api/admin/assignment-program/template-library";

type LibraryData = {
  templates: ProgramTemplateSummary[];
  students: AssignableStudent[];
  error: string | null;
};

function classGroupLabel(group: string): string {
  return ASSIGNMENT_CLASS_GROUP_LABELS[group as AssignmentClassGroup] ?? group;
}

/**
 * Saf veri getirme - hicbir setState cagirmaz, yalniz sonucu doner. Boylece
 * hem ilk yukleme effect'i hem de mutasyon sonrasi yenileme ayni mantigi
 * paylasir ve effect govdesinde senkron setState olmaz.
 */
async function fetchLibraryData(): Promise<LibraryData> {
  try {
    const [libraryResponse, studentsResponse] = await Promise.all([
      fetch(LIBRARY_ENDPOINT, { credentials: "same-origin", cache: "no-store" }),
      fetch("/api/admin/assignment-program/students", { credentials: "same-origin", cache: "no-store" }),
    ]);

    const libraryPayload = (await libraryResponse.json()) as {
      ok?: boolean;
      message?: string;
      templates?: ProgramTemplateSummary[];
    };
    const studentsPayload = (await studentsResponse.json()) as {
      ok?: boolean;
      students?: AssignableStudent[];
    };

    const students = studentsResponse.ok && studentsPayload.ok ? (studentsPayload.students ?? []) : [];

    if (!libraryResponse.ok || !libraryPayload.ok) {
      return { templates: [], students, error: libraryPayload.message ?? "Şablonlar yüklenemedi." };
    }

    return { templates: libraryPayload.templates ?? [], students, error: null };
  } catch {
    return { templates: [], students: [], error: "Veriler yüklenemedi. Lütfen tekrar deneyin." };
  }
}

function FeedbackLine({ tone, message }: { tone: "error" | "success"; message: string }) {
  const toneClass =
    tone === "error"
      ? "border-red-200 bg-red-50 text-red-700"
      : "border-emerald-200 bg-emerald-50 text-emerald-700";
  return (
    <p role={tone === "error" ? "alert" : "status"} aria-live={tone === "error" ? "assertive" : "polite"} className={`rounded-xl border px-3 py-2 text-sm ${toneClass}`}>
      {message}
    </p>
  );
}

function TemplateCard({
  template,
  onDuplicate,
  onDeactivate,
  busy,
}: {
  template: ProgramTemplateSummary;
  onDuplicate: (template: ProgramTemplateSummary) => void;
  onDeactivate: (template: ProgramTemplateSummary) => void;
  busy: boolean;
}) {
  const isComplete = template.filledSlotCount >= template.expectedSlotCount;
  const percent =
    template.expectedSlotCount > 0
      ? Math.min(100, Math.round((template.filledSlotCount / template.expectedSlotCount) * 100))
      : 0;

  return (
    <article className={`${CARD_SURFACE_CLASS} flex flex-col gap-3`}>
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="min-w-0">
          <h3 className="text-[15px] font-semibold">{template.name}</h3>
          <p className={`mt-0.5 ${MUTED_TEXT_CLASS}`}>
            {classGroupLabel(template.classGroup)} · {template.programDays} gün · günde {template.tasksPerDay} çalışma
          </p>
        </div>
        <span
          className={`inline-flex shrink-0 items-center rounded-full px-2 py-0.5 text-[11px] font-semibold ${
            isComplete ? "bg-emerald-100 text-emerald-700" : "bg-amber-100 text-amber-700"
          }`}
        >
          {isComplete ? "Hazır" : "Eksik"}
        </span>
      </div>

      <div>
        <div className="flex items-center justify-between text-xs font-semibold">
          <span>Doluluk</span>
          <span>
            {template.filledSlotCount} / {template.expectedSlotCount}
          </span>
        </div>
        <div
          className="mt-1 h-2 w-full overflow-hidden rounded-full bg-slate-200"
          role="progressbar"
          aria-valuenow={percent}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-label={`${template.name} doluluk oranı`}
        >
          <div
            className={`h-full transition-all ${isComplete ? "bg-emerald-500" : "bg-amber-500"}`}
            style={{ width: `${percent}%` }}
          />
        </div>
      </div>

      {template.description ? <p className={MUTED_TEXT_CLASS}>{template.description}</p> : null}

      <div className="flex flex-wrap gap-2">
        <Link href={`/ogretmen/idil-panel/odev-programi/${template.id}`} className={SECONDARY_BUTTON_CLASS}>
          Düzenle
        </Link>
        <button type="button" className={SECONDARY_BUTTON_CLASS} onClick={() => onDuplicate(template)} disabled={busy}>
          Kopyala
        </button>
        <button type="button" className={SECONDARY_BUTTON_CLASS} onClick={() => onDeactivate(template)} disabled={busy}>
          Pasifleştir
        </button>
      </div>
    </article>
  );
}

export function TemplateLibraryClient() {
  const [templates, setTemplates] = useState<ProgramTemplateSummary[]>([]);
  const [students, setStudents] = useState<AssignableStudent[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const [newName, setNewName] = useState("");
  const [newClassGroup, setNewClassGroup] = useState<AssignmentClassGroup>("grade_1");
  const [newProgramDays, setNewProgramDays] = useState(20);

  const [assignTemplateId, setAssignTemplateId] = useState("");
  const [assignStudentId, setAssignStudentId] = useState("");

  const applyLibraryData = useCallback((data: LibraryData) => {
    setTemplates(data.templates);
    setStudents(data.students);
    setError(data.error);
    setLoading(false);
  }, []);

  const reload = useCallback(async () => {
    applyLibraryData(await fetchLibraryData());
  }, [applyLibraryData]);

  useEffect(() => {
    let cancelled = false;

    void (async () => {
      const data = await fetchLibraryData();
      if (cancelled) return;
      applyLibraryData(data);
    })();

    return () => {
      cancelled = true;
    };
  }, [applyLibraryData]);

  const completeTemplates = useMemo(
    () => templates.filter((template) => template.filledSlotCount >= template.expectedSlotCount),
    [templates],
  );

  const handleCreate = async () => {
    if (!newName.trim()) {
      setError("Şablon adı zorunludur.");
      return;
    }
    setBusy(true);
    setError(null);
    setSuccess(null);
    try {
      const response = await fetch(LIBRARY_ENDPOINT, {
        method: "POST",
        credentials: "same-origin",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: newName.trim(), classGroup: newClassGroup, programDays: newProgramDays }),
      });
      const payload = (await response.json()) as { ok?: boolean; message?: string };
      if (!response.ok || !payload.ok) {
        setError(payload.message ?? "Şablon oluşturulamadı.");
        return;
      }
      setNewName("");
      setSuccess("Şablon oluşturuldu. Günlük çalışmaları doldurmak için Düzenle'ye girin.");
      await reload();
    } catch {
      setError("Şablon oluşturulamadı. Lütfen tekrar deneyin.");
    } finally {
      setBusy(false);
    }
  };

  const handleDuplicate = async (template: ProgramTemplateSummary) => {
    const name = window.prompt("Yeni şablonun adı:", `${template.name} (kopya)`);
    if (!name?.trim()) {
      return;
    }
    setBusy(true);
    setError(null);
    setSuccess(null);
    try {
      const response = await fetch(`${LIBRARY_ENDPOINT}/${encodeURIComponent(template.id)}/duplicate`, {
        method: "POST",
        credentials: "same-origin",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: name.trim() }),
      });
      const payload = (await response.json()) as { ok?: boolean; message?: string };
      if (!response.ok || !payload.ok) {
        setError(payload.message ?? "Şablon kopyalanamadı.");
        return;
      }
      setSuccess("Şablon tüm günleriyle birlikte kopyalandı.");
      await reload();
    } catch {
      setError("Şablon kopyalanamadı. Lütfen tekrar deneyin.");
    } finally {
      setBusy(false);
    }
  };

  const handleDeactivate = async (template: ProgramTemplateSummary) => {
    if (!window.confirm(`"${template.name}" şablonu pasifleştirilsin mi? Atanmış programlar etkilenmez.`)) {
      return;
    }
    setBusy(true);
    setError(null);
    setSuccess(null);
    try {
      const response = await fetch(`${LIBRARY_ENDPOINT}/${encodeURIComponent(template.id)}`, {
        method: "DELETE",
        credentials: "same-origin",
      });
      const payload = (await response.json()) as { ok?: boolean; message?: string };
      if (!response.ok || !payload.ok) {
        setError(payload.message ?? "Şablon pasifleştirilemedi.");
        return;
      }
      setSuccess("Şablon pasifleştirildi.");
      await reload();
    } catch {
      setError("Şablon pasifleştirilemedi. Lütfen tekrar deneyin.");
    } finally {
      setBusy(false);
    }
  };

  const handleAssign = async () => {
    if (!assignTemplateId || !assignStudentId) {
      setError("Şablon ve öğrenci seçin.");
      return;
    }
    setBusy(true);
    setError(null);
    setSuccess(null);
    try {
      const response = await fetch("/api/admin/assignment-program/programs", {
        method: "POST",
        credentials: "same-origin",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ studentId: assignStudentId, templateId: assignTemplateId }),
      });
      const payload = (await response.json()) as {
        ok?: boolean;
        message?: string;
        summary?: { totalDays: number; totalTasks: number };
      };
      if (!response.ok || !payload.ok) {
        setError(payload.message ?? "Program atanamadı.");
        return;
      }
      setSuccess(
        `Program atandı: ${payload.summary?.totalDays ?? 0} gün, ${payload.summary?.totalTasks ?? 0} çalışma. İlk gün öğrenciye açıldı.`,
      );
      setAssignStudentId("");
      await reload();
    } catch {
      setError("Program atanamadı. Lütfen tekrar deneyin.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <AppShell
      title="Ödev Şablonları"
      subtitle="Günlük çalışmaları tek tek belirlediğiniz şablonları hazırlayın ve istediğiniz öğrenciye atayın."
      navItems={TEACHER_NAV_ITEMS}
      wide
    >
      <TeacherOnly>
        <div className="grid gap-4">
          {error ? <FeedbackLine tone="error" message={error} /> : null}
          {success ? <FeedbackLine tone="success" message={success} /> : null}

          <PanelCard title="Yeni Şablon" subtitle="Boş bir şablon oluşturun, günlük çalışmaları ardından doldurun">
            <div className="grid gap-3 sm:grid-cols-[2fr_1fr_1fr_auto] sm:items-end">
              <label htmlFor="new-template-name" className="grid gap-1 text-sm font-medium">
                <span>Şablon adı</span>
                <input
                  id="new-template-name"
                  type="text"
                  value={newName}
                  onChange={(event) => setNewName(event.target.value)}
                  placeholder="Örn. 3. Sınıf Programı"
                  className={INPUT_CLASS}
                />
              </label>

              <label htmlFor="new-template-group" className="grid gap-1 text-sm font-medium">
                <span>Sınıf grubu</span>
                <select
                  id="new-template-group"
                  value={newClassGroup}
                  onChange={(event) => setNewClassGroup(event.target.value as AssignmentClassGroup)}
                  className={INPUT_CLASS}
                >
                  {ASSIGNMENT_CLASS_GROUPS.map((group) => (
                    <option key={group} value={group}>
                      {ASSIGNMENT_CLASS_GROUP_LABELS[group]}
                    </option>
                  ))}
                </select>
              </label>

              <label htmlFor="new-template-days" className="grid gap-1 text-sm font-medium">
                <span>Gün sayısı</span>
                <input
                  id="new-template-days"
                  type="number"
                  min={1}
                  max={60}
                  step={1}
                  value={newProgramDays}
                  onChange={(event) => setNewProgramDays(Number(event.target.value))}
                  className={INPUT_CLASS}
                />
              </label>

              <button type="button" className={PRIMARY_BUTTON_CLASS} onClick={handleCreate} disabled={busy}>
                Oluştur
              </button>
            </div>
            <p className={`mt-2 ${MUTED_TEXT_CLASS}`}>
              Sınıf grubu yalnız etiket amaçlıdır — hazır bir şablonu istediğiniz sınıftaki öğrenciye
              atayabilirsiniz. Öğrenciler bu etiketi görmez.
            </p>
          </PanelCard>

          <PanelCard title="Şablon Kütüphanesi" subtitle="Hazırladığınız şablonlar burada kalıcı olarak durur">
            {loading ? (
              <p aria-busy="true" className={MUTED_TEXT_CLASS}>
                Şablonlar yükleniyor...
              </p>
            ) : templates.length === 0 ? (
              <p className={MUTED_TEXT_CLASS}>Henüz şablon yok. Yukarıdan yeni bir şablon oluşturun.</p>
            ) : (
              <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                {templates.map((template) => (
                  <TemplateCard
                    key={template.id}
                    template={template}
                    onDuplicate={handleDuplicate}
                    onDeactivate={handleDeactivate}
                    busy={busy}
                  />
                ))}
              </div>
            )}
          </PanelCard>

          <PanelCard
            title="Öğrenciye Program Ata"
            subtitle="Tamamlanmış herhangi bir şablonu, sınıfından bağımsız olarak istediğiniz öğrenciye atayın"
          >
            <div className="grid gap-3 sm:grid-cols-[1fr_1fr_auto] sm:items-end">
              <label htmlFor="assign-template" className="grid gap-1 text-sm font-medium">
                <span>Şablon</span>
                <select
                  id="assign-template"
                  value={assignTemplateId}
                  onChange={(event) => setAssignTemplateId(event.target.value)}
                  className={INPUT_CLASS}
                >
                  <option value="">Seçiniz</option>
                  {completeTemplates.map((template) => (
                    <option key={template.id} value={template.id}>
                      {template.name} ({classGroupLabel(template.classGroup)} · {template.programDays} gün)
                    </option>
                  ))}
                </select>
              </label>

              <label htmlFor="assign-student" className="grid gap-1 text-sm font-medium">
                <span>Öğrenci</span>
                <select
                  id="assign-student"
                  value={assignStudentId}
                  onChange={(event) => setAssignStudentId(event.target.value)}
                  className={INPUT_CLASS}
                >
                  <option value="">Seçiniz</option>
                  {students.map((student) => (
                    <option key={student.id} value={student.id} disabled={student.hasActiveProgram}>
                      {student.name}
                      {student.hasActiveProgram ? " — aktif programı var" : ""}
                    </option>
                  ))}
                </select>
              </label>

              <button type="button" className={PRIMARY_BUTTON_CLASS} onClick={handleAssign} disabled={busy}>
                Programı Ata
              </button>
            </div>
            {completeTemplates.length === 0 && !loading ? (
              <p className={`mt-2 ${MUTED_TEXT_CLASS}`}>
                Atanabilir şablon yok — bir şablonun tüm günlerinin 5 çalışması doldurulmuş olmalıdır.
              </p>
            ) : null}
          </PanelCard>
        </div>
      </TeacherOnly>
    </AppShell>
  );
}
