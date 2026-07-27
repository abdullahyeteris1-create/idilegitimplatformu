import assert from "node:assert/strict";
import test from "node:test";

import {
  calculateShadowReadingRemainingActiveSeconds,
  calculateShadowReadingTotalActiveSeconds,
  hasShadowReadingReachedAssignedDuration,
} from "../src/lib/exercise-engine/shadowReading.ts";

// Bu dosya yalniz saf (side-effect'siz) hesap fonksiyonlarini gercek
// fonksiyon cagrilariyla dogrular - regex/source-contract testi degildir.
// Bilerek Blok Okuma'nin blockReading.ts icindeki esdeger fonksiyonlarindan
// bagimsiz test edilir (bu turda ortak/genel helper cikarilmadi).

test("calculateShadowReadingTotalActiveSeconds: onceki metinlerde biriken sure + su anki metnin suresi", () => {
  assert.equal(calculateShadowReadingTotalActiveSeconds(0, 0), 0);
  assert.equal(calculateShadowReadingTotalActiveSeconds(60, 30), 90);
  assert.equal(calculateShadowReadingTotalActiveSeconds(150, 0), 150);
});

test("calculateShadowReadingTotalActiveSeconds: negatif girdiler 0'a kirpilir (savunmaci, normalde olusmaz)", () => {
  assert.equal(calculateShadowReadingTotalActiveSeconds(-10, 5), 5);
  assert.equal(calculateShadowReadingTotalActiveSeconds(10, -5), 10);
});

test("calculateShadowReadingRemainingActiveSeconds: atanan süreden toplam aktif süre cikarilir, negatife inmez", () => {
  assert.equal(calculateShadowReadingRemainingActiveSeconds(150, 0, 60), 90);
  assert.equal(calculateShadowReadingRemainingActiveSeconds(150, 60, 0), 90);
  assert.equal(calculateShadowReadingRemainingActiveSeconds(150, 100, 40), 10);
});

test("calculateShadowReadingRemainingActiveSeconds: toplam aktif sure atanan sureyi asarsa 0 doner (negatif olmaz)", () => {
  assert.equal(calculateShadowReadingRemainingActiveSeconds(150, 100, 100), 0);
  assert.equal(calculateShadowReadingRemainingActiveSeconds(150, 200, 50), 0);
});

test("calculateShadowReadingRemainingActiveSeconds: standalone (sonsuz atanan sure) icin Infinity doner", () => {
  assert.equal(
    calculateShadowReadingRemainingActiveSeconds(Number.POSITIVE_INFINITY, 60, 30),
    Number.POSITIVE_INFINITY,
  );
});

test("hasShadowReadingReachedAssignedDuration: toplam aktif sure atanan sureye esit veya buyukse true doner", () => {
  assert.equal(hasShadowReadingReachedAssignedDuration(150, 60, 89), false);
  assert.equal(hasShadowReadingReachedAssignedDuration(150, 60, 90), true);
  assert.equal(hasShadowReadingReachedAssignedDuration(150, 60, 91), true);
  assert.equal(hasShadowReadingReachedAssignedDuration(150, 0, 0), false);
});

test("hasShadowReadingReachedAssignedDuration: ilk metin ilk atanan sureden erken bitse bile toplam dolmadiysa false", () => {
  // Ogretmen 150 sn atadi, ogrenci ilk metni 60 saniyede bitirdi - gorev
  // henuz tamamlanmis SAYILMAMALI.
  assert.equal(hasShadowReadingReachedAssignedDuration(150, 0, 60), false);
});

test("hasShadowReadingReachedAssignedDuration: standalone (sonsuz atanan sure) hicbir zaman true donmez", () => {
  assert.equal(hasShadowReadingReachedAssignedDuration(Number.POSITIVE_INFINITY, 100_000, 100_000), false);
});

test("Iki metinlik senaryo ucdan uca: ilk metin 60sn, ikinci metin 90sn toplamda tam 150sn'ye ulasir", () => {
  const assigned = 150;
  let cumulative = 0;

  // Metin 1 biter (60 sn aktif calisildi).
  const afterFirstText = calculateShadowReadingTotalActiveSeconds(cumulative, 60);
  assert.equal(hasShadowReadingReachedAssignedDuration(assigned, afterFirstText, 0), false);
  assert.equal(calculateShadowReadingRemainingActiveSeconds(assigned, afterFirstText, 0), 90);
  cumulative = afterFirstText;

  // Metin 2 devam ediyor, 89 sn'de henuz dolmadi.
  assert.equal(hasShadowReadingReachedAssignedDuration(assigned, cumulative, 89), false);
  // Tam 90 sn'de gorev tamamlanmis sayilir.
  assert.equal(hasShadowReadingReachedAssignedDuration(assigned, cumulative, 90), true);
});
