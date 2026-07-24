import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const TODAY_ROUTE_URL = new URL(
  "../src/app/api/student/assignment-program/today/route.ts",
  import.meta.url,
);
const CARD_COMPONENT_URL = new URL(
  "../src/components/student-panel-preview/TodaysProgramTasksCard.tsx",
  import.meta.url,
);
const OGRENCI_PAGE_URL = new URL("../src/app/ogrenci/page.tsx", import.meta.url);
const STUDENT_PANEL_PREVIEW_URL = new URL(
  "../src/components/student-panel-preview/StudentPanelPreview.tsx",
  import.meta.url,
);

async function readTodayRoute() {
  return readFile(TODAY_ROUTE_URL, "utf8");
}

async function readCardComponent() {
  return readFile(CARD_COMPONENT_URL, "utf8");
}

// ============================================================================
// GET /api/student/assignment-program/today - Faz 1: SALT-OKUNUR "bugunku
// odevler" endpoint'i. Bu faz kesinlikle yazma/tamamlama/RPC icermemelidir.
// ============================================================================

test("GET today route ogrenci oturumunu verifyStudentAccess ile dogruluyor, gecersizse cookie temizliyor", async () => {
  const source = await readTodayRoute();
  assert.match(source, /verifyStudentAccess\(request\)/);
  assert.match(source, /clearStudentSessionCookie/);
  assert.match(source, /access\.clearSessionCookie/);
});

test("GET today route yalniz service-role server client kullaniyor, baska bir Supabase client yok", async () => {
  const source = await readTodayRoute();
  assert.match(source, /getSupabaseServerClient/);
  assert.doesNotMatch(source, /createClient\(/);
});

test("GET today route hicbir yazma islemi veya RPC cagrisi icermiyor", async () => {
  const source = await readTodayRoute();
  assert.doesNotMatch(source, /\.insert\(|\.update\(|\.upsert\(|\.delete\(/);
  assert.doesNotMatch(source, /\.rpc\(/);
});

test("GET today route aktif programi student_id + status='active' ile filtreliyor", async () => {
  const source = await readTodayRoute();
  assert.match(source, /from\(STUDENT_ASSIGNMENT_PROGRAMS_TABLE\)/);
  assert.match(source, /\.eq\("student_id",\s*access\.studentId\)/);
  assert.match(source, /\.eq\("status",\s*"active"\)/);
});

test("GET today route 'bugunku gun'u ILERLEME BAZLI (status IN available/in_progress, en kucuk day_number) buluyor - takvim tarihi kullanilmiyor", async () => {
  const source = await readTodayRoute();
  assert.match(source, /from\(STUDENT_ASSIGNMENT_PROGRAM_DAYS_TABLE\)/);
  assert.match(source, /\.in\("status",\s*\["available",\s*"in_progress"\]\)/);
  assert.match(source, /\.order\("day_number",\s*\{\s*ascending:\s*true\s*\}\)/);
  assert.match(source, /\.limit\(1\)/);
  // Takvim/timezone tabanli bir hesaplama KESINLIKLE olmamali.
  assert.doesNotMatch(source, /new Date\(\)|Intl\.DateTimeFormat|start_date|getAssignmentDateForTimezone/);
});

test("GET today route gorevleri hem program_day_id hem de student_id ile (katmanli savunma) filtreliyor", async () => {
  const source = await readTodayRoute();
  assert.match(source, /from\(STUDENT_ASSIGNMENT_PROGRAM_TASKS_TABLE\)/);
  assert.match(source, /\.eq\("program_day_id",\s*todayDay\.id\)/);
  assert.match(source, /\.eq\("student_id",\s*access\.studentId\)/);
  assert.match(source, /\.order\("task_order",\s*\{\s*ascending:\s*true\s*\}\)/);
});

test("GET today route gorev adini DB'nin exercise_title kolonundan DEGIL, guvenli katalogdan cozuyor", async () => {
  const source = await readTodayRoute();
  assert.match(source, /getAssignmentExerciseDefinition/);
  const tasksSelectMatch = source.match(/from\(STUDENT_ASSIGNMENT_PROGRAM_TASKS_TABLE\)\s*\n\s*\.select\("([^"]+)"\)/);
  assert.ok(tasksSelectMatch, "gorevler icin .select(...) cagrisi bulunamali");
  assert.doesNotMatch(tasksSelectMatch[1], /exercise_title/);
  assert.match(source, /title:\s*definition\?\.title\s*\?\?\s*exerciseSlug/);
});

test("GET today route yalniz ready egzersizleri isReady=true olarak isaretliyor (savunma amacli ikinci kontrol)", async () => {
  const source = await readTodayRoute();
  assert.match(source, /isReady:\s*definition\?\.integrationStatus === "ready"/);
});

test("GET today route programi/gunu/gorevleri bulunamayinca uygun bos durumlari donuyor (400\\/500 hatasi degil)", async () => {
  const source = await readTodayRoute();
  assert.match(source, /program:\s*null[\s\S]*?dayCompleted:\s*false[\s\S]*?programCompleted:\s*false/);
  assert.match(source, /todayDay:\s*null[\s\S]*?tasks:\s*\[\][\s\S]*?dayCompleted:\s*false[\s\S]*?programCompleted:\s*true/);
});

test("GET today route eski daily_assignments sistemine hic dokunmuyor", async () => {
  const source = await readTodayRoute();
  assert.doesNotMatch(source, /daily_assignment/i);
});

// ============================================================================
// TodaysProgramTasksCard - Faz 1 UI: yalniz gosterim, hicbir eylem/link yok.
// ============================================================================

test("TodaysProgramTasksCard 'Calismaya Basla' butonu veya egzersize link ICERMIYOR (Faz 1 kesin yasagi)", async () => {
  const source = await readCardComponent();
  assert.doesNotMatch(source, /Çalışmaya Başla/);
  assert.doesNotMatch(source, /\/egzersizler\//);
  assert.doesNotMatch(source, /programTaskId/);
  assert.doesNotMatch(source, /<Link/);
  assert.doesNotMatch(source, /<a\s/);
});

test("TodaysProgramTasksCard gorev tamamlama, sonuc kaydetme veya program ilerletme cagrisi ICERMIYOR", async () => {
  const source = await readCardComponent();
  assert.doesNotMatch(source, /\/complete/);
  assert.doesNotMatch(source, /\/api\/student\/results/);
  assert.doesNotMatch(source, /saveExerciseResult/);
  assert.doesNotMatch(source, /\.rpc\(/);
  assert.doesNotMatch(source, /supabase/i);
});

test("TodaysProgramTasksCard yalniz GET /api/student/assignment-program/today'ye fetch atiyor", async () => {
  const source = await readCardComponent();
  assert.match(source, /fetch\("\/api\/student\/assignment-program\/today"/);
  assert.doesNotMatch(source, /method:\s*"POST"/);
});

test("TodaysProgramTasksCard egzersiz adi, sira numarasi, seviye ve durum bilgisini gosteriyor", async () => {
  const source = await readCardComponent();
  assert.match(source, /task\.taskOrder/);
  assert.match(source, /task\.title/);
  assert.match(source, /task\.currentLevel/);
  assert.match(source, /STATUS_LABELS\[task\.status\]/);
});

test("TodaysProgramTasksCard bos program/tamamlanmis program durumlarinda dogru mesaji gosteriyor", async () => {
  const source = await readCardComponent();
  assert.match(source, /aktif bir ödev programın yok/);
  assert.match(source, /20 günlük programını tamamladın/);
  assert.match(source, /Bugünün ödevleri tamamlandı/);
});

test("TodaysProgramTasksCard basliginda gun numarasini ve gorev sayisini gosteriyor", async () => {
  const source = await readCardComponent();
  assert.match(source, /\$\{state\.dayNumber\}\. Gün • Bugünkü Ödevlerim/);
  assert.match(source, /\$\{state\.tasks\.length\} görev/);
  // dayNumber, API'nin zaten dondurdugu todayDay.dayNumber'dan geliyor -
  // yeni bir alan/migration icat edilmedi.
  assert.match(source, /dayNumber:\s*data\.todayDay\.dayNumber/);
});

test("TodaysProgramTasksCard gorsel dili (CSS module) mevcut panel kartlariyla uyumlu siniflar kullaniyor, Tailwind'e gecmiyor", async () => {
  const source = await readCardComponent();
  assert.match(source, /import styles from "\.\/student-panel-preview\.module\.css"/);
  assert.match(source, /styles\.todaysProgramSection/);
  assert.match(source, /styles\.todaysProgramItem/);
  assert.match(source, /styles\.todaysProgramStatus/);
  assert.doesNotMatch(source, /className="[^"]*rounded-|className="[^"]*text-\[/);
});

// ============================================================================
// Entegrasyon: kart artik StudentPanelPreview'in ANA ICERIK sutununda
// (mainColumn) render ediliyor - sayfanin ustunde bagimsiz/kopuk degil; eski
// bolumler (Hero/DailyTask/istatistikler vb.) bozulmadi.
// ============================================================================

test("src/app/ogrenci/page.tsx artik karti dogrudan render ETMIYOR - kart StudentPanelPreview icine tasindi", async () => {
  const source = await readFile(OGRENCI_PAGE_URL, "utf8");
  assert.doesNotMatch(source, /TodaysProgramTasksCard/);
  assert.match(source, /<StudentPanelPreview\s*\n\s*showReadingTestsCard=\{true\}\s*\n\s*showStatisticsCard=\{true\}/);
});

test("StudentPanelPreview.tsx karti ana icerik sutununda (mainColumn) render ediyor, mevcut bolumleri bozmuyor", async () => {
  const source = await readFile(STUDENT_PANEL_PREVIEW_URL, "utf8");
  assert.match(source, /import \{ TodaysProgramTasksCard \} from "\.\/TodaysProgramTasksCard"/);
  // mainColumn'un ILK cocugu olmali (statsGrid'den once) - sol menu/sidebar
  // veya sayfanin bagimsiz bir yerinde DEGIL.
  assert.match(source, /className=\{styles\.mainColumn\}><TodaysProgramTasksCard\/><section className=\{styles\.statsGrid\}/);
  // Eski bolumler (Hero, DailyTask, RecentResults, kategori grid'i) hala yerinde.
  assert.match(source, /<Hero /);
  assert.match(source, /<DailyTask /);
  assert.match(source, /<RecentResults /);
  // StudentPanelPreview DOGRUDAN DB/tablo adina referans vermiyor - yalniz
  // kendi ic bileseni (TodaysProgramTasksCard) araciligiyla, o da yalniz
  // kendi API route'una fetch atarak calisiyor.
  assert.doesNotMatch(source, /student_assignment_program/i);
});

test("Egzersiz katalogundaki (exerciseCatalog.ts) baslik alanlarinda eksik Turkce karakter kalmadi (slug/route degismedi)", async () => {
  const source = await readFile(
    new URL("../src/lib/assignments/exerciseCatalog.ts", import.meta.url),
    "utf8",
  );

  assert.match(source, /title: "Kare Görme Çalışması"/);
  assert.match(source, /title: "Göz Beyin"/);
  assert.match(source, /title: "Hafıza Geliştirme"/);
  assert.match(source, /title: "Gruplama Çalışması"/);
  assert.match(source, /title: "Gölgeleme"/);
  assert.match(source, /title: "Odaklı Okuma"/);
  assert.match(source, /title: "Çift Taraflı Odak"/);
  assert.match(source, /title: "Aynı Olanı Yakala"/);
  assert.match(source, /title: "Göz Kasları"/);
  assert.match(source, /title: "Göz Çalışması"/);
  assert.match(source, /title: "Göz Egzersizleri Kolonlar"/);
  assert.match(source, /title: "Kart Hafıza"/);
  assert.match(source, /title: "Kart Eşleştirme"/);
  assert.match(source, /title: "Parçalı Resim Kelime"/);
  assert.match(source, /title: "Görsel Puzzle"/);
  // Teknik alanlar (slug/route) degismemis olmali.
  assert.match(source, /slug: "kare-gorme-alani"/);
  assert.match(source, /route: "\/egzersizler\/kare-gorme-alani"/);
  assert.match(source, /slug: "goz-beyin"/);
  assert.match(source, /route: "\/egzersizler\/goz-beyin"/);
});
