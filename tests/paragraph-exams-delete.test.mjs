import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

const root = path.resolve(".");
const read = (file) => fs.readFileSync(path.join(root, file), "utf8");
const repository = () => read("src/lib/paragraph-exams/repository.ts");
const route = () => read("src/app/api/admin/paragraph-exams/[examId]/route.ts");
const ui = () => read("src/app/ogretmen/icerik-yonetimi/paragraf-denemeleri/ParagraphExamsClient.tsx");
const migration = () => read("supabase/migrations/20260921120000_paragraph_exam_force_delete.sql");
const has = (source, fragment) => assert.ok(source.includes(fragment), "missing: " + fragment);
const notHas = (source, fragment) => assert.equal(source.includes(fragment), false, "unexpected: " + fragment);
const ordered = (source, fragments) => {
  let previous = -1;
  for (const fragment of fragments) {
    const next = source.indexOf(fragment);
    assert.ok(next > previous, "order missing: " + fragment);
    previous = next;
  }
};

test("existing foreign keys remain restrictive and source question references remain safe", () => {
  const sql = read("supabase/migrations/20260918100000_create_paragraph_exams.sql");
  has(sql, "references public.paragraph_exams(id) on delete restrict");
  has(sql, "source_question_id text references public.paragraph_questions(id) on delete set null");
  has(sql, "references public.paragraph_exam_attempts(id) on delete cascade");
  notHas(migration(), "delete from public.paragraph_questions");
});

test("atomic RPC deletes all exam-owned history in dependency order without deleting question-bank rows", () => {
  const sql = migration();
  has(sql, "create or replace function public.delete_paragraph_exam_force(p_exam_id uuid)");
  has(sql, "security definer");
  has(sql, "set search_path = pg_catalog, public");
  has(sql, "where id = p_exam_id");
  has(sql, "for update");
  ordered(sql, [
    "delete from public.paragraph_exam_answers",
    "delete from public.paragraph_exam_attempts",
    "delete from public.paragraph_exam_questions",
    "delete from public.paragraph_exam_passages",
    "delete from public.paragraph_exams",
  ]);
  has(sql, "set_config('app.paragraph_exam_force_delete', 'on', true)");
  has(repository(), 'rpc("delete_paragraph_exam_force", { p_exam_id: examId })');
  const deleteFunction = repository().slice(repository().indexOf("export async function deleteExam"), repository().indexOf("type ImportedDraftQuestion"));
  notHas(deleteFunction, ".from(");
});

test("force-delete bypass is limited to DELETE and normal published/archived guards remain", () => {
  const sql = migration();
  has(sql, "if tg_op = 'DELETE' then");
  has(sql, "current_setting('app.paragraph_exam_force_delete', true)");
  has(sql, "return old;");
  has(sql, "if tg_op = 'UPDATE' then");
  has(sql, "Published or archived paragraph exam content is immutable");
  has(sql, "Answers for finalized paragraph exam attempts are immutable");
  const original = read("supabase/migrations/20260918100000_create_paragraph_exams.sql");
  has(original, "create or replace function public.guard_paragraph_exam_status_mutation");
  has(original, "old.status = 'published' and new.status = 'archived'");
  has(original, "old.status <> 'draft'");
});

test("attempt creation is serialized against exam deletion", () => {
  const sql = migration();
  has(sql, "create or replace function public.lock_paragraph_exam_for_attempt");
  has(sql, "where id = new.exam_id");
  has(sql, "for key share");
  has(sql, "before insert or update of exam_id on public.paragraph_exam_attempts");
  has(sql, "drop trigger if exists paragraph_exam_attempts_exam_lock");
});

test("RPC privileges are restricted to the server service role", () => {
  const sql = migration();
  has(sql, "revoke all on function public.delete_paragraph_exam_force(uuid) from public");
  has(sql, "revoke all on function public.delete_paragraph_exam_force(uuid) from anon, authenticated");
  has(sql, "grant execute on function public.delete_paragraph_exam_force(uuid) to service_role");
  notHas(sql, "grant execute on function public.delete_paragraph_exam_force(uuid) to anon");
  notHas(sql, "grant execute on function public.delete_paragraph_exam_force(uuid) to authenticated");
});

test("every delete statement is scoped to the requested exam and its attempts", () => {
  const sql = migration();
  has(sql, "where attempt_id in");
  has(sql, "select id from public.paragraph_exam_attempts where exam_id = p_exam_id");
  has(sql, "delete from public.paragraph_exam_attempts");
  has(sql, "where exam_id = p_exam_id");
  has(sql, "delete from public.paragraph_exam_questions");
  has(sql, "delete from public.paragraph_exam_passages");
  has(sql, "delete from public.paragraph_exams");
  notHas(sql, "delete from public.paragraph_questions");
});

test("a forced SQL error cannot be swallowed into a partial-delete success", () => {
  const sql = migration();
  has(sql, "returns jsonb");
  has(sql, "begin");
  has(sql, "return jsonb_build_object");
  notHas(sql, "exception when others");
  const deleteFunction = sql.slice(sql.indexOf("create or replace function public.delete_paragraph_exam_force"), sql.indexOf("revoke all on function"));
  ordered(deleteFunction, [
    "delete from public.paragraph_exam_answers",
    "delete from public.paragraph_exam_attempts",
    "delete from public.paragraph_exam_questions",
    "delete from public.paragraph_exam_passages",
    "delete from public.paragraph_exams",
    "return jsonb_build_object",
  ]);
});
test("draft, published, and archived exams with zero, one, or multiple attempts all use the same atomic RPC", async () => {
  const { deleteExam } = await import("../src/lib/paragraph-exams/repository.ts");
  const examId = "11111111-1111-4111-8111-111111111111";
  for (const status of ["draft", "published", "archived"]) {
    for (const [attemptCount, answerCount] of [[0, 0], [1, 1], [3, 7]]) {
      const calls = [];
      const result = await deleteExam(examId, {
        rpc: async (functionName, args) => {
          calls.push({ functionName, args });
          return { data: { deleted: true, exam_id: examId, title: status + " exam", status, attempt_count: attemptCount, answer_count: answerCount }, error: null };
        },
      });
      assert.deepEqual(calls, [{ functionName: "delete_paragraph_exam_force", args: { p_exam_id: examId } }]);
      assert.equal(result.deleted, true);
      assert.equal(result.exam.status, status);
      assert.equal(result.attemptCount, attemptCount);
      assert.equal(result.answerCount, answerCount);
    }
  }
});

test("missing exam is mapped to 404 and invalid ids are rejected before RPC", async () => {
  const { deleteExam } = await import("../src/lib/paragraph-exams/repository.ts");
  await assert.rejects(
    () => deleteExam("11111111-1111-4111-8111-111111111111", { rpc: async () => ({ data: null, error: { code: "P0002", message: "Paragraph exam not found" } }) }),
    (error) => error?.status === 404,
  );
  let called = false;
  await assert.rejects(
    () => deleteExam("not-a-uuid", { rpc: async () => { called = true; return { data: null, error: null }; } }),
    (error) => error?.status === 400,
  );
  assert.equal(called, false);
});

test("RPC failure cannot produce a partial client-side delete", () => {
  const source = repository();
  const deleteStart = source.indexOf("export async function deleteExam");
  const deleteEnd = source.indexOf("type ImportedDraftQuestion", deleteStart);
  const deleteFunction = source.slice(deleteStart, deleteEnd);
  has(deleteFunction, "await rpc(");
  notHas(deleteFunction, ".from(");
  notHas(deleteFunction, "QUESTIONS_TABLE");
  notHas(deleteFunction, "PASSAGES_TABLE");
  notHas(deleteFunction, "EXAMS_TABLE");
});

test("admin route keeps server authentication, invalid-id protection, impact preview, and force delete", () => {
  const source = route();
  has(source, "if (!isAdminSessionValid(request)) return unauthorized()");
  has(source, 'request.nextUrl.searchParams.get("view") === "delete-impact"');
  has(source, "getDeleteExamImpact(examId)");
  has(source, "export async function DELETE");
  has(source, "if (!isUuid(examId))");
  has(source, "const deleted = await deleteExam(examId)");
  has(source, "repositoryErrorResponse");
  const deleteStart = source.indexOf("export async function DELETE");
  notHas(source.slice(deleteStart), "request.json()");
});

test("teacher UI allows all statuses, shows server impact, and requires exact title when attempts exist", () => {
  const source = ui();
  has(source, "onDelete={() => void openDeleteDialog()}");
  has(source, "?view=delete-impact");
  has(source, "attemptCount > 0");
  has(source, "confirmedTitle === impact.exam.title");
  has(source, "disabled={deleting || (requiresExactTitle && !titleMatches)}");
  has(source, "attemptCount} öğrenci kaydı");
  has(source, "Kalıcı olarak sil");
  has(source, 'method: "DELETE"');
  notHas(source, 'exam.status === "draft" && <Button type="button" onClick={onDelete}');
});

test("archive action and question-bank source behavior remain available", () => {
  const source = ui();
  has(source, 'exam.status === "published"');
  has(source, "Arşivle");
  has(source, "/archive");
  has(source, "sourceQuestionId");
  has(source, "existingSourceQuestionIds");
});