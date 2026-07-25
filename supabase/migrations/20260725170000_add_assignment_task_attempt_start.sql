-- ============================================================================
-- ODEV SISTEMI V2 - FAZ 1
--
-- Bu migration yalniz guvenli gorev oturumu temelini ekler:
--   1) student_assignment_program_tasks.attempt_id
--   2) attempt kimligi icin partial unique index
--   3) idempotent ve service_role-only start RPC'si
--
-- Mevcut completion RPC'si ve mevcut gorev/program verileri degistirilmez.
-- ============================================================================

alter table public.student_assignment_program_tasks
  add column if not exists attempt_id uuid;

create unique index if not exists student_assignment_program_tasks_attempt_id_uidx
  on public.student_assignment_program_tasks (attempt_id)
  where attempt_id is not null;

comment on column public.student_assignment_program_tasks.attempt_id is
  'V2 current assignment attempt. A new start supersedes the previous attempt. '
  'The value may be retained on completed tasks for audit and completion idempotency.';

comment on column public.student_assignment_program_tasks.started_at is
  'V2 server-side start time of the current assignment attempt. A new attempt replaces '
  'this value; completed tasks may retain it for audit and idempotency.';

comment on column public.student_assignment_program_tasks.expires_at is
  'V2 server-side deadline of the current assignment attempt: started_at + duration_seconds. '
  'A new attempt replaces this value; completed tasks may retain it for audit and idempotency.';

create or replace function public.start_student_assignment_program_task(
  p_student_id uuid,
  p_task_id uuid,
  p_attempt_id uuid,
  p_exercise_slug text
)
returns jsonb
language plpgsql
volatile
security definer
set search_path = public, pg_temp
as $$
declare
  v_normalized_exercise_slug text;

  v_task_student_id uuid;
  v_program_id uuid;
  v_program_day_id uuid;
  v_day_number integer;
  v_task_exercise_slug text;
  v_task_status text;
  v_duration_seconds integer;
  v_current_attempt_id uuid;
  v_started_at timestamptz;
  v_expires_at timestamptz;

  v_day_status text;
  v_program_student_id uuid;
  v_program_status text;

  v_now timestamptz;
  v_constraint_name text;
begin
  -- 1) Stable, testable input errors.
  if p_student_id is null then
    raise exception 'INVALID_STUDENT_ID: p_student_id zorunludur.';
  end if;

  if p_task_id is null then
    raise exception 'INVALID_TASK_ID: p_task_id zorunludur.';
  end if;

  if p_attempt_id is null then
    raise exception 'INVALID_ATTEMPT_ID: p_attempt_id zorunludur.';
  end if;

  if p_exercise_slug is null or length(btrim(p_exercise_slug)) = 0 then
    raise exception 'INVALID_EXERCISE_SLUG: p_exercise_slug bos olamaz.';
  end if;

  v_normalized_exercise_slug := btrim(p_exercise_slug);

  -- 2) Lock exactly the requested task. Later starts for the same task serialize
  --    behind this row lock, so only the latest accepted attempt remains current.
  begin
    select
      t.student_id,
      t.program_id,
      t.program_day_id,
      t.day_number,
      t.exercise_slug,
      t.status,
      t.duration_seconds,
      t.attempt_id,
      t.started_at,
      t.expires_at
    into strict
      v_task_student_id,
      v_program_id,
      v_program_day_id,
      v_day_number,
      v_task_exercise_slug,
      v_task_status,
      v_duration_seconds,
      v_current_attempt_id,
      v_started_at,
      v_expires_at
    from public.student_assignment_program_tasks t
    where t.id = p_task_id
    for update;
  exception
    when no_data_found then
      raise exception 'TASK_NOT_FOUND: Gorev bulunamadi.';
  end;

  if v_task_student_id <> p_student_id then
    raise exception 'TASK_NOT_OWNED: Gorev bu ogrenciye ait degil.';
  end if;

  -- 3) Lock and validate the task's real program day. Composite foreign keys
  --    already protect this relationship; the explicit predicates keep the RPC
  --    self-contained and fail closed if legacy data is inconsistent.
  begin
    select d.status
    into strict v_day_status
    from public.student_assignment_program_days d
    where d.id = v_program_day_id
      and d.program_id = v_program_id
      and d.day_number = v_day_number
    for update;
  exception
    when no_data_found then
      raise exception 'NOT_CURRENT_DAY: Gorevin bagli oldugu program gunu bulunamadi.';
  end;

  -- Lock order matches task -> day -> program progress operations and avoids
  -- introducing a conflicting lock order with the current completion flow.
  begin
    select p.student_id, p.status
    into strict v_program_student_id, v_program_status
    from public.student_assignment_programs p
    where p.id = v_program_id
    for update;
  exception
    when no_data_found then
      raise exception 'PROGRAM_NOT_ACTIVE: Gorevin bagli oldugu program bulunamadi.';
  end;

  if v_program_student_id <> p_student_id then
    raise exception 'TASK_NOT_OWNED: Gorevin programi bu ogrenciye ait degil.';
  end if;

  if v_program_status <> 'active' then
    raise exception 'PROGRAM_NOT_ACTIVE: Program aktif durumda degil.';
  end if;

  -- Terminal task states have their own stable errors even when their day has
  -- also reached a terminal state.
  if v_task_status = 'completed' then
    raise exception 'TASK_ALREADY_COMPLETED: Gorev zaten tamamlanmis.';
  end if;

  if v_task_status = 'cancelled' then
    raise exception 'TASK_CANCELLED: Gorev iptal edilmis.';
  end if;

  -- 4) Only the next open day can be started.
  if v_day_status = 'locked' then
    raise exception 'DAY_LOCKED: Program gunu henuz acik degil.';
  end if;

  if v_day_status = 'completed' then
    raise exception 'DAY_ALREADY_COMPLETED: Program gunu zaten tamamlanmis.';
  end if;

  if v_day_status not in ('available', 'in_progress') then
    raise exception 'NOT_CURRENT_DAY: Program gunu baslatilabilir durumda degil.';
  end if;

  if exists (
    select 1
    from public.student_assignment_program_days earlier_day
    where earlier_day.program_id = v_program_id
      and earlier_day.day_number < v_day_number
      and earlier_day.status <> 'completed'
  ) then
    raise exception 'NOT_CURRENT_DAY: Daha kucuk numarali tamamlanmamis bir program gunu var.';
  end if;

  -- 5) Task state validation follows the repository's real status contract.
  if v_task_status = 'locked' then
    raise exception 'TASK_LOCKED: Gorev henuz acik degil.';
  end if;

  if v_task_status not in ('available', 'in_progress') then
    raise exception 'TASK_LOCKED: Gorev baslatilabilir durumda degil.';
  end if;

  if v_normalized_exercise_slug <> v_task_exercise_slug then
    raise exception 'EXERCISE_MISMATCH: Istenen egzersiz gorevle eslesmiyor.';
  end if;

  if v_duration_seconds is null or v_duration_seconds <= 0 then
    raise exception 'INVALID_TASK_DURATION: Gorev suresi pozitif olmalidir.';
  end if;

  -- A single clock value is used for the response and, on a new start, for both
  -- started_at and expires_at calculations.
  v_now := clock_timestamp();

  -- 6) Same-attempt retry: preserve the original server times exactly.
  if v_task_status = 'in_progress'
     and v_current_attempt_id = p_attempt_id then
    return jsonb_build_object(
      'taskId', p_task_id,
      'attemptId', v_current_attempt_id,
      'startedAt', v_started_at,
      'expiresAt', v_expires_at,
      'serverNow', v_now,
      'durationSeconds', v_duration_seconds,
      'taskStatus', v_task_status,
      'dayStatus', v_day_status,
      'idempotent', true
    );
  end if;

  -- 7) Give a stable application error when the UUID is already current on a
  --    different task. The unique-violation handler below remains the race-safe
  --    backstop for concurrent starts.
  if exists (
    select 1
    from public.student_assignment_program_tasks other_task
    where other_task.attempt_id = p_attempt_id
      and other_task.id <> p_task_id
  ) then
    raise exception 'ATTEMPT_ID_ALREADY_IN_USE: Attempt kimligi baska bir gorevde kullaniliyor.';
  end if;

  -- 8) A different attempt supersedes the previous one and restarts the full
  --    duration using server time. Existing result/completion fields are not
  --    touched because only available/in_progress tasks reach this block.
  begin
    update public.student_assignment_program_tasks
    set
      attempt_id = p_attempt_id,
      started_at = v_now,
      expires_at = v_now + make_interval(secs => v_duration_seconds),
      last_heartbeat_at = null,
      status = 'in_progress'
    where id = p_task_id;
  exception
    when unique_violation then
      get stacked diagnostics v_constraint_name = constraint_name;
      if v_constraint_name = 'student_assignment_program_tasks_attempt_id_uidx' then
        raise exception 'ATTEMPT_ID_ALREADY_IN_USE: Attempt kimligi baska bir gorevde kullaniliyor.';
      end if;
      raise;
  end;

  if v_day_status = 'available' then
    update public.student_assignment_program_days
    set
      status = 'in_progress',
      started_at = coalesce(started_at, v_now)
    where id = v_program_day_id;

    v_day_status := 'in_progress';
  end if;

  return jsonb_build_object(
    'taskId', p_task_id,
    'attemptId', p_attempt_id,
    'startedAt', v_now,
    'expiresAt', v_now + make_interval(secs => v_duration_seconds),
    'serverNow', v_now,
    'durationSeconds', v_duration_seconds,
    'taskStatus', 'in_progress',
    'dayStatus', v_day_status,
    'idempotent', false
  );
end;
$$;

comment on function public.start_student_assignment_program_task(uuid, uuid, uuid, text) is
  'Service-role-only V2 assignment start primitive. Locks and validates the owned current-day '
  'task, starts it with server time, returns the existing times for a same-attempt retry, and '
  'supersedes the previous current attempt when a different attempt UUID is accepted.';

revoke all on function public.start_student_assignment_program_task(uuid, uuid, uuid, text) from public;
revoke all on function public.start_student_assignment_program_task(uuid, uuid, uuid, text) from anon;
revoke all on function public.start_student_assignment_program_task(uuid, uuid, uuid, text) from authenticated;
grant execute on function public.start_student_assignment_program_task(uuid, uuid, uuid, text) to service_role;
