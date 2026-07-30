import assert from "node:assert/strict";
import fs from "node:fs";
import { register } from "node:module";
import test from "node:test";

register("./ts-alias-loader.mjs", new URL("./", import.meta.url));

const apiSource = fs.readFileSync("src/app/api/student/profile/route.ts", "utf8");
const clientSource = fs.readFileSync("src/app/ogrenci/profil/StudentProfileClient.tsx", "utf8");

test("öğrenci profil doğrulaması alanları sınırlı ve tarih güvenlidir", async () => {
  const { validateStudentProfileInput } = await import("../src/lib/students/studentProfileValidation.ts");
  const valid = validateStudentProfileInput({ name: "  Ayşe Yılmaz ", birthDate: "2012-05-10", classLevel: "4-A", schoolName: "  İDİL Okulu " });
  assert.equal(valid.ok, true);
  if (valid.ok) assert.deepEqual(valid.value, { name: "Ayşe Yılmaz", birthDate: "2012-05-10", classLevel: "4-A", schoolName: "İDİL Okulu" });
  assert.equal(validateStudentProfileInput({ name: "A", birthDate: "2030-01-01", classLevel: "4-A", schoolName: "" }).ok, false);
  assert.equal(validateStudentProfileInput({ name: "Ayşe Yılmaz", birthDate: "2030-01-01", classLevel: "4-A", schoolName: "" }).ok, false);
  assert.equal(validateStudentProfileInput({ name: "Ayşe Yılmaz", birthDate: "2012-05-10", classLevel: "4-A!", schoolName: "" }).ok, false);
});

test("profil API'si kimliği yalnız imzalı oturumdan çözer ve allowlist uygular", () => {
  assert.match(apiSource, /verifyStudentAccess\(request\)/);
  assert.match(apiSource, /\.eq\("id", access\.studentId\)/);
  assert.match(apiSource, /const ALLOWED_FIELDS = new Set\(\["name", "birthDate", "classLevel", "schoolName"\]\)/);
  assert.doesNotMatch(apiSource, /studentId.*body|body.*studentId/);
  assert.doesNotMatch(apiSource, /password/);
});

test("kullanıcı adı salt okunur gösterilir ve şifreler arayüze alınmaz", () => {
  assert.match(clientSource, /id="profile-username"[^>]*value=\{profile\.username\}[^>]*readOnly/);
  assert.match(clientSource, /Şifre Değiştir/);
  assert.match(clientSource, /güvenli Auth yeniden doğrulama akışına bağlı değil/);
  assert.doesNotMatch(clientSource, /current-password|new-password|password/);
});
