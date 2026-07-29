import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

import { TWO_SIDE_FOCUS_WORD_SETS } from "../src/lib/two-side-focus/twoSideFocusStaticData.ts";
import {
  buildTwoSideFocusNormalizedKey,
  buildTwoSideFocusSeedRows,
  loadTwoSideFocusWordSets,
  normalizeTwoSideFocusText,
  normalizeTwoSideFocusWord,
  toTwoSideFocusWordSets,
  validateTwoSideFocusWordSetDraft,
} from "../src/lib/two-side-focus/twoSideFocusRepository.ts";
import { TWO_SIDE_FOCUS_WORDS } from "../src/lib/data/twoSideFocusWords.ts";

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

  function applyFilters(sourceRows, filters) {
    return sourceRows.filter((row) =>
      filters.every((filter) => {
        if (filter.kind === "eq") {
          return row[filter.column] === filter.value;
        }

        return true;
      }),
    );
  }

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
      resultRows = applyFilters(resultRows, state.filters);
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

function getSeedTupleLines(rows) {
  return rows.map((row) =>
    `(${[
      `'${row.base_word.replace(/'/g, "''")}'`,
      `'${JSON.stringify(row.variants).replace(/'/g, "''")}'::jsonb`,
      `'${row.normalized_key.replace(/'/g, "''")}'`,
      "true",
      row.sort_order,
    ].join(", ")})`,
  );
}

test("static fallback havuzu 28 set ve 84 variant içeriyor", () => {
  const seedRows = buildTwoSideFocusSeedRows();

  assert.equal(TWO_SIDE_FOCUS_WORD_SETS.length, 28);
  assert.equal(seedRows.length, 28);
  assert.equal(seedRows.reduce((sum, row) => sum + row.variants.length, 0), 84);
  assert.ok(seedRows.every((row) => row.variants.length === 3));
});

test("static source ve seed birebir eşleşiyor", () => {
  const seedRows = buildTwoSideFocusSeedRows();

  assert.deepEqual(toTwoSideFocusWordSets(seedRows), TWO_SIDE_FOCUS_WORD_SETS);
});

test("tüm kayıtlar geçerli ve duplicate / normalized duplicate üretmiyor", () => {
  const seedRows = buildTwoSideFocusSeedRows();
  const seenKeys = new Set();
  const exactKeys = new Set(seedRows.map((row) => JSON.stringify({
    base_word: row.base_word,
    variants: row.variants,
  })));

  for (const row of seedRows) {
    const normalizedKey = buildTwoSideFocusNormalizedKey(row.base_word, row.variants);
    assert.equal(normalizedKey, row.normalized_key);
    assert.ok(!seenKeys.has(normalizedKey), `duplicate normalized_key bulundu: ${normalizedKey}`);
    seenKeys.add(normalizedKey);
  }

  assert.equal(exactKeys.size, seedRows.length, "exact duplicate bulunmamalı");
});

test("Turkce normalizasyonu NFC ve tr-TR lowercase ile calisiyor", () => {
  assert.equal(normalizeTwoSideFocusText("  go\u0308ru\u0308ş kelime  "), "görüş kelime");
  assert.equal(normalizeTwoSideFocusWord("  Öğrenci  "), "Öğrenci");
  assert.equal(buildTwoSideFocusNormalizedKey("I", ["İ"]), "ı|i");
  assert.equal(buildTwoSideFocusNormalizedKey("İ", ["I"]), "i|ı");
  assert.equal("I".toLocaleLowerCase("tr-TR"), "ı");
  assert.equal("İ".toLocaleLowerCase("tr-TR"), "i");
  assert.equal("ı".toLocaleLowerCase("tr-TR"), "ı");
  assert.equal("i".toLocaleLowerCase("tr-TR"), "i");
});

test("mojibake, boş base ve boş/duplicate variant reddediliyor", () => {
  assert.equal(normalizeTwoSideFocusText("gÃ¶z"), null);
  assert.equal(normalizeTwoSideFocusWord("gÃ§"), null);

  assert.equal(
    validateTwoSideFocusWordSetDraft({ baseWord: "   ", variants: ["kasa"] }).ok,
    false,
  );
  assert.equal(
    validateTwoSideFocusWordSetDraft({ baseWord: "masa", variants: ["   "] }).ok,
    false,
  );
  assert.equal(
    validateTwoSideFocusWordSetDraft({ baseWord: "masa", variants: ["kasa", "kasa", "musa"] }).ok,
    false,
  );
  assert.equal(
    validateTwoSideFocusWordSetDraft({ baseWord: "masa", variants: ["kasa", "masa"] }).ok,
    false,
  );
});

test("variant sırası normalized_key sonucunu değiştirmiyor", () => {
  const left = buildTwoSideFocusNormalizedKey("masa", ["musa", "kasa", "masal"]);
  const right = buildTwoSideFocusNormalizedKey("masa", ["masal", "kasa", "musa"]);

  assert.equal(left, right);
  assert.equal(left, "masa|kasa|masal|musa");
});

test("repository aktif kayıtları database'den okur ve student DTO metadata içermez", async () => {
  const seedRows = withIds(
    buildTwoSideFocusSeedRows().map((row) => ({
      ...row,
      created_at: "2026-07-29T00:00:00.000Z",
      updated_at: "2026-07-29T00:00:00.000Z",
    })),
  );
  const supabase = createMockSupabase(seedRows);

  const result = await loadTwoSideFocusWordSets(supabase);

  assert.equal(supabase.calls.from[0], "two_side_focus_word_sets");
  assert.deepEqual(supabase.calls.eq[0], { column: "is_active", value: true });
  assert.equal(result.source, "database");
  assert.equal(result.databaseRowCount, 28);
  assert.deepEqual(result.fallbackReasons, []);
  assert.deepEqual(result.wordSets, TWO_SIDE_FOCUS_WORD_SETS);
  assert.deepEqual(Object.keys(result.wordSets[0]).sort(), ["base", "variants"]);
});

test("pasif kayıtlar student DTO'ya girmez", async () => {
  const supabase = createMockSupabase([
    {
      id: "active-row",
      base_word: "masa",
      variants: ["kasa", "musa", "masal"],
      normalized_key: "masa|kasa|masal|musa",
      is_active: true,
      sort_order: 0,
      created_at: "2026-07-29T00:00:00.000Z",
      updated_at: "2026-07-29T00:00:00.000Z",
    },
    {
      id: "passive-row",
      base_word: "deniz",
      variants: ["beniz", "denir", "deniş"],
      normalized_key: "deniz|beniz|denir|deniş",
      is_active: false,
      sort_order: 1,
      created_at: "2026-07-29T00:00:00.000Z",
      updated_at: "2026-07-29T00:00:00.000Z",
    },
  ]);

  const result = await loadTwoSideFocusWordSets(supabase);

  assert.equal(result.source, "database");
  assert.deepEqual(result.wordSets, [{ base: "masa", variants: ["kasa", "musa", "masal"] }]);
});

test("database hatası ve boş sonuçta static fallback calisir", async () => {
  const errorResult = await loadTwoSideFocusWordSets(createMockSupabase([], { error: { code: "500", message: "db down" } }));
  assert.equal(errorResult.source, "static");
  assert.equal(errorResult.fallbackReasons[0], "database-query-error");
  assert.deepEqual(errorResult.wordSets, TWO_SIDE_FOCUS_WORD_SETS);

  const emptyResult = await loadTwoSideFocusWordSets(createMockSupabase([]));
  assert.equal(emptyResult.source, "static");
  assert.equal(emptyResult.fallbackReasons[0], "database-empty");
  assert.deepEqual(emptyResult.wordSets, TWO_SIDE_FOCUS_WORD_SETS);
});

test("invalid ve duplicate satirlar güvenli static fallback'a dusurur", async () => {
  const invalidResult = await loadTwoSideFocusWordSets(
    createMockSupabase([
      {
        id: "invalid",
        base_word: "masa1",
        variants: ["kasa", "musa", "masal"],
        normalized_key: "masa|kasa|masal|musa",
        is_active: true,
        sort_order: 0,
        created_at: "2026-07-29T00:00:00.000Z",
        updated_at: "2026-07-29T00:00:00.000Z",
      },
    ]),
  );
  assert.equal(invalidResult.source, "static");
  assert.equal(invalidResult.fallbackReasons[0], "database-invalid-row");

  const duplicateResult = await loadTwoSideFocusWordSets(
    createMockSupabase([
      {
        id: "row-1",
        base_word: "masa",
        variants: ["kasa", "musa", "masal"],
        normalized_key: "masa|kasa|masal|musa",
        is_active: true,
        sort_order: 0,
        created_at: "2026-07-29T00:00:00.000Z",
        updated_at: "2026-07-29T00:00:00.000Z",
      },
      {
        id: "row-2",
        base_word: "masa",
        variants: ["masal", "kasa", "musa"],
        normalized_key: "masa|kasa|masal|musa",
        is_active: true,
        sort_order: 1,
        created_at: "2026-07-29T00:00:00.000Z",
        updated_at: "2026-07-29T00:00:00.000Z",
      },
    ]),
  );
  assert.equal(duplicateResult.source, "static");
  assert.equal(duplicateResult.fallbackReasons[0], "database-duplicate-key");
  assert.deepEqual(duplicateResult.wordSets, TWO_SIDE_FOCUS_WORD_SETS);
});

test("client davranisi korunuyor ve repository client bundle'a girme potansiyeli taşımiyor", async () => {
  const source = await readFile(
    new URL("../src/app/egzersizler/cift-tarafli-odak/TwoSideFocusExerciseClient.tsx", import.meta.url),
    "utf8",
  );

  assert.doesNotMatch(source, /twoSideFocusStaticData/);
  assert.doesNotMatch(source, /loadTwoSideFocusWordSets/);
  assert.doesNotMatch(source, /getSupabaseServiceRoleClient/);
  assert.match(source, /const NET_TARGET = 10;/);
  assert.match(source, /type TwoSideFocusStudentWordSet = \{/);
  assert.match(source, /function createRound\(\s*level: ExerciseLevel,\s*wordSets: readonly TwoSideFocusStudentWordSet\[\],\s*\): RoundData \{/);
  assert.match(source, /export function TwoSideFocusExerciseClient\(\{\s*initialWordSets = \[\],\s*\}:/);
  assert.match(source, /function getWordCount\(level: ExerciseLevel\)/);
});

test("paralel kategori modeli degismedi", () => {
  assert.equal(Object.keys(TWO_SIDE_FOCUS_WORDS).length, 6);
  assert.equal(TWO_SIDE_FOCUS_WORDS.Genel.sameWords.length, 6);
  assert.equal(TWO_SIDE_FOCUS_WORDS.Ortaokul.similarPairs.length, 6);
});

test("migration seed sayisi 28 ve static source ile birebir uyumlu", async () => {
  const sql = await readFile(
    new URL("../supabase/migrations/20260729130000_create_two_side_focus_word_sets.sql", import.meta.url),
    "utf8",
  );
  const seedRows = buildTwoSideFocusSeedRows();
  const expectedTupleLines = getSeedTupleLines(seedRows);

  assert.match(sql, /create table if not exists public\.two_side_focus_word_sets/);
  assert.match(sql, /constraint two_side_focus_word_sets_normalized_key_unique/);
  assert.match(sql, /alter table public\.two_side_focus_word_sets enable row level security/);
  assert.match(sql, /grant select, insert, update, delete on public\.two_side_focus_word_sets to service_role/);
  assert.match(sql, /on conflict \(normalized_key\) do update/);

  const valuesBlock = sql.match(/values\s*([\s\S]*?)\s*on conflict/i);
  assert.ok(valuesBlock, "migration values bloğu bulunamadi");

  const tupleLines = valuesBlock[1]
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => line.replace(/,$/, ""));

  assert.equal(tupleLines.length, 28);
  assert.deepEqual(tupleLines, expectedTupleLines);
});
