import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const EDITOR_PATH = "src/components/education-programs/EducationProgramTemplateEditor.tsx";

async function read(relativePath) {
  return readFile(new URL(`../${relativePath}`, import.meta.url), "utf8");
}

test("editor exerciseSettingsSchemas'tan sema okur, hardcoded READONLY placeholder kaldirildi", async () => {
  const source = await read(EDITOR_PATH);

  assert.match(
    source,
    /import \{ getExerciseSettingsSchema \} from "@\/lib\/education-programs\/exerciseSettingsSchemas"/,
  );
  assert.doesNotMatch(source, /settingsPlaceholder/);
  assert.doesNotMatch(source, /readOnly\s*\n\s*value=\{\s*\n?\s*definition\?\.settingsPlaceholder/);
});

test("sema tanimli egzersiz secilince dinamik select'ler render edilir", async () => {
  const source = await read(EDITOR_PATH);

  assert.match(source, /const settingsSchema = slot\.exerciseSlug/);
  assert.match(source, /settingsSchema\.fields\.map\(\(field\) =>/);
  assert.match(source, /name=\{`task-\$\{orderNumber\}-settings-\$\{field\.key\}`\}/);
});

test("secenekler disinda deger secilemez - her alan select ile secenek listesinden render edilir (serbest metin girisi yok)", async () => {
  const source = await read(EDITOR_PATH);
  const fieldsBlock = source.slice(
    source.indexOf("settingsSchema.fields.map"),
    source.indexOf("Egzersize özel ayarlar"),
  );

  assert.match(fieldsBlock, /<select/);
  assert.doesNotMatch(fieldsBlock, /<input/);
  assert.match(fieldsBlock, /field\.options\.map\(\(option\) =>/);
});

test("sema tanimsiz egzersizde yeni fallback mesaji gosterilir", async () => {
  const source = await read(EDITOR_PATH);

  assert.match(
    source,
    /Bu egzersiz için özel ayarlar henüz desteklenmiyor\. Egzersiz varsayılan ayarlarla çalışacaktır\./,
  );
  assert.match(source, /"Ayarları görmek için egzersiz seçin\."/);
});

test("egzersiz degistirilince settings yeni egzersizin varsayilanlarina sifirlanir", async () => {
  const source = await read(EDITOR_PATH);

  assert.match(
    source,
    /settings: exerciseSlug \? createSlotSettings\(exerciseSlug\) : \{\}/,
  );
});

test("createDrafts eski/mevcut gorev settings'ini semaya gore doldurur, eksik alan varsayilana duser", async () => {
  const source = await read(EDITOR_PATH);

  assert.match(source, /function createSlotSettings\(/);
  assert.match(
    source,
    /existing !== undefined \? String\(existing\) : String\(field\.defaultValue\)/,
  );
  assert.match(
    source,
    /settings: task\?\.exerciseSlug\s*\?\s*createSlotSettings\(task\.exerciseSlug, task\.settings\)\s*:\s*\{\}/,
  );
});

test("durum rozeti Taslak/Yayinda gosterir ve atanabilirlik bilgisini acikca belirtir", async () => {
  const source = await read(EDITOR_PATH);

  assert.match(source, /template\.status === "published" \? "Yayında" : "Taslak"/);
  assert.match(source, /Bu şablon öğrencilere atanabilir\./);
  assert.match(
    source,
    /Taslak şablonlar öğrencilere atanamaz\. Atamak için önce yayınlayın\./,
  );
});

test("warning durumu ayri (amber) stil ve alert rolu ile gosterilir", async () => {
  const source = await read(EDITOR_PATH);

  assert.match(source, /state\.status === "warning"/);
  assert.match(
    source,
    /role=\{state\.status === "error" \|\| state\.status === "warning" \? "alert" : "status"\}/,
  );
});

test("Yayinla butonu kaldirilmadi, is kurali degismedi", async () => {
  const source = await read(EDITOR_PATH);

  assert.match(source, /name="intent"\s*\n\s*value="publish"/);
  assert.match(source, /Yayınla/);
});
