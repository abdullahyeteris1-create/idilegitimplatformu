import assert from "node:assert/strict";
import test from "node:test";

import {
  getTeacherStudentTrackingSummary,
  matchesTeacherStudentStatusFilter,
} from "../src/lib/teachers/studentTrackingPresentation.ts";
import { getStudentStatusLabel } from "../src/lib/students/studentStatus.ts";

function student(status, index) {
  return {
    studentId: `student-${index}`,
    fullName: `Öğrenci ${index}`,
    classLabel: "5-A",
    status,
    accountStatus: status === "passive" ? "passive" : "active",
    accessEndsAt: "2026-12-31",
    totalXp: 10,
    level: 1,
    levelTitle: "Yeni Başlayan",
    lastActivityAt: null,
    activeProgramName: index % 2 === 0 ? "Eğitim Programı" : null,
    programProgressPercent: null,
  };
}

const students = [
  ...Array.from({ length: 10 }, (_, index) => student("active", index)),
  ...Array.from({ length: 4 }, (_, index) => student("completed", index + 10)),
  ...Array.from({ length: 2 }, (_, index) => student("passive", index + 14)),
];

test("takip KPI'lari egitim durumlarini status alanina gore ayirir", () => {
  const summary = getTeacherStudentTrackingSummary(students);

  assert.equal(summary.total, 16);
  assert.equal(summary.active, 10);
  assert.equal(summary.completed, 4);
  assert.equal(summary.passive, 2);
  assert.equal(summary.totalXp, 160);
});

test("durum filtreleri completed ogrenciyi active filtresine katmaz", () => {
  const filter = (statusFilter) =>
    students.filter((item) => matchesTeacherStudentStatusFilter(item, statusFilter));

  assert.equal(filter("active").length, 10);
  assert.ok(filter("active").every((item) => item.status === "active"));
  assert.equal(filter("completed").length, 4);
  assert.ok(filter("completed").every((item) => item.status === "completed"));
  assert.equal(filter("passive").length, 2);
  assert.ok(filter("passive").every((item) => item.status === "passive"));
  assert.equal(filter("all").length, 16);
});

test("Guncel filtresi mevcut anlamini korur: active ve passive", () => {
  const currentStudents = students.filter((item) =>
    matchesTeacherStudentStatusFilter(item, "current"),
  );

  assert.equal(currentStudents.length, 12);
  assert.ok(currentStudents.every((item) => item.status !== "completed"));
});

test("completed ogrenci tablo badge'inde egitimi tamamlandi etiketi alir", () => {
  assert.equal(getStudentStatusLabel("completed"), "Eğitimi Tamamlandı");
});
