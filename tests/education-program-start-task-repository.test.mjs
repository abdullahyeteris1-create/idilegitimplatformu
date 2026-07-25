import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

import {
  START_EDUCATION_PROGRAM_TASK_RPC,
  startEducationProgramTask,
} from "../src/lib/education-programs/studentProgramRepository.ts";

const STUDENT_ID = "11111111-1111-4111-8111-111111111111";
const TASK_ID = "22222222-2222-4222-8222-222222222222";

test("gecerli baslatma RPC'yi dogru parametrelerle cagirir ve sonucu map eder", async () => {
  const calls = [];
  const supabase = {
    async rpc(name, args) {
      calls.push({ name, args });
      return {
        data: {
          ok: true,
          idempotent: false,
          taskId: TASK_ID,
          taskStatus: "in_progress",
          startedAt: "2026-07-25T12:00:00.000Z",
          exerciseSlug: "kare-gorme-alani",
          dayStatus: "in_progress",
        },
        error: null,
      };
    },
  };

  const result = await startEducationProgramTask(supabase, STUDENT_ID, TASK_ID);

  assert.equal(calls[0].name, START_EDUCATION_PROGRAM_TASK_RPC);
  assert.deepEqual(calls[0].args, { p_student_id: STUDENT_ID, p_task_id: TASK_ID });
  assert.deepEqual(result, {
    ok: true,
    value: {
      taskId: TASK_ID,
      taskStatus: "in_progress",
      startedAt: "2026-07-25T12:00:00.000Z",
      exerciseSlug: "kare-gorme-alani",
      idempotent: false,
    },
  });
});

test("idempotent RPC yaniti idempotent:true olarak dogru map edilir", async () => {
  const supabase = {
    async rpc() {
      return {
        data: {
          ok: true,
          idempotent: true,
          taskId: TASK_ID,
          taskStatus: "in_progress",
          startedAt: "2026-07-25T12:00:00.000Z",
          exerciseSlug: "kare-gorme-alani",
          dayStatus: "in_progress",
        },
        error: null,
      };
    },
  };

  const result = await startEducationProgramTask(supabase, STUDENT_ID, TASK_ID);

  assert.equal(result.ok, true);
  assert.equal(result.value.idempotent, true);
});

test("baska ogrencinin gorevi mismatch hatasi Turkce conflict/not_found sonucuna map edilir", async () => {
  const supabase = {
    async rpc() {
      return {
        data: null,
        error: { code: "P0001", message: "EDUCATION_TASK_START_STUDENT_MISMATCH: Gorev bu ogrenciye ait degil." },
      };
    },
  };

  const result = await startEducationProgramTask(supabase, STUDENT_ID, TASK_ID);

  assert.equal(result.ok, false);
  assert.equal(result.code, "not_found");
  assert.equal(result.message, "Bu görev size ait değil.");
});

test("locked gorev baslatma hatasi conflict sonucuna map edilir", async () => {
  const supabase = {
    async rpc() {
      return {
        data: null,
        error: { code: "P0001", message: "EDUCATION_TASK_START_TASK_NOT_STARTABLE: Gorev locked durumunda." },
      };
    },
  };

  const result = await startEducationProgramTask(supabase, STUDENT_ID, TASK_ID);

  assert.equal(result.ok, false);
  assert.equal(result.code, "conflict");
  assert.equal(result.message, "Bu görev şu anda başlatılamaz.");
});

test("gun kilitliyken baslatma conflict sonucuna map edilir", async () => {
  const supabase = {
    async rpc() {
      return {
        data: null,
        error: { code: "P0001", message: "EDUCATION_TASK_START_DAY_NOT_STARTABLE: Gun locked durumunda." },
      };
    },
  };

  const result = await startEducationProgramTask(supabase, STUDENT_ID, TASK_ID);

  assert.equal(result.ok, false);
  assert.equal(result.code, "conflict");
  assert.equal(result.message, "Bu gün henüz açılmadı.");
});

test("pasif program hatasi conflict sonucuna map edilir", async () => {
  const supabase = {
    async rpc() {
      return {
        data: null,
        error: { code: "P0001", message: "EDUCATION_TASK_START_PROGRAM_NOT_ACTIVE: Program aktif degil." },
      };
    },
  };

  const result = await startEducationProgramTask(supabase, STUDENT_ID, TASK_ID);

  assert.equal(result.ok, false);
  assert.equal(result.code, "conflict");
  assert.equal(result.message, "Bu program artık aktif değil.");
});

test("gecersiz UUID icin RPC hic cagrilmadan not_found doner", async () => {
  let called = false;
  const supabase = {
    async rpc() {
      called = true;
      return { data: null, error: null };
    },
  };

  const result = await startEducationProgramTask(supabase, "gecersiz", TASK_ID);

  assert.equal(called, false);
  assert.equal(result.ok, false);
  assert.equal(result.code, "not_found");
});

test("repository eski assignment helper veya tablolarina bagli degildir", async () => {
  const source = await readFile(
    new URL("../src/lib/education-programs/studentProgramRepository.ts", import.meta.url),
    "utf8",
  );

  assert.doesNotMatch(source, /@\/lib\/assignments\//);
  assert.doesNotMatch(source, /student_assignment_program/);
  assert.doesNotMatch(source, /daily_assignment/);
});
