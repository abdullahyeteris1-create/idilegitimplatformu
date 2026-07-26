import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const ACTIONS_PATH = "src/app/ogretmen/idil-panel/egitim-programlari/actions.ts";

async function read(relativePath) {
  return readFile(new URL(`../${relativePath}`, import.meta.url), "utf8");
}

test("yayinlama hatasi buildPublishValidationMessage ile acik ve ozel bir mesaj uretir", async () => {
  const source = await read(ACTIONS_PATH);

  assert.match(
    source,
    /import \{ buildPublishValidationMessage \} from "@\/lib\/education-programs\/publishMessages"/,
  );
  assert.match(
    source,
    /buildPublishValidationMessage\(validation\.issues, templateResult\.value\.dayCount\)/,
  );
  assert.doesNotMatch(source, /"Program yayınlanamadı\. Eksik gün ve çalışmaları tamamlayın\."/);
});

test("gun kaydindan once mevcut status okunur (wasPublished tespiti)", async () => {
  const source = await read(ACTIONS_PATH);

  const statusReadIndex = source.indexOf('.select("status")');
  const saveCallIndex = source.indexOf("await saveEducationProgramTemplateDay(");

  assert.ok(statusReadIndex >= 0, "status once okunmali");
  assert.ok(saveCallIndex > statusReadIndex, "status okuma gun kaydindan once olmali");
  assert.match(source, /const wasPublished = statusRow\?\.status === "published";/);
});

test("yayinlanmis sablon taslak olarak kaydedilince belirgin bir uyari doner", async () => {
  const source = await read(ACTIONS_PATH);

  assert.match(source, /if \(wasPublished\) \{/);
  assert.match(source, /status: "warning"/);
  assert.match(
    source,
    /Şablonda değişiklik yaptığınız için şablon tekrar taslak durumuna alındı\. Öğrencilere atayabilmek için yeniden yayınlamanız gerekir\./,
  );
});

test("daha once taslak olan sablon tekrar taslak kaydedilince uyari degil basari mesaji doner", async () => {
  const source = await read(ACTIONS_PATH);
  const warningBlockIndex = source.indexOf("if (wasPublished) {");
  const successFallbackIndex = source.indexOf(
    'message: `Gün ${dayNumber} taslak olarak kaydedildi.`',
  );

  assert.ok(warningBlockIndex >= 0);
  assert.ok(successFallbackIndex > warningBlockIndex);
});

test("readTaskInputs secili egzersizin semasi varsa form'dan settings okur", async () => {
  const source = await read(ACTIONS_PATH);

  assert.match(
    source,
    /import \{ getExerciseSettingsSchema, readExerciseSettingsFromFormData \} from "@\/lib\/education-programs\/exerciseSettingsSchemas"/,
  );
  assert.match(source, /const settingsSchema = getExerciseSettingsSchema\(exerciseSlug\);/);
  assert.match(
    source,
    /readExerciseSettingsFromFormData\(settingsSchema, formData, `\$\{prefix\}-settings-`\)/,
  );
});

test("yayinla butonu/is kurali kaldirilmadi - publish akisi hala calisir", async () => {
  const source = await read(ACTIONS_PATH);

  assert.match(source, /intent === "publish"/);
  assert.match(source, /validateCompleteEducationProgramTemplate\(templateResult\.value\)/);
  assert.match(source, /publishEducationProgramTemplate\(supabase, templateId\)/);
});
