import type { ExerciseResult } from "@/lib/results/types";
import * as XLSX from "xlsx";

const CSV_DELIMITER = ";";
const CSV_LINE_BREAK = "\r\n";
const UTF8_BOM = "\uFEFF";

const RESULTS_HEADER = [
  "Ogrenci Adi",
  "Ogrenci ID",
  "Egzersiz",
  "Tarih",
  "Sure",
  "Dogru",
  "Yanlis",
  "Puan",
  "Basari Yuzdesi",
  "Okuma Hizi",
  "Anlama Orani",
  "Kelime Sayisi",
  "Okuma Suresi",
];

function hasWindow(): boolean {
  return typeof window !== "undefined";
}

function escapeCsvValue(value: string | number): string {
  const text = String(value ?? "");

  if (
    text.includes(CSV_DELIMITER) ||
    text.includes("\n") ||
    text.includes("\r") ||
    text.includes("\"")
  ) {
    return `"${text.replaceAll("\"", "\"\"")}"`;
  }

  return text;
}

function getDetailNumber(result: ExerciseResult, key: string): number | "" {
  const value = result.details?.[key];

  return typeof value === "number" && Number.isFinite(value) ? value : "";
}

function toExportRow(result: ExerciseResult): Array<string | number> {
  return [
    result.studentName,
    result.studentId,
    result.exerciseTitle,
    new Date(result.date).toLocaleString("tr-TR"),
    result.durationSeconds,
    result.correctCount,
    result.wrongCount,
    result.score,
    result.successRate,
    getDetailNumber(result, "readingSpeedWpm"),
    getDetailNumber(result, "comprehensionScore"),
    getDetailNumber(result, "totalWords"),
    getDetailNumber(result, "readingDurationSeconds"),
  ];
}

export function exportResultsToCsv(results: ExerciseResult[]): string {
  const rows = results.map(toExportRow);

  const csvBody = [RESULTS_HEADER, ...rows]
    .map((row) => row.map((cell) => escapeCsvValue(cell)).join(CSV_DELIMITER))
    .join(CSV_LINE_BREAK);

  // "sep=;" line helps Excel detect delimiter when opening via double click.
  return [`sep=${CSV_DELIMITER}`, csvBody].join(CSV_LINE_BREAK);
}

export function downloadResultsCsv(results: ExerciseResult[], filename: string): void {
  if (!hasWindow()) {
    return;
  }

  const csv = exportResultsToCsv(results);
  const blob = new Blob([UTF8_BOM, csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");

  link.href = url;
  link.setAttribute("download", filename);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

export function exportResultsToXlsx(results: ExerciseResult[]): XLSX.WorkBook {
  const rows = results.map((result) => ({
    "Ogrenci Adi": result.studentName,
    "Ogrenci ID": result.studentId,
    Egzersiz: result.exerciseTitle,
    Tarih: new Date(result.date).toLocaleString("tr-TR"),
    Sure: result.durationSeconds,
    Dogru: result.correctCount,
    Yanlis: result.wrongCount,
    Puan: result.score,
    "Basari Yuzdesi": result.successRate,
    "Okuma Hizi": getDetailNumber(result, "readingSpeedWpm"),
    "Anlama Orani": getDetailNumber(result, "comprehensionScore"),
    "Kelime Sayisi": getDetailNumber(result, "totalWords"),
    "Okuma Suresi": getDetailNumber(result, "readingDurationSeconds"),
  }));

  const worksheet = XLSX.utils.json_to_sheet(rows, {
    header: RESULTS_HEADER,
  });

  worksheet["!cols"] = [
    { wch: 24 },
    { wch: 18 },
    { wch: 22 },
    { wch: 22 },
    { wch: 10 },
    { wch: 10 },
    { wch: 10 },
    { wch: 10 },
    { wch: 16 },
    { wch: 14 },
    { wch: 14 },
    { wch: 14 },
    { wch: 14 },
  ];

  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, "Sonuclar");

  return workbook;
}

export function downloadResultsXlsx(results: ExerciseResult[], filename: string): void {
  if (!hasWindow()) {
    return;
  }

  const workbook = exportResultsToXlsx(results);
  XLSX.writeFile(workbook, filename, { compression: true });
}
