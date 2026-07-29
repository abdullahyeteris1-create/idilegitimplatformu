import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

import {
  buildTwoSideFocusBulkPreview,
  buildTwoSideFocusNormalizedKey,
  createTwoSideFocusTeacherSummary,
  filterTwoSideFocusTeacherItems,
  normalizeTwoSideFocusText,
  normalizeTwoSideFocusWord,
  validateTwoSideFocusTeacherDraft,
} from "../src/lib/two-side-focus/twoSideFocusCrud.ts";
import {
  bulkCreateTwoSideFocusWordSets,
  createTwoSideFocusWordSet,
  deleteTwoSideFocusWordSet,
  listTwoSideFocusWordSetsForTeacher,
  setTwoSideFocusWordSetActive,
  updateTwoSideFocusWordSet,
} from "../src/lib/two-side-focus/twoSideFocusTeacherRepository.ts";

function withIds(rows) {
  return rows.map((row, index) => ({
    ...row,
    id: row.id ?? `row-${index + 1}`,
    created_at: row.created_at ?? "2026-07-29T00:00:00.000Z",
    updated_at: row.updated_at ?? "2026-07-29T00:00:00.000Z",
  }));
}

function createMockSupabase(initialRows = [], options = {}) {
  let rows = initialRows.map((row) => ({ ...row }));
  const calls = {
    from: [],
    select: [],
    eq: [],
    neq: [],
    order: [],
    limit: [],
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

  function execute(state) {
    if (options.error) {
      return { data: null, error: options.error };
    }

    if (state.mode === "insert") {
      const payloads = Array.isArray(state.payload) ? state.payload : [state.payload];
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
          ...state.payload,
          updated_at: state.payload.updated_at ?? "2026-07-29T00:00:00.000Z",
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

  function createQuery() {
    const state = {
      mode: "read",
      filters: [],
      orders: [],
      limitCount: null,
      payload: null,
    };

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
        calls.limit.push(count);
        state.limitCount = count;
        return query;
      },
      insert(payload) {
        calls.insert.push(payload);
        state.mode = "insert";
        state.payload = payload;
        return query;
      },
      update(payload) {
        calls.update.push(payload);
        state.mode = "update";
        state.payload = payload;
        return query;
      },
      delete() {
        calls.delete.push(true);
        state.mode = "delete";
        return query;
      },
      maybeSingle() {
        return Promise.resolve(execute(state)).then(({ data, error }) => ({
          data: Array.isArray(data) ? data[0] ?? null : data ?? null,
          error,
        }));
      },
      single() {
        return Promise.resolve(execute(state)).then(({ data, error }) => ({
          data: Array.isArray(data) ? data[0] ?? null : data ?? null,
          error,
        }));
      },
      then(resolve, reject) {
        return Promise.resolve(execute(state)).then(resolve, reject);
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

function makeRows() {
  return withIds([
    {
      base_word: "ayna",
      variants: ["sol", "sağ", "orta"],
      normalized_key: "ayna|orta|sağ|sol",
      is_active: true,
      sort_order: 0,
    },
    {
      base_word: "denge",
      variants: ["tut", "bırak", "koru"],
      normalized_key: "denge|bırak|koru|tut",
      is_active: false,
      sort_order: 1,
    },
  ]);
}

test("1) normalizeTwoSideFocusText ve normalizeTwoSideFocusWord Turkish karakterleri korur", () => {
  assert.equal(normalizeTwoSideFocusText("  Çalışma  "), "Çalışma");
  assert.equal(normalizeTwoSideFocusWord("  Öğrenci  "), "Öğrenci");
  assert.equal(buildTwoSideFocusNormalizedKey("I", ["İ", "K", "L"]), "ı|i|k|l");
  assert.equal("I".toLocaleLowerCase("tr-TR"), "ı");
  assert.equal("İ".toLocaleLowerCase("tr-TR"), "i");
  assert.equal("ı".toLocaleLowerCase("tr-TR"), "ı");
  assert.equal("i".toLocaleLowerCase("tr-TR"), "i");
});

test("2) validateTwoSideFocusTeacherDraft trim, normalization ve bozuk veri reddi yapar", () => {
  const result = validateTwoSideFocusTeacherDraft({
    baseWord: "  ayna ",
    variantOne: " sol ",
    variantTwo: "sağ",
    variantThree: "orta",
    isActive: true,
    sortOrder: " 7 ",
  });

  assert.equal(result.ok, true);
  if (result.ok) {
    assert.equal(result.value.baseWord, "ayna");
    assert.equal(result.value.variants.join(","), "sol,sağ,orta");
    assert.equal(result.value.normalizedKey, "ayna|orta|sağ|sol");
    assert.equal(result.value.sortOrder, 7);
  }

  const invalid = validateTwoSideFocusTeacherDraft({
    baseWord: "gÃ¶z",
    variantOne: "sol",
    variantTwo: "sağ",
    variantThree: "orta",
    isActive: true,
    sortOrder: 0,
  });
  assert.equal(invalid.ok, false);
});

test("3) buildTwoSideFocusBulkPreview valid, duplicate ve invalid satirları ayırır", () => {
  const preview = buildTwoSideFocusBulkPreview(
    ["ayna | sol, sağ, orta", "ayna | sol, sağ, orta", "bozukÃ§ | sağ, sol, orta"].join("\n"),
    ["ayna|orta|sağ|sol"],
  );

  assert.equal(preview.rows.length, 3);
  assert.equal(preview.validRows.length, 0);
  assert.equal(preview.duplicateRows.length, 2);
  assert.equal(preview.invalidRows.length, 1);
});

test("4) filterTwoSideFocusTeacherItems arama ve durum filtresi uygular", () => {
  const filtered = filterTwoSideFocusTeacherItems(makeRows(), {
    searchTerm: "denge",
    statusFilter: "passive",
  });

  assert.equal(filtered.length, 1);
  assert.equal(filtered[0].base_word, "denge");
});

test("5) listTwoSideFocusWordSetsForTeacher kayıtları summary ile döndürür", async () => {
  const supabase = createMockSupabase(makeRows());
  const result = await listTwoSideFocusWordSetsForTeacher(supabase);

  assert.equal(result.ok, true);
  if (result.ok) {
    assert.equal(result.items.length, 2);
    assert.deepEqual(result.summary, createTwoSideFocusTeacherSummary(result.items));
    assert.equal(result.summary.total, 2);
    assert.equal(result.summary.active, 1);
    assert.equal(result.summary.passive, 1);
  }
});

test("6) createTwoSideFocusWordSet yeni kayıt ekler ve duplicate'i reddeder", async () => {
  const supabase = createMockSupabase(makeRows());
  const created = await createTwoSideFocusWordSet(
    {
      baseWord: "kare",
      variantOne: "sol",
      variantTwo: "sağ",
      variantThree: "orta",
      isActive: true,
      sortOrder: 2,
    },
    supabase,
  );

  assert.equal(created.ok, true);
  assert.equal(supabase.calls.insert.length, 1);

  const duplicate = await createTwoSideFocusWordSet(
    {
      baseWord: "ayna",
      variantOne: "sol",
      variantTwo: "sağ",
      variantThree: "orta",
      isActive: true,
      sortOrder: 3,
    },
    supabase,
  );

  assert.equal(duplicate.ok, false);
  if (!duplicate.ok) {
    assert.match(duplicate.message, /zaten var/);
  }
});

test("7) update, toggle ve delete işlemleri server-side çalışır", async () => {
  const supabase = createMockSupabase(makeRows());

  const updateResult = await updateTwoSideFocusWordSet(
    "row-1",
    {
      baseWord: "ayna",
      variantOne: "sağ",
      variantTwo: "sol",
      variantThree: "orta",
      isActive: false,
      sortOrder: 5,
    },
    supabase,
  );
  assert.equal(updateResult.ok, true);

  const toggleResult = await setTwoSideFocusWordSetActive("row-1", false, supabase);
  assert.equal(toggleResult.ok, true);

  const deleteResult = await deleteTwoSideFocusWordSet("row-2", supabase);
  assert.equal(deleteResult.ok, true);
  assert.equal(supabase.getRows().length, 1);
});

test("8) bulkCreateTwoSideFocusWordSets önizleme ve duplicate sayımı yapar", async () => {
  const supabase = createMockSupabase(makeRows());
  const result = await bulkCreateTwoSideFocusWordSets(
    ["yol | sağ, sol, orta", "ayna | sol, sağ, orta", "bozuk | sağ, sol"].join("\n"),
    supabase,
  );

  assert.equal(result.ok, true);
  if (result.ok) {
    assert.equal(result.value.invalidCount, 1);
    assert.equal(result.value.duplicateCount, 1);
    assert.equal(result.value.insertedCount, 1);
    assert.equal(result.value.items.length, 1);
  }
});

test("9) route, action, client ve module sınırları korunur", async () => {
  const pageSource = await readFile(
    new URL("../src/app/ogretmen/icerik-yonetimi/cift-tarafli-odak/page.tsx", import.meta.url),
    "utf8",
  );
  const actionSource = await readFile(
    new URL("../src/app/ogretmen/icerik-yonetimi/cift-tarafli-odak/actions.ts", import.meta.url),
    "utf8",
  );
  const clientSource = await readFile(
    new URL("../src/app/ogretmen/icerik-yonetimi/cift-tarafli-odak/TwoSideFocusAdminClient.tsx", import.meta.url),
    "utf8",
  );
  const modulesSource = await readFile(new URL("../src/lib/content-management/modules.ts", import.meta.url), "utf8");

  assert.match(pageSource, /requireTeacherSession\(\)/);
  assert.match(actionSource, /requireTeacherSession\(\)/);
  assert.match(actionSource, /revalidatePath\(LIST_ROUTE\)/);
  assert.match(clientSource, /buildTwoSideFocusBulkPreview/);
  assert.doesNotMatch(clientSource, /getSupabaseServiceRoleClient/);
  assert.doesNotMatch(clientSource, /twoSideFocusTeacherRepository/);
  assert.match(modulesSource, /\/ogretmen\/icerik-yonetimi\/cift-tarafli-odak/);
  assert.match(modulesSource, /status: "linked"/);
});
