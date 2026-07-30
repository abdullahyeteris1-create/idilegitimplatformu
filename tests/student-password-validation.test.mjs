import assert from "node:assert/strict";
import test from "node:test";
import { register } from "node:module";

register("./ts-alias-loader.mjs", new URL("./", import.meta.url));

const { validateStudentPassword } = await import("../src/lib/students/studentPasswordValidation.ts");

test("parola en az 8 karakter, harf ve rakam ister; iç boşluğa izin verir", () => {
  assert.deepEqual(validateStudentPassword("Güvenli parola 42", { username: "ceren" }).ok, true);
  assert.equal(validateStudentPassword("Kısa7").ok, false);
  assert.equal(validateStudentPassword("sadeceharfler").ok, false);
  assert.equal(validateStudentPassword("12345678").ok, false);
});

test("baş ve son boşluklar ile kullanıcı adı/ad soyad eşleşmesi reddedilir", () => {
  assert.equal(validateStudentPassword(" Güvenli42").ok, false);
  assert.equal(validateStudentPassword("Güvenli42 ").ok, false);
  assert.equal(validateStudentPassword("Ceren Bora", { name: "ceren bora" }).ok, false);
  assert.equal(validateStudentPassword("ceren42", { username: "CEREN42" }).ok, false);
});
