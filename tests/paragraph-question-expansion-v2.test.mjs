import assert from "node:assert/strict";
import crypto from "node:crypto";
import { paragraphQuestionExpansionV2, paragraphQuestionExpansionV2PilotIds } from "../data/paragraph-question-expansion-v2.mjs";
import { paragraphQuestionExpansionV2Pilot } from "../data/paragraph-question-expansion-v2-pilot.mjs";

const normalize = (value) => value.trim().normalize("NFKC").replace(/\s+/gu, " ").toLocaleLowerCase("tr-TR");
const hash = (rows) => crypto.createHash("sha256").update(JSON.stringify(rows)).digest("hex");
assert.equal(paragraphQuestionExpansionV2.length, 131);
assert.deepEqual(paragraphQuestionExpansionV2.filter((r) => r.grade_band === "4-5").length, 46);
assert.deepEqual(paragraphQuestionExpansionV2.filter((r) => r.grade_band === "8").length, 39);
assert.deepEqual(paragraphQuestionExpansionV2.filter((r) => r.grade_band === "high-school").length, 46);
assert.equal(new Set(paragraphQuestionExpansionV2.map((r) => r.id)).size, 131);
assert.equal(new Set(paragraphQuestionExpansionV2.map((r) => normalize(r.question))).size, 131);
assert.equal(hash(paragraphQuestionExpansionV2.filter((r) => paragraphQuestionExpansionV2PilotIds.includes(r.id))), hash(paragraphQuestionExpansionV2Pilot));
for (const row of paragraphQuestionExpansionV2) {
  assert.equal(row.options.length, 5, row.id);
  assert.ok(row.correct_index >= 0 && row.correct_index < 5, row.id);
  if (row.category === "flow") assert.ok(row.options.every((option) => /^[IVX]+$/u.test(option)), row.id);
}
console.log("paragraph-question-expansion-v2: all tests passed");
