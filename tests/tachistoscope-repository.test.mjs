import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

import { TACHISTOSCOPE_WORDS_BY_LEVEL } from "../src/lib/exercise-engine/tachistoscopeWords.ts";
import {
  buildTachistoscopeNormalizedKey,
  buildTachistoscopeSeedRows,
  loadTachistoscopeWords,
  normalizeTachistoscopeText,
  normalizeTachistoscopeWord,
  toTachistoscopeWordsByLevel,
} from "../src/lib/tachistoscope/tachistoscopeRepository.ts";

function withIds(rows) {
  return rows.map((row, index) => ({
    id: row.id ?? `row-${index + 1}`,
    ...row,
  }));
}

function createMockSupabase(initialRows = [], options = {}) {
  let rows = initialRows.map((row) => ({ ...row }));
  const calls = {
    from: [],
    select: [],
    eq: [],
    order: [],
  };

  function applyOrder(sourceRows, orders) {
    return [...sourceRows].sort((left, right) => {
      for (const order of orders) {
        const leftValue = left[order.column];
        const rightValue = right[order.column];

        if (leftValue === rightValue) {
          continue;
        }

        const comparison = String(leftValue).localeCompare(String(rightValue), "tr-TR");
        return order.ascending ? comparison : comparison * -1;
      }

      return 0;
    });
  }

  function createQuery() {
    const state = {
      filters: [],
      orders: [],
    };

    function execute() {
      if (options.error) {
        return { data: null, error: options.error };
      }

      let resultRows = [...rows];
      for (const filter of state.filters) {
        if (filter.kind === "eq") {
          resultRows = resultRows.filter((row) => row[filter.column] === filter.value);
        }
      }

      resultRows = applyOrder(resultRows, state.orders);
      return { data: resultRows, error: null };
    }

    const query = {
      select(columns) {
        calls.select.push(columns);
        return query;
      },
      eq(column, value) {
        calls.eq.push({ column, value });
        state.filters.push({ kind: "eq", column, value });
        return query;
      },
      order(column, options) {
        calls.order.push({ column, options });
        state.orders.push({ column, ascending: options?.ascending !== false });
        return query;
      },
      maybeSingle() {
        return Promise.resolve(execute()).then(({ data, error }) => ({
          data: Array.isArray(data) ? data[0] ?? null : data ?? null,
          error,
        }));
      },
      then(resolve, reject) {
        return Promise.resolve(execute()).then(resolve, reject);
      },
    };

    return query;
  }

  return {
    calls,
    from(table) {
      calls.from.push(table);
      return createQuery();
    },
  };
}

test("seed kayit sayisi ve level dagilimi statik havuzla uyumludur", () => {
  const rows = buildTachistoscopeSeedRows();

  assert.equal(rows.length, 193);
  assert.deepEqual(
    Object.fromEntries(
      Object.entries(
        rows.reduce((acc, row) => {
          acc[row.level] = (acc[row.level] || 0) + 1;
          return acc;
        }, {}),
      ).sort((left, right) => Number(left[0]) - Number(right[0])),
    ),
    {
      1: 8,
      2: 12,
      3: 18,
      4: 20,
      5: 20,
      6: 16,
      7: 14,
      8: 18,
      9: 12,
      10: 11,
      11: 11,
      12: 10,
      13: 8,
      14: 7,
      15: 8,
    },
  );
});

test("engine shape donusumu statik havuzla birebir uyumludur", () => {
  const rows = buildTachistoscopeSeedRows();
  const wordsByLevel = toTachistoscopeWordsByLevel(rows);

  assert.deepEqual(wordsByLevel, TACHISTOSCOPE_WORDS_BY_LEVEL);
});

test("Turkce normalizasyonu NFC, whitespace ve tr-TR lowercase anahtarlarini korur", () => {
  assert.equal(normalizeTachistoscopeText("  go\u0308ru\u0308\u015F   "), "görüş");
  assert.equal(normalizeTachistoscopeWord("  Öğrenci  "), "Öğrenci");
  assert.equal(buildTachistoscopeNormalizedKey("I"), "ı");
  assert.equal(buildTachistoscopeNormalizedKey("İ"), "i");
  assert.equal(buildTachistoscopeNormalizedKey("ı"), "ı");
  assert.equal(buildTachistoscopeNormalizedKey("i"), "i");
});

test("mojibake ve gecersiz karakterler reddedilir", () => {
  assert.equal(normalizeTachistoscopeText("gÃ¶z"), null);
  assert.equal(normalizeTachistoscopeWord("göz1"), null);
  assert.equal(buildTachistoscopeNormalizedKey("göz1"), null);
});

test("repository database rows'u engine shape'ine cevirir", async () => {
  const supabase = createMockSupabase(
    withIds(
      buildTachistoscopeSeedRows().map((row) => ({
        ...row,
        created_at: "2026-07-29T00:00:00.000Z",
        updated_at: "2026-07-29T00:00:00.000Z",
      })),
    ),
  );

  const result = await loadTachistoscopeWords(supabase);

  assert.equal(supabase.calls.from[0], "tachistoscope_words");
  assert.deepEqual(supabase.calls.eq[0], { column: "is_active", value: true });
  assert.equal(result.source, "database");
  assert.equal(result.databaseRowCount, 193);
  assert.deepEqual(result.wordsByLevel, TACHISTOSCOPE_WORDS_BY_LEVEL);
  assert.deepEqual(result.sourceByLevel, {
    1: "database",
    2: "database",
    3: "database",
    4: "database",
    5: "database",
    6: "database",
    7: "database",
    8: "database",
    9: "database",
    10: "database",
    11: "database",
    12: "database",
    13: "database",
    14: "database",
    15: "database",
  });
});

test("service-role baglantisi yoksa static fallback calisir", async () => {
  const result = await loadTachistoscopeWords(null);

  assert.equal(result.source, "static");
  assert.equal(result.databaseRowCount, 0);
  assert.equal(result.fallbackReasons[0], "service-role-client-unavailable");
  assert.deepEqual(result.wordsByLevel, TACHISTOSCOPE_WORDS_BY_LEVEL);
});

test("database sorgu hatasinda static fallback calisir", async () => {
  const supabase = createMockSupabase([], { error: { code: "500", message: "db down" } });
  const result = await loadTachistoscopeWords(supabase);

  assert.equal(result.source, "static");
  assert.equal(result.fallbackReasons[0], "database-query-error");
  assert.deepEqual(result.wordsByLevel, TACHISTOSCOPE_WORDS_BY_LEVEL);
});

test("duplicate key bulunan level static fallback'a duser", async () => {
  const rows = withIds([
    {
      level: 4,
      word: "Masa",
      normalized_key: "masa",
      is_active: true,
      sort_order: 0,
    },
    {
      level: 4,
      word: "masa",
      normalized_key: "masa",
      is_active: true,
      sort_order: 1,
    },
    {
      level: 5,
      word: "kalem",
      normalized_key: "kalem",
      is_active: true,
      sort_order: 0,
    },
  ]);
  const supabase = createMockSupabase(rows);

  const result = await loadTachistoscopeWords(supabase);

  assert.equal(result.source, "mixed");
  assert.equal(result.sourceByLevel[4], "static");
  assert.equal(result.sourceByLevel[5], "database");
  assert.equal(result.fallbackReasons.includes("database-duplicate-key"), true);
  assert.deepEqual(result.wordsByLevel[4], TACHISTOSCOPE_WORDS_BY_LEVEL[4]);
});

test("gecersiz row sadece ilgili level'i static fallback'a duserur", async () => {
  const rows = withIds([
    {
      level: 7,
      word: "öğrenci",
      normalized_key: "öğrenci",
      is_active: true,
      sort_order: 0,
    },
    {
      level: 8,
      word: "göz1",
      normalized_key: "göz1",
      is_active: true,
      sort_order: 0,
    },
  ]);
  const supabase = createMockSupabase(rows);

  const result = await loadTachistoscopeWords(supabase);

  assert.equal(result.source, "mixed");
  assert.equal(result.sourceByLevel[7], "database");
  assert.equal(result.sourceByLevel[8], "static");
  assert.equal(result.fallbackReasons.includes("database-invalid-row"), true);
  assert.deepEqual(result.wordsByLevel[8], TACHISTOSCOPE_WORDS_BY_LEVEL[8]);
});

test("migration sql yeni tablo, constraint, trigger, RLS ve idempotent seed icerir", async () => {
  const sql = await readFile(
    new URL("../supabase/migrations/20260729120000_create_tachistoscope_words.sql", import.meta.url),
    "utf8",
  );

  assert.match(sql, /create table if not exists public\.tachistoscope_words/);
  assert.match(sql, /constraint tachistoscope_words_level_check/);
  assert.match(sql, /constraint tachistoscope_words_word_check/);
  assert.match(sql, /constraint tachistoscope_words_level_normalized_key_unique/);
  assert.match(sql, /create index if not exists tachistoscope_words_level_active_sort_idx/);
  assert.match(sql, /alter table public\.tachistoscope_words enable row level security/);
  assert.match(sql, /alter table public\.tachistoscope_words force row level security/);
  assert.match(sql, /grant select, insert, update, delete on public\.tachistoscope_words to service_role/);
  assert.match(sql, /with seed_rows\(level, word, sort_order\) as \(/);
  assert.match(sql, /on conflict \(level, normalized_key\) do update/);
});
