import assert from "node:assert/strict";
import test from "node:test";

import { calculateIntervalMs as calculateBlockIntervalMs } from "../src/lib/exercise-engine/blockReading.ts";
import { calculateIntervalMs as calculateShadowIntervalMs } from "../src/lib/exercise-engine/shadowReading.ts";
import { READING_SPEED_OPTIONS } from "../src/lib/exercises/readingSpeedOptions.ts";

test("Gölgeleme, Blok Okuma ve ortak config aynı hız seçeneklerini kullanır", async () => {
  assert.deepEqual(READING_SPEED_OPTIONS, [
    ...Array.from({ length: 20 }, (_, index) => (index + 1) * 50),
    1100,
    2000,
    5000,
  ]);
  assert.equal(READING_SPEED_OPTIONS[0], 50);
  assert.equal(READING_SPEED_OPTIONS.at(-1), 5000);
});

test("50 ms ve 5000 ms seçimleri gerçek interval timer mapping'ine aynen gider", () => {
  for (const intervalMs of [50, 5000]) {
    assert.equal(
      calculateShadowIntervalMs({ mode: "interval", blockSize: 2, intervalMs }),
      intervalMs,
    );
    assert.equal(
      calculateBlockIntervalMs({ mode: "interval", blockSize: 2, intervalMs }),
      intervalMs,
    );
  }
});
