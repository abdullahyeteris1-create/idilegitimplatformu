import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";
import test from "node:test";

/**
 * Sinif grubu liderlik tablosu. En kritik iddia GIZLILIK: disari adin yalniz
 * ilk kelimesi cikar; lise havuzunda ham profil degeri yerine sadece guvenli
 * 9-12 sinif etiketi gosterilir.
 */

const ROOT = process.cwd();
const read = (relativePath) => readFile(path.join(ROOT, relativePath), "utf8");

const {
  mapWordRaceLeaderboardEntries,
  resolveWordRaceLeaderboardGroup,
  toDisplayName,
  WORD_RACE_HIGH_SCHOOL_CLASS_NAMES,
  WORD_RACE_LEADERBOARD_SIZE,
} = await import(
  "../src/lib/word-race/wordRaceLeaderboard.ts"
);
const { injectWordRaceResultBridge, readWordRaceGameHtml } = await import(
  "../src/lib/word-race/wordRaceAsset.ts"
);

test("gorunen ad yalnizca ilk kelimedir, soyad hicbir kosulda sizmaz", () => {
  assert.equal(toDisplayName("Ahmet Yılmaz"), "Ahmet");
  assert.equal(toDisplayName("Ayşe Nur Kaya"), "Ayşe");
  assert.equal(toDisplayName("  Mehmet   Demir  "), "Mehmet");
  assert.equal(toDisplayName("Zeynep"), "Zeynep");

  // Bozuk/eksik veri anonim etikete duser, patlamaz.
  assert.equal(toDisplayName(""), "Öğrenci");
  assert.equal(toDisplayName("   "), "Öğrenci");
  assert.equal(toDisplayName(null), "Öğrenci");
  assert.equal(toDisplayName(undefined), "Öğrenci");
  assert.equal(toDisplayName(42), "Öğrenci");

  // Asiri uzun ad kirpilir.
  assert.equal(toDisplayName("A".repeat(80)).length, 24);
});

test("ilk 10 ile sinirli", () => {
  assert.equal(WORD_RACE_LEADERBOARD_SIZE, 10);
});

test("9 ve 12. sinif ogrencileri ayni 9-12 Lise havuzunu kullanir", () => {
  const expectedClasses = ["9", "10", "11", "12"];

  assert.deepEqual(WORD_RACE_HIGH_SCHOOL_CLASS_NAMES, expectedClasses);
  assert.deepEqual(resolveWordRaceLeaderboardGroup("9"), {
    groupLabel: "Lise",
    classNames: expectedClasses,
    showClassLabel: true,
  });
  assert.deepEqual(resolveWordRaceLeaderboardGroup("12"), {
    groupLabel: "Lise",
    classNames: expectedClasses,
    showClassLabel: true,
  });
});

test("Lise havuzu dogru siralanir ve her ogrencinin gercek sinif etiketi korunur", () => {
  const students = [
    { id: "student-9", name: "Ayşe Yılmaz", class_name: "9" },
    { id: "student-12", name: "Mehmet Demir", class_name: "12" },
    { id: "student-10", name: "Ece Kaya", class_name: "10" },
    { id: "student-11", name: "Can Çelik", class_name: "11" },
  ];
  const results = [
    { student_id: "student-9", score: 2450 },
    { student_id: "student-12", score: 2310 },
    { student_id: "student-10", score: 2250 },
    { student_id: "student-11", score: 2180 },
    // Ogrenci basina en iyi skor davranisi korunur.
    { student_id: "student-9", score: 1200 },
  ];

  assert.deepEqual(
    mapWordRaceLeaderboardEntries(students, results, "student-11", true),
    [
      { rank: 1, displayName: "Ayşe", classLabel: "9. Sınıf", score: 2450, isCurrentStudent: false },
      { rank: 2, displayName: "Mehmet", classLabel: "12. Sınıf", score: 2310, isCurrentStudent: false },
      { rank: 3, displayName: "Ece", classLabel: "10. Sınıf", score: 2250, isCurrentStudent: false },
      { rank: 4, displayName: "Can", classLabel: "11. Sınıf", score: 2180, isCurrentStudent: true },
    ],
  );
});

test("8. sinif Lise havuzuna girmez; ilk ve ortaokul birebir sinif davranisini korur", () => {
  assert.deepEqual(resolveWordRaceLeaderboardGroup("8"), {
    groupLabel: "Sınıf",
    classNames: ["8"],
    showClassLabel: false,
  });

  for (const className of ["2", "3", "5", "6", "6-A"]) {
    assert.deepEqual(resolveWordRaceLeaderboardGroup(className), {
      groupLabel: "Sınıf",
      classNames: [className],
      showClassLabel: false,
    });
  }
});

test("repository Lise icin backend IN, diger siniflar icin mevcut EQ filtresini kullanir", async () => {
  const source = await read("src/lib/word-race/wordRaceLeaderboard.ts");

  // Ogrenci basina en iyi skor - tek ogrenci listeyi dolduramaz.
  assert.match(source, /bestByStudent/);
  // Karsilastirma oturumdaki ogrencinin backend'de cozulmus grubuyla sinirlidir.
  assert.match(source, /class_name/);
  assert.match(source, /classmatesQuery\.in\("class_name", group\.classNames\)/);
  assert.match(source, /classmatesQuery\.eq\("class_name", group\.classNames\[0\]\)/);
  // Ogrenci id'si donmez; lise icin guvenli sinif etiketi eklenebilir.
  assert.match(source, /rank: index \+ 1/);
  assert.match(source, /displayName: profile\?\.displayName/);
  assert.match(source, /isCurrentStudent: rowStudentId === currentStudentId/);
});

test("API route ogrenci oturumu dogrulamadan veri vermez", async () => {
  const source = await read("src/app/api/student/word-race-leaderboard/route.ts");

  assert.match(source, /verifyStudentAccess/);
  assert.match(source, /if \(!access\.ok\)/);
  // Sinif/ogrenci secimi client'tan gelen bir parametreyle YAPILMAZ.
  assert.doesNotMatch(source, /searchParams/);
  assert.match(source, /getWordRaceClassLeaderboard\(access\.studentId\)/);
  assert.match(source, /"Cache-Control": "no-store"/);
});

test("liderlik bolumu oyunun sonuc ekranina enjekte edilir, prototip degismez", async () => {
  const html = await readWordRaceGameHtml();

  assert.match(html, /idilWordRaceLeaderboard/);
  assert.match(html, /Sınıf Sıralaması/);
  assert.match(html, /Lise Sıralaması/);
  // Sonuc ekraninin icine yerlesir.
  assert.match(html, /#veilOver \.sheet/);
  // Blok </body> ONCESINE eklenir; kapanis etiketi hala tek ve en sonda.
  assert.equal(html.split("</body>").length - 1, 1);
  assert.ok(html.indexOf("idilWordRaceLeaderboard") < html.indexOf("</body>"));
});

test("isimler textContent ile yazilir - enjekte edilen blokta innerHTML yok", async () => {
  const html = await readWordRaceGameHtml();
  const block = html.slice(html.indexOf("#idilWordRaceLeaderboard"));

  assert.doesNotMatch(block, /innerHTML/);
  assert.doesNotMatch(block, /insertAdjacentHTML/);
  assert.match(block, /name\.textContent = String\(entry\.displayName\)/);
  assert.match(block, /grade\.textContent = String\(entry\.classLabel\)/);
});

test("iframe yalniz kendi ust penceresinden gelen siralama mesajini kabul eder", async () => {
  const html = await readWordRaceGameHtml();

  assert.match(html, /event\.source !== window\.parent/);
  assert.match(html, /data\.source !== "idil-word-race-host"/);
  // Gelen liste 10 ile kirpilir.
  assert.match(html, /entries\.slice\(0, 10\)/);
});

test("anchor kaybolursa yukleme sessizce degil hata firlatarak bozulur", () => {
  assert.throws(() => injectWordRaceResultBridge("<html><body></body></html>"), /kanca noktasi/);
});

test("client siralamayi sonuc KAYDEDILDIKTEN sonra ceker", async () => {
  const client = await read("src/app/egzersizler/kelime-yarisi/WordRaceExerciseClient.tsx");

  assert.match(client, /\/api\/student\/word-race-leaderboard/);
  assert.match(client, /credentials: "same-origin"/);
  // pushLeaderboard, kaydetmenin finally blogunda cagrilir.
  const persistBlock = client.slice(client.indexOf("const persistResult"));
  assert.match(persistBlock.slice(0, persistBlock.indexOf("[completeTaskAfterResultSave")), /finally \{[\s\S]*pushLeaderboard\(\)/);
});
