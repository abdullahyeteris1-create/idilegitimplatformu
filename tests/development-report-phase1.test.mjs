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
