import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

const clientSource = fs.readFileSync(
  "src/app/ogrenci/profil/StudentProfileClient.tsx",
  "utf8",
);
const styleSource = fs.readFileSync(
  "src/app/ogrenci/profil/student-profile.module.css",
  "utf8",
);
const loginSource = fs.readFileSync(
  "src/components/auth/LoginForm.tsx",
  "utf8",
);

test("profilde ayrı Şifre Değiştir formu ve üç boş parola alanı vardır", () => {
  assert.match(clientSource, /<h2>Şifre Değiştir<\/h2>/);
  assert.match(clientSource, /id="profile-current-password"/);
  assert.match(clientSource, /id="profile-new-password"/);
  assert.match(clientSource, /id="profile-confirm-password"/);
  assert.match(clientSource, /useState\(""\)/);
  assert.doesNotMatch(clientSource, /defaultValue=.*password/i);
});

test("autocomplete ve erişilebilir göster gizle davranışı tanımlıdır", () => {
  assert.match(clientSource, /autoComplete="current-password"/);
  assert.equal(
    (clientSource.match(/autoComplete="new-password"/g) ?? []).length,
    2,
  );
  assert.match(clientSource, /type=\{visible \? "text" : "password"\}/);
  assert.match(clientSource, /aria-label=\{`\$\{label\} alanındaki şifreyi/);
  assert.match(clientSource, /aria-pressed=\{visible\}/);
  assert.match(clientSource, /type="button"/);
});

test("kurallar, hata erişilebilirliği ve güvenli başarı mesajı gösterilir", () => {
  assert.doesNotMatch(clientSource, /En az 8 karakter/);
  assert.doesNotMatch(clientSource, /Harf ve rakam içermeli/);
  assert.doesNotMatch(clientSource, /Kullanıcı adı veya ad soyad olamaz/);
  assert.doesNotMatch(clientSource, /profile-password-rules/);
  assert.match(clientSource, /role=\{passwordMessageType === "error" \? "alert" : "status"\}/);
  assert.match(clientSource, /aria-live="polite"/);
  assert.match(
    clientSource,
    /Şifreniz başarıyla değiştirildi\. Güvenlik nedeniyle tekrar giriş yapmanız gerekiyor\./,
  );
});

test("loading sırasında çift submit engellenir ve başarı tam sayfa yönlendirir", () => {
  assert.match(clientSource, /if \(isChangingPassword \|\| passwordChangeSucceeded\) return/);
  assert.match(clientSource, /disabled=\{isChangingPassword \|\| passwordChangeSucceeded\}/);
  assert.match(clientSource, /setPasswordChangeSucceeded\(true\)/);
  assert.match(clientSource, /Şifre Değiştiriliyor\.\.\./);
  assert.match(
    clientSource,
    /window\.location\.assign\("\/giris\?reason=password-changed"\)/,
  );
});

test("parolalar yalnız same-origin POST body içinde kullanılır, storage veya log yoktur", () => {
  assert.match(clientSource, /fetch\("\/api\/student\/profile\/password"/);
  assert.match(clientSource, /method: "POST"/);
  assert.match(clientSource, /credentials: "same-origin"/);
  assert.match(
    clientSource,
    /JSON\.stringify\(\{ currentPassword, newPassword, confirmPassword \}\)/,
  );
  assert.doesNotMatch(clientSource, /localStorage|sessionStorage|console\./);
  assert.doesNotMatch(clientSource, /reason=.*\$\{|URLSearchParams/);
});

test("login reason mesajı sabit allowlist ile gösterilir", () => {
  assert.match(
    loginSource,
    /searchParams\.get\("reason"\) === "password-changed"/,
  );
  assert.match(
    loginSource,
    /Şifreniz değiştirildi\. Yeni şifrenizle tekrar giriş yapın\./,
  );
  assert.doesNotMatch(loginSource, /\{searchParams\.get\("reason"\)\}/);
});

test("form mevcut tema değişkenlerini ve responsive düzeni kullanır", () => {
  assert.match(styleSource, /\.passwordFields\{/);
  assert.match(styleSource, /\.passwordInputWrap\{/);
  assert.match(styleSource, /var\(--idil-soft-block\)/);
  assert.match(styleSource, /var\(--idil-text\)/);
  assert.match(styleSource, /@media\(max-width:800px\)/);
  assert.match(styleSource, /@media\(max-width:480px\)/);
  assert.doesNotMatch(styleSource, /min-width:\s*[4-9]\d\dpx/);
});
