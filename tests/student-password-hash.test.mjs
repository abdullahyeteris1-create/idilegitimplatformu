import assert from "node:assert/strict";
import { performance } from "node:perf_hooks";
import { register } from "node:module";
import test from "node:test";

register("./ts-alias-loader.mjs", new URL("./", import.meta.url));

const {
  hashStudentPassword,
  isStudentPasswordHash,
  verifyStudentPassword,
} = await import("../src/lib/auth/studentPassword.ts");

const PASSWORD = "Güvenli şifre 42";

test("geçerli parola scrypt formatında hashlenir ve düz metni içermez", async () => {
  const hash = await hashStudentPassword(PASSWORD);
  assert.match(hash, /^scrypt\$v=1\$N=16384\$r=8\$p=1\$[A-Za-z0-9_-]+\$[A-Za-z0-9_-]+$/);
  assert.equal(hash.includes(PASSWORD), false);
  assert.equal(isStudentPasswordHash(hash), true);
});

test("aynı parola her seferinde farklı salt ile hashlenir ve iki hash de doğrulanır", async () => {
  const first = await hashStudentPassword(PASSWORD);
  const second = await hashStudentPassword(PASSWORD);
  assert.notEqual(first, second);
  assert.equal(await verifyStudentPassword(PASSWORD, first), true);
  assert.equal(await verifyStudentPassword(PASSWORD, second), true);
});

test("doğru parola true, yanlış parola false döner", async () => {
  const hash = await hashStudentPassword(PASSWORD);
  assert.equal(await verifyStudentPassword(PASSWORD, hash), true);
  assert.equal(await verifyStudentPassword("Yanlış parola", hash), false);
});

test("Türkçe karakter, iç boşluk ve baş/son boşluk davranışı korunur", async () => {
  const password = "İçeride boşluk şifre";
  const hash = await hashStudentPassword(password);
  assert.equal(await verifyStudentPassword(password, hash), true);
  assert.equal(await verifyStudentPassword(` ${password}`, hash), false);
  assert.equal(await verifyStudentPassword(`${password} `, hash), false);
});

test("128 karakter kabul edilir, 129 karakter reddedilir", async () => {
  assert.equal(isStudentPasswordHash(await hashStudentPassword("a".repeat(128))), true);
  await assert.rejects(() => hashStudentPassword("a".repeat(129)), /too long/);
});

test("boş parola reddedilir", async () => {
  await assert.rejects(() => hashStudentPassword(""), /must not be empty/);
});

test("bozuk veya saldırgan kontrollü hash parametreleri false döner", async () => {
  const hash = await hashStudentPassword(PASSWORD);
  const parts = hash.split("$");
  const variants = [
    "not-a-hash",
    hash.split("$").slice(0, 6).join("$"),
    hash.replace("scrypt$", "bcrypt$"),
    hash.replace("v=1", "v=2"),
    hash.replace("N=16384", "N=32768"),
    hash.replace("r=8", "r=16"),
    hash.replace("p=1", "p=2"),
    hash.replace(parts[5], "!") ,
    hash.replace(parts[5], "AA"),
    hash.replace(parts[6], "AA"),
    null,
    undefined,
    { hash },
  ];

  for (const variant of variants) {
    assert.equal(isStudentPasswordHash(variant), false);
    assert.equal(await verifyStudentPassword(PASSWORD, variant), false);
  }
});

test("hash helper hatalarda parola/hash değerlerini mesajına eklemez", async () => {
  const secret = "GizliTestParolası";
  await assert.rejects(() => hashStudentPassword(""), (error) => {
    assert.equal(String(error).includes(secret), false);
    return true;
  });
  assert.equal(await verifyStudentPassword(secret, "bozuk-hash"), false);
});

test("server-only helper client bileşeni veya use client içermez", async () => {
  const { readFile } = await import("node:fs/promises");
  const source = await readFile("src/lib/auth/studentPassword.ts", "utf8");
  assert.match(source, /from ["']node:crypto["']/);
  assert.doesNotMatch(source, /use client/);
  assert.doesNotMatch(source, /console\.(log|error)/);
});

test("scrypt hash ve verify yaklaşık performansı ölçülür", async () => {
  const hashStart = performance.now();
  const hash = await hashStudentPassword("Benchmark parola 42");
  const hashMs = performance.now() - hashStart;
  const verifyStart = performance.now();
  await verifyStudentPassword("Benchmark parola 42", hash);
  const verifyMs = performance.now() - verifyStart;
  assert.ok(hashMs > 0);
  assert.ok(verifyMs > 0);
  console.log(`student password benchmark: hash=${hashMs.toFixed(1)}ms verify=${verifyMs.toFixed(1)}ms`);
});
