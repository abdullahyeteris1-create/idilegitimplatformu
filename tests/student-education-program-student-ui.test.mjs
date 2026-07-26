import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

import {
  calculateStudentProgramProgress,
  formatStudentProgramDuration,
  selectCurrentStudentProgramDay,
  STUDENT_PROGRAM_DAY_STATUS_LABELS,
  STUDENT_PROGRAM_TASK_STATUS_LABELS,
} from "../src/lib/education-programs/studentProgramPresentation.ts";

async function read(relativePath) {
  return readFile(new URL(`../${relativePath}`, import.meta.url), "utf8");
}

function day(dayNumber, status) {
  return {
    id: `day-${dayNumber}`,
    dayNumber,
    title: null,
    description: null,
    status,
    startedAt: null,
    completedAt: null,
    tasks: [],
  };
}

test("ilerleme yüzdesi doğru hesaplanır ve 0-100 arasında tutulur", () => {
  assert.equal(calculateStudentProgramProgress(0, 20), 0);
  assert.equal(calculateStudentProgramProgress(10, 20), 50);
  assert.equal(calculateStudentProgramProgress(20, 20), 100);
  assert.equal(calculateStudentProgramProgress(30, 20), 100);
  assert.equal(calculateStudentProgramProgress(-2, 20), 0);
  assert.equal(calculateStudentProgramProgress(4, 0), 0);
});

test("süre öğrenci için okunabilir Türkçe metne dönüştürülür", () => {
  assert.equal(formatStudentProgramDuration(60), "60 saniye");
  assert.equal(formatStudentProgramDuration(120), "2 dakika");
  assert.equal(formatStudentProgramDuration(150), "2 dakika 30 saniye");
  assert.equal(formatStudentProgramDuration(45), "45 saniye");
});

test("mevcut gün yalnız görüntüleme fallback sırasına göre seçilir", () => {
  const days = [day(3, "locked"), day(1, "completed"), day(2, "in_progress")];

  assert.equal(selectCurrentStudentProgramDay(days, 2)?.dayNumber, 2);
  assert.equal(selectCurrentStudentProgramDay(days, 3)?.dayNumber, 2);
  assert.equal(
    selectCurrentStudentProgramDay(
      [day(3, "locked"), day(1, "completed")],
      3,
    )?.dayNumber,
    3,
  );
  assert.equal(
    selectCurrentStudentProgramDay(
      [day(3, "locked"), day(1, "completed")],
      9,
    )?.dayNumber,
    1,
  );
  assert.equal(selectCurrentStudentProgramDay([], 1), null);
});

test("gün ve görev durumları Türkçe gösterilir", () => {
  const expected = {
    locked: "Kilitli",
    available: "Başlamaya Hazır",
    in_progress: "Devam Ediyor",
    completed: "Tamamlandı",
  };

  assert.deepEqual(STUDENT_PROGRAM_DAY_STATUS_LABELS, expected);
  assert.deepEqual(STUDENT_PROGRAM_TASK_STATUS_LABELS, expected);
});

test("öğrenci ekranı empty state, program bilgisi ve beş görev yuvasını içerir", async () => {
  const source = await read(
    "src/components/education-programs/StudentEducationProgramStudentView.tsx",
  );
  // FAZ 4-2B-1: hero JSX'i (program adı/mesajı ve genel ilerleme progressbar'ı
  // dahil) StudentEducationProgramHero.tsx'e çıkarıldı; bu ekran hâlâ o
  // bileşen üzerinden aynı bilgiyi gösteriyor.
  const heroSource = await read(
    "src/components/education-programs/StudentEducationProgramHero.tsx",
  );

  assert.match(source, /Henüz aktif bir eğitim programınız bulunmuyor/);
  assert.match(
    source,
    /Öğretmeniniz size bir eğitim programı atadığında burada\s+görüntülenecektir\./,
  );
  assert.match(source, /visibleName=\{visibleName\}/);
  assert.match(source, /studentMessage=\{program\.studentMessage\}/);
  assert.match(heroSource, /role="progressbar"/);
  assert.match(source, /aria-current=\{isCurrent \? "step" : undefined\}/);
  assert.match(source, /Array\.from\(\{ length: 5 \}/);
  assert.match(source, /STUDENT_PROGRAM_DAY_STATUS_LABELS\[day\.status\]/);
  assert.match(source, /STUDENT_PROGRAM_TASK_STATUS_LABELS\[task\.status\]/);
});

test("öğrenci görev kartında aktif egzersiz aksiyonu ve yönetici bilgisi yoktur", async () => {
  const source = await read(
    "src/components/education-programs/StudentEducationProgramStudentView.tsx",
  );

  assert.doesNotMatch(source, /href=\{task\./);
  assert.doesNotMatch(source, /\/egzersizler\//);
  assert.doesNotMatch(source, /<button/);
  assert.doesNotMatch(source, />\s*Başla\s*</);
  assert.doesNotMatch(source, /category/i);
  assert.doesNotMatch(source, /admin.?note/i);
  assert.doesNotMatch(source, /assigned.?by/i);
  assert.doesNotMatch(source, /settings/i);
  assert.doesNotMatch(source, /result.?id/i);
});
