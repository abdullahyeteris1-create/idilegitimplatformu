import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const watcherSource = await readFile("src/components/auth/StudentSessionWatcher.tsx", "utf8");
const statusRouteSource = await readFile("src/app/api/student/session-status/route.ts", "utf8");

test("session watcher tek-flight, tek retry ve transient hata korumasını içerir", () => {
  assert.match(watcherSource, /let checking = false/);
  assert.match(watcherSource, /SESSION_RETRY_DELAY_MS = 300/);
  assert.match(watcherSource, /response = await request\(\)/);
  assert.match(watcherSource, /if \(response\.status === 401 \|\| response\.status === 403\)/);
  assert.match(watcherSource, /catch \{\s*\/\/ Network and timeout failures are temporary/);
  assert.match(watcherSource, /disposed \|\| redirecting/);
});

test("session-status güvenli reason kodunu döndürür", () => {
  assert.match(statusRouteSource, /reason: access\.reason/);
  assert.doesNotMatch(statusRouteSource, /token|studentId|username/);
});
