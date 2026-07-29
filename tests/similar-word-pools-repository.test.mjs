import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

import { SIMILAR_WORD_POOLS } from "../src/lib/data/similarWordPools.ts";
import { createSimilarWordsSession } from "../src/lib/exercise-engine/similarWords.ts";
import {
  buildSimilarWordPoolNormalizedKey,
  buildSimilarWordPoolSeedRows,
  loadSimilarWordPools,
  normalizeSimilarWordPoolText,
  normalizeSimilarWordPoolWord,
  toSimilarWordPools,
} from "../src/lib/similar-word-pools/similarWordPoolsRepository.ts";

function createMockSupabase({ data = [], error = null } = {}) {
  const calls = {
    from: [],
    select: [],
    eq: [],
    order: [],
  };

  const query = {
    select(columns) {
      calls.select.push(columns);
      return query;
    },
    eq(column, value) {
      calls.eq.push({ column, value });
      return query;
    },
    order(column, options) {
      calls.order.push({ column, options });
      return query;
    },
    then(resolve, reject) {
      return Promise.resolve({ data, error }).then(resolve, reject);
    },
  };

  return {
    calls,
    from(table) {
      calls.from.push(table);
      return query;
    },
  };
}

test("normalization NFC ve whitespace temizligi yapar", () => {
  assert.equal(normalizeSimilarWordPoolText("  go\u0308ru\u0308s\u0327   kelime  "), "görüş kelime");
});

test("tr-TR lowercase I/İ/ı/i ayrimini korur", () => {
  assert.equal(normalizeSimilarWordPoolWord("I"), "I");
  assert.equal(normalizeSimilarWordPoolWord("İ"), "İ");
  assert.equal("I".toLocaleLowerCase("tr-TR"), "ı");
  assert.equal("İ".toLocaleLowerCase("tr-TR"), "i");
  assert.equal("ı".toLocaleLowerCase("tr-TR"), "ı");
  assert.equal("i".toLocaleLowerCase("tr-TR"), "i");
});

test("bos icerik reddedilir", () => {
  assert.equal(normalizeSimilarWordPoolWord("   "), null);
});

test("mojibake karakterler reddedilir", () => {
  assert.equal(normalizeSimilarWordPoolText("gÃ¶z"), null);
  assert.equal(normalizeSimilarWordPoolWord("ÅŸehir"), null);
});

test("canonical normalized key icin variant sirasi fark etmez", () => {
  const left = buildSimilarWordPoolNormalizedKey("masa", ["nasa", "masa"]);
  const right = buildSimilarWordPoolNormalizedKey("masa", ["masa", "nasa"]);

  assert.equal(left, "masa::masa::nasa");
  assert.equal(left, right);
});

test("duplicate pair iceren kayitlar seed'e aynen tasinir", () => {
  const seedRows = buildSimilarWordPoolSeedRows();
  const panelRow = seedRows.find((row) => row.difficulty === "medium" && row.base_word === "panel");

  assert.ok(panelRow);
  assert.deepEqual(panelRow.variants, ["panel", "panel"]);
  assert.equal(panelRow.normalized_key, "panel::panel::panel");
});

test("seed kayit sayisi ve difficulty dagilimi static havuzla uyumludur", () => {
  const seedRows = buildSimilarWordPoolSeedRows();

  assert.equal(seedRows.length, 34);
  assert.equal(seedRows.filter((row) => row.difficulty === "easy").length, 10);
  assert.equal(seedRows.filter((row) => row.difficulty === "medium").length, 12);
  assert.equal(seedRows.filter((row) => row.difficulty === "hard").length, 12);
});

test("toSimilarWordPools engine shape'ini korur", () => {
  const seedRows = buildSimilarWordPoolSeedRows();
  const pools = toSimilarWordPools(seedRows);

  assert.deepEqual(Object.keys(pools).sort(), ["easy", "hard", "medium"]);
  assert.deepEqual(pools.easy[0], SIMILAR_WORD_POOLS.easy[0]);
  assert.deepEqual(pools.medium[2], SIMILAR_WORD_POOLS.medium[2]);
});

test("repository DTO shape'i database rows'dan engine shape'ine cevrilir", async () => {
  const seedRows = buildSimilarWordPoolSeedRows();
  const supabase = createMockSupabase({ data: seedRows });

  const result = await loadSimilarWordPools(supabase);

  assert.equal(supabase.calls.from[0], "similar_word_pools");
  assert.deepEqual(supabase.calls.eq[0], { column: "is_active", value: true });
  assert.equal(result.source, "database");
  assert.equal(result.databaseRowCount, 34);
  assert.deepEqual(result.sourceByDifficulty, {
    easy: "database",
    medium: "database",
    hard: "database",
  });
  assert.deepEqual(result.pools.easy[0], SIMILAR_WORD_POOLS.easy[0]);
  assert.deepEqual(result.pools.hard[11], SIMILAR_WORD_POOLS.hard[11]);
});

test("DB unavailable durumunda static fallback calisir", async () => {
  const result = await loadSimilarWordPools(null);

  assert.equal(result.source, "static");
  assert.deepEqual(result.sourceByDifficulty, {
    easy: "static",
    medium: "static",
    hard: "static",
  });
  assert.equal(result.databaseRowCount, 0);
  assert.equal(result.fallbackReasons[0], "service-role-client-unavailable");
  assert.deepEqual(result.pools, SIMILAR_WORD_POOLS);
});

test("query hatasi durumunda static fallback calisir", async () => {
  const supabase = createMockSupabase({ error: { code: "500", message: "db down" } });

  const result = await loadSimilarWordPools(supabase);

  assert.equal(result.source, "static");
  assert.equal(result.fallbackReasons[0], "database-query-error");
  assert.deepEqual(result.pools, SIMILAR_WORD_POOLS);
});

test("similar words engine mevcut static davranis regresyonunu korur", () => {
  const session = createSimilarWordsSession({ difficulty: "easy", durationSeconds: 60 });

  assert.equal(session.config.difficulty, "easy");
  assert.equal(session.config.durationSeconds, 60);
  assert.equal(session.pairs.length, 12);
  assert.ok(session.pairs.every((pair) => typeof pair.id === "string"));
  assert.ok(session.pairs.every((pair) => typeof pair.leftWord === "string"));
  assert.ok(session.pairs.every((pair) => typeof pair.rightWord === "string"));
  assert.ok(session.pairs.every((pair) => typeof pair.isDifferent === "boolean"));
});

test("migration sql yeni tablo, constraint, trigger ve idempotent seed icerir", async () => {
  const sql = await readFile(
    new URL("../supabase/migrations/20260729100000_create_similar_word_pools.sql", import.meta.url),
    "utf8",
  );

  assert.match(sql, /create table if not exists public\.similar_word_pools/);
  assert.match(sql, /constraint similar_word_pools_difficulty_check/);
  assert.match(sql, /constraint similar_word_pools_variants_check/);
  assert.match(sql, /constraint similar_word_pools_difficulty_normalized_key_unique/);
  assert.match(sql, /create index if not exists similar_word_pools_difficulty_active_sort_idx/);
  assert.match(sql, /create or replace function public\.set_updated_at_similar_word_pools\(\)/);
  assert.match(sql, /on conflict \(difficulty, normalized_key\) do update/);
  assert.match(sql, /'tekrarlama::tekrarıama::tekrarlama'/);
});
