import assert from "node:assert/strict";
import test from "node:test";
import { calculateDevelopmentMetric } from "../src/lib/reports/developmentReportCalculations.ts";

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

test("development report has no overall score or radar benchmark contract", async () => {
  const source = await import("node:fs/promises").then((fs) => fs.readFile("src/components/teacher-panel/DevelopmentReportClient.tsx", "utf8"));
  assert.match(source, /Genel Gelişim Özeti/);
  assert.doesNotMatch(source, /Genel Başarı Puanı/);
  assert.doesNotMatch(source, /radar/i);
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
  assert.match(source, /lesson\[field\] === null \? null/);
  assert.match(source, /field === \"focusScore\" \? lesson\[field\] \/ 10/);
  assert.match(source, /field === \"focusScore\" \? \[0, 2\.5, 5, 7\.5, 10\]/);
});

test("development report print styles keep A4 charts together and preserve print colors", async () => {
  const css = await import("node:fs/promises").then((fs) => fs.readFile("src/components/teacher-panel/development-report.module.css", "utf8"));
  assert.match(css, /@page \{ size: A4 portrait/);
  assert.match(css, /page-break-inside: avoid/);
  assert.match(css, /print-color-adjust: exact/);
  assert.doesNotMatch(css, /noteHint/);
});
