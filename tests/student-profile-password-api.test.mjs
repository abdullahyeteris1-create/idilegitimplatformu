import assert from "node:assert/strict";
import fs from "node:fs";
import { register } from "node:module";
import test from "node:test";

register("./ts-alias-loader.mjs", new URL("./", import.meta.url));

const routeSource = fs.readFileSync(
  "src/app/api/student/profile/password/route.ts",
  "utf8",
);
const sessionRouteSource = fs.readFileSync(
  "src/app/api/student-session/route.ts",
  "utf8",
);
const migrationSource = fs.readFileSync(
  "supabase/migrations/20260731130000_secure_student_password_writes_v1.sql",
  "utf8",
);

test("öğrenci parola API'si kimliği yalnız doğrulanmış session'dan alır", () => {
  assert.match(routeSource, /verifyStudentAccess\(request\)/);
  assert.match(routeSource, /\.eq\("id", access\.studentId\)/);
  assert.match(routeSource, /p_student_id: access\.studentId/);
  assert.match(
    routeSource,
    /const ALLOWED_FIELDS = new Set\(\["currentPassword", "newPassword", "confirmPassword"\]\)/,
  );
  assert.doesNotMatch(routeSource, /body\.studentId|body\["studentId"\]/);
  assert.match(routeSource, /access\.status === 401/);
});

test("same-origin kontrolü farklı ve eksik origin'i reddeder, proxy origin'ini destekler", async () => {
  const { isSameOriginRequest } = await import(
    "../src/lib/auth/sameOriginRequest.ts"
  );

  assert.equal(
    isSameOriginRequest(
      new Request("http://localhost:3000/api/student/profile/password", {
        headers: { origin: "http://localhost:3000" },
      }),
    ),
    true,
  );
  assert.equal(
    isSameOriginRequest(
      new Request("http://localhost:3000/api/student/profile/password", {
        headers: { origin: "https://attacker.example" },
      }),
    ),
    false,
  );
  assert.equal(
    isSameOriginRequest(
      new Request("http://localhost:3000/api/student/profile/password"),
    ),
    false,
  );
  assert.equal(
    isSameOriginRequest(
      new Request("http://internal:3000/api/student/profile/password", {
        headers: {
          origin: "https://app.example",
          "x-forwarded-host": "app.example",
          "x-forwarded-proto": "https",
        },
      }),
    ),
    true,
  );
  assert.match(routeSource, /jsonError\("İstek kaynağı doğrulanamadı\.", 403\)/);
});

test("request body allowlist, tip ve boyut sınırlarıyla doğrulanır", () => {
  assert.match(routeSource, /const MAX_BODY_LENGTH = 4096/);
  assert.match(routeSource, /request\.text\(\)/);
  assert.match(routeSource, /Object\.keys\(body\)\.some/);
  assert.match(routeSource, /typeof body\.currentPassword !== "string"/);
  assert.match(routeSource, /Array\.from\(body\.newPassword\)\.length > 128/);
  assert.match(routeSource, /body\.newPassword !== body\.confirmPassword/);
  assert.match(routeSource, /body\.newPassword === body\.currentPassword/);
});

test("mevcut parola yalnız desteklenen hash üzerinden doğrulanır", async () => {
  const {
    hashStudentPassword,
    isStudentPasswordHash,
    verifyStudentPassword,
  } = await import("../src/lib/auth/studentPassword.ts");

  const oldHash = await hashStudentPassword("MevcutŞifre7");
  const newHash = await hashStudentPassword("YeniŞifre8");
  assert.equal(isStudentPasswordHash(oldHash), true);
  assert.equal(await verifyStudentPassword("MevcutŞifre7", oldHash), true);
  assert.equal(await verifyStudentPassword("YanlışŞifre7", oldHash), false);
  assert.equal(await verifyStudentPassword("MevcutŞifre7", newHash), false);

  assert.match(
    routeSource,
    /\.select\("id,username,name,password_hash,password_hash_version,session_version"\)/,
  );
  assert.match(routeSource, /student\.password_hash_version !== PASSWORD_HASH_VERSION/);
  assert.match(routeSource, /isStudentPasswordHash\(student\.password_hash\)/);
  assert.match(routeSource, /verifyStudentPassword\(\s*body\.currentPassword/);
  assert.match(routeSource, /return jsonError\(CURRENT_PASSWORD_MESSAGE, 401\)/);
  assert.doesNotMatch(
    routeSource,
    /\.select\("[^"]*(?:^|,)password(?:,|")[^"]*"\)/,
  );
});

test("yeni parola ortak doğrulama helper'ından değiştirilmeden geçer", async () => {
  const { validateStudentPassword } = await import(
    "../src/lib/students/studentPasswordValidation.ts"
  );
  const context = { username: "ayse12", name: "Ayşe Yılmaz" };

  assert.equal(validateStudentPassword("Kısa1", context).ok, false);
  assert.equal(validateStudentPassword(`${"A".repeat(128)}1`, context).ok, false);
  assert.equal(validateStudentPassword("12345678", context).ok, false);
  assert.equal(validateStudentPassword("Şifreyok", context).ok, false);
  assert.equal(validateStudentPassword(" Güvenli7", context).ok, false);
  assert.equal(validateStudentPassword("Güvenli7 ", context).ok, false);
  assert.equal(validateStudentPassword("ayse12", context).ok, false);
  assert.equal(validateStudentPassword("Ayşe Yılmaz", context).ok, false);
  assert.equal(validateStudentPassword("GüvenliŞifre7", context).ok, true);

  assert.match(routeSource, /validateStudentPassword\(body\.newPassword/);
  assert.match(routeSource, /username: student\.username/);
  assert.match(routeSource, /name: student\.name/);
});

test("hash server-side üretilir ve yalnız hash parametreleri atomik RPC'ye gider", () => {
  assert.match(routeSource, /passwordHash = await hashStudentPassword\(validation\.value\)/);
  assert.match(routeSource, /"admin_update_student_password_v1"/);
  assert.match(routeSource, /p_student_id: access\.studentId/);
  assert.match(routeSource, /p_password_hash: passwordHash/);
  assert.match(routeSource, /p_password_hash_version: PASSWORD_HASH_VERSION/);
  assert.doesNotMatch(routeSource, /supabase[\s\S]*?\.update\(/);
  assert.doesNotMatch(routeSource, /p_(?:current|new|confirm|plain).*password/);
  assert.match(routeSource, /if \(updateError \|\| !Array\.isArray\(updateResult\)/);
});

test("RPC session'ı atomik geçersiz kılar ve başarı cookie'yi temizler", () => {
  assert.match(migrationSource, /password = null/);
  assert.match(migrationSource, /password_hash = p_password_hash/);
  assert.match(migrationSource, /password_hash_version = p_password_hash_version/);
  assert.match(migrationSource, /password_changed_at = now\(\)/);
  assert.match(migrationSource, /session_version = coalesce\(session_version, 0\) \+ 1/);
  assert.match(routeSource, /clearStudentSessionCookie\(response\)/);
  assert.match(
    routeSource,
    /\{ success: true, requiresReauthentication: true \}/,
  );
  assert.doesNotMatch(
    routeSource,
    /\{ success: true[^}]+(?:passwordHash|studentId|sessionToken)/,
  );
});

test("Faz 2 login karar ağacı değiştirilmeden hash doğrulamasını korur", () => {
  assert.match(sessionRouteSource, /verifyStudentLoginPassword/);
  assert.match(sessionRouteSource, /createStudentSessionToken/);
  assert.doesNotMatch(routeSource, /studentPasswordLogin/);
});

test("parola, hash, salt ve request body loglanmaz", () => {
  assert.doesNotMatch(routeSource, /console\.(?:log|info|warn)\(/);
  assert.doesNotMatch(routeSource, /console\.error\([^)]*(?:body|passwordHash|student\.password_hash)/s);
  assert.doesNotMatch(routeSource, /JSON\.stringify\(body\)/);
});
