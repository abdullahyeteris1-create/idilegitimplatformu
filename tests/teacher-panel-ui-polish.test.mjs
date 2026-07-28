import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const MAIN_PAGE = new URL("../src/app/ogretmen/page.tsx", import.meta.url);
const DASHBOARD_OVERVIEW = new URL("../src/components/teacher-panel/TeacherDashboardOverview.tsx", import.meta.url);
const TRACKING_PAGE = new URL("../src/app/ogretmen/idil-panel/ogrenci-takip/page.tsx", import.meta.url);
const TRACKING_CLIENT = new URL("../src/components/teacher-panel/TeacherStudentTrackingClient.tsx", import.meta.url);
const DETAIL_CLIENT = new URL("../src/components/teacher-panel/TeacherStudentDetailClient.tsx", import.meta.url);
const TRACKING_REPOSITORY = new URL("../src/lib/teachers/studentTrackingRepository.ts", import.meta.url);

async function read(path) {
  return readFile(path, "utf8");
}

test("ogretmen ana sayfasi server-side gercek dashboard ozetine baglanir", async () => {
  const source = await read(MAIN_PAGE);

  assert.match(source, /requireTeacherSession/);
  assert.match(source, /getTeacherDashboardSummary/);
  assert.match(source, /TeacherDashboardOverview/);
  assert.match(source, /export const dynamic = "force-dynamic";/);
  assert.match(source, /export const revalidate = 0;/);
  assert.match(source, /<AppShell/);
  assert.doesNotMatch(source, /getIdilPanelSummary/);
  assert.doesNotMatch(source, /summaryStorage/);
  assert.doesNotMatch(source, /classLevel/);
  assert.doesNotMatch(source, /TeacherOnly/);
});

test("dashboard overview gercek ozet kartlari ve uyarilari icerir", async () => {
  const source = await read(DASHBOARD_OVERVIEW);

  assert.match(source, /Öğretmen paneline hoş geldiniz/);
  assert.match(source, /Canlı özet/);
  assert.match(source, /Gerçek veri/);
  assert.match(source, /Toplam XP/);
  assert.match(source, /Son 7 Gün XP/);
  assert.match(source, /Veri Uyarıları/);
  assert.match(source, /Takip Edilmesi Önerilen Öğrenciler/);
});

test("ogrenci takip ekraninda class ve level filtreleri ile mobil kart ve desktop tablo vardir", async () => {
  const source = await read(TRACKING_CLIENT);

  assert.match(source, /const \[classFilter, setClassFilter\] = useState\("all"\)/);
  assert.match(source, /const \[levelFilter, setLevelFilter\] = useState\("all"\)/);
  assert.match(source, /Avatar name=\{student\.fullName\}/);
  assert.match(source, /ProgressBar value=\{student\.programProgressPercent\}/);
  assert.match(source, /md:hidden/);
  assert.match(source, /hidden overflow-hidden rounded-\[24px\]/);
  assert.match(source, /Filtreleri Temizle/);
  assert.match(source, /Detayları Gör/);
});

test("ogrenci detay ekraninda avatar, gamification ozeti ve performans kartlari vardir", async () => {
  const source = await read(DETAIL_CLIENT);

  assert.match(source, /Avatar name=\{detail\.profile\.fullName\}/);
  assert.match(source, /Toplam XP/);
  assert.match(source, /Sonraki seviyeye ilerleme/);
  assert.match(source, /Performans Özeti/);
  assert.match(source, /Okuma Testleri/);
  assert.match(source, /Sonuç Geçmişi/);
  assert.match(source, /Henüz veri yok/);
  assert.match(source, /md:hidden/);
  assert.match(source, /hidden overflow-hidden rounded-\[24px\]/);
});

test("ogrenci takip sayfasi temel sorgu hatasini error state'e cevirir", async () => {
  const pageSource = await read(TRACKING_PAGE);
  const repositorySource = await read(TRACKING_REPOSITORY);
  const clientSource = await read(TRACKING_CLIENT);

  assert.match(pageSource, /loadError/);
  assert.match(pageSource, /Öğrenci verileri şu anda yüklenemedi/);
  assert.match(repositorySource, /teacher-students-query-failed/);
  assert.doesNotMatch(repositorySource, /studentsResult\.error \|\| xpResult\.error/);
  assert.doesNotMatch(repositorySource, /class_level/);
  assert.doesNotMatch(repositorySource, /parent_phone/);
  assert.match(repositorySource, /select\("id,name,username,class_name,phone,status,is_active,access_end_date,last_login_at"\)/);
  assert.match(
    repositorySource,
    /select\(\s*"id,name,username,class_name,phone,status,is_active,access_end_date,last_login_at,parent_name,education_level,education_status,notes,created_at",\s*\)/,
  );
  assert.match(clientSource, /Sayfayı Yenile/);
  assert.match(clientSource, /loadError/);
});
