import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { buildTwoSideFocusResultPayload } from "../src/app/egzersizler/cift-tarafli-odak/twoSideFocusDuration.ts";

async function read(relativePath) {
  return readFile(new URL(`../${relativePath}`, import.meta.url), "utf8");
}

test("Çift Taraflı Odak manuel Bitir akışı gerçek güvenli kayıt ve ortak sonuç ekranını kullanır", async () => {
  const pageSource = await read("src/app/egzersizler/cift-tarafli-odak/page.tsx");
  const clientSource = await read("src/app/egzersizler/cift-tarafli-odak/TwoSideFocusExerciseClient.tsx");

  assert.match(pageSource, /route|cift-tarafli-odak/);
  assert.match(clientSource, /import \{ useRouter \} from "next\/navigation"/);
  assert.match(clientSource, /import \{ saveExerciseResultSecure, type SecureExerciseResultInput \} from "@\/lib\/results\/secureResultStorage"/);
  assert.match(clientSource, /const finishExercise = useCallback\(\(\) => \{/);
  assert.match(clientSource, /if \(hasFinalizedRef\.current\) return;/);
  assert.match(clientSource, /if \(saveInFlightRef\.current \|\| saveCompletedRef\.current\) return;/);
  assert.match(clientSource, /setIsRunning\(false\)/);
  assert.match(clientSource, /await saveExerciseResultSecure\(payload\)/);
  assert.match(clientSource, /exerciseType=\$\{encodeURIComponent\(payload\.exerciseType\)\}/);
  assert.match(clientSource, /<button[^>]*onClick=\{finishExercise\}[^>]*>Bitir<\/button>/s);
  assert.match(clientSource, /disabled=\{!canFinish \|\| saveStatus !== "idle"\}/);
});

test("Çift Taraflı Odak sonucu doğru exercise type/title ve mevcut metriklerle hazırlanır", () => {
  const payload = buildTwoSideFocusResultPayload({
    durationSeconds: 42,
    correctCount: 8,
    wrongCount: 2,
  });

  assert.deepEqual(payload, {
    exerciseType: "two-side-focus",
    exerciseTitle: "Çift Taraflı Odak",
    durationSeconds: 42,
    correctCount: 8,
    wrongCount: 2,
    score: 6,
    successRate: 80,
    details: {
      totalRounds: 10,
      levels: "[]",
    },
  });
});
