import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";
import test from "node:test";

/**
 * Sinif ici liderlik tablosu. En kritik iddia GIZLILIK: disari yalniz adin ilk
 * kelimesi ve skor cikar - soyad, tam ad, kullanici adi, ogrenci id'si veya
 * sinif adi asla client'a gonderilmez.
 */

const ROOT = process.cwd();
const read = (relativePath) => readFile(path.join(ROOT, relativePath), "utf8");

const { toDisplayName, WORD_RACE_LEADERBOARD_SIZE } = await import(
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

test("repository yalniz gorunen ad ve skor dondurur, sinifla sinirlar", async () => {
  const source = await read("src/lib/word-race/wordRaceLeaderboard.ts");

  // Ogrenci basina en iyi skor - tek ogrenci listeyi dolduramaz.
  assert.match(source, /bestByStudent/);
  // Karsilastirma sinif ici.
  assert.match(source, /class_name/);
  assert.match(source, /\.eq\("class_name", className\)/);
  // Donen nesnede yalniz bu dort alan var.
  assert.match(source, /rank: index \+ 1/);
  assert.match(source, /displayName: nameById\.get/);
  assert.match(source, /isCurrentStudent: rowStudentId === studentId/);
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
