import assert from "node:assert/strict";
import test from "node:test";
import { createAdminSessionToken, isAdminSessionTokenValid } from "../src/lib/auth/adminSession.ts";
import { isAdminSessionTokenValidEdge } from "../src/lib/auth/adminSessionEdge.ts";

test("admin session rastgele 16+ karakterle degil, imzali token ile kabul edilir", async () => {
  const previous = process.env.ADMIN_SESSION_SECRET;
  process.env.ADMIN_SESSION_SECRET = "test-admin-session-secret";
  try {
    assert.equal(isAdminSessionTokenValid("x".repeat(32)), false);
    const token = createAdminSessionToken(1_700_000_000);
    assert.ok(token);
    assert.equal(isAdminSessionTokenValid(token, 1_700_000_001), true);
    assert.equal(await isAdminSessionTokenValidEdge(token, 1_700_000_001), true);
  } finally {
    if (previous === undefined) delete process.env.ADMIN_SESSION_SECRET;
    else process.env.ADMIN_SESSION_SECRET = previous;
  }
});

test("admin session tamper ve expiry durumunda reddedilir", () => {
  const previous = process.env.ADMIN_SESSION_SECRET;
  process.env.ADMIN_SESSION_SECRET = "test-admin-session-secret";
  try {
    const token = createAdminSessionToken(1_700_000_000);
    assert.ok(token);
    const [payload, signature] = token.split(".");
    assert.equal(isAdminSessionTokenValid(`${payload}.${signature.slice(0, -1)}x`, 1_700_000_001), false);
    assert.equal(isAdminSessionTokenValid(token, 1_700_000_000 + 8 * 60 * 60), false);
  } finally {
    if (previous === undefined) delete process.env.ADMIN_SESSION_SECRET;
    else process.env.ADMIN_SESSION_SECRET = previous;
  }
});

test("admin login yeni session token helper'ini, mevcut logout cookie akisini koruyarak kullanir", async () => {
  const fs = await import("node:fs/promises");
  const login = await fs.readFile(new URL("../src/app/api/admin-login/route.ts", import.meta.url), "utf8");
  const logout = await fs.readFile(new URL("../src/app/api/admin-logout/route.ts", import.meta.url), "utf8");
  assert.match(login, /createAdminSessionToken\(\)/);
  assert.match(login, /httpOnly: true/);
  assert.match(login, /sameSite: "lax"/);
  assert.match(login, /secure: process\.env\.NODE_ENV === "production"/);
  assert.match(logout, /maxAge: 0/);
});
