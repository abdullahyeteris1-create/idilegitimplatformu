import assert from "node:assert/strict";
import { getVaultProgress, getVaultSpeedScore, getVaultTypePool, generateVaultQuestion } from "../src/lib/exercises/vault.ts";

const levels = ["easy", "medium", "hard", "master"];
for (const level of levels) {
  for (const mode of ["mixed", "logic"]) {
    const pool = getVaultTypePool(level, mode);
    assert.ok(pool.length > 0);
    for (const digits of [2, 3, 4]) {
      for (let index = 0; index < 20; index += 1) {
        const question = generateVaultQuestion(level, digits, mode);
        assert.match(question.answer, new RegExp(`^[1-9][0-9]{${digits - 1}}$`));
        assert.equal(Number(question.answer), Number(question.answer));
        assert.ok(pool.includes(question.type));
      }
    }
  }
}

assert.equal(getVaultProgress(1, 10), 0);
assert.equal(getVaultProgress(10, 10), 90);
assert.equal(getVaultProgress(11, 10), 100);
assert.equal(getVaultSpeedScore("easy", 0, 0, 4).total, 160);
assert.equal(getVaultSpeedScore("easy", 20, 0, 1).speed, 0);
assert.equal(getVaultSpeedScore("easy", 20, 200, 1).speed, 220);
assert.equal(getVaultSpeedScore("easy", 20, 0, 0).streak, 0);

console.log("mental arithmetic vault runtime invariants passed");
