import assert from "node:assert/strict";
import test from "node:test";

import {
  calculateRemainingActiveSeconds,
  calculateTotalActiveSeconds,
  hasReachedAssignedDuration,
} from "../src/lib/exercise-engine/blockReading.ts";

// Bu dosya yalniz saf (side-effect'siz) hesap fonksiyonlarini gercek
// fonksiyon cagrilariyla dogrular - regex/source-contract testi degildir
// (bkz. education-program-blok-okuma-*.test.mjs dosyalari, kaynak metin
// dogrulamasi yapar).

test("calculateTotalActiveSeconds: onceki metinlerde biriken sure + su anki metnin suresi", () => {
  assert.equal(calculateTotalActiveSeconds(0, 0), 0);
  assert.equal(calculateTotalActiveSeconds(60, 30), 90);
  assert.equal(calculateTotalActiveSeconds(150, 0), 150);
});

test("calculateTotalActiveSeconds: negatif girdiler 0'a kirpilir (savunmaci, normalde olusmaz)", () => {
  assert.equal(calculateTotalActiveSeconds(-10, 5), 5);
  assert.equal(calculateTotalActiveSeconds(10, -5), 10);
});

test("calculateRemainingActiveSeconds: atanan süreden toplam aktif süre cikarilir, negatife inmez", () => {
  assert.equal(calculateRemainingActiveSeconds(150, 0, 60), 90);
  assert.equal(calculateRemainingActiveSeconds(150, 60, 0), 90);
  assert.equal(calculateRemainingActiveSeconds(150, 100, 40), 10);
});

test("calculateRemainingActiveSeconds: toplam aktif sure atanan sureyi asarsa 0 doner (negatif olmaz)", () => {
  assert.equal(calculateRemainingActiveSeconds(150, 100, 100), 0);
  assert.equal(calculateRemainingActiveSeconds(150, 200, 50), 0);
});

test("calculateRemainingActiveSeconds: standalone (sonsuz atanan sure) icin Infinity doner", () => {
  assert.equal(calculateRemainingActiveSeconds(Number.POSITIVE_INFINITY, 60, 30), Number.POSITIVE_INFINITY);
});

test("hasReachedAssignedDuration: toplam aktif sure atanan sureye esit veya buyukse true doner", () => {
  assert.equal(hasReachedAssignedDuration(150, 60, 89), false);
  assert.equal(hasReachedAssignedDuration(150, 60, 90), true);
  assert.equal(hasReachedAssignedDuration(150, 60, 91), true);
  assert.equal(hasReachedAssignedDuration(150, 0, 0), false);
});

test("hasReachedAssignedDuration: Ilk metin ilk atanan sureden erken bitse bile toplam dolmadiysa false", () => {
  // Ogretmen 150 sn atadi, ogrenci ilk metni 60 saniyede bitirdi - kullanicinin
  // spesifik olarak istedigi senaryo: gorev henuz tamamlanmis SAYILMAMALI.
  assert.equal(hasReachedAssignedDuration(150, 0, 60), false);
});

test("hasReachedAssignedDuration: standalone (sonsuz atanan sure) hicbir zaman true donmez", () => {
  assert.equal(hasReachedAssignedDuration(Number.POSITIVE_INFINITY, 100_000, 100_000), false);
});

test("Iki metinlik senaryo ucdan uca: ilk metin 60sn, ikinci metin 90sn toplamda tam 150sn'ye ulasir", () => {
  const assigned = 150;
  let cumulative = 0;

  // Metin 1 biter (60 sn aktif calisildi).
  const afterFirstText = calculateTotalActiveSeconds(cumulative, 60);
  assert.equal(hasReachedAssignedDuration(assigned, afterFirstText, 0), false);
  assert.equal(calculateRemainingActiveSeconds(assigned, afterFirstText, 0), 90);
  cumulative = afterFirstText;

  // Metin 2 devam ediyor, 89 sn'de henuz dolmadi.
  assert.equal(hasReachedAssignedDuration(assigned, cumulative, 89), false);
  // Tam 90 sn'de gorev tamamlanmis sayilir.
  assert.equal(hasReachedAssignedDuration(assigned, cumulative, 90), true);
});
