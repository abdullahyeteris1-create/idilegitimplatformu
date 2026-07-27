import assert from "node:assert/strict";
import test from "node:test";

import {
  calculateGroupingReadingRemainingActiveSeconds,
  calculateGroupingReadingTotalActiveSeconds,
  hasGroupingReadingReachedAssignedDuration,
} from "../src/lib/exercise-engine/groupingReading.ts";

// Bu dosya yalniz saf (side-effect'siz) hesap fonksiyonlarini gercek
// fonksiyon cagrilariyla dogrular - regex/source-contract testi degildir.
// Bilerek Blok Okuma'nin blockReading.ts ve Golgeleme'nin shadowReading.ts
// icindeki esdeger fonksiyonlarindan bagimsiz test edilir (bu turda ortak/
// genel bir helper'a cikarilmadi).

test("calculateGroupingReadingTotalActiveSeconds: onceki metinlerde biriken sure + su anki metnin suresi", () => {
  assert.equal(calculateGroupingReadingTotalActiveSeconds(0, 0), 0);
  assert.equal(calculateGroupingReadingTotalActiveSeconds(60, 30), 90);
  assert.equal(calculateGroupingReadingTotalActiveSeconds(150, 0), 150);
});

test("calculateGroupingReadingTotalActiveSeconds: negatif girdiler 0'a kirpilir (savunmaci, normalde olusmaz)", () => {
  assert.equal(calculateGroupingReadingTotalActiveSeconds(-10, 5), 5);
  assert.equal(calculateGroupingReadingTotalActiveSeconds(10, -5), 10);
});

test("calculateGroupingReadingRemainingActiveSeconds: atanan süreden toplam aktif süre cikarilir, negatife inmez", () => {
  assert.equal(calculateGroupingReadingRemainingActiveSeconds(150, 0, 60), 90);
  assert.equal(calculateGroupingReadingRemainingActiveSeconds(150, 60, 0), 90);
  assert.equal(calculateGroupingReadingRemainingActiveSeconds(150, 100, 40), 10);
});

test("calculateGroupingReadingRemainingActiveSeconds: toplam aktif sure atanan sureyi asarsa 0 doner (negatif olmaz)", () => {
  assert.equal(calculateGroupingReadingRemainingActiveSeconds(150, 100, 100), 0);
  assert.equal(calculateGroupingReadingRemainingActiveSeconds(150, 200, 50), 0);
});

test("calculateGroupingReadingRemainingActiveSeconds: standalone (sonsuz atanan sure) icin Infinity doner", () => {
  assert.equal(
    calculateGroupingReadingRemainingActiveSeconds(Number.POSITIVE_INFINITY, 60, 30),
    Number.POSITIVE_INFINITY,
  );
});

test("hasGroupingReadingReachedAssignedDuration: toplam aktif sure atanan sureye esit veya buyukse true doner", () => {
  assert.equal(hasGroupingReadingReachedAssignedDuration(150, 60, 89), false);
  assert.equal(hasGroupingReadingReachedAssignedDuration(150, 60, 90), true);
  assert.equal(hasGroupingReadingReachedAssignedDuration(150, 60, 91), true);
  assert.equal(hasGroupingReadingReachedAssignedDuration(150, 0, 0), false);
});

test("hasGroupingReadingReachedAssignedDuration: ilk metin ilk atanan sureden erken bitse bile toplam dolmadiysa false", () => {
  // Ogretmen 150 sn atadi, ogrenci ilk metni 60 saniyede bitirdi - gorev
  // henuz tamamlanmis SAYILMAMALI.
  assert.equal(hasGroupingReadingReachedAssignedDuration(150, 0, 60), false);
});

test("hasGroupingReadingReachedAssignedDuration: standalone (sonsuz atanan sure) hicbir zaman true donmez", () => {
  assert.equal(hasGroupingReadingReachedAssignedDuration(Number.POSITIVE_INFINITY, 100_000, 100_000), false);
});

test("Iki metinlik senaryo ucdan uca: ilk metin 60sn, ikinci metin 90sn toplamda tam 150sn'ye ulasir", () => {
  const assigned = 150;
  let cumulative = 0;

  // Metin 1 biter (60 sn aktif calisildi).
  const afterFirstText = calculateGroupingReadingTotalActiveSeconds(cumulative, 60);
  assert.equal(hasGroupingReadingReachedAssignedDuration(assigned, afterFirstText, 0), false);
  assert.equal(calculateGroupingReadingRemainingActiveSeconds(assigned, afterFirstText, 0), 90);
  cumulative = afterFirstText;

  // Metin 2 devam ediyor, 89 sn'de henuz dolmadi.
  assert.equal(hasGroupingReadingReachedAssignedDuration(assigned, cumulative, 89), false);
  // Tam 90 sn'de gorev tamamlanmis sayilir.
  assert.equal(hasGroupingReadingReachedAssignedDuration(assigned, cumulative, 90), true);
});
