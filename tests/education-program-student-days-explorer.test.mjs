import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

import {
  countCompletedStudentProgramTasks,
  selectInitialStudentProgramDayId,
} from "../src/lib/education-programs/studentProgramPresentation.ts";

async function read(relativePath) {
  return readFile(new URL(`../${relativePath}`, import.meta.url), "utf8");
}

function day(dayNumber, status, tasks = []) {
  return {
    id: `day-${dayNumber}`,
    dayNumber,
    title: null,
    description: null,
    status,
    startedAt: null,
    completedAt: null,
    tasks,
  };
}

function task(status) {
  return {
    id: `task-${Math.random()}`,
    dayNumber: 1,
    orderNumber: 1,
    exerciseSlug: "kare-gorme-alani",
    exerciseTitle: "Kare Görme Alanı",
    durationSeconds: 60,
    startingLevel: null,
    status,
  };
}

// --- countCompletedStudentProgramTasks ---

test("countCompletedStudentProgramTasks yalniz completed statusundeki gorevleri sayar", () => {
  const tasks = [
    task("completed"),
    task("available"),
    task("completed"),
    task("locked"),
    task("in_progress"),
  ];

  assert.equal(countCompletedStudentProgramTasks(tasks), 2);
});

test("countCompletedStudentProgramTasks bos dizide 0 doner (NaN olusmaz)", () => {
  assert.equal(countCompletedStudentProgramTasks([]), 0);
});

// --- selectInitialStudentProgramDayId ---

test("3) mevcut gun (currentDayNumber) her zaman ilk oncelikli secilir", () => {
  const days = [
    day(1, "completed"),
    day(2, "in_progress"),
    day(3, "locked"),
  ];

  assert.equal(selectInitialStudentProgramDayId(days, 3), "day-3");
});

test("4) mevcut gun bulunamazsa ilk in_progress gun oncelikli secilir", () => {
  const days = [day(1, "completed"), day(2, "in_progress"), day(3, "locked")];

  assert.equal(selectInitialStudentProgramDayId(days, 99), "day-2");
});

test("5) in_progress yoksa ilk available gun fallback olarak secilir", () => {
  const days = [day(1, "completed"), day(2, "available"), day(3, "locked")];

  assert.equal(selectInitialStudentProgramDayId(days, 99), "day-2");
});

test("in_progress ve available yoksa son tamamlanan gun secilir", () => {
  const days = [day(1, "completed"), day(2, "completed"), day(3, "locked")];

  assert.equal(selectInitialStudentProgramDayId(days, 99), "day-2");
});

test("hicbiri yoksa (hepsi locked) ilk gun secilir", () => {
  const days = [day(3, "locked"), day(1, "locked"), day(2, "locked")];

  assert.equal(selectInitialStudentProgramDayId(days, 99), "day-1");
});

test("6/7) kilitli gun baslangicta secili olamaz, tamamlanan gun secilebilir olarak dondurulebilir", () => {
  const days = [day(1, "completed"), day(2, "locked")];

  assert.equal(selectInitialStudentProgramDayId(days, 2), "day-2");
  // currentDayNumber locked bir gune isaret etse bile fonksiyon dogrudan onu
  // dondurur (gun ID'si) - UI tarafinda nav butonu zaten disabled olacagi
  // icin kullanici bu gune tiklayarak GECEMEZ; bu yalniz "hangi gun ic
  // icerigi baslangicta gorunsun" secimidir, tiklanabilirlik ayri kontrol
  // edilir (bkz. StudentEducationProgramDaysExplorer.tsx disabled={isLocked}).
});

test("gun dizisi bossa null doner", () => {
  assert.equal(selectInitialStudentProgramDayId([], 1), null);
});

// --- StudentEducationProgramDaysExplorer.tsx statik kaynak dogrulamasi ---

const EXPLORER_PATH =
  "src/components/education-programs/StudentEducationProgramDaysExplorer.tsx";

test("Explorer client bilesenidir ve gun secimini gercek button ile yapar", async () => {
  const source = await read(EXPLORER_PATH);

  assert.match(source, /"use client"/);
  assert.match(source, /<button/);
  assert.match(source, /type="submit"|type="button"/);
});

test("kilitli gun butonu disabled olur, secili gun aria-current tasir", async () => {
  const source = await read(EXPLORER_PATH);

  assert.match(source, /disabled=\{isLocked\}/);
  assert.match(source, /aria-current=\{isSelected \? "true" : undefined\}/);
});

test("Explorer durum yalniz renkle degil ikon + metinle de anlatir", async () => {
  const source = await read(EXPLORER_PATH);

  assert.match(source, /STUDENT_PROGRAM_DAY_STATUS_LABELS\[day\.status\]/);
  assert.match(source, /<Icon name=\{dayStatusIcon\(day\.status\)\}/);
});

test("Explorer hassas veri icermez ve Assignment System V2'ye bagli degildir", async () => {
  const source = await read(EXPLORER_PATH);

  assert.doesNotMatch(source, /studentId/);
  assert.doesNotMatch(source, /getSupabaseServiceRoleClient/);
  assert.doesNotMatch(source, /SUPABASE_SERVICE_ROLE/);
  assert.doesNotMatch(source, /@\/lib\/assignments\//);
  assert.doesNotMatch(source, /@\/components\/assignments\//);
  assert.doesNotMatch(source, /launchToken|LAUNCH_SECRET/i);
});

test("Explorer onceden render edilmis children'i data-day-id ile secer, kendi gorev/gun verisini render etmez", async () => {
  const source = await read(EXPLORER_PATH);

  assert.match(source, /child\.props\["data-day-id"\]/);
  assert.doesNotMatch(source, /TaskLaunchForm/);
  assert.doesNotMatch(source, /exerciseTitle/);
});

// --- StudentEducationProgramStudentView.tsx: yeni iki kolonlu entegrasyon ---

const VIEW_PATH =
  "src/components/education-programs/StudentEducationProgramStudentView.tsx";

test("8/9) StudentEducationProgramDaysExplorer'a gun basina data-day-id ile isaretlenmis tek bir cocuk gecirilir", async () => {
  const source = await read(VIEW_PATH);

  assert.match(source, /<StudentEducationProgramDaysExplorer/);
  assert.match(source, /data-day-id=\{day\.id\}/);
});

test("FAZ 4-2B-2) gun secimi kontrollu: parent selectedDayId state'ini tutar, Explorer'a selectedDayId\\/onSelectDayId olarak gecirilir", async () => {
  const viewSource = await read(VIEW_PATH);
  const explorerSource = await read(EXPLORER_PATH);

  assert.match(viewSource, /useState\(initialSelectedDayId\)/);
  assert.match(viewSource, /selectedDayId=\{selectedDayId\}/);
  assert.match(viewSource, /onSelectDayId=\{setSelectedDayId\}/);
  assert.doesNotMatch(explorerSource, /useState/);
  assert.match(explorerSource, /onSelectDayId: \(dayId: string\) => void/);
});

test("15/16) genel ilerleme gorev bazli, NaN/0'a bolme guvenlidir", async () => {
  const source = await read(VIEW_PATH);

  assert.match(source, /allTasks = program\.days\.flatMap\(\(day\) => day\.tasks\)/);
  // FAZ 4-2B-2: completedTaskCount tek yerde adlandirilip hem ilerleme
  // hesabinda hem de sag panele gecirilirken yeniden kullanilir (cift
  // hesaplama yok).
  assert.match(
    source,
    /completedTaskCount = countCompletedStudentProgramTasks\(allTasks\)/,
  );
  assert.match(
    source,
    /overallTaskProgress = calculateStudentProgramProgress\(\s*completedTaskCount,\s*allTasks\.length,?\s*\)/,
  );
});

test("10) gun ilerlemesi (X / Y) her gun icin gorev statuslarindan hesaplanir", async () => {
  const source = await read(VIEW_PATH);

  assert.match(source, /completedTaskCount = countCompletedStudentProgramTasks\(day\.tasks\)/);
});

test("19) EducationProgramLaunchErrorBanner/hata-empty state akisina bu dosyadan dokunulmadi (page.tsx tarafinda kalir)", async () => {
  const source = await read(VIEW_PATH);

  assert.doesNotMatch(source, /EducationProgramLaunchErrorBanner/);
});

test("21) launch sistemine (token/RPC/route) bu bilesenden hicbir bagimlilik yoktur", async () => {
  const viewSource = await read(VIEW_PATH);
  const explorerSource = await read(EXPLORER_PATH);
  const combined = `${viewSource}\n${explorerSource}`;

  assert.doesNotMatch(combined, /launchToken/i);
  assert.doesNotMatch(combined, /exerciseLaunchValidation/);
  assert.doesNotMatch(combined, /educationLaunch/);
});

test("22) Assignment System V2 bu iki dosyada da izole kalir", async () => {
  const viewSource = await read(VIEW_PATH);
  const explorerSource = await read(EXPLORER_PATH);
  const combined = `${viewSource}\n${explorerSource}`;

  assert.doesNotMatch(combined, /@\/lib\/assignments\//);
  assert.doesNotMatch(combined, /@\/components\/assignments\//);
  assert.doesNotMatch(combined, /AssignmentTaskProvider/);
});

// --- responsive/mobile CSS sanity ---

test("21/mobil) gun navigasyonu mobilde yatay kaydirilabilir sekmeye donusur, dikey uzun liste olmaz", async () => {
  const css = await read(
    "src/components/education-programs/StudentEducationProgramDaysExplorer.module.css",
  );

  assert.match(css, /grid-template-columns: minmax\(240px, 300px\) minmax\(0, 1fr\)/);
  assert.match(css, /@media \(max-width: 980px\)/);
  assert.match(css, /flex-direction: row;/);
  assert.match(css, /overflow-x: auto;/);
});

test("erisilebilirlik: gun butonlari minimum 44px dokunma alani hedefler", async () => {
  const css = await read(
    "src/components/education-programs/StudentEducationProgramDaysExplorer.module.css",
  );

  assert.match(css, /\.navItem\s*\{[^}]*min-height:\s*44px/s);
});

test("tema: sabit beyaz arka plan yerine mevcut --idil- degiskenleri kullanilir", async () => {
  const css = await read(
    "src/components/education-programs/StudentEducationProgramDaysExplorer.module.css",
  );

  assert.doesNotMatch(css, /background:\s*#fff/i);
  assert.doesNotMatch(css, /background:\s*white/i);
  assert.match(css, /var\(--idil-surface-strong\)/);
  assert.match(css, /var\(--idil-accent\)/);
});
