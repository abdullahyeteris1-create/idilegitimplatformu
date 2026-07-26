import assert from "node:assert/strict";
import test from "node:test";

import { buildPublishValidationMessage } from "../src/lib/education-programs/publishMessages.ts";

test("eksik gun/gorev yoksa yalniz genel mesaj doner", () => {
  const message = buildPublishValidationMessage([], 20);
  assert.equal(
    message,
    "Şablon yayınlanamadı. 20 günün her birinde 5 görev bulunmalıdır.",
  );
});

test("tamamen eksik gun 5 gorev eksik olarak sayilir", () => {
  const message = buildPublishValidationMessage(
    [{ field: "day", message: "Gün 7 eksik.", dayNumber: 7 }],
    20,
  );

  assert.match(message, /Şablon yayınlanamadı\. 20 günün her birinde 5 görev bulunmalıdır\./);
  assert.match(message, /Eksik günler: 7\. gün \(5 görev eksik\)\./);
});

test("kismi eksik gunde her bos slot ayri sayilir", () => {
  const issues = [
    { field: "exerciseSlug", message: "...", dayNumber: 3, orderNumber: 2 },
    { field: "exerciseSlug", message: "...", dayNumber: 3, orderNumber: 4 },
  ];

  const message = buildPublishValidationMessage(issues, 20);
  assert.match(message, /Eksik günler: 3\. gün \(2 görev eksik\)\./);
});

test("birden fazla eksik gun kucukten buyuge siralanir ve virgulle listelenir", () => {
  const issues = [
    { field: "day", message: "Gün 7 eksik.", dayNumber: 7 },
    { field: "exerciseSlug", message: "...", dayNumber: 3, orderNumber: 1 },
    { field: "exerciseSlug", message: "...", dayNumber: 3, orderNumber: 2 },
  ];

  const message = buildPublishValidationMessage(issues, 20);
  assert.match(
    message,
    /Eksik günler: 3\. gün \(2 görev eksik\), 7\. gün \(5 görev eksik\)\./,
  );
});

test("gun basina eksik gorev sayisi 5'i asamaz", () => {
  const issues = Array.from({ length: 7 }, (_, index) => ({
    field: "exerciseSlug",
    message: "...",
    dayNumber: 1,
    orderNumber: index + 1,
  }));

  const message = buildPublishValidationMessage(issues, 5);
  assert.match(message, /1\. gün \(5 görev eksik\)/);
});

test("dayNumber tasimayan issue'lar mesaja gun olarak eklenmez", () => {
  const message = buildPublishValidationMessage(
    [{ field: "settings", message: "Ayarlar geçerli değil." }],
    10,
  );
  assert.doesNotMatch(message, /Eksik günler/);
});
