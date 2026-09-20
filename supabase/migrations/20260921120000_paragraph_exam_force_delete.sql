-- Review-only migration for admin hard deletion of paragraph exams.
-- This file is intentionally not applied by this change.

create or replace function public.guard_paragraph_exam_draft_content()
returns trigger
language plpgsql
set search_path = public, pg_catalog
as $$
declare
  exam_status text;
  old_exam_status text;
begin
  if tg_op = 'DELETE' then
    if coalesce(current_setting('app.paragraph_exam_force_delete', true), 'off') = 'on' then
      return old;
    end if;
    select status into exam_status from public.paragraph_exams where id = old.exam_id;
  elsif tg_op = 'UPDATE' then
    select status into old_exam_status from public.paragraph_exams where id = old.exam_id;
    select status into exam_status from public.paragraph_exams where id = new.exam_id;
    if old_exam_status is distinct from 'draft' or exam_status is distinct from 'draft' then
      raise exception 'Published or archived paragraph exam content is immutable'
        using errcode = '55000';
    end if;
  else
    select status into exam_status from public.paragraph_exams where id = new.exam_id;
  end if;
  if tg_op <> 'UPDATE' and exam_status is distinct from 'draft' then
    raise exception 'Published or archived paragraph exam content is immutable'
      using errcode = '55000';
  end if;
  if tg_op = 'DELETE' then
    return old;
  end if;
  return new;
end;
$$;

create or replace function public.guard_paragraph_exam_answer_mutation()
returns trigger
language plpgsql
set search_path = public, pg_catalog
as $$
declare
  attempt_status text;
  old_attempt_status text;
begin
  if tg_op = 'DELETE' then
    if coalesce(current_setting('app.paragraph_exam_force_delete', true), 'off') = 'on' then
      return old;
    end if;
    select status into attempt_status from public.paragraph_exam_attempts where id = old.attempt_id;
  elsif tg_op = 'UPDATE' then
    select status into old_attempt_status from public.paragraph_exam_attempts where id = old.attempt_id;
    select status into attempt_status from public.paragraph_exam_attempts where id = new.attempt_id;
    if old_attempt_status is distinct from 'in_progress' or attempt_status is distinct from 'in_progress' then
      raise exception 'Answers for finalized paragraph exam attempts are immutable'
        using errcode = '55000';
    end if;
  else
    select status into attempt_status from public.paragraph_exam_attempts where id = new.attempt_id;
  end if;
  if tg_op <> 'UPDATE' and attempt_status is distinct from 'in_progress' then
    raise exception 'Answers for finalized paragraph exam attempts are immutable'
      using errcode = '55000';
  end if;
  if tg_op = 'DELETE' then
    return old;
  end if;
  return new;
end;
$$;

create or replace function public.lock_paragraph_exam_for_attempt()
returns trigger
language plpgsql
set search_path = public, pg_catalog
as $$
declare
  locked_exam_id uuid;
begin
  select id into locked_exam_id
    from public.paragraph_exams
   where id = new.exam_id
   for key share;
  if not found then
    raise exception 'Paragraph exam does not exist'
      using errcode = '23503';
  end if;
  return new;
end;
$$;

drop trigger if exists paragraph_exam_attempts_exam_lock on public.paragraph_exam_attempts;
create trigger paragraph_exam_attempts_exam_lock
before insert or update of exam_id on public.paragraph_exam_attempts
for each row execute function public.lock_paragraph_exam_for_attempt();

create or replace function public.delete_paragraph_exam_force(p_exam_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  exam_row public.paragraph_exams%rowtype;
  attempt_count bigint;
  answer_count bigint;
begin
  select *
    into exam_row
    from public.paragraph_exams
   where id = p_exam_id
   for update;

  if not found then
    raise exception 'Paragraph exam not found'
      using errcode = 'P0002';
  end if;

  select count(*) into attempt_count
    from public.paragraph_exam_attempts
   where exam_id = p_exam_id;

  select count(*) into answer_count
    from public.paragraph_exam_answers answer
    join public.paragraph_exam_attempts attempt on attempt.id = answer.attempt_id
   where attempt.exam_id = p_exam_id;

  perform set_config('app.paragraph_exam_force_delete', 'on', true);

  delete from public.paragraph_exam_answers
   where attempt_id in (
     select id from public.paragraph_exam_attempts where exam_id = p_exam_id
   );

  delete from public.paragraph_exam_attempts
   where exam_id = p_exam_id;

  delete from public.paragraph_exam_questions
   where exam_id = p_exam_id;

  delete from public.paragraph_exam_passages
   where exam_id = p_exam_id;

  delete from public.paragraph_exams
   where id = p_exam_id;

  return jsonb_build_object(
    'deleted', true,
    'exam_id', exam_row.id,
    'title', exam_row.title,
    'status', exam_row.status,
    'attempt_count', attempt_count,
    'answer_count', answer_count
  );
end;
$$;

revoke all on function public.delete_paragraph_exam_force(uuid) from public;
revoke all on function public.delete_paragraph_exam_force(uuid) from anon, authenticated;
grant execute on function public.delete_paragraph_exam_force(uuid) to service_role;