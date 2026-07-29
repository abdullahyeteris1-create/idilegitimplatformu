import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

import { SIMILAR_WORD_POOLS } from "../src/lib/data/similarWordPools.ts";
import { createSimilarWordsSession } from "../src/lib/exercise-engine/similarWords.ts";
import {
  buildSimilarWordPoolNormalizedKey,
  bulkCreateSimilarWordPools,
  createSimilarWordPool,
  deleteSimilarWordPool,
  listSimilarWordPoolsForTeacher,
  loadSimilarWordPools,
  normalizeSimilarWordPoolText,
  normalizeSimilarWordPoolWord,
  setSimilarWordPoolActive,
  toSimilarWordPools,
  updateSimilarWordPool,
} from "../src/lib/similar-word-pools/similarWordPoolsRepository.ts";
import {
  buildSimilarWordPoolBulkPreview,
  validateSimilarWordPoolDraft,
} from "../src/lib/similar-word-pools/similarWordPoolsShared.ts";

function withIds(rows) {
  return rows.map((row, index) => ({
    id: row.id ?? `row-${index + 1}`,
    ...row,
  }));
}

function createMockSupabase(initialRows = []) {
  let rows = initialRows.map((row) => ({ ...row }));
  const calls = {
    from: [],
    select: [],
    eq: [],
    neq: [],
    order: [],
    insert: [],
    update: [],
    delete: [],
  };

  function applyFilters(sourceRows, filters) {
    return sourceRows.filter((row) =>
      filters.every((filter) => {
        if (filter.kind === "eq") {
          return row[filter.column] === filter.value;
        }

        if (filter.kind === "neq") {
          return row[filter.column] !== filter.value;
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
      mode: "read",
      filters: [],
      orders: [],
      limitCount: null,
      insertPayload: null,
      updatePayload: null,
    };

    function execute() {
      if (state.mode === "insert") {
        const payloads = Array.isArray(state.insertPayload) ? state.insertPayload : [state.insertPayload];
        const inserted = payloads.map((payload, index) => ({
          id: payload.id ?? `inserted-${rows.length + index + 1}`,
          created_at: payload.created_at ?? "2026-07-29T00:00:00.000Z",
          updated_at: payload.updated_at ?? "2026-07-29T00:00:00.000Z",
          ...payload,
        }));
        rows = [...rows, ...inserted];
        return { data: inserted, error: null };
      }

      if (state.mode === "update") {
        const updatedRows = [];
        rows = rows.map((row) => {
          const matches = applyFilters([row], state.filters).length === 1;
          if (!matches) {
            return row;
          }

          const nextRow = {
            ...row,
            ...state.updatePayload,
            updated_at: state.updatePayload.updated_at ?? "2026-07-29T00:00:00.000Z",
          };
          updatedRows.push(nextRow);
          return nextRow;
        });

        return { data: updatedRows, error: null };
      }

      if (state.mode === "delete") {
        const deletedRows = applyFilters(rows, state.filters);
        rows = rows.filter((row) => !deletedRows.includes(row));
        return { data: deletedRows, error: null };
      }

      let resultRows = applyFilters(rows, state.filters);
      resultRows = applyOrder(resultRows, state.orders);
      if (typeof state.limitCount === "number") {
        resultRows = resultRows.slice(0, state.limitCount);
      }
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
      neq(column, value) {
        calls.neq.push({ column, value });
        state.filters.push({ kind: "neq", column, value });
        return query;
      },
      order(column, options) {
        calls.order.push({ column, options });
        state.orders.push({ column, ascending: options?.ascending !== false });
        return query;
      },
      limit(count) {
        state.limitCount = count;
        return query;
      },
      insert(payload) {
        calls.insert.push(payload);
        state.mode = "insert";
        state.insertPayload = payload;
        return query;
      },
      update(payload) {
        calls.update.push(payload);
        state.mode = "update";
        state.updatePayload = payload;
        return query;
      },
      delete() {
        calls.delete.push(true);
        state.mode = "delete";
        return query;
      },
      maybeSingle() {
        return Promise.resolve(execute()).then(({ data, error }) => ({
          data: Array.isArray(data) ? data[0] ?? null : data ?? null,
          error,
        }));
      },
      single() {
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
    getRows() {
      return rows.map((row) => ({ ...row }));
    },
    from(table) {
      calls.from.push(table);
      return createQuery();
    },
  };
}

test("normalization NFC ve whitespace temizliği yapar", () => {
  assert.equal(normalizeSimilarWordPoolText("  go\u0308ru\u0308ş   kelime  "), "görüş kelime");
});

test("tr-TR lowercase I/İ/ı/i ayrımını korur", () => {
  assert.equal(normalizeSimilarWordPoolWord("I"), "I");
  assert.equal(normalizeSimilarWordPoolWord("İ"), "İ");
  assert.equal("I".toLocaleLowerCase("tr-TR"), "ı");
  assert.equal("İ".toLocaleLowerCase("tr-TR"), "i");
  assert.equal("ı".toLocaleLowerCase("tr-TR"), "ı");
  assert.equal("i".toLocaleLowerCase("tr-TR"), "i");
});

test("boş içerik reddedilir", () => {
  assert.equal(normalizeSimilarWordPoolWord("   "), null);
});

test("mojibake karakterler reddedilir", () => {
  assert.equal(normalizeSimilarWordPoolText("gÃ¶z"), null);
  assert.equal(normalizeSimilarWordPoolWord("ÃÅŸehir"), null);
});

test("canonical normalized key için variant sırası fark etmez", () => {
  const left = buildSimilarWordPoolNormalizedKey("masa", ["nasa", "masa"]);
  const right = buildSimilarWordPoolNormalizedKey("masa", ["masa", "nasa"]);

  assert.equal(left, "masa::masa::nasa");
  assert.equal(left, right);
});

test("duplicate çift içeren kayıtlar seed'e aynen taşınır", () => {
  const staticSeedRows = withIds(
    Object.entries(SIMILAR_WORD_POOLS).flatMap(([difficulty, templates]) =>
      templates.map((template, index) => ({
        difficulty,
        base_word: template.base,
        variants: template.variants,
        normalized_key: buildSimilarWordPoolNormalizedKey(template.base, template.variants),
        is_active: true,
        sort_order: index,
      })),
    ),
  );

  const panelRow = staticSeedRows.find((row) => row.difficulty === "medium" && row.base_word === "panel");

  assert.ok(panelRow);
  assert.deepEqual(panelRow.variants, ["panel", "panel"]);
  assert.equal(panelRow.normalized_key, "panel::panel::panel");
});

test("seed kayıt sayısı ve difficulty dağılımı static havuzla uyumludur", () => {
  const rows = Object.entries(SIMILAR_WORD_POOLS).flatMap(([difficulty, templates]) =>
    templates.map((template, index) => ({
      difficulty,
      base_word: template.base,
      variants: template.variants,
      normalized_key: buildSimilarWordPoolNormalizedKey(template.base, template.variants),
      is_active: true,
      sort_order: index,
    })),
  );

  assert.equal(rows.length, 34);
  assert.equal(rows.filter((row) => row.difficulty === "easy").length, 10);
  assert.equal(rows.filter((row) => row.difficulty === "medium").length, 12);
  assert.equal(rows.filter((row) => row.difficulty === "hard").length, 12);
});

test("toSimilarWordPools engine shape'ini korur", () => {
  const seedRows = Object.entries(SIMILAR_WORD_POOLS).flatMap(([difficulty, templates]) =>
    templates.map((template, index) => ({
      difficulty,
      base_word: template.base,
      variants: template.variants,
      normalized_key: buildSimilarWordPoolNormalizedKey(template.base, template.variants),
      is_active: true,
      sort_order: index,
    })),
  );
  const pools = toSimilarWordPools(seedRows);

  assert.deepEqual(Object.keys(pools).sort(), ["easy", "hard", "medium"]);
  assert.deepEqual(pools.easy[0], SIMILAR_WORD_POOLS.easy[0]);
  assert.deepEqual(pools.medium[2], SIMILAR_WORD_POOLS.medium[2]);
});

test("repository DTO shape'i database rows'dan engine shape'ine çevrilir", async () => {
  const seedRows = withIds(
    Object.entries(SIMILAR_WORD_POOLS).flatMap(([difficulty, templates]) =>
      templates.map((template, index) => ({
        difficulty,
        base_word: template.base,
        variants: template.variants,
        normalized_key: buildSimilarWordPoolNormalizedKey(template.base, template.variants),
        is_active: true,
        sort_order: index,
      })),
    ),
  );
  const supabase = createMockSupabase(seedRows);

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

test("DB unavailable durumunda static fallback çalışır", async () => {
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

test("query hatası durumunda static fallback çalışır", async () => {
  const supabase = createMockSupabase([]);
  supabase.from = () => ({
    select() {
      return this;
    },
    eq() {
      return this;
    },
    order() {
      return this;
    },
    then(resolve) {
      return resolve({ data: null, error: { code: "500", message: "db down" } });
    },
  });

  const result = await loadSimilarWordPools(supabase);

  assert.equal(result.source, "static");
  assert.equal(result.fallbackReasons[0], "database-query-error");
  assert.deepEqual(result.pools, SIMILAR_WORD_POOLS);
});

test("teacher list stored rows'ı döndürür", async () => {
  const rows = withIds([
    {
      difficulty: "easy",
      base_word: "masa",
      variants: ["masa", "nasa"],
      normalized_key: "masa::masa::nasa",
      is_active: true,
      sort_order: 0,
    },
    {
      difficulty: "hard",
      base_word: "tekrarlama",
      variants: ["tekrarIama", "tekrarlama"],
      normalized_key: "tekrarlama::tekrarıama::tekrarlama",
      is_active: false,
      sort_order: 5,
    },
  ]);
  const supabase = createMockSupabase(rows);

  const result = await listSimilarWordPoolsForTeacher(supabase);

  assert.equal(result.ok, true);
  if (result.ok) {
    assert.equal(result.items.length, 2);
    assert.equal(result.summary.total, 2);
    assert.equal(result.summary.active, 1);
    assert.equal(result.summary.passive, 1);
    assert.equal(result.items[0].difficultyLabel, "Kolay");
  }
});

test("createSimilarWordPool duplicate anahtarları reddeder", async () => {
  const supabase = createMockSupabase(
    withIds([
      {
        difficulty: "easy",
        base_word: "masa",
        variants: ["masa", "nasa"],
        normalized_key: "masa::masa::nasa",
        is_active: true,
        sort_order: 0,
      },
    ]),
  );

  const result = await createSimilarWordPool(
    {
      difficulty: "easy",
      baseWord: "masa",
      variantsText: "nasa, masa",
      isActive: true,
      sortOrder: 1,
    },
    supabase,
  );

  assert.equal(result.ok, false);
  if (!result.ok) {
    assert.match(result.message, /zorluk seviyesinde bir kayıt zaten var/);
  }
});

test("updateSimilarWordPool mevcut kaydı günceller", async () => {
  const supabase = createMockSupabase(
    withIds([
      {
        difficulty: "easy",
        base_word: "masa",
        variants: ["masa", "nasa"],
        normalized_key: "masa::masa::nasa",
        is_active: true,
        sort_order: 0,
      },
    ]),
  );

  const result = await updateSimilarWordPool(
    "row-1",
    {
      difficulty: "medium",
      baseWord: "panel",
      variantsText: "panel, panal",
      isActive: false,
      sortOrder: 7,
    },
    supabase,
  );

  assert.equal(result.ok, true);
  if (result.ok) {
    assert.equal(result.value.difficulty, "medium");
    assert.equal(result.value.is_active, false);
    assert.equal(result.value.sort_order, 7);
  }
});

test("setSimilarWordPoolActive ve deleteSimilarWordPool çalışır", async () => {
  const supabase = createMockSupabase(
    withIds([
      {
        difficulty: "easy",
        base_word: "masa",
        variants: ["masa", "nasa"],
        normalized_key: "masa::masa::nasa",
        is_active: true,
        sort_order: 0,
      },
    ]),
  );

  const toggleResult = await setSimilarWordPoolActive("row-1", false, supabase);
  assert.equal(toggleResult.ok, true);
  if (toggleResult.ok) {
    assert.equal(toggleResult.value.is_active, false);
  }

  const deleteResult = await deleteSimilarWordPool("row-1", supabase);
  assert.equal(deleteResult.ok, true);
  assert.equal(supabase.getRows().length, 0);
});

test("bulkCreateSimilarWordPools geçerli satırları toplu ekler", async () => {
  const supabase = createMockSupabase([]);
  const result = await bulkCreateSimilarWordPools(
    [
      "easy | masa | nasa, masa",
      "medium | panel | panel, panel",
      "medium | panel | panel, panel",
      "hard | tekrarlama | tekrarIama, tekrarlama",
    ].join("\n"),
    supabase,
  );

  assert.equal(result.ok, true);
  if (result.ok) {
    assert.equal(result.value.insertedCount, 3);
    assert.equal(result.value.duplicateCount, 1);
    assert.equal(result.value.invalidCount, 0);
    assert.equal(result.value.skippedCount, 1);
    assert.equal(supabase.getRows().length, 3);
  }
});

test("bulk önizleme same-file duplicate'ları işaretler", () => {
  const preview = buildSimilarWordPoolBulkPreview(
    [
      "easy | masa | nasa, masa",
      "easy | masa | masa, nasa",
      "hard | tekrarlama | tekrarIama, tekrarlama",
    ].join("\n"),
  );

  assert.equal(preview.rows.length, 3);
  assert.equal(preview.duplicateRows.length, 1);
  assert.equal(preview.validRows.length, 2);
  assert.equal(preview.invalidRows.length, 0);
});

test("draft validation Turkish normalization ve duplicate kontrolü yapar", () => {
  const result = validateSimilarWordPoolDraft({
    difficulty: "easy",
    baseWord: "  Masa ",
    variantsText: "nasa, masa",
    isActive: true,
    sortOrder: 1,
  });

  assert.equal(result.ok, true);
  if (result.ok) {
    assert.equal(result.value.baseWord, "Masa");
    assert.equal(result.value.normalizedKey, "masa::masa::nasa");
  }
});

test("teacher route ve action dosyaları korumalı akışı kullanır", async () => {
  const routeSource = await readFile(
    new URL("../src/app/ogretmen/icerik-yonetimi/benzer-kelimeler/page.tsx", import.meta.url),
    "utf8",
  );
  const actionSource = await readFile(
    new URL("../src/app/ogretmen/icerik-yonetimi/benzer-kelimeler/actions.ts", import.meta.url),
    "utf8",
  );
  const moduleSource = await readFile(
    new URL("../src/lib/content-management/modules.ts", import.meta.url),
    "utf8",
  );

  assert.match(routeSource, /requireTeacherSession\(\)/);
  assert.match(routeSource, /SimilarWordPoolsClient/);
  assert.match(actionSource, /\/ogretmen\/icerik-yonetimi\/benzer-kelimeler/);
  assert.match(actionSource, /revalidatePath\(LIST_ROUTE\)/);
  assert.match(actionSource, /requireTeacherSession\(\)/);
  assert.match(moduleSource, /href: "\/ogretmen\/icerik-yonetimi\/benzer-kelimeler"/);
  assert.match(moduleSource, /status: "linked"/);
});

test("migration sql yeni tablo, constraint, trigger ve idempotent seed içerir", async () => {
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
  assert.match(sql, /tekrarlama::tekrarıama::tekrarlama/);
});

test("similar words engine mevcut static davranış regresyonunu korur", () => {
  const session = createSimilarWordsSession({ difficulty: "easy", durationSeconds: 60 });

  assert.equal(session.config.difficulty, "easy");
  assert.equal(session.config.durationSeconds, 60);
  assert.equal(session.pairs.length, 12);
  assert.ok(session.pairs.every((pair) => typeof pair.id === "string"));
  assert.ok(session.pairs.every((pair) => typeof pair.leftWord === "string"));
  assert.ok(session.pairs.every((pair) => typeof pair.rightWord === "string"));
  assert.ok(session.pairs.every((pair) => typeof pair.isDifferent === "boolean"));
});
