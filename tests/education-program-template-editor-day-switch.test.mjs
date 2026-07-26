import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const EDITOR_PATH = "src/components/education-programs/EducationProgramTemplateEditor.tsx";
const ACTIONS_PATH = "src/app/ogretmen/idil-panel/egitim-programlari/actions.ts";
const VALIDATION_PATH = "src/lib/education-programs/validation.ts";

async function read(relativePath) {
  return readFile(new URL(`../${relativePath}`, import.meta.url), "utf8");
}

function extractFunctionBody(source, signatureStart) {
  const startIndex = source.indexOf(signatureStart);
  assert.ok(startIndex >= 0, `${signatureStart} bulunmalı`);
  const braceIndex = source.indexOf("{", startIndex);
  let depth = 0;
  let index = braceIndex;
  for (; index < source.length; index += 1) {
    if (source[index] === "{") depth += 1;
    if (source[index] === "}") {
      depth -= 1;
      if (depth === 0) break;
    }
  }
  return source.slice(braceIndex, index + 1);
}

test("1) gün değiştirme handler'ı dirty gün varsa önce kayıt başlatır", async () => {
  const source = await read(EDITOR_PATH);
  const body = extractFunctionBody(source, "async function handleDayChange(nextDayNumber");

  assert.match(body, /if \(!isDayDirty\(selectedDayNumber\)\)/);
  assert.match(body, /await saveEducationProgramDayAction\(/);
});

test("2/3) kayıt başarısız olursa selectedDayNumber değişmeden fonksiyon sonlanır", async () => {
  const source = await read(EDITOR_PATH);
  const body = extractFunctionBody(source, "async function handleDayChange(nextDayNumber");

  const errorBranchIndex = body.indexOf('if (result.status === "error")');
  const setSelectedAfterAwaitIndex = body.indexOf(
    "setSelectedDayNumber(nextDayNumber);",
    body.indexOf("await saveEducationProgramDayAction("),
  );

  assert.ok(errorBranchIndex >= 0, "hata dalı bulunmalı");
  assert.ok(setSelectedAfterAwaitIndex > errorBranchIndex, "selectedDayNumber degisimi hata dalindan sonra olmali");
  assert.match(body, /if \(result\.status === "error"\) \{\s*setSwitchError\(result\.message\);\s*return;\s*\}/);
});

test("4) kayıt başarılıysa saved snapshot güncellenir ve ardından yeni güne geçilir", async () => {
  const source = await read(EDITOR_PATH);
  const body = extractFunctionBody(source, "async function handleDayChange(nextDayNumber");

  const snapshotIndex = body.indexOf("setSavedSnapshotByDay(");
  const switchIndex = body.lastIndexOf("setSelectedDayNumber(nextDayNumber);");

  assert.ok(snapshotIndex >= 0);
  assert.ok(switchIndex > snapshotIndex, "gune gecis snapshot guncellemesinden sonra olmali");
});

test("5) değişiklik yoksa kayıt çağrılmadan gün doğrudan değişir", async () => {
  const source = await read(EDITOR_PATH);
  const body = extractFunctionBody(source, "async function handleDayChange(nextDayNumber");

  const dirtyCheckIndex = body.indexOf("if (!isDayDirty(selectedDayNumber)) {");
  const earlyReturnBlock = body.slice(dirtyCheckIndex, body.indexOf("return;", dirtyCheckIndex) + "return;".length);
  const firstSaveCallIndex = body.indexOf("await saveEducationProgramDayAction(");

  assert.match(earlyReturnBlock, /setSelectedDayNumber\(nextDayNumber\);/);
  assert.ok(
    body.indexOf(earlyReturnBlock) < firstSaveCallIndex,
    "temiz gun kontrolu save cagrisindan once olmali",
  );
});

test("6) gün butonları kayıt sırasında (isSwitchingDay) ve form pending iken disabled olur", async () => {
  const source = await read(EDITOR_PATH);

  assert.match(source, /onClick=\{\(\) => void handleDayChange\(dayNumber\)\}/);
  assert.match(source, /disabled=\{isSwitchingDay \|\| pending\}/);
});

test("7) publish sırasında seçili olmayan dirty gün varsa engellenir ve günler listelenir", async () => {
  const source = await read(EDITOR_PATH);
  const body = extractFunctionBody(source, "function handlePublishClick(event");

  assert.match(
    body,
    /const otherDirtyDays = dirtyDayNumbers\.filter\(\(dayNumber\) => dayNumber !== selectedDayNumber\);/,
  );
  assert.match(body, /event\.preventDefault\(\);/);
  assert.match(body, /Kaydedilmemiş günler var\. Lütfen bu günleri kaydedin:/);
  assert.match(source, /onClick=\{handlePublishClick\}/);
});

test("8) mevcut publish action ve her gün 5 görev kuralı değişmemiştir", async () => {
  const actionsSource = await read(ACTIONS_PATH);
  const validationSource = await read(VALIDATION_PATH);

  assert.match(actionsSource, /intent === "publish"/);
  assert.match(actionsSource, /validateCompleteEducationProgramTemplate\(templateResult\.value\)/);
  assert.match(actionsSource, /publishEducationProgramTemplate\(supabase, templateId\)/);
  assert.match(validationSource, /export const EDUCATION_PROGRAM_TASKS_PER_DAY = 5;/);
  assert.match(
    validationSource,
    /Her gün tam 5 çalışma içermelidir\./,
  );
});

test("9) gün geçişinde local draft verisi (draftsByDay) temizlenmez/sıfırlanmaz", async () => {
  const source = await read(EDITOR_PATH);
  const dayChangeBody = extractFunctionBody(source, "async function handleDayChange(nextDayNumber");

  assert.doesNotMatch(dayChangeBody, /setDraftsByDay\(/);
});

test("10) buildDayFormData, exercise settings alanlarını semaya göre doğru şekilde forma yazar", async () => {
  const source = await read(EDITOR_PATH);
  const body = extractFunctionBody(source, "function buildDayFormData(slots");

  assert.match(body, /getExerciseSettingsSchema\(slot\.exerciseSlug\)/);
  assert.match(
    body,
    /formData\.set\(\s*`\$\{prefix\}-settings-\$\{field\.key\}`,\s*slot\.settings\[field\.key\] \?\? String\(field\.defaultValue\),\s*\)/,
  );
});

test("dirty karşılaştırması sabit alan sıralı serileştirme kullanır (settings anahtarları sıralı)", async () => {
  const source = await read(EDITOR_PATH);
  const body = extractFunctionBody(source, "function serializeSlots(slots");

  assert.match(body, /exerciseSlug: slot\.exerciseSlug,/);
  assert.match(body, /durationSeconds: slot\.durationSeconds,/);
  assert.match(body, /startingLevel: slot\.startingLevel,/);
  assert.match(body, /Object\.keys\(slot\.settings\)\s*\.sort\(\)/);
});

test("kayıt başarısız olursa hata role=\"alert\" ile gösterilir", async () => {
  const source = await read(EDITOR_PATH);

  assert.match(
    source,
    /role="alert"\s*\n\s*className="mb-4 rounded-2xl border border-red-200 bg-red-50/,
  );
  assert.match(source, /\{switchError\}/);
});

test("saveEducationProgramDayAction doğrudan (form olmadan) çağrılır - yeni bağımsız kayıt sistemi kurulmamış", async () => {
  const source = await read(EDITOR_PATH);

  assert.match(
    source,
    /import \{ saveEducationProgramDayAction \} from "@\/app\/ogretmen\/idil-panel\/egitim-programlari\/actions"/,
  );
  // Ayni server action hem form (useActionState) hem de programatik cagri icin kullanilir.
  assert.match(source, /useActionState\(boundAction, INITIAL_STATE\)/);
  assert.match(source, /await saveEducationProgramDayAction\(\s*template\.id,/);
});
