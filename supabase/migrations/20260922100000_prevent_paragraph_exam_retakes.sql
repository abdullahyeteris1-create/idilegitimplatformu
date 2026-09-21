-- Keep the existing force-delete RPC compatible with the immutable-attempt guard.
create or replace function public.guard_paragraph_exam_attempt_mutation()
returns trigger
language plpgsql
set search_path = public, pg_catalog
as $$
begin
  if tg_op = 'DELETE' then
    if coalesce(current_setting('app.paragraph_exam_force_delete', true), 'off') = 'on' then
      return old;
    end if;
    raise exception 'Finalized paragraph exam attempts are immutable'
      using errcode = '55000';
  end if;

  if old.status <> 'in_progress' then
    raise exception 'Finalized paragraph exam attempts are immutable'
      using errcode = '55000';
  end if;

  return new;
end;
$$;
-- Prevent new attempts after a student has submitted or timed out.
-- This migration preserves historical attempts and excludes abandoned because restart remains allowed.
create unique index paragraph_exam_attempts_single_lifetime_uidx
  on public.paragraph_exam_attempts (student_id, exam_id)
  where status in ('in_progress', 'submitted', 'expired');
create or replace function public.lock_paragraph_exam_for_attempt()
returns trigger
language plpgsql
set search_path = public, pg_catalog
as $$
declare
  locked_exam_id uuid;
begin
  perform pg_advisory_xact_lock(hashtext(new.student_id::text), hashtext(new.exam_id::text));

  select id into locked_exam_id
  from public.paragraph_exams
  where id = new.exam_id
  for key share;

  if not found then
    raise exception 'Sınav bulunamadı.';
  end if;

  if new.status = 'in_progress' then
    if exists (
      select 1
      from public.paragraph_exam_attempts
      where student_id = new.student_id
        and exam_id = new.exam_id
        and status in ('submitted', 'expired')
        and id is distinct from new.id
    ) then
      raise exception 'Bu denemeyi daha önce tamamladınız.'
        using errcode = '23505', constraint = 'paragraph_exam_attempts_single_lifetime_uidx';
    end if;

    if exists (
      select 1
      from public.paragraph_exam_attempts
      where student_id = new.student_id
        and exam_id = new.exam_id
        and status = 'in_progress'
        and id is distinct from new.id
    ) then
      raise exception 'Bu denemenin aktif attemptı zaten var.'
        using errcode = '23505', constraint = 'paragraph_exam_attempts_single_lifetime_uidx';
    end if;
  end if;

  return new;
end;
$$;

drop trigger if exists paragraph_exam_attempts_exam_lock on public.paragraph_exam_attempts;

create trigger paragraph_exam_attempts_exam_lock
before insert or update of exam_id, student_id, status
on public.paragraph_exam_attempts
for each row execute function public.lock_paragraph_exam_for_attempt();

drop index if exists public.paragraph_exam_attempts_one_active_uidx;
