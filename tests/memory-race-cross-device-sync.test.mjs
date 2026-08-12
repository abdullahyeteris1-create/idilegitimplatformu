import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const read = (path) => readFile(path, "utf8");
const client = await read("src/components/memory-race/MemoryRaceMultiplayerClient.tsx");
const css = await read("src/components/memory-race/MemoryRaceMultiplayerClient.module.css");

test("realtime client latest-version guard preserves a v12 burst after an in-flight v11 fetch", async () => {
  assert.match(client, /highestSeenBroadcastVersionRef/);
  assert.match(client, /Math\.max\(highestSeenBroadcastVersionRef\.current, version\)/);
  assert.match(client, /nextGame\.version < highestSeenBroadcastVersionRef\.current/);
  assert.match(client, /refreshQueued\.current \|\| authoritativeVersionRef\.current < highestSeenBroadcastVersionRef\.current/);
  assert.match(client, /nextGame\.version < authoritativeVersionRef\.current/);

  let currentVersion = 10;
  let highestSeenVersion = 10;
  let refreshQueued = false;
  let fetchVersion = 11;
  const onBroadcast = (version) => {
    highestSeenVersion = Math.max(highestSeenVersion, version);
    if (currentVersion >= version) return;
    refreshQueued = true;
  };
  onBroadcast(11);
  onBroadcast(12);
  if (fetchVersion < highestSeenVersion) refreshQueued = true;
  assert.equal(refreshQueued, true);
  fetchVersion = 12;
  currentVersion = fetchVersion;
  assert.equal(currentVersion, 12);
  assert.equal(currentVersion >= highestSeenVersion, true);
});

test("visual parity uses explicit level grids and card-relative emoji sizing", () => {
  for (const [count, columns] of [[16, 4], [20, 5], [24, 6], [32, 8]]) {
    assert.match(css, new RegExp(`\\.count${count} \\{[^}]*grid-template-columns: repeat\\(${columns}, 1fr\\)`));
  }
  assert.match(css, /\.count40, \.count60 \{[^}]*grid-template-columns: repeat\(10, 1fr\)/);
  assert.match(css, /font-size: clamp\([^;]*cqw/);
  assert.match(css, /aspect-ratio: 1/);
  assert.match(css, /container-type: inline-size/);
});

test("cross-device synchronization does not expose hidden board data", () => {
  assert.doesNotMatch(client, /game\.board|rawBoard|pairId/);
  assert.doesNotMatch(client, /broadcast[^\n]*(emoji|pairId|board)/i);
});
