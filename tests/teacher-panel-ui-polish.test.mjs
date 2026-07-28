import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const MAIN_PAGE = new URL("../src/app/ogretmen/page.tsx", import.meta.url);
const TRACKING_PAGE = new URL("../src/app/ogretmen/idil-panel/ogrenci-takip/page.tsx", import.meta.url);
const TRACKING_CLIENT = new URL("../src/components/teacher-panel/TeacherStudentTrackingClient.tsx", import.meta.url);
const DETAIL_CLIENT = new URL("../src/components/teacher-panel/TeacherStudentDetailClient.tsx", import.meta.url);
const TRACKING_REPOSITORY = new URL("../src/lib/teachers/studentTrackingRepository.ts", import.meta.url);

async function read(path) {
  return readFile(path, "utf8");
}

test("ogretmen ana sayfasi modern hero ve hizli erisim kartlari icerir", async () => {
  const source = await read(MAIN_PAGE);

  assert.match(source, /Öğretmen paneline hoş geldiniz/);
  assert.match(source, /Öğrenci Takip/);
  assert.match(source, /Eğitim Programları/);
  assert.match(source, /Hızlı Erişim/);
  assert.match(source, /Bugünkü Durum/);
  assert.match(source, /group flex min-h-\[72px\]/);
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
  assert.match(clientSource, /Sayfayı Yenile/);
  assert.match(clientSource, /loadError/);
});
