import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

import { getNextCountingTotals } from "../src/lib/exercise-engine/letterNumberCountingFocus.ts";

const clientPath = new URL(
  "../src/app/egzersizler/harf-rakam-sayma/LetterNumberCountingFocusClient.tsx",
  import.meta.url,
);

test("harf-rakam sayma cevaplari seviyeler arasinda genel toplamda birikir", () => {
  assert.deepEqual(getNextCountingTotals(3, 1, true), { correct: 4, wrong: 1 });
  assert.deepEqual(getNextCountingTotals(4, 1, false), { correct: 4, wrong: 2 });
});

test("harf-rakam sayma sonucu seviye degil genel toplam ref'ini kaydeder", async () => {
  const source = await readFile(clientPath, "utf8");

  assert.match(source, /const totalCorrectRef = useRef\(0\)/);
  assert.match(source, /const totalWrongRef = useRef\(0\)/);
  assert.match(source, /const finalCorrect = totalCorrectRef\.current/);
  assert.match(source, /const finalWrong = totalWrongRef\.current/);
  assert.match(source, /const finalNet = calculateNet\(finalCorrect, finalWrong\)/);
});
