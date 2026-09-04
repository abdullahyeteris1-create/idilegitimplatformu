import assert from "node:assert/strict";
import test from "node:test";
import {
  calculateDailyDevelopmentAverages,
  calculateDevelopmentMetric,
  getDevelopmentDateKey,
  resolveDevelopmentEducationStartDate,
} from "../src/lib/reports/developmentReportCalculations.ts";

function lesson(id, lessonDate, wordsPerMinute, comprehensionScore, focusScore) {
  return { id, lessonNo: Number(id), lessonDate, wordsPerMinute, comprehensionScore, focusScore, teacherNote: "" };
}

test("development report groups same calendar day and averages each metric independently", () => {
  const days = calculateDailyDevelopmentAverages([
    lesson("1", "2026-07-30T08:00:00+03:00", 160, 88, 88),
    lesson("2", "2026-07-30T12:00:00+03:00", 196, 50, 50),
    lesson("3", "2026-07-30T15:00:00+03:00", 185, 100, 100),
    lesson("4", "2026-07-30T18:00:00+03:00", 170, 100, 100),
    lesson("5", "2026-08-13T08:00:00+03:00", 215, 100, 100),
    lesson("6", "2026-08-13T12:00:00+03:00", 255, 100, 100),
    lesson("7", "2026-08-13T15:00:00+03:00", 228, 100, 100),
    lesson("8", "2026-08-13T18:00:00+03:00", 215, 100, 100),
    lesson("9", "2026-08-13T20:00:00+03:00", 241, 100, 100),
  ]);
  assert.equal(days.length, 2);
  assert.deepEqual(days.map((day) => day.dateKey), ["2026-07-30", "2026-08-13"]);
  assert.equal(days[0].wordsPerMinute, 177.75);
  assert.equal(days[0].comprehensionScore, 84.5);
  assert.equal(days[0].focusScore, 84.5);
  assert.equal(days[1].wordsPerMinute, 230.8);
  assert.equal(days[1].comprehensionScore, 100);
  assert.equal(days[1].focusScore, 100);
});

test("development report keeps timezone calendar dates stable and handles one-day/null data", () => {
  assert.equal(getDevelopmentDateKey("2026-07-30"), "2026-07-30");
  const days = calculateDailyDevelopmentAverages([
    lesson("1", "2026-07-30T23:30:00+03:00", 100, null, null),
    lesson("2", "2026-07-31T00:30:00+03:00", null, 80, 90),
  ]);
  assert.equal(days.length, 2);
  assert.equal(days[0].comprehensionScore, null);
  assert.equal(days[1].wordsPerMinute, null);
  assert.equal(days[1].focusScore, 90);
});

test("development report calculates first/last valid values without treating missing focus as zero", () => {
  const metric = calculateDevelopmentMetric([null, 50, null, 75]);
  assert.equal(metric.first, 50);
  assert.equal(metric.last, 75);
  assert.equal(metric.delta, 25);
  assert.equal(metric.percent, 50);
});

test("development report supports arbitrary lesson counts", () => {
  const metric = calculateDevelopmentMetric([100, 120, 140, 160, 180, 200, 220, 240, 260, 280, 300, 320, 340, 360, 380, 400, 420]);
  assert.equal(metric.first, 100);
  assert.equal(metric.last, 420);
  assert.equal(metric.percent, 320);
});

test("education start uses the earliest valid lesson one date", () => {
  const lessons = [
    { ...lesson("1", "2026-08-05", 100, 80, 80), lessonNo: 1 },
    { ...lesson("2", "2026-08-03", 110, 82, 82), lessonNo: 1 },
    { ...lesson("3", "2026-08-04", 120, 84, 84), lessonNo: 1 },
    { ...lesson("4", "2026-08-01", 130, 86, 86), lessonNo: 4 },
  ];

  assert.equal(resolveDevelopmentEducationStartDate(lessons, "2026-07-01"), "2026-08-03");
});

test("education start falls back to the earliest lesson when lesson one is missing", () => {
  const lessons = [
    { ...lesson("3", "2026-08-10", 100, 80, 80), lessonNo: 3 },
    { ...lesson("4", "2026-08-15", 110, 82, 82), lessonNo: 4 },
  ];

  assert.equal(resolveDevelopmentEducationStartDate(lessons, "2026-07-01"), "2026-08-10");
});

test("education start uses the stored fallback only when no valid lesson date exists", () => {
  assert.equal(resolveDevelopmentEducationStartDate([], "2026-07-01"), "2026-07-01");
  assert.equal(
    resolveDevelopmentEducationStartDate(
      [
        { ...lesson("1", null, 100, 80, 80), lessonNo: 1 },
        { ...lesson("2", "not-a-date", 100, 80, 80), lessonNo: 2 },
      ],
      "2026-07-01",
    ),
    "2026-07-01",
  );
  assert.equal(resolveDevelopmentEducationStartDate([], "invalid"), null);
  assert.equal(resolveDevelopmentEducationStartDate([], null), null);
});

test("development report has no overall score or radar benchmark contract", async () => {
  const source = await import("node:fs/promises").then((fs) => fs.readFile("src/components/teacher-panel/DevelopmentReportClient.tsx", "utf8"));
  assert.match(source, /Genel Gelişim Özeti/);
  assert.doesNotMatch(source, /Genel Başarı Puanı/);
  assert.doesNotMatch(source, /radar/i);
  assert.doesNotMatch(source, /ÖĞRENCİ ID/);
  assert.match(source, /report\.metrics\.comprehension\.last/);
  assert.match(source, /focusScore.*\/ 10/);
});

test("development report charts use responsive label density and SVG area/marker styling", async () => {
  const source = await import("node:fs/promises").then((fs) => fs.readFile("src/components/teacher-panel/DevelopmentReportClient.tsx", "utf8"));
  assert.match(source, /getLabelIndexes/);
  assert.match(source, /length <= 6/);
  assert.match(source, /length <= 10/);
  assert.match(source, /areaPath/);
  assert.match(source, /strokeWidth=\"2\"/);
  assert.match(source, /CHART_COLORS/);
  assert.match(source, /field !== \"wordsPerMinute\"/);
  assert.match(source, /axisLabel/);
});

test("development report keeps focus missing values out of chart points and displays focus on ten", async () => {
  const source = await import("node:fs/promises").then((fs) => fs.readFile("src/components/teacher-panel/DevelopmentReportClient.tsx", "utf8"));
  assert.match(source, /day\[field\] === null \? null/);
  assert.match(source, /field === \"focusScore\" \? day\[field\] \/ 10/);
  assert.match(source, /field === \"focusScore\" \? \[0, 2\.5, 5, 7\.5, 10\]/);
});

test("development report keeps KPI and profile formatting on the shared metric display", async () => {
  const source = await import("node:fs/promises").then((fs) => fs.readFile("src/components/teacher-panel/DevelopmentReportClient.tsx", "utf8"));
  assert.match(source, /function profileMetricValue/);
  assert.match(source, /const display = metricDisplay\(metric, field\)/);
  assert.match(source, /return `\$\{formatted\} kelime\/dk`/);
  assert.match(source, /return `%\$\{formatted\}`/);
  assert.match(source, /return `\$\{formatted\}\/10`/);
  assert.match(source, /metric=\{report\.metrics\.speed\} field="wordsPerMinute"/);
  assert.match(source, /metric=\{report\.metrics\.comprehension\} field="comprehensionScore"/);
  assert.match(source, /metric=\{report\.metrics\.focus\} field="focusScore"/);
});

test("development report print styles keep A4 charts together and preserve print colors", async () => {
  const css = await import("node:fs/promises").then((fs) => fs.readFile("src/components/teacher-panel/development-report.module.css", "utf8"));
  assert.match(css, /@page \{ size: A4 portrait/);
  assert.match(css, /page-break-inside: avoid/);
  assert.match(css, /print-color-adjust: exact/);
  assert.match(css, /\.reportPageOne/);
  assert.match(css, /page-break-after: always/);
  assert.match(css, /\.pdfMode \.reportPageOne/);
  assert.doesNotMatch(css, /noteHint/);
});

test("development report keeps the two-page PDF structure and compact A4 capture bounds", async () => {
  const source = await import("node:fs/promises").then((fs) => fs.readFile("src/components/teacher-panel/DevelopmentReportClient.tsx", "utf8"));
  assert.match(source, /reportPageOne/);
  assert.match(source, /reportPageTwo/);
  assert.match(source, /classList\.add\(styles\.pdfMode\)/);
  assert.match(source, /const PDF_CONTENT_WIDTH_PX = 718/);
  assert.match(source, /maxWidth = `\$\{PDF_CONTENT_WIDTH_PX\}px`/);
  assert.doesNotMatch(source, /794px/);
  assert.match(source, /margin: \[PDF_MARGIN_MM, PDF_MARGIN_MM, PDF_MARGIN_MM, PDF_MARGIN_MM\]/);
  assert.match(source, /scale: 2/);
  assert.match(source, /format: "a4", orientation: "portrait"/);
  assert.match(source, /Sayfa 1 \/ 2/);
  assert.match(source, /Sayfa 2 \/ 2/);
  assert.equal((source.match(/<MetricCard title=/g) ?? []).length, 3);
  assert.equal((source.match(/<ProfileBar label=/g) ?? []).length, 3);
  assert.equal((source.match(/<Chart title=/g) ?? []).length, 3);
  assert.equal((source.match(/<footer className=\{styles\.footer\}>/g) ?? []).length, 2);
  assert.match(source, /<table><thead><tr><th>Ders<\/th><th>Tarih<\/th>/);
  assert.match(source, /calculateDailyDevelopmentAverages/);
  assert.match(source, /formatShortDate/);
});

test("development report does not clip the compact first PDF page", async () => {
  const css = await import("node:fs/promises").then((fs) => fs.readFile("src/components/teacher-panel/development-report.module.css", "utf8"));
  assert.match(css, /\.pdfMode \.reportPageOne \{ height: auto; min-height: 0; overflow: visible; \}/);
  assert.match(css, /\.pdfMode \.chartCard \{ min-height: 190px/);
  assert.match(css, /\.pdfMode \.chartSvg \{ height: 160px; max-height: 160px/);
  assert.match(css, /\.pdfMode \.profileRow \{ grid-template-columns: 165px minmax\(0, 1fr\) 135px/);
  assert.match(css, /\.pdfMode \.assessmentCard \{ margin-top: 8px/);
  assert.doesNotMatch(css, /794px/);
  assert.match(css, /\.pdfMode \.studentBox > div \{[\s\S]*?align-items: start/);
  assert.match(css, /\.pdfMode \.metricMain \{[\s\S]*?grid-template-rows/);
  assert.match(css, /\.pdfMode \.tableWrap th,[\s\S]*?vertical-align: middle/);
  assert.match(css, /\.pdfMode \.detailGrid \{[\s\S]*?align-items: stretch/);
});

test("development report provides direct PDF download without changing print flow", async () => {
  const source = await import("node:fs/promises").then((fs) => fs.readFile("src/components/teacher-panel/DevelopmentReportClient.tsx", "utf8"));
  assert.match(source, /html2pdf/);
  assert.match(source, /PDF hazırlanıyor/);
  assert.match(source, /fileSafeName\(report\.student\.name\)/);
  assert.match(source, /\.pdf/);
  assert.match(source, /printControls.*noPrint/);
  assert.match(source, /useCORS: true/);
  assert.match(source, /window\.print\(\)/);
});

test("development report header reuses the real local Idil logo asset", async () => {
  const source = await import("node:fs/promises").then((fs) => fs.readFile("src/components/teacher-panel/DevelopmentReportClient.tsx", "utf8"));
  const css = await import("node:fs/promises").then((fs) => fs.readFile("src/components/teacher-panel/development-report.module.css", "utf8"));
  assert.match(source, /src="\/logo-idil\.png"/);
  assert.match(source, /alt="İdil Hızlı Okuma"/);
  assert.match(css, /\.logoMark img/);
  assert.match(css, /object-fit: contain/);
});
