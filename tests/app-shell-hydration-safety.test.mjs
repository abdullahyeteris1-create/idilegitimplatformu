import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const APP_SHELL_PATH = path.join(ROOT, "src", "components", "layout", "AppShell.tsx");

const read = () => readFile(APP_SHELL_PATH, "utf8");

/**
 * Regresyon korumasi:
 *
 * AppShell ogretmen adini localStorage'dan okuyor. Bu deger render sirasinda
 * dogrudan okunursa sunucu her zaman fallback ("Ogretmen"), tarayici ise gercek
 * kullanici adini uretir; ilk render'lar uyusmadigi icin React her sayfa
 * yuklemesinde "Hydration failed because the server rendered text..." hatasi
 * firlatiyordu.
 *
 * Cozum: `useSyncExternalStore` - `getServerSnapshot` hem SSR'da hem de
 * hydration'in ilk render'inda kullanilir, gercek deger ancak hydration
 * bittikten sonra devreye girer.
 */

test("1) ogretmen adi useSyncExternalStore ile okunuyor (render sirasinda localStorage okunmuyor)", async () => {
  const source = await read();

  assert.match(source, /useSyncExternalStore/);
  assert.match(source, /const teacherUsername = useSyncExternalStore\(/);
});

test("2) useSyncExternalStore'a server snapshot fonksiyonu veriliyor", async () => {
  const source = await read();

  // Ucuncu argüman (server snapshot) olmadan SSR ve hydration ayrisir.
  assert.match(
    source,
    /useSyncExternalStore\(\s*subscribeToStoredUser,\s*readTeacherUsername,\s*readTeacherUsernameOnServer,?\s*\)/,
  );
});

test("3) server snapshot sabit fallback donuyor - localStorage'a dokunmuyor", async () => {
  const source = await read();

  const fnStart = source.indexOf("function readTeacherUsernameOnServer");
  assert.ok(fnStart > -1, "readTeacherUsernameOnServer tanimli olmali");

  const fnBody = source.slice(fnStart, source.indexOf("\n}", fnStart));
  assert.match(fnBody, /return TEACHER_USERNAME_FALLBACK;/);
  assert.doesNotMatch(fnBody, /localStorage|getResolvedCurrentUser/);
});

test("4) getResolvedCurrentUser bilesenin render govdesinde cagrilmiyor", async () => {
  const source = await read();

  const componentStart = source.indexOf("export function AppShell(");
  assert.ok(componentStart > -1, "AppShell bilesen tanimi bulunmali");

  // Render govdesi icinde (bilesen tanimindan sonra) dogrudan cagri olmamali;
  // cagri yalnizca modul seviyesindeki readTeacherUsername icinde yer almali.
  const componentBody = source.slice(componentStart);
  assert.doesNotMatch(componentBody, /getResolvedCurrentUser\(\)/);
});

test("5) fallback metni Turkce ve tek kaynaktan geliyor", async () => {
  const source = await read();

  assert.match(source, /const TEACHER_USERNAME_FALLBACK = "Öğretmen";/);
  // Fallback string'i baska yerde tekrar hardcode edilmemeli.
  const hardcoded = source.match(/"Öğretmen"/g) ?? [];
  assert.equal(hardcoded.length, 1);
});

test("6) masaustu/mobil menu CSS ile gizleniyor - JS genislik kontrolu yok", async () => {
  const source = await read();

  // window.innerWidth ile kosullu render SSR/client farki uretirdi.
  assert.doesNotMatch(source, /innerWidth|matchMedia/);
  assert.match(source, /lg:hidden/);
  assert.match(source, /lg:flex/);
});
