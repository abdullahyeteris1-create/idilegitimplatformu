import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const createRoute = await readFile("src/app/api/admin/students/route.ts", "utf8");
const updateRoute = await readFile("src/app/api/admin/students/[studentId]/route.ts", "utf8");
const editForm = await readFile("src/app/ogretmen/ogrenciler/[studentId]/duzenle/EditStudentFormClient.tsx", "utf8");

test("yönetici parola yazma rotaları sunucu hash helper'ını ve hash alanlarını kullanır", () => {
  for (const source of [createRoute, updateRoute]) {
    assert.match(source, /hashStudentPassword/);
    assert.match(source, /password_hash/);
    assert.match(source, /password_hash_version/);
    assert.doesNotMatch(source, /console\.log\([^)]*password/i);
  }
});

test("güncellemede boş parola gönderimi mevcut parolayı değiştirmez", () => {
  assert.match(updateRoute, /rawPassword\.trim\(\)/);
  assert.match(updateRoute, /if \(passwordValidation\?\.ok\)/);
  assert.match(editForm, /password\.trim\(\) \? \{ password \} : \{\}/);
  assert.match(editForm, /autoComplete="new-password"/);
});
