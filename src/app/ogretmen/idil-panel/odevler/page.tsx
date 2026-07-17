"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { TeacherOnly } from "@/components/auth/TeacherOnly";
import { AppShell } from "@/components/layout/AppShell";
import { PanelCard } from "@/components/ui/PanelCard";
import {
  ASSIGNMENT_EXERCISE_CATALOG,
  ASSIGNMENT_EXERCISE_BY_SLUG,
  type AssignmentExerciseDefinition,
} from "@/lib/assignments/exerciseCatalog";
import { EDUCATION_LEVEL_LABELS, isEducationLevel } from "@/lib/assignments/educationLevels";
import { TEACHER_NAV_ITEMS } from "@/lib/constants/teacherNavigation";
import { getStudentsWithRemote } from "@/lib/students/studentStorage";
import type { Student } from "@/lib/students/types";

type AssignmentItem = {
  id: string;
  exerciseSlug: string;
  exerciseTitle: string;
  category: string;
  status: "pending" | "started" | "completed" | "skipped";
  sortOrder: number;
  settingsJson: Record<string, unknown>;
  targetType?: string;
  targetValue?: number;
  assignedTextId?: string;
  assignedTextTitle?: string;
  isRepeat: boolean;
  teacherNote?: string;
};

type DailyAssignment = {
  id: string;
  assignmentDate: string;
  title: string;
  status: "pending" | "in_progress" | "completed" | "skipped";
  teacherNote?: string;
  warningMessage?: string;
  items: AssignmentItem[];
};

type TextCandidate = {
  id: string;
  title: string;
  educationLevel: string | null;
};

type ItemEditorState = {
  exerciseSlug: string;
  status: AssignmentItem["status"];
  sortOrder: number;
  settingsJson: Record<string, unknown>;
  assignedTextId: string;
  assignedTextTitle: string;
  teacherNote: string;
};

type AssignmentResponse = {
  ok?: boolean;
  assignment?: DailyAssignment | null;
  textCandidates?: TextCandidate[];
  message?: string;
};

const STATUS_LABELS: Record<AssignmentItem["status"], string> = {
  pending: "Bekliyor",
  started: "Baslandi",
  completed: "Tamamlandi",
  skipped: "Atlandi",
};

const ASSIGNMENT_STATUS_LABELS: Record<DailyAssignment["status"], string> = {
  pending: "Bekliyor",
  in_progress: "Baslandi",
  completed: "Tamamlandi",
  skipped: "Atlandi",
};

function formatDateInput(value = new Date()): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Europe/Istanbul",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(value);
}

function createEditorState(item: AssignmentItem): ItemEditorState {
  return {
    exerciseSlug: item.exerciseSlug,
    status: item.status,
    sortOrder: item.sortOrder,
    settingsJson: { ...item.settingsJson },
    assignedTextId: item.assignedTextId ?? "",
    assignedTextTitle: item.assignedTextTitle ?? "",
    teacherNote: item.teacherNote ?? "",
  };
}

function getStatusBadgeClass(status: string): string {
  if (status === "completed") return "bg-emerald-100 text-emerald-800";
  if (status === "started" || status === "in_progress") return "bg-sky-100 text-sky-800";
  if (status === "skipped") return "bg-slate-200 text-slate-700";
  return "bg-amber-100 text-amber-800";
}

function getSupportedSettingFields(definition: AssignmentExerciseDefinition): string[] {
  return definition.supportedSettings;
}

function coerceSettingValue(rawValue: string): string | number {
  const trimmed = rawValue.trim();
  if (trimmed === "") {
    return "";
  }

  const numericValue = Number(trimmed);
  return Number.isFinite(numericValue) ? numericValue : trimmed;
}

export default function AssignmentManagementPage() {
  const [students, setStudents] = useState<Student[]>([]);
  const [selectedStudentId, setSelectedStudentId] = useState("");
  const [selectedDate, setSelectedDate] = useState(formatDateInput());
  const [assignment, setAssignment] = useState<DailyAssignment | null>(null);
  const [textCandidates, setTextCandidates] = useState<TextCandidate[]>([]);
  const [itemEditors, setItemEditors] = useState<Record<string, ItemEditorState>>({});
  const [assignmentTitle, setAssignmentTitle] = useState("");
  const [assignmentTeacherNote, setAssignmentTeacherNote] = useState("");
  const [newItemSlug, setNewItemSlug] = useState(ASSIGNMENT_EXERCISE_CATALOG[0]?.slug ?? "takistoskop");
  const [isLoading, setIsLoading] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isSavingAssignment, setIsSavingAssignment] = useState(false);
  const [isRegenerating, setIsRegenerating] = useState(false);
  const [busyItemId, setBusyItemId] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    void (async () => {
      const nextStudents = await getStudentsWithRemote();
      setStudents(nextStudents);
      if (nextStudents[0]?.id) {
        setSelectedStudentId(nextStudents[0].id);
      }
    })();
  }, []);

  const selectedStudent = useMemo(
    () => students.find((student) => student.id === selectedStudentId) ?? null,
    [selectedStudentId, students],
  );
  const educationLevel = selectedStudent?.educationLevel;
  const educationLevelLabel = isEducationLevel(educationLevel)
    ? EDUCATION_LEVEL_LABELS[educationLevel]
    : null;

  const sortedItems = useMemo(
    () => assignment?.items.slice().sort((left, right) => left.sortOrder - right.sortOrder) ?? [],
    [assignment],
  );

  function syncAssignmentState(nextAssignment: DailyAssignment | null, nextTextCandidates?: TextCandidate[]) {
    setAssignment(nextAssignment);
    setAssignmentTitle(nextAssignment?.title ?? "");
    setAssignmentTeacherNote(nextAssignment?.teacherNote ?? "");
    setItemEditors(
      Object.fromEntries((nextAssignment?.items ?? []).map((item) => [item.id, createEditorState(item)])),
    );
    if (nextTextCandidates) {
      setTextCandidates(nextTextCandidates);
    }
  }

  async function loadAssignment() {
    if (!selectedStudentId) return;

    setIsLoading(true);
    setMessage(null);

    try {
      const response = await fetch(
        `/api/admin/assignments?studentId=${encodeURIComponent(selectedStudentId)}&date=${selectedDate}`,
        { credentials: "same-origin", cache: "no-store" },
      );
      const data = (await response.json()) as AssignmentResponse;

      if (!response.ok || !data.ok) {
        syncAssignmentState(null, data.textCandidates);
        setMessage(data.message ?? "Plan getirilemedi.");
        return;
      }

      syncAssignmentState(data.assignment ?? null, data.textCandidates ?? []);
      if (!data.assignment) {
        setMessage("Bu tarih icin plan bulunmuyor.");
      }
    } catch {
      setMessage("Plan yuklenemedi.");
    } finally {
      setIsLoading(false);
    }
  }

  async function generateAssignment() {
    if (!selectedStudentId) return;

    setIsGenerating(true);
    setMessage(null);

    try {
      const response = await fetch("/api/admin/assignments/generate", {
        method: "POST",
        credentials: "same-origin",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ studentId: selectedStudentId, date: selectedDate, forceRegenerate: false }),
      });
      const data = (await response.json()) as AssignmentResponse;

      if (!response.ok || !data.ok || !data.assignment) {
        setMessage(data.message ?? "Plan olusturulamadi.");
        return;
      }

      syncAssignmentState(data.assignment);
      setMessage("Plan hazirlandi.");
    } catch {
      setMessage("Plan olusturulamadi.");
    } finally {
      setIsGenerating(false);
    }
  }

  async function saveAssignmentMeta() {
    if (!assignment) return;

    setIsSavingAssignment(true);
    setMessage(null);

    try {
      const response = await fetch(`/api/admin/assignments/${encodeURIComponent(assignment.id)}`, {
        method: "PATCH",
        credentials: "same-origin",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: assignmentTitle, teacherNote: assignmentTeacherNote }),
      });
      const data = (await response.json()) as AssignmentResponse;

      if (!response.ok || !data.ok || !data.assignment) {
        setMessage(data.message ?? "Plan bilgileri kaydedilemedi.");
        return;
      }

      syncAssignmentState(data.assignment);
      setMessage("Plan bilgileri guncellendi.");
    } catch {
      setMessage("Plan bilgileri kaydedilemedi.");
    } finally {
      setIsSavingAssignment(false);
    }
  }

  async function regenerateAssignment() {
    if (!assignment) return;

    setIsRegenerating(true);
    setMessage(null);

    try {
      const response = await fetch(`/api/admin/assignments/${encodeURIComponent(assignment.id)}/regenerate`, {
        method: "POST",
        credentials: "same-origin",
      });
      const data = (await response.json()) as AssignmentResponse;

      if (!response.ok || !data.ok || !data.assignment) {
        setMessage(data.message ?? "Plan yeniden olusturulamadi.");
        return;
      }

      syncAssignmentState(data.assignment);
      setMessage("Plan yeniden olusturuldu.");
    } catch {
      setMessage("Plan yeniden olusturulamadi.");
    } finally {
      setIsRegenerating(false);
    }
  }

  async function saveItem(itemId: string) {
    const editor = itemEditors[itemId];
    if (!assignment || !editor) return;

    setBusyItemId(itemId);
    setMessage(null);

    const definition = ASSIGNMENT_EXERCISE_BY_SLUG.get(editor.exerciseSlug);
    if (!definition) {
      setMessage("Gecersiz egzersiz secimi.");
      setBusyItemId(null);
      return;
    }

    try {
      const response = await fetch(`/api/admin/assignment-items/${encodeURIComponent(itemId)}`, {
        method: "PATCH",
        credentials: "same-origin",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          exerciseSlug: editor.exerciseSlug,
          status: editor.status,
          sortOrder: editor.sortOrder,
          settingsJson: editor.settingsJson,
          assignedTextId: editor.assignedTextId,
          assignedTextTitle:
            definition.slug === "anlama-testi"
              ? textCandidates.find((item) => item.id === editor.assignedTextId)?.title ?? editor.assignedTextTitle
              : "",
          isRepeat: Boolean(editor.assignedTextId && definition.slug === "anlama-testi"),
          teacherNote: editor.teacherNote,
        }),
      });
      const data = (await response.json()) as AssignmentResponse & { item?: AssignmentItem };

      if (!response.ok || !data.ok || !data.assignment) {
        setMessage(data.message ?? "Item guncellenemedi.");
        return;
      }

      syncAssignmentState(data.assignment);
      setMessage("Item guncellendi.");
    } catch {
      setMessage("Item guncellenemedi.");
    } finally {
      setBusyItemId(null);
    }
  }

  async function deleteItem(itemId: string) {
    if (!assignment) return;

    setBusyItemId(itemId);
    setMessage(null);

    try {
      const response = await fetch(`/api/admin/assignment-items/${encodeURIComponent(itemId)}`, {
        method: "DELETE",
        credentials: "same-origin",
      });
      const data = (await response.json()) as { ok?: boolean; assignmentId?: string; message?: string };

      if (!response.ok || !data.ok) {
        setMessage(data.message ?? "Item silinemedi.");
        return;
      }

      await loadAssignment();
      setMessage("Item silindi.");
    } catch {
      setMessage("Item silinemedi.");
    } finally {
      setBusyItemId(null);
    }
  }

  async function addItem() {
    if (!assignment) return;

    setBusyItemId("new");
    setMessage(null);

    const definition = ASSIGNMENT_EXERCISE_BY_SLUG.get(newItemSlug);
    if (!definition) {
      setMessage("Gecersiz egzersiz secimi.");
      setBusyItemId(null);
      return;
    }

    try {
      const response = await fetch(`/api/admin/assignments/${encodeURIComponent(assignment.id)}/items`, {
        method: "POST",
        credentials: "same-origin",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          exerciseSlug: newItemSlug,
          sortOrder: assignment.items.length + 1,
          settingsJson: {},
        }),
      });
      const data = (await response.json()) as AssignmentResponse;

      if (!response.ok || !data.ok || !data.assignment) {
        setMessage(data.message ?? "Yeni item eklenemedi.");
        return;
      }

      syncAssignmentState(data.assignment);
      setMessage("Yeni item eklendi.");
    } catch {
      setMessage("Yeni item eklenemedi.");
    } finally {
      setBusyItemId(null);
    }
  }

  const completedCount = assignment?.items.filter((item) => item.status === "completed").length ?? 0;

  return (
    <AppShell
      title="Gunluk Odevler"
      subtitle="Guvenli gunluk odev planlarini olustur, duzenle ve takip et."
      navItems={TEACHER_NAV_ITEMS}
      wide
    >
      <TeacherOnly>
        <PanelCard title="Plan Secimi" subtitle="Tarih ve ogrenciye gore plan getir veya olustur">
          <div className="grid gap-3 md:grid-cols-4">
            <label className="grid gap-1 text-sm font-semibold text-slate-700 md:col-span-2">
              <span>Ogrenci</span>
              <select
                value={selectedStudentId}
                onChange={(event) => setSelectedStudentId(event.target.value)}
                className="min-h-[44px] rounded-xl border border-slate-300 bg-white px-3"
              >
                {students.map((student) => (
                  <option key={student.id} value={student.id}>
                    {student.name}
                  </option>
                ))}
              </select>
            </label>

            <label className="grid gap-1 text-sm font-semibold text-slate-700">
              <span>Tarih</span>
              <input
                type="date"
                value={selectedDate}
                onChange={(event) => setSelectedDate(event.target.value)}
                className="min-h-[44px] rounded-xl border border-slate-300 bg-white px-3"
              />
            </label>

            <div className="grid gap-2 sm:grid-cols-2">
              <button type="button" onClick={() => void loadAssignment()} className="min-h-[44px] rounded-xl border border-slate-300 bg-white px-3 text-sm font-semibold text-slate-700">
                Getir
              </button>
              <button type="button" onClick={() => void generateAssignment()} disabled={isGenerating} className="min-h-[44px] rounded-xl bg-red-600 px-3 text-sm font-semibold text-white disabled:opacity-60">
                {isGenerating ? "Olusuyor..." : "Olustur"}
              </button>
            </div>
          </div>

          {educationLevelLabel ? (
            <p className="mt-3 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-700">
              Egitim Duzeyi: {educationLevelLabel}
            </p>
          ) : (
            <p className="mt-3 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-sm font-semibold text-amber-800">
              Egitim duzeyi secilmemis.
            </p>
          )}

          {message ? <p className="mt-3 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm font-semibold text-slate-700">{message}</p> : null}
        </PanelCard>

        {isLoading ? (
          <PanelCard>
            <p className="text-sm text-slate-600">Plan yukleniyor...</p>
          </PanelCard>
        ) : null}

        {assignment ? (
          <>
            <PanelCard title="Plan Ust Bilgileri" subtitle={`${completedCount} / ${assignment.items.length} tamamlandi`}>
              <div className="grid gap-3 lg:grid-cols-[1.2fr_1fr_auto] lg:items-end">
                <label className="grid gap-1 text-sm font-semibold text-slate-700">
                  <span>Baslik</span>
                  <input value={assignmentTitle} onChange={(event) => setAssignmentTitle(event.target.value)} className="min-h-[44px] rounded-xl border border-slate-300 bg-white px-3" />
                </label>
                <label className="grid gap-1 text-sm font-semibold text-slate-700">
                  <span>Ogretmen Notu</span>
                  <input value={assignmentTeacherNote} onChange={(event) => setAssignmentTeacherNote(event.target.value)} className="min-h-[44px] rounded-xl border border-slate-300 bg-white px-3" />
                </label>
                <div className="flex flex-wrap gap-2">
                  <button type="button" onClick={() => void saveAssignmentMeta()} disabled={isSavingAssignment} className="min-h-[44px] rounded-xl border border-slate-300 bg-white px-4 text-sm font-semibold text-slate-700 disabled:opacity-60">
                    {isSavingAssignment ? "Kaydediliyor..." : "Plani Kaydet"}
                  </button>
                  <button
                    type="button"
                    onClick={() => void regenerateAssignment()}
                    disabled={isRegenerating || assignment.status !== "pending" || assignment.items.some((item) => item.status !== "pending")}
                    className="min-h-[44px] rounded-xl bg-slate-900 px-4 text-sm font-semibold text-white disabled:opacity-50"
                  >
                    {isRegenerating ? "Yenileniyor..." : "Yeniden Olustur"}
                  </button>
                </div>
              </div>

              <div className="mt-3 flex flex-wrap items-center gap-2 text-sm text-slate-600">
                <span className={`rounded-full px-3 py-1 font-semibold ${getStatusBadgeClass(assignment.status)}`}>
                  {ASSIGNMENT_STATUS_LABELS[assignment.status]}
                </span>
                <span>Tarih: {assignment.assignmentDate}</span>
              </div>

              {assignment.warningMessage ? <p className="mt-3 rounded-xl border border-orange-200 bg-orange-50 px-3 py-2 text-sm text-orange-800">{assignment.warningMessage}</p> : null}
            </PanelCard>

            <PanelCard title="Item Ekle" subtitle="Gercek egzersiz katalogundan manuel item ekle">
              <div className="grid gap-3 md:grid-cols-[1.3fr_auto] md:items-end">
                <label className="grid gap-1 text-sm font-semibold text-slate-700">
                  <span>Egzersiz</span>
                  <select value={newItemSlug} onChange={(event) => setNewItemSlug(event.target.value)} className="min-h-[44px] rounded-xl border border-slate-300 bg-white px-3">
                    {ASSIGNMENT_EXERCISE_CATALOG.filter((item) => item.assignmentEnabled).map((item) => (
                      <option key={item.slug} value={item.slug}>{item.title}</option>
                    ))}
                  </select>
                </label>
                <button type="button" onClick={() => void addItem()} disabled={busyItemId === "new"} className="min-h-[44px] rounded-xl bg-red-600 px-4 text-sm font-semibold text-white disabled:opacity-60">
                  {busyItemId === "new" ? "Ekleniyor..." : "Item Ekle"}
                </button>
              </div>
            </PanelCard>

            <div className="grid gap-3">
              {sortedItems.map((item) => {
                const editor = itemEditors[item.id] ?? createEditorState(item);
                const definition = ASSIGNMENT_EXERCISE_BY_SLUG.get(editor.exerciseSlug) ?? ASSIGNMENT_EXERCISE_CATALOG[0];
                const supportedFields = definition ? getSupportedSettingFields(definition) : [];
                const isBusy = busyItemId === item.id;

                return (
                  <PanelCard key={item.id} title={`${item.sortOrder}. ${item.exerciseTitle}`} subtitle={`Durum: ${STATUS_LABELS[item.status]}`}>
                    <div className="grid gap-4 xl:grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)]">
                      <div className="grid gap-3 sm:grid-cols-2">
                        <label className="grid gap-1 text-sm font-semibold text-slate-700 sm:col-span-2">
                          <span>Egzersiz</span>
                          <select
                            value={editor.exerciseSlug}
                            onChange={(event) => setItemEditors((current) => ({
                              ...current,
                              [item.id]: {
                                ...editor,
                                exerciseSlug: event.target.value,
                              },
                            }))}
                            className="min-h-[44px] rounded-xl border border-slate-300 bg-white px-3"
                          >
                            {ASSIGNMENT_EXERCISE_CATALOG.filter((entry) => entry.assignmentEnabled).map((entry) => (
                              <option key={entry.slug} value={entry.slug}>{entry.title}</option>
                            ))}
                          </select>
                        </label>

                        <label className="grid gap-1 text-sm font-semibold text-slate-700">
                          <span>Durum</span>
                          <select
                            value={editor.status}
                            onChange={(event) => setItemEditors((current) => ({
                              ...current,
                              [item.id]: { ...editor, status: event.target.value as AssignmentItem["status"] },
                            }))}
                            className="min-h-[44px] rounded-xl border border-slate-300 bg-white px-3"
                          >
                            {Object.entries(STATUS_LABELS).map(([value, label]) => (
                              <option key={value} value={value}>{label}</option>
                            ))}
                          </select>
                        </label>

                        <label className="grid gap-1 text-sm font-semibold text-slate-700">
                          <span>Sira</span>
                          <input
                            type="number"
                            min={1}
                            value={editor.sortOrder}
                            onChange={(event) => setItemEditors((current) => ({
                              ...current,
                              [item.id]: { ...editor, sortOrder: Number(event.target.value) || 1 },
                            }))}
                            className="min-h-[44px] rounded-xl border border-slate-300 bg-white px-3"
                          />
                        </label>

                        {supportedFields.map((field) => (
                          <label key={field} className="grid gap-1 text-sm font-semibold text-slate-700">
                            <span>{field}</span>
                            <input
                              value={String(editor.settingsJson[field] ?? "")}
                              onChange={(event) => setItemEditors((current) => ({
                                ...current,
                                [item.id]: {
                                  ...editor,
                                  settingsJson: {
                                    ...editor.settingsJson,
                                    [field]: coerceSettingValue(event.target.value),
                                  },
                                },
                              }))}
                              className="min-h-[44px] rounded-xl border border-slate-300 bg-white px-3"
                            />
                          </label>
                        ))}

                        {editor.exerciseSlug === "anlama-testi" ? (
                          <label className="grid gap-1 text-sm font-semibold text-slate-700 sm:col-span-2">
                            <span>Metin</span>
                            <select
                              value={editor.assignedTextId}
                              onChange={(event) => setItemEditors((current) => ({
                                ...current,
                                [item.id]: {
                                  ...editor,
                                  assignedTextId: event.target.value,
                                  assignedTextTitle: textCandidates.find((entry) => entry.id === event.target.value)?.title ?? "",
                                },
                              }))}
                              className="min-h-[44px] rounded-xl border border-slate-300 bg-white px-3"
                            >
                              <option value="">Metin seciniz</option>
                              {textCandidates.map((entry) => (
                                <option key={entry.id} value={entry.id}>{entry.title}</option>
                              ))}
                            </select>
                          </label>
                        ) : null}
                      </div>

                      <div className="grid gap-3">
                        <label className="grid gap-1 text-sm font-semibold text-slate-700">
                          <span>Ogretmen Notu</span>
                          <textarea
                            value={editor.teacherNote}
                            onChange={(event) => setItemEditors((current) => ({
                              ...current,
                              [item.id]: { ...editor, teacherNote: event.target.value },
                            }))}
                            className="min-h-[120px] rounded-xl border border-slate-300 bg-white px-3 py-2"
                          />
                        </label>

                        <div className="flex flex-wrap gap-2">
                          <button type="button" onClick={() => void saveItem(item.id)} disabled={isBusy} className="min-h-[44px] rounded-xl bg-red-600 px-4 text-sm font-semibold text-white disabled:opacity-60">
                            {isBusy ? "Kaydediliyor..." : "Itemi Kaydet"}
                          </button>
                          <button type="button" onClick={() => void deleteItem(item.id)} disabled={isBusy || item.status !== "pending"} className="min-h-[44px] rounded-xl border border-rose-300 bg-rose-50 px-4 text-sm font-semibold text-rose-700 disabled:opacity-60">
                            Itemi Sil
                          </button>
                        </div>
                      </div>
                    </div>
                  </PanelCard>
                );
              })}
            </div>

            <div className="flex flex-wrap gap-2">
              <Link href={selectedStudent ? `/ogretmen/ogrenciler/${selectedStudent.id}` : "/ogretmen/idil-panel/ogrenci-takip"} className="inline-flex min-h-[40px] items-center rounded-xl border border-slate-300 bg-white px-3 text-sm font-semibold text-slate-700">
                Ogrenciye Git
              </Link>
            </div>
          </>
        ) : null}
      </TeacherOnly>
    </AppShell>
  );
}
