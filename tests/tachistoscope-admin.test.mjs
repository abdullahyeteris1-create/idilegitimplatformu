import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

import { TACHISTOSCOPE_LEVELS } from "../src/lib/tachistoscope/tachistoscopeShared.ts";
import {
  buildTachistoscopeBulkPreview,
  buildTachistoscopeNormalizedKey,
  bulkCreateTachistoscopeWords,
  createTachistoscopeWord,
  deleteTachistoscopeWord,
  listTachistoscopeWordsForTeacher,
  normalizeTachistoscopeWord,
  setTachistoscopeWordActive,
  updateTachistoscopeWord,
  validateTachistoscopeDraft,
} from "../src/lib/tachistoscope/tachistoscopeRepository.ts";
import { filterTachistoscopeTeacherItems } from "../src/lib/tachistoscope/tachistoscopeShared.ts";

function withIds(rows) {
  return rows.map((row, index) => ({
    ...row,
    id: row.id ?? `row-${index + 1}`,
    created_at: row.created_at ?? "2026-07-29T00:00:00.000Z",
    updated_at: row.updated_at ?? "2026-07-29T00:00:00.000Z",
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
        calls.limit.push(count);
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

function makeTeacherRows() {
  return withIds([
    {
      level: 1,
      word: "a",
      normalized_key: "a",
      is_active: true,
      sort_order: 0,
    },
    {
      level: 3,
      word: "göz",
      normalized_key: "göz",
      is_active: false,
      sort_order: 1,
    },
    {
      level: 3,
      word: "kuş",
      normalized_key: "kuş",
      is_active: true,
      sort_order: 0,
    },
  ]);
}

test("1) normalizeTachistoscopeWord Turkish karakterleri korur", () => {
  assert.equal(TACHISTOSCOPE_LEVELS.length, 15);
  assert.equal(normalizeTachistoscopeWord("  Öğrenci  "), "Öğrenci");
  assert.equal(buildTachistoscopeNormalizedKey("I"), "ı");
  assert.equal(buildTachistoscopeNormalizedKey("İ"), "i");
});

test("2) validateTachistoscopeDraft boş ve bozuk girişleri reddeder", () => {
  const invalid = validateTachistoscopeDraft({ level: 2, word: "gÃ¶z", isActive: true });
  assert.equal(invalid.ok, false);
  if (!invalid.ok) {
    assert.ok(invalid.issues.length > 0);
  }
});

test("3) validateTachistoscopeDraft geçerli formu normalize eder", () => {
  const result = validateTachistoscopeDraft({ level: "3", word: "  Öğrenci ", isActive: false });
  assert.equal(result.ok, true);
  if (result.ok) {
    assert.equal(result.value.level, 3);
    assert.equal(result.value.word, "Öğrenci");
    assert.equal(result.value.normalizedKey, "öğrenci");
    assert.equal(result.value.isActive, false);
  }
});

test("4) buildTachistoscopeBulkPreview aynı level duplicate'larını ayırır", () => {
  const preview = buildTachistoscopeBulkPreview("masa\nmasa\ngöz", 4, ["4::masa"]);
  assert.equal(preview.rows.length, 3);
  assert.equal(preview.validRows.length, 1);
  assert.equal(preview.duplicateRows.length, 2);
  assert.equal(preview.invalidRows.length, 0);
});

test("5) buildTachistoscopeBulkPreview farklı level duplicate saymaz", () => {
  const preview = buildTachistoscopeBulkPreview("masa", 5, ["4::masa"]);
  assert.equal(preview.validRows.length, 1);
  assert.equal(preview.duplicateRows.length, 0);
});

test("6) listTachistoscopeWordsForTeacher kayıtları summary ile döndürür", async () => {
  const supabase = createMockSupabase(makeTeacherRows());
  const result = await listTachistoscopeWordsForTeacher(supabase);

  assert.equal(result.ok, true);
  if (result.ok) {
    assert.equal(result.items.length, 3);
    assert.equal(result.summary.total, 3);
    assert.equal(result.summary.active, 2);
    assert.equal(result.summary.passive, 1);
    assert.equal(result.summary.byLevel[3], 2);
  }
});

test("7) createTachistoscopeWord yeni kaydı ekler", async () => {
  const supabase = createMockSupabase(makeTeacherRows());
  const result = await createTachistoscopeWord({ level: 3, word: "çiçek", isActive: true }, supabase);

  assert.equal(result.ok, true);
  assert.equal(supabase.calls.insert.length, 1);
  assert.equal(supabase.getRows().length, 4);
});

test("8) createTachistoscopeWord aynı level duplicate'ını reddeder", async () => {
  const supabase = createMockSupabase(makeTeacherRows());
  const result = await createTachistoscopeWord({ level: 3, word: "kuş", isActive: true }, supabase);

  assert.equal(result.ok, false);
  if (!result.ok) {
    assert.match(result.message, /zaten var/);
  }
});

test("9) updateTachistoscopeWord kayıt günceller", async () => {
  const supabase = createMockSupabase(makeTeacherRows());
  const result = await updateTachistoscopeWord("row-2", { level: 3, word: "gün", isActive: true }, supabase);

  assert.equal(result.ok, true);
  assert.equal(supabase.calls.update.length, 1);
  const updated = supabase.getRows().find((row) => row.id === "row-2");
  assert.equal(updated.word, "gün");
  assert.equal(updated.is_active, true);
});

test("10) setTachistoscopeWordActive aktif/pasif değiştirir", async () => {
  const supabase = createMockSupabase(makeTeacherRows());
  const result = await setTachistoscopeWordActive("row-2", true, supabase);

  assert.equal(result.ok, true);
  const updated = supabase.getRows().find((row) => row.id === "row-2");
  assert.equal(updated.is_active, true);
});

test("11) deleteTachistoscopeWord kaydı siler", async () => {
  const supabase = createMockSupabase(makeTeacherRows());
  const result = await deleteTachistoscopeWord("row-2", supabase);

  assert.equal(result.ok, true);
  assert.equal(supabase.getRows().length, 2);
});

test("12) bulkCreateTachistoscopeWords geçerli satırları ekler", async () => {
  const supabase = createMockSupabase(makeTeacherRows());
  const result = await bulkCreateTachistoscopeWords(3, "masa\nöğrenci\nbozuk1", supabase);

  assert.equal(result.ok, true);
  if (result.ok) {
    assert.equal(result.value.insertedCount, 2);
    assert.equal(result.value.invalidCount, 1);
  }
});

test("13) teacher filter search ve seviye filtresi çalışır", () => {
  const filtered = filterTachistoscopeTeacherItems(makeTeacherRows(), {
    searchTerm: "göz",
    levelFilter: 3,
    statusFilter: "all",
  });

  assert.equal(filtered.length, 1);
  assert.equal(filtered[0].word, "göz");
});

test("14) route, action ve client bundle sınırları korunur", async () => {
  const pageSource = await readFile(
    new URL("../src/app/ogretmen/icerik-yonetimi/takistoskop/page.tsx", import.meta.url),
    "utf8",
  );
  const actionSource = await readFile(
    new URL("../src/app/ogretmen/icerik-yonetimi/takistoskop/actions.ts", import.meta.url),
    "utf8",
  );
  const clientSource = await readFile(
    new URL("../src/app/ogretmen/icerik-yonetimi/takistoskop/TakistoskopClient.tsx", import.meta.url),
    "utf8",
  );
  const modulesSource = await readFile(
    new URL("../src/lib/content-management/modules.ts", import.meta.url),
    "utf8",
  );

  assert.match(pageSource, /requireTeacherSession\(\)/);
  assert.match(pageSource, /TakistoskopClient/);
  assert.match(actionSource, /requireTeacherSession\(\)/);
  assert.match(actionSource, /revalidatePath\(LIST_ROUTE\)/);
  assert.match(clientSource, /buildTachistoscopeBulkPreview/);
  assert.doesNotMatch(clientSource, /getSupabaseServiceRoleClient/);
  assert.doesNotMatch(clientSource, /@\/lib\/supabase\/server/);
  assert.match(modulesSource, /\/ogretmen\/icerik-yonetimi\/takistoskop/);
  assert.match(modulesSource, /status: "linked"/);
});
