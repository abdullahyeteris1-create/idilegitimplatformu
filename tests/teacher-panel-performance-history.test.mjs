import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { buildTeacherStudentPerformanceHistory } from "../src/lib/teachers/studentPerformanceHistory.ts";

const REPOSITORY = new URL("../src/lib/teachers/studentTrackingRepository.ts", import.meta.url);
const DETAIL_CLIENT = new URL("../src/components/teacher-panel/TeacherStudentDetailClient.tsx", import.meta.url);

function makeResult(overrides = {}) {
  return {
    id: "result-base",
    studentId: "student-1",
    studentName: "Öğrenci",
    username: "ogrenci",
    exerciseType: "reading-speed-test",
    exerciseTitle: "Okuma Hızı Testi",
    date: "2026-07-01T10:00:00.000Z",
    createdAt: "2026-07-01T10:00:01.000Z",
    durationSeconds: 45,
    correctCount: 0,
    wrongCount: 0,
    score: 0,
    successRate: 0,
    submissionKey: "submission-base",
    details: {
      textTitle: "Başlangıç Metni",
      readingSpeedWpm: 100,
      durationSeconds: 45,
      completedAt: "2026-07-01T10:00:00.000Z",
    },
    ...overrides,
  };
}

test("performance history classifies valid results and ignores invalid ones", () => {
  const result = buildTeacherStudentPerformanceHistory({
    results: [
      makeResult({
        id: "speed-1",
        submissionKey: "submission-a",
        date: "2026-07-01T10:00:00.000Z",
        createdAt: "2026-07-01T10:00:01.000Z",
        details: {
          textTitle: "Metin A",
          readingSpeedWpm: 100,
          durationSeconds: 40,
          completedAt: "2026-07-01T10:00:00.000Z",
        },
      }),
      makeResult({
        id: "comp-1",
        exerciseType: "reading-comprehension",
        exerciseTitle: "Anlama Testi",
        submissionKey: "submission-b",
        date: "2026-07-02T10:00:00.000Z",
        createdAt: "2026-07-02T10:00:01.000Z",
        correctCount: 2,
        wrongCount: 1,
        successRate: 70,
        details: {
          textTitle: "Metin B",
          readingSpeedWpm: 130,
          readingDurationSeconds: 30,
          comprehensionScore: 70,
          correctAnswers: 2,
          wrongAnswers: 1,
          totalQuestions: 3,
          completedAt: "2026-07-02T10:00:00.000Z",
        },
      }),
      makeResult({
        id: "comp-2",
        exerciseType: "reading-comprehension",
        exerciseTitle: "Anlama Testi",
        submissionKey: "submission-c",
        date: "2026-07-03T10:00:00.000Z",
        createdAt: "2026-07-03T10:00:01.000Z",
        correctCount: 1,
        wrongCount: 2,
        successRate: 40,
        details: {
          textTitle: "Metin C",
          readingSpeedWpm: 90,
          readingDurationSeconds: 25,
          comprehensionScore: 40,
          correctAnswers: 1,
          wrongAnswers: 2,
          totalQuestions: 3,
          completedAt: "2026-07-03T10:00:00.000Z",
        },
      }),
      makeResult({
        id: "speed-invalid",
        submissionKey: "submission-d",
        date: "2026-07-04T10:00:00.000Z",
        details: {
          textTitle: "Geçersiz Metin",
          readingSpeedWpm: 0,
          completedAt: "2026-07-04T10:00:00.000Z",
        },
      }),
      makeResult({
        id: "comp-invalid",
        exerciseType: "reading-comprehension",
        submissionKey: "submission-e",
        date: "2026-07-05T10:00:00.000Z",
        successRate: null,
        details: {
          textTitle: "Geçersiz Anlama",
          readingSpeedWpm: 110,
          completedAt: "2026-07-05T10:00:00.000Z",
        },
      }),
      makeResult({
        id: "unknown",
        exerciseType: "tachistoscope",
        submissionKey: "submission-f",
        date: "2026-07-06T10:00:00.000Z",
        details: {
          completedAt: "2026-07-06T10:00:00.000Z",
        },
      }),
    ],
    activeProgram: null,
    programTasks: [],
    xpEvents: [],
    analysisLimit: 100,
  });

  assert.equal(result.performanceHistoryError, null);
  assert.equal(result.performanceHistory.reading.totalResultCount, 4);
  assert.equal(result.performanceHistory.comprehension.totalResultCount, 2);
  assert.equal(result.performanceHistory.reading.latestValue, 110);
  assert.equal(result.performanceHistory.reading.previousValue, 90);
  assert.equal(result.performanceHistory.reading.highestValue, 130);
  assert.equal(result.performanceHistory.reading.averageValue, 107.5);
  assert.equal(result.performanceHistory.reading.changeValue, 20);
  assert.equal(result.performanceHistory.reading.changePercent, 22.2);
  assert.equal(result.performanceHistory.reading.trendDirection, "up");
  assert.equal(result.performanceHistory.comprehension.latestValue, 40);
  assert.equal(result.performanceHistory.comprehension.previousValue, 70);
  assert.equal(result.performanceHistory.comprehension.highestValue, 70);
  assert.equal(result.performanceHistory.comprehension.averageValue, 55);
  assert.equal(result.performanceHistory.comprehension.changeValue, -30);
  assert.equal(result.performanceHistory.comprehension.changePercent, -42.9);
  assert.equal(result.performanceHistory.comprehension.trendDirection, "down");
});

test("performance history dedupes submission key and id fallback entries and enriches recent results", () => {
  const result = buildTeacherStudentPerformanceHistory({
    results: [
      makeResult({
        id: "speed-old",
        submissionKey: "submission-a",
        date: "2026-07-01T10:00:00.000Z",
        createdAt: "2026-07-01T10:00:01.000Z",
        details: {
          textTitle: "Tekrar Metin",
          readingSpeedWpm: 100,
          completedAt: "2026-07-01T10:00:00.000Z",
        },
      }),
      makeResult({
        id: "speed-new",
        submissionKey: "submission-a",
        date: "2026-07-04T10:00:00.000Z",
        createdAt: "2026-07-04T10:00:01.000Z",
        programTaskId: "task-1",
        details: {
          textTitle: "Tekrar Metin",
          readingSpeedWpm: 120,
          durationSeconds: 50,
          completedAt: "2026-07-04T10:00:00.000Z",
        },
      }),
      makeResult({
        id: "fallback-id",
        date: "2026-07-02T10:00:00.000Z",
        createdAt: "2026-07-02T10:00:01.000Z",
        submissionKey: "",
        details: {
          textTitle: "Kimlik Fallback",
          readingSpeedWpm: 80,
          completedAt: "2026-07-02T10:00:00.000Z",
        },
      }),
      makeResult({
        id: "fallback-id",
        date: "2026-07-03T10:00:00.000Z",
        createdAt: "2026-07-03T10:00:01.000Z",
        submissionKey: "",
        details: {
          textTitle: "Kimlik Fallback",
          readingSpeedWpm: 95,
          completedAt: "2026-07-03T10:00:00.000Z",
        },
      }),
      makeResult({
        id: "comp-1",
        exerciseType: "reading-comprehension",
        submissionKey: "submission-b",
        date: "2026-07-05T10:00:00.000Z",
        createdAt: "2026-07-05T10:00:01.000Z",
        programTaskId: "task-1",
        successRate: 82,
        correctCount: 4,
        wrongCount: 1,
        details: {
          textTitle: "Program Metni",
          readingSpeedWpm: 111,
          readingDurationSeconds: 33,
          comprehensionScore: 82,
          correctAnswers: 4,
          wrongAnswers: 1,
          totalQuestions: 5,
          completedAt: "2026-07-05T10:00:00.000Z",
        },
      }),
    ],
    activeProgram: {
      id: "program-1",
      visibleName: "İzleme Programı",
      status: "active",
      currentDayNumber: 3,
      completedDays: 2,
      totalDays: 20,
      assignedAt: "2026-07-01T10:00:00.000Z",
      startedAt: "2026-07-01T10:05:00.000Z",
      completedAt: null,
    },
    programTasks: [
      {
        taskId: "task-1",
        programId: "program-1",
        dayId: "day-1",
        studentId: "student-1",
        dayNumber: 1,
        orderNumber: 1,
        exerciseSlug: "reading-speed-test",
        exerciseTitle: "Görev 1",
        taskType: "reading-speed-test",
        status: "completed",
        startedAt: "2026-07-04T10:00:00.000Z",
        completedAt: "2026-07-04T10:30:00.000Z",
        resultId: "speed-new",
        resultSummary: null,
        awardedXp: null,
      },
    ],
    xpEvents: [
      {
        idempotency_key: "result:submission-a",
        xp_amount: 20,
        event_type: "reading_speed_test_completed",
        source_type: "exercise",
        source_id: "reading-speed-test",
        earned_at: "2026-07-04T10:00:00.000Z",
      },
    ],
    analysisLimit: 100,
  });

  assert.equal(result.performanceHistory.reading.totalResultCount, 3);
  assert.equal(result.performanceHistory.reading.latestValue, 111);
  assert.equal(result.performanceHistory.reading.previousValue, 120);
  assert.equal(result.performanceHistory.reading.trendDirection, "down");
  assert.equal(result.performanceHistory.reading.recentResults[0].sourceLabel, "Program Metni");
  assert.equal(result.performanceHistory.reading.recentResults[0].programName, "İzleme Programı");
  assert.equal(result.performanceHistory.reading.recentResults[0].programTaskName, "Görev 1");
  assert.equal(result.performanceHistory.reading.recentResults[0].sourceId, "speed-new");
  assert.equal(result.performanceHistory.reading.recentResults[1].sourceLabel, "Tekrar Metin");
  assert.equal(result.performanceHistory.reading.recentResults[1].programName, "İzleme Programı");
  assert.equal(result.performanceHistory.reading.recentResults[1].programTaskName, "Görev 1");
  assert.equal(result.performanceHistory.reading.recentResults[1].awardedXp, 20);
  assert.equal(result.performanceHistory.reading.recentResults[1].sourceId, "speed-new");
  assert.equal(result.performanceHistory.reading.recentResults.length, 3);
});

test("teacher detail repository and client wire the new performance history without breaking the live schema", async () => {
  const repositorySource = await readFile(REPOSITORY, "utf8");
  const clientSource = await readFile(DETAIL_CLIENT, "utf8");
  const normalizedRepositorySource = repositorySource.replace(/\s+/g, " ");
  const normalizedClientSource = clientSource.replace(/\s+/g, " ");

  assert.match(repositorySource, /buildTeacherStudentPerformanceHistory/);
  assert.match(repositorySource, /performanceHistory:/);
  assert.match(repositorySource, /performanceHistoryError:/);
  assert.ok(normalizedRepositorySource.includes("exercise_title,completed_at,created_at,correct_count,wrong_count,score,success_rate,submission_key,program_task_id,details"));
  assert.doesNotMatch(repositorySource, /duration_seconds/);
  assert.doesNotMatch(repositorySource, /class_level/);

  assert.ok(normalizedClientSource.includes("Okuma ve Anlama Performansı"));
  assert.ok(normalizedClientSource.includes("detail.performanceHistory"));
  assert.ok(normalizedClientSource.includes("detail.performanceHistoryError"));
  assert.ok(normalizedClientSource.includes("PerformanceMetricCard"));
});
