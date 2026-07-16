"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { TeacherOnly } from "@/components/auth/TeacherOnly";
import { AppShell } from "@/components/layout/AppShell";
import { PanelCard } from "@/components/ui/PanelCard";
import { TEACHER_NAV_ITEMS } from "@/lib/constants/teacherNavigation";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";

type CsvColumn =
  | "name"
  | "class_name"
  | "education_level"
  | "parent_name"
  | "phone"
  | "username"
  | "password"
  | "is_active"
  | "notes";

type PreviewStatus = "ready" | "missing-name" | "username-conflict" | "skipped" | "imported";

type CsvStudentPayload = {
  name: string;
  class_name: string | null;
  education_level: string | null;
  parent_name: string | null;
  phone: string | null;
  username: string;
  password: string;
  is_active: boolean;
  notes: string | null;
};

type PreviewRow = CsvStudentPayload & {
  id: string;
  rowNumber: number;
  status: PreviewStatus;
};

type ImportReport = {
  totalRows: number;
  importedRows: number;
  skippedRows: number;
  conflictRows: number;
  invalidRows: number;
};

const REQUIRED_COLUMNS: CsvColumn[] = [
  "name",
  "class_name",
  "parent_name",
  "phone",
  "username",
  "password",
  "is_active",
  "notes",
];

const STUDENTS_TABLE = process.env.NEXT_PUBLIC_SUPABASE_STUDENTS_TABLE ?? "students";

function cleanCell(value: string | undefined): string {
  return (value ?? "").replace(/^\uFEFF/, "").trim();
}

function normalizeUsernameLookup(value: string): string {
  return value
    .toLocaleLowerCase("tr-TR")
    .replace(/ğ/g, "g")
    .replace(/ü/g, "u")
    .replace(/ş/g, "s")
    .replace(/ı/g, "i")
    .replace(/ö/g, "o")
    .replace(/ç/g, "c")
    .replace(/İ/g, "i")
    .replace(/[^a-z0-9]/g, "");
}

function generateUsername(value: string): string {
  const normalized = normalizeUsernameLookup(value);

  if (normalized) {
    return normalized;
  }

  return `ogrenci${Math.floor(Math.random() * 9000 + 1000)}`;
}

function parseBoolean(value: string): boolean {
  const normalized = value.trim().toLocaleLowerCase("tr-TR");

  if (!normalized) {
    return true;
  }

  return !["false", "0", "hayir", "hayır", "pasif", "inactive", "no"].includes(normalized);
}

function detectDelimiter(headerLine: string): string {
  const candidates = [",", ";", "\t"];
  return candidates.reduce((best, candidate) => {
    const bestCount = headerLine.split(best).length;
    const candidateCount = headerLine.split(candidate).length;
    return candidateCount > bestCount ? candidate : best;
  }, ",");
}

function parseCsv(text: string): string[][] {
  const normalizedText = text.replace(/^\uFEFF/, "").replace(/\r\n/g, "\n").replace(/\r/g, "\n");
  const delimiter = detectDelimiter(normalizedText.split("\n")[0] ?? "");
  const rows: string[][] = [];
  let currentRow: string[] = [];
  let currentCell = "";
  let isQuoted = false;

  for (let index = 0; index < normalizedText.length; index += 1) {
    const character = normalizedText[index];
    const nextCharacter = normalizedText[index + 1];

    if (character === "\"") {
      if (isQuoted && nextCharacter === "\"") {
        currentCell += "\"";
        index += 1;
      } else {
        isQuoted = !isQuoted;
      }

      continue;
    }

    if (character === delimiter && !isQuoted) {
      currentRow.push(currentCell);
      currentCell = "";
      continue;
    }

    if (character === "\n" && !isQuoted) {
      currentRow.push(currentCell);
      rows.push(currentRow);
      currentRow = [];
      currentCell = "";
      continue;
    }

    currentCell += character;
  }

  currentRow.push(currentCell);
  rows.push(currentRow);

  return rows.filter((row) => row.some((cell) => cleanCell(cell)));
}

function makeUniqueUsername(username: string, usedUsernames: Set<string>): string {
  const baseUsername = generateUsername(username);
  let candidate = baseUsername;
  let suffix = 2;

  while (usedUsernames.has(normalizeUsernameLookup(candidate))) {
    candidate = `${baseUsername}${suffix}`;
    suffix += 1;
  }

  usedUsernames.add(normalizeUsernameLookup(candidate));
  return candidate;
}

function getStatusLabel(status: PreviewStatus): string {
  switch (status) {
    case "missing-name":
      return "Eksik ad soyad";
    case "username-conflict":
      return "Kullanıcı adı çakışıyor";
    case "skipped":
      return "Atlanacak";
    case "imported":
      return "Geçerli";
    default:
      return "Aktarılacak";
  }
}

function getStatusClass(status: PreviewStatus): string {
  switch (status) {
    case "missing-name":
    case "username-conflict":
      return "border-rose-200 bg-rose-50 text-rose-700";
    case "skipped":
      return "border-amber-200 bg-amber-50 text-amber-700";
    case "imported":
      return "border-emerald-200 bg-emerald-50 text-emerald-700";
    default:
      return "border-sky-200 bg-sky-50 text-sky-700";
  }
}

async function readCsvFile(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result ?? ""));
    reader.onerror = () => reject(new Error("CSV dosyası okunamadı."));
    reader.readAsText(file, "utf-8");
  });
}

async function fetchExistingUsernames(): Promise<Set<string>> {
  const supabase = getSupabaseBrowserClient();

  if (!supabase) {
    throw new Error("Supabase bağlantısı bulunamadı. Ortam değişkenlerini kontrol edin.");
  }

  const { data, error } = await supabase.from(STUDENTS_TABLE).select("username");

  if (error) {
    throw new Error("Mevcut kullanıcı adları alınamadı.");
  }

  return new Set(
    (data ?? [])
      .map((row) => (typeof row.username === "string" ? normalizeUsernameLookup(row.username) : ""))
      .filter(Boolean),
  );
}

function buildPreviewRows(csvText: string, existingUsernames: Set<string>): PreviewRow[] {
  const parsedRows = parseCsv(csvText);
  const [headerRow, ...dataRows] = parsedRows;
  const headers = (headerRow ?? []).map((header) => cleanCell(header).toLocaleLowerCase("tr-TR"));
  const educationLevelColumnIndex = headers.indexOf("education_level");
  const missingColumns = REQUIRED_COLUMNS.filter((column) => !headers.includes(column));

  if (missingColumns.length > 0) {
    throw new Error(`CSV kolonları eksik: ${missingColumns.join(", ")}`);
  }

  const usedCsvUsernames = new Set<string>();

  return dataRows.map((row, index) => {
    const values = new Map<CsvColumn, string>();

    REQUIRED_COLUMNS.forEach((column) => {
      const columnIndex = headers.indexOf(column);
      values.set(column, cleanCell(row[columnIndex]));
    });

    const name = values.get("name") ?? "";
    const usernameSource = values.get("username") || name;
    const username = makeUniqueUsername(usernameSource, usedCsvUsernames);
    const isNameMissing = !name;
    const hasConflict = existingUsernames.has(normalizeUsernameLookup(username));

    return {
      id: `csv-row-${index + 2}`,
      rowNumber: index + 2,
      name,
      class_name: values.get("class_name") || null,
      education_level:
        educationLevelColumnIndex >= 0 ? cleanCell(row[educationLevelColumnIndex]) || null : null,
      parent_name: values.get("parent_name") || null,
      phone: values.get("phone") || null,
      username,
      password: values.get("password") || "1234",
      is_active: parseBoolean(values.get("is_active") ?? ""),
      notes: values.get("notes") || null,
      status: isNameMissing ? "missing-name" : hasConflict ? "username-conflict" : "ready",
    };
  });
}

function buildReport(rows: PreviewRow[], importedRows: number): ImportReport {
  const conflictRows = rows.filter((row) => row.status === "username-conflict").length;
  const invalidRows = rows.filter((row) => row.status === "missing-name").length;

  return {
    totalRows: rows.length,
    importedRows,
    conflictRows,
    invalidRows,
    skippedRows: rows.length - importedRows,
  };
}

function toStudentPayload(row: PreviewRow): CsvStudentPayload {
  return {
    name: row.name,
    class_name: row.class_name,
    education_level: row.education_level,
    parent_name: row.parent_name,
    phone: row.phone,
    username: row.username,
    password: row.password,
    is_active: row.is_active,
    notes: row.notes,
  };
}

export default function BulkStudentImportPage() {
  const [fileName, setFileName] = useState("");
  const [previewRows, setPreviewRows] = useState<PreviewRow[]>([]);
  const [errorMessage, setErrorMessage] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [isParsing, setIsParsing] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [report, setReport] = useState<ImportReport | null>(null);

  const readyRows = useMemo(() => previewRows.filter((row) => row.status === "ready"), [previewRows]);

  async function handleFileChange(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];

    setErrorMessage("");
    setSuccessMessage("");
    setReport(null);
    setPreviewRows([]);
    setFileName(file?.name ?? "");

    if (!file) {
      return;
    }

    if (!file.name.toLocaleLowerCase("tr-TR").endsWith(".csv")) {
      setErrorMessage("Lütfen .csv uzantılı bir dosya seçin.");
      return;
    }

    setIsParsing(true);

    try {
      const [csvText, existingUsernames] = await Promise.all([readCsvFile(file), fetchExistingUsernames()]);
      setPreviewRows(buildPreviewRows(csvText, existingUsernames));
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "CSV dosyası işlenemedi.");
    } finally {
      setIsParsing(false);
    }
  }

  async function handleImport() {
    setErrorMessage("");
    setSuccessMessage("");
    setReport(null);

    if (readyRows.length === 0) {
      setErrorMessage("Aktarılacak geçerli öğrenci bulunamadı.");
      return;
    }

    const supabase = getSupabaseBrowserClient();

    if (!supabase) {
      setErrorMessage("Supabase bağlantısı bulunamadı. Ortam değişkenlerini kontrol edin.");
      return;
    }

    setIsImporting(true);

    const payload = readyRows.map(toStudentPayload);
    const { data, error } = await supabase.from(STUDENTS_TABLE).insert(payload).select("username");

    if (error) {
      setErrorMessage(`Öğrenciler aktarılamadı: ${error.message}`);
      setIsImporting(false);
      return;
    }

    const importedUsernames = new Set(
      (data ?? [])
        .map((row) => (typeof row.username === "string" ? normalizeUsernameLookup(row.username) : ""))
        .filter(Boolean),
    );
    const importedCount = importedUsernames.size || readyRows.length;

    setPreviewRows((currentRows) =>
      currentRows.map((row) => {
        if (row.status === "ready" && importedUsernames.has(normalizeUsernameLookup(row.username))) {
          return { ...row, status: "imported" };
        }

        if (row.status === "ready" && importedUsernames.size === 0) {
          return { ...row, status: "imported" };
        }

        if (row.status === "ready") {
          return { ...row, status: "skipped" };
        }

        return row.status === "username-conflict" || row.status === "missing-name" ? { ...row, status: "skipped" } : row;
      }),
    );

    setReport(buildReport(previewRows, importedCount));
    setSuccessMessage("Öğrenciler başarıyla aktarıldı.");
    setIsImporting(false);
  }

  return (
    <AppShell
      title="Toplu Öğrenci Aktar"
      subtitle="CSV dosyasıyla öğrencileri ön izleyip sisteme aktar."
      navItems={TEACHER_NAV_ITEMS}
      wide
    >
      <TeacherOnly>
        <PanelCard>
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div>
              <h2 className="text-[24px] font-semibold tracking-tight text-slate-950">Toplu Öğrenci Aktar</h2>
              <p className="mt-1 text-sm leading-5 text-[var(--muted)]">
                CSV dosyasıyla öğrencileri ön izleyip sisteme aktar.
              </p>
            </div>
            <Link
              href="/ogretmen/idil-panel"
              className="inline-flex min-h-[40px] items-center justify-center rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-sm font-semibold text-slate-700 shadow-sm transition duration-200 hover:border-red-200 hover:bg-red-50 hover:text-red-800"
            >
              Geri Dön
            </Link>
          </div>
        </PanelCard>

        <PanelCard title="CSV Dosyası" subtitle="Desteklenen kolonlar: name, class_name, parent_name, phone, username, password, is_active, notes">
          <label className="flex min-h-[150px] cursor-pointer flex-col items-center justify-center rounded-2xl border border-dashed border-red-200 bg-red-50/50 px-4 py-6 text-center transition hover:bg-red-50">
            <span className="text-sm font-semibold text-red-800">CSV dosyası seç</span>
            <span className="mt-1 text-xs text-slate-500">Sadece .csv dosyaları kabul edilir.</span>
            <input type="file" accept=".csv,text/csv" onChange={handleFileChange} className="sr-only" />
          </label>

          <div className="mt-3 flex flex-col gap-2 text-sm text-slate-600 md:flex-row md:items-center md:justify-between">
            <span>{fileName ? `Seçilen dosya: ${fileName}` : "Henüz dosya seçilmedi."}</span>
            <span>{isParsing ? "CSV okunuyor..." : previewRows.length > 0 ? `${previewRows.length} satır ön izlendi.` : ""}</span>
          </div>
        </PanelCard>

        {errorMessage ? (
          <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-semibold text-rose-700 shadow-sm">
            {errorMessage}
          </div>
        ) : null}

        {successMessage ? (
          <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-700 shadow-sm">
            {successMessage}
          </div>
        ) : null}

        {report ? (
          <PanelCard title="Aktarım Raporu" subtitle="CSV aktarım özeti">
            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
              {[
                ["CSV'deki toplam satır", report.totalRows],
                ["Aktarılan öğrenci", report.importedRows],
                ["Atlanan satır", report.skippedRows],
                ["Kullanıcı adı çakışması", report.conflictRows],
                ["Hatalı satır", report.invalidRows],
              ].map(([label, value]) => (
                <div key={label} className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-rose-700">{label}</p>
                  <p className="mt-2 text-[30px] font-semibold leading-none text-slate-950">{value}</p>
                </div>
              ))}
            </div>
          </PanelCard>
        ) : null}

        {previewRows.length > 0 ? (
          <PanelCard title="Ön İzleme Tablosu" subtitle="Çakışan ve hatalı satırlar varsayılan olarak aktarılmaz.">
            <div className="mb-3 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
              <p className="text-sm font-medium text-slate-600">
                Aktarılacak geçerli öğrenci: <span className="font-bold text-slate-950">{readyRows.length}</span>
              </p>
              <button
                type="button"
                onClick={handleImport}
                disabled={isImporting || readyRows.length === 0}
                className="inline-flex min-h-[42px] items-center justify-center rounded-xl bg-red-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {isImporting ? "Aktarılıyor..." : "Geçerli Öğrencileri Aktar"}
              </button>
            </div>

            <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white">
              <table className="min-w-[1120px] w-full border-collapse text-left text-sm">
                <thead className="bg-slate-50 text-[11px] uppercase tracking-[0.14em] text-slate-500">
                  <tr>
                    {["Durum", "Ad Soyad", "Sınıf", "Veli", "Telefon", "Kullanıcı Adı", "Şifre", "Aktif", "Not"].map((column) => (
                      <th key={column} className="border-b border-slate-200 px-3 py-3 font-semibold">
                        {column}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {previewRows.map((row) => (
                    <tr
                      key={row.id}
                      className={`border-b border-slate-100 last:border-0 ${
                        row.status === "imported" ? "bg-emerald-50/60" : row.status === "ready" ? "bg-white" : "bg-slate-50/70"
                      }`}
                    >
                      <td className="px-3 py-3 align-top">
                        <span className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-semibold ${getStatusClass(row.status)}`}>
                          {getStatusLabel(row.status)}
                        </span>
                      </td>
                      <td className="px-3 py-3 align-top font-semibold text-slate-900">{row.name || "-"}</td>
                      <td className="px-3 py-3 align-top text-slate-700">{row.class_name || "-"}</td>
                      <td className="px-3 py-3 align-top text-slate-700">{row.parent_name || "-"}</td>
                      <td className="px-3 py-3 align-top text-slate-700">{row.phone || "-"}</td>
                      <td className="px-3 py-3 align-top font-mono text-xs text-slate-800">{row.username}</td>
                      <td className="px-3 py-3 align-top font-mono text-xs text-slate-800">{row.password}</td>
                      <td className="px-3 py-3 align-top text-slate-700">{row.is_active ? "Evet" : "Hayır"}</td>
                      <td className="max-w-[280px] px-3 py-3 align-top text-slate-700">{row.notes || "-"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </PanelCard>
        ) : null}
      </TeacherOnly>
    </AppShell>
  );
}
