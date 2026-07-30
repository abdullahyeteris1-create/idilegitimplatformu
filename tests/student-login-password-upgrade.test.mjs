import assert from "node:assert/strict";
import { register } from "node:module";
import test from "node:test";

register("./ts-alias-loader.mjs", new URL("./", import.meta.url));

const { hashStudentPassword } = await import("../src/lib/auth/studentPassword.ts");
const { verifyStudentLoginPassword } = await import("../src/lib/auth/studentPasswordLogin.ts");

test("geçerli hash doğru parolayı kabul eder", async () => {
  const hash = await hashStudentPassword("Türkçe parola 42");
  const result = await verifyStudentLoginPassword({
    password: "Türkçe parola 42",
    passwordHash: hash,
    passwordHashVersion: 1,
    legacyPassword: "başka parola",
  });
  assert.deepEqual(result, { authenticated: true, shouldUpgradeLegacy: false });
});

test("hash varken yanlış parola ve legacy fallback reddedilir", async () => {
  const hash = await hashStudentPassword("Doğru parola 42");
  const result = await verifyStudentLoginPassword({
    password: "Legacy parola",
    passwordHash: hash,
    passwordHashVersion: 1,
    legacyPassword: "Legacy parola",
  });
  assert.deepEqual(result, { authenticated: false, shouldUpgradeLegacy: false });
});

test("bozuk, bilinmeyen veya desteklenmeyen hash reddedilir", async () => {
  for (const passwordHash of ["bozuk-hash", "bcrypt$v=1$hash", "scrypt$v=9$N=16384$r=8$p=1$AA$AA"]) {
    const result = await verifyStudentLoginPassword({
      password: "Parola 42",
      passwordHash,
      passwordHashVersion: 1,
      legacyPassword: "Parola 42",
    });
    assert.deepEqual(result, { authenticated: false, shouldUpgradeLegacy: false });
  }
});

test("DB hash version ile hash formatı çelişirse reddedilir", async () => {
  const hash = await hashStudentPassword("Parola 42");
  const result = await verifyStudentLoginPassword({
    password: "Parola 42",
    passwordHash: hash,
    passwordHashVersion: 2,
    legacyPassword: "Parola 42",
  });
  assert.deepEqual(result, { authenticated: false, shouldUpgradeLegacy: false });
});

test("hash version null iken geçerli v1 hash doğrulanır", async () => {
  const hash = await hashStudentPassword("Parola 42");
  const result = await verifyStudentLoginPassword({
    password: "Parola 42",
    passwordHash: hash,
    passwordHashVersion: null,
    legacyPassword: "yanlış legacy değer",
  });
  assert.deepEqual(result, { authenticated: true, shouldUpgradeLegacy: false });
});

test("hash yokken legacy parola trim uyumluluğuyla kabul edilir ve upgrade ister", async () => {
  const result = await verifyStudentLoginPassword({
    password: "Parola123",
    passwordHash: null,
    passwordHashVersion: null,
    legacyPassword: "Parola123 ",
  });
  assert.deepEqual(result, { authenticated: true, shouldUpgradeLegacy: true });
});

test("yanlış legacy parola reddedilir ve upgrade istemez", async () => {
  const result = await verifyStudentLoginPassword({
    password: "Yanlış",
    passwordHash: null,
    passwordHashVersion: null,
    legacyPassword: "Doğru parola",
  });
  assert.deepEqual(result, { authenticated: false, shouldUpgradeLegacy: false });
});

test("legacy input sessizce trim edilmez", async () => {
  const result = await verifyStudentLoginPassword({
    password: "  Parola 42  ",
    passwordHash: null,
    passwordHashVersion: null,
    legacyPassword: "Parola 42",
  });
  assert.deepEqual(result, { authenticated: false, shouldUpgradeLegacy: false });
});

test("iki parola alanı da boşsa reddedilir", async () => {
  const result = await verifyStudentLoginPassword({
    password: "Parola 42",
    passwordHash: null,
    passwordHashVersion: null,
    legacyPassword: null,
  });
  assert.deepEqual(result, { authenticated: false, shouldUpgradeLegacy: false });
});

test("login route parola alanlarını seçer ve conditional upgrade kullanır", async () => {
  const { readFile } = await import("node:fs/promises");
  const source = await readFile("src/app/api/student-session/route.ts", "utf8");
  assert.match(source, /password,password_hash,password_hash_version/);
  assert.match(source, /hashStudentPassword/);
  assert.match(source, /\.is\("password_hash", null\)/);
  assert.doesNotMatch(source, /student:\s*\{[\s\S]*password_hash/);
  assert.doesNotMatch(source, /console\.(?:log|error)\([^\n]*passwordHash/);
});
