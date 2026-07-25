import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

async function read(relativePath) {
  return readFile(new URL(`../${relativePath}`, import.meta.url), "utf8");
}

test("atama ekrani aktif programi olan ogrenciyi isaretler ve secilemez yapar", async () => {
  const source = await read(
    "src/components/education-programs/EducationProgramAssignmentForm.tsx",
  );

  assert.match(source, /disabled=\{Boolean\(student\.activeProgramId\)\}/);
  assert.match(source, /Aktif programı var:/);
  assert.match(source, /activeProgramName/);
});

test("repository sorgusu yalniz published ve aktif sablonlari listeler", async () => {
  const source = await read(
    "src/lib/education-programs/studentProgramRepository.ts",
  );

  assert.match(source, /\.eq\("status", "published"\)/);
  assert.match(source, /\.eq\("is_active", true\)/);
});

test("server action admin oturumu, service role ve program ID yonlendirmesi kullanir", async () => {
  const source = await read(
    "src/app/ogretmen/idil-panel/egitim-programlari/actions.ts",
  );

  assert.match(source, /await hasAdminSession\(\)/);
  assert.match(source, /getSupabaseServiceRoleClient\(\)/);
  assert.match(
    source,
    /redirect\(`\$\{STUDENT_PROGRAMS_ROUTE\}\/\$\{result\.value\.programId\}\?assigned=1`\)/,
  );
  assert.doesNotMatch(source, /formData\.get\("assignedBy"\)/);
});

test("yonetici liste ve detay route'lari salt okunur goruntuleme saglar", async () => {
  const listPage = await read(
    "src/app/ogretmen/idil-panel/ogrenci-programlari/page.tsx",
  );
  const detailPage = await read(
    "src/app/ogretmen/idil-panel/ogrenci-programlari/[programId]/page.tsx",
  );
  const list = await read(
    "src/components/education-programs/StudentEducationProgramList.tsx",
  );
  const detail = await read(
    "src/components/education-programs/StudentEducationProgramDetail.tsx",
  );

  assert.match(listPage, /listStudentEducationPrograms/);
  assert.match(detailPage, /params: Promise<\{ programId: string \}>/);
  assert.match(detailPage, /getStudentEducationProgramDetail/);
  assert.match(list, /Öğrenci/);
  assert.match(list, /Kaynak şablon/);
  assert.match(list, /Toplam gün/);
  assert.match(list, /Mevcut gün/);
  assert.match(list, /Tamamlanan gün/);
  assert.match(list, /Tamamlandı/);
  assert.match(list, /Görüntüle/);
  assert.match(detail, /Öğrenci mesajı/);
  assert.match(detail, /Yönetici notu/);
  assert.match(detail, /program\.days\.map/);
  assert.match(detail, /day\.tasks\.map/);
  assert.match(detail, /formatDuration/);
  assert.match(detail, /formatSettings/);
  assert.doesNotMatch(`${listPage}\n${detailPage}\n${list}\n${detail}`, /type="submit"/);
});

test("yeni UI ve server katmani eski assignment route ve helperlarini import etmez", async () => {
  const paths = [
    "src/app/ogretmen/idil-panel/egitim-programlari/actions.ts",
    "src/app/ogretmen/idil-panel/egitim-programlari/ata/page.tsx",
    "src/app/ogretmen/idil-panel/ogrenci-programlari/page.tsx",
    "src/app/ogretmen/idil-panel/ogrenci-programlari/[programId]/page.tsx",
    "src/components/education-programs/EducationProgramAssignmentForm.tsx",
    "src/components/education-programs/StudentEducationProgramList.tsx",
    "src/components/education-programs/StudentEducationProgramDetail.tsx",
    "src/lib/education-programs/studentProgramRepository.ts",
  ];
  const source = (await Promise.all(paths.map(read))).join("\n");

  assert.doesNotMatch(source, /@\/lib\/assignments\//);
  assert.doesNotMatch(source, /@\/components\/assignments\//);
  assert.doesNotMatch(source, /assignment-program-tasks/);
  assert.doesNotMatch(source, /assignment-items/);
  assert.doesNotMatch(source, /student_assignment_program/);
  assert.doesNotMatch(source, /daily_assignment/);
});
