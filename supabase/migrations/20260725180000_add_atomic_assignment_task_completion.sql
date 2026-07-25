-- ============================================================================
-- ODEV SISTEMI V2 - FAZ 2
--
-- Guvenli ve atomik V2 tamamlama primitive'i:
--   attempt + server duration validation
--   exercise_results insert + task link
--   task/day/program progress
--   exactly-next-day + its locked tasks unlock
--
-- Faz 1 start RPC'si ve eski completion RPC'si bu migration'da degistirilmez.
-- ============================================================================

-- V2 completion her zaman hem tam sureyi hem de sonucu gerektirir. Eski iki
-- deger geriye donuk uyumluluk icin korunur.
alter table public.student_assignment_program_tasks
  drop constraint if exists student_assignment_program_tasks_completion_reason_check;

alter table public.student_assignment_program_tasks
  add constraint student_assignment_program_tasks_completion_reason_check check (
    completion_reason is null
    or completion_reason in ('result_submitted', 'time_expired', 'duration_completed')
  );

create or replace function public.complete_student_assignment_program_task_v2(
  p_student_id uuid,
  p_task_id uuid,
  p_attempt_id uuid,
  p_exercise_slug text,
  p_result jsonb
)
returns jsonb
language plpgsql
volatile
security definer
set search_path = public, pg_temp
as $$
declare
  v_now timestamptz;
  v_normalized_exercise_slug text;

  v_task_student_id uuid;
  v_program_id uuid;
  v_program_day_id uuid;
  v_day_number integer;
  v_task_exercise_slug text;
  v_task_status text;
  v_task_attempt_id uuid;
  v_task_started_at timestamptz;
  v_task_expires_at timestamptz;
  v_task_completed_at timestamptz;
  v_task_duration_seconds integer;
  v_task_result_id uuid;

  v_day_status text;
  v_program_student_id uuid;
  v_program_status text;
  v_tasks_per_day integer;
  v_total_days integer;

  v_student_name text;
  v_username text;
  v_result_exercise_type text;
  v_result_exercise_title text;
  v_score numeric;
  v_success_rate numeric;
  v_correct_count integer;
  v_wrong_count integer;
  v_level integer;
  v_result_details jsonb;
  v_result_id uuid;

  v_remaining_seconds integer;
  v_total_tasks_in_day integer;
  v_completed_tasks_in_day integer;
  v_completed_days integer;
  v_day_completed boolean := false;
  v_program_completed boolean := false;

  v_next_day_id uuid;
  v_next_day_status text;
  v_next_day_unlocked integer := null;
  v_next_day_task_count integer;
  v_unlocked_task_count integer := 0;

  v_updated_rows integer;
  v_constraint_name text;
begin
  -- 1) Basic request validation. Detailed result validation is intentionally
  --    after the completed-task idempotency branch.
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

  if p_result is null or jsonb_typeof(p_result) <> 'object' then
    raise exception 'INVALID_RESULT_PAYLOAD: p_result bir JSON object olmalidir.';
  end if;

  v_normalized_exercise_slug := btrim(p_exercise_slug);
  -- The transaction uses one authoritative wall-clock value.
  v_now := clock_timestamp();

  -- 2) Fixed lock order: task -> day -> program. Concurrent completions for the
  --    same task serialize on the first row lock.
  begin
    select
      t.student_id,
      t.program_id,
      t.program_day_id,
      t.day_number,
      t.exercise_slug,
      t.status,
      t.attempt_id,
      t.started_at,
      t.expires_at,
      t.completed_at,
      t.duration_seconds,
      t.result_id
    into strict
      v_task_student_id,
      v_program_id,
      v_program_day_id,
      v_day_number,
      v_task_exercise_slug,
      v_task_status,
      v_task_attempt_id,
      v_task_started_at,
      v_task_expires_at,
      v_task_completed_at,
      v_task_duration_seconds,
      v_task_result_id
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
      raise exception 'DATA_INTEGRITY_ERROR: Gorevin bagli oldugu program gunu bulunamadi.';
  end;

  begin
    select p.student_id, p.status, p.tasks_per_day, p.total_days
    into strict v_program_student_id, v_program_status, v_tasks_per_day, v_total_days
    from public.student_assignment_programs p
    where p.id = v_program_id
    for update;
  exception
    when no_data_found then
      raise exception 'DATA_INTEGRITY_ERROR: Gorevin bagli oldugu program bulunamadi.';
  end;

  if v_program_student_id <> p_student_id then
    raise exception 'TASK_NOT_OWNED: Gorevin programi bu ogrenciye ait degil.';
  end if;

  if v_normalized_exercise_slug <> v_task_exercise_slug then
    raise exception 'EXERCISE_MISMATCH: Istenen egzersiz gorevle eslesmiyor.';
  end if;

  -- 3) Completed-task idempotency comes before active/day checks because the
  --    fifth task may already have completed both its day and its program.
  if v_task_status = 'completed' then
    if v_task_attempt_id is distinct from p_attempt_id then
      raise exception 'ALREADY_COMPLETED_BY_ANOTHER_ATTEMPT: Gorev farkli bir attempt ile tamamlanmis.';
    end if;

    if v_task_result_id is null or v_task_completed_at is null then
      raise exception 'DATA_INTEGRITY_ERROR: Tamamlanmis gorevin result veya completion zamani eksik.';
    end if;

    begin
      select r.id
      into strict v_result_id
      from public.exercise_results r
      where r.id = v_task_result_id
        and r.student_id = p_student_id
        and r.program_task_id = p_task_id
      for update;
    exception
      when no_data_found then
        raise exception 'DATA_INTEGRITY_ERROR: Tamamlanmis gorevin bagli sonucu bulunamadi.';
    end;

    select count(*), count(*) filter (where t.status = 'completed')
    into v_total_tasks_in_day, v_completed_tasks_in_day
    from public.student_assignment_program_tasks t
    where t.program_day_id = v_program_day_id;

    if v_total_tasks_in_day <> v_tasks_per_day then
      raise exception 'DATA_INTEGRITY_ERROR: Program gunundeki gorev sayisi tasks_per_day ile uyusmuyor.';
    end if;

    select count(*)
    into v_completed_days
    from public.student_assignment_program_days d
    where d.program_id = v_program_id
      and d.status = 'completed';

    if v_day_status = 'completed' and v_day_number < v_total_days then
      select d.day_number
      into v_next_day_unlocked
      from public.student_assignment_program_days d
      where d.program_id = v_program_id
        and d.day_number = v_day_number + 1
        and d.status in ('available', 'in_progress')
      limit 1;
    end if;

    return jsonb_build_object(
      'ok', true,
      'idempotent', true,
      'taskId', p_task_id,
      'attemptId', p_attempt_id,
      'resultId', v_result_id,
      'taskCompleted', true,
      'dayCompleted', v_day_status = 'completed',
      'completedTasksInDay', v_completed_tasks_in_day,
      'totalTasksInDay', v_total_tasks_in_day,
      'nextDayUnlocked', v_next_day_unlocked,
      'programCompleted', v_program_status = 'completed',
      'completedDays', v_completed_days,
      'totalDays', v_total_days,
      'serverCompletedAt', v_task_completed_at
    );
  end if;

  -- 4) Fresh completion state, ownership and current-day validation.
  if v_program_status <> 'active' then
    raise exception 'PROGRAM_NOT_ACTIVE: Program aktif durumda degil.';
  end if;

  if v_day_status = 'locked' then
    raise exception 'DAY_LOCKED: Program gunu henuz acik degil.';
  end if;

  if v_day_status = 'completed' then
    raise exception 'DAY_ALREADY_COMPLETED: Program gunu zaten tamamlanmis.';
  end if;

  if v_day_status not in ('available', 'in_progress') then
    raise exception 'NOT_CURRENT_DAY: Program gunu tamamlanabilir durumda degil.';
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

  if v_task_status = 'cancelled' then
    raise exception 'TASK_CANCELLED: Gorev iptal edilmis.';
  end if;

  if v_task_status = 'locked' then
    raise exception 'TASK_LOCKED: Gorev henuz acik degil.';
  end if;

  if v_task_attempt_id is null then
    raise exception 'TASK_NOT_STARTED: Gorev icin bir attempt baslatilmamis.';
  end if;

  if v_task_status <> 'in_progress' then
    raise exception 'TASK_NOT_STARTED: Gorev in_progress durumda degil.';
  end if;

  if v_task_attempt_id <> p_attempt_id then
    raise exception 'STALE_ATTEMPT: Attempt gorevin guncel attempt kimligi degil.';
  end if;

  if v_task_started_at is null or v_task_expires_at is null then
    raise exception 'INVALID_ATTEMPT_STATE: Attempt sunucu zamanlari eksik.';
  end if;

  if v_task_duration_seconds is null or v_task_duration_seconds <= 0 then
    raise exception 'INVALID_TASK_DURATION: Gorev suresi pozitif olmalidir.';
  end if;

  if v_task_result_id is not null then
    raise exception 'DATA_INTEGRITY_ERROR: Tamamlanmamis gorev beklenmedik bir result_id tasiyor.';
  end if;

  -- Exact boundary: any instant before expires_at is rejected; equality passes.
  if v_now < v_task_expires_at then
    v_remaining_seconds := greatest(
      0,
      ceil(extract(epoch from (v_task_expires_at - v_now)))
    )::integer;
    raise exception 'DURATION_NOT_ELAPSED: remainingSeconds=%', v_remaining_seconds;
  end if;

  -- 5) Canonical assignment slug -> stored result type/title. Client result JSON
  --    cannot choose either value.
  v_result_exercise_type := case v_task_exercise_slug
    when 'kare-gorme-alani' then 'square-vision'
    when 'ayni-olani-yakala' then 'catch-same'
    when 'benzer-kelimeler' then 'similar-words'
    when 'kelime-bulma' then 'word-finding'
    when 'goz-egzersizleri-kolonlar' then 'eye-columns'
    when 'takistoskop' then 'tachistoscope'
    when 'harf-rakam-sayma' then 'letter-number-counting-focus'
    when 'hafiza-gelistirme' then 'memory-game'
    when 'kart-eslestirme' then 'card-matching'
    else null
  end;

  v_result_exercise_title := case v_task_exercise_slug
    when 'kare-gorme-alani' then 'Kare Gorme Calismasi'
    when 'ayni-olani-yakala' then 'Ayni Olani Yakala'
    when 'benzer-kelimeler' then 'Benzer Kelimeler'
    when 'kelime-bulma' then 'Kelime Bulma'
    when 'goz-egzersizleri-kolonlar' then 'Goz Egzersizleri Kolonlar'
    when 'takistoskop' then 'Takistoskop'
    when 'harf-rakam-sayma' then 'Harf Rakam Sayma'
    when 'hafiza-gelistirme' then 'Hafiza Gelistirme'
    when 'kart-eslestirme' then 'Kart Eslestirme'
    else null
  end;

  if v_result_exercise_type is null or v_result_exercise_title is null then
    raise exception 'RESULT_SCHEMA_INVALID: Gorevin egzersizi V2 result allowlist icinde degil.';
  end if;

  -- 6) Common minimum result schema. Exercise-specific detail schemas remain a
  --    later adapter phase, but arbitrary top-level fields, oversized details
  --    and identity/timing overrides are rejected here.
  if exists (
    select 1
    from jsonb_object_keys(p_result) as result_key(key)
    where result_key.key not in (
      'score', 'successRate', 'correctCount', 'wrongCount', 'level', 'details'
    )
  ) then
    raise exception 'RESULT_SCHEMA_INVALID: Bilinmeyen ust seviye result alani.';
  end if;

  if not (p_result ? 'score') or jsonb_typeof(p_result -> 'score') <> 'number' then
    raise exception 'RESULT_SCHEMA_INVALID: score sayi olmalidir.';
  end if;

  if not (p_result ? 'successRate') or jsonb_typeof(p_result -> 'successRate') <> 'number' then
    raise exception 'RESULT_SCHEMA_INVALID: successRate sayi olmalidir.';
  end if;

  if not (p_result ? 'correctCount') or jsonb_typeof(p_result -> 'correctCount') <> 'number' then
    raise exception 'RESULT_SCHEMA_INVALID: correctCount sayi olmalidir.';
  end if;

  if not (p_result ? 'wrongCount') or jsonb_typeof(p_result -> 'wrongCount') <> 'number' then
    raise exception 'RESULT_SCHEMA_INVALID: wrongCount sayi olmalidir.';
  end if;

  v_score := (p_result ->> 'score')::numeric;
  v_success_rate := (p_result ->> 'successRate')::numeric;

  if v_score < -1000000 or v_score > 1000000 then
    raise exception 'RESULT_SCHEMA_INVALID: score izin verilen aralikta degil.';
  end if;

  if v_success_rate < 0 or v_success_rate > 100 then
    raise exception 'RESULT_SCHEMA_INVALID: successRate 0-100 araliginda olmalidir.';
  end if;

  if (p_result ->> 'correctCount')::numeric < 0
     or (p_result ->> 'correctCount')::numeric > 100000
     or (p_result ->> 'correctCount')::numeric <> trunc((p_result ->> 'correctCount')::numeric) then
    raise exception 'RESULT_SCHEMA_INVALID: correctCount 0-100000 arasi tam sayi olmalidir.';
  end if;

  if (p_result ->> 'wrongCount')::numeric < 0
     or (p_result ->> 'wrongCount')::numeric > 100000
     or (p_result ->> 'wrongCount')::numeric <> trunc((p_result ->> 'wrongCount')::numeric) then
    raise exception 'RESULT_SCHEMA_INVALID: wrongCount 0-100000 arasi tam sayi olmalidir.';
  end if;

  v_correct_count := (p_result ->> 'correctCount')::integer;
  v_wrong_count := (p_result ->> 'wrongCount')::integer;

  if p_result ? 'level' and p_result -> 'level' <> 'null'::jsonb then
    if jsonb_typeof(p_result -> 'level') <> 'number'
       or (p_result ->> 'level')::numeric < 1
       or (p_result ->> 'level')::numeric > 1000
       or (p_result ->> 'level')::numeric <> trunc((p_result ->> 'level')::numeric) then
      raise exception 'RESULT_SCHEMA_INVALID: level null veya 1-1000 arasi tam sayi olmalidir.';
    end if;
    v_level := (p_result ->> 'level')::integer;
  else
    v_level := null;
  end if;

  if not (p_result ? 'details') or p_result -> 'details' = 'null'::jsonb then
    v_result_details := '{}'::jsonb;
  elsif jsonb_typeof(p_result -> 'details') <> 'object' then
    raise exception 'RESULT_SCHEMA_INVALID: details bir JSON object veya null olmalidir.';
  else
    v_result_details := p_result -> 'details';
  end if;

  if octet_length(v_result_details::text) > 8192 then
    raise exception 'RESULT_SCHEMA_INVALID: details 8192 byte sinirini asiyor.';
  end if;

  if exists (
    select 1
    from jsonb_object_keys(v_result_details) as detail_key(key)
    where lower(detail_key.key) in (
      'studentid', 'student_id', 'userid', 'user_id',
      'programtaskid', 'program_task_id', 'attemptid', 'attempt_id',
      'duration', 'durationseconds', 'duration_seconds',
      'exercisetype', 'exercise_type', 'completedat', 'completed_at'
    )
  ) then
    raise exception 'RESULT_SCHEMA_INVALID: details kimlik, sure veya completion alanlarini override edemez.';
  end if;

  -- Authoritative duration and optional normalized level are server-composed.
  v_result_details := v_result_details
    || jsonb_build_object('durationSeconds', v_task_duration_seconds);
  if v_level is not null then
    v_result_details := v_result_details || jsonb_build_object('level', v_level);
  end if;

  begin
    select s.name, s.username
    into strict v_student_name, v_username
    from public.students s
    where s.id = p_student_id;
  exception
    when no_data_found then
      raise exception 'DATA_INTEGRITY_ERROR: Gorevin ogrenci satiri bulunamadi.';
  end;

  if v_student_name is null or length(btrim(v_student_name)) = 0 then
    raise exception 'DATA_INTEGRITY_ERROR: Ogrenci adi result kaydi icin gecersiz.';
  end if;

  -- 7) Result insert and task link are in this same function transaction.
  begin
    insert into public.exercise_results (
      student_id,
      student_name,
      username,
      exercise_type,
      exercise_title,
      correct_count,
      wrong_count,
      score,
      success_rate,
      details,
      completed_at,
      program_task_id
    ) values (
      p_student_id,
      btrim(v_student_name),
      nullif(btrim(coalesce(v_username, '')), ''),
      v_result_exercise_type,
      v_result_exercise_title,
      v_correct_count,
      v_wrong_count,
      v_score,
      v_success_rate,
      v_result_details,
      v_now,
      p_task_id
    )
    returning id into v_result_id;
  exception
    when unique_violation then
      get stacked diagnostics v_constraint_name = constraint_name;
      if v_constraint_name = 'exercise_results_program_task_id_uidx' then
        raise exception 'DATA_INTEGRITY_ERROR: Gorev icin zaten bagli bir result satiri var.';
      end if;
      raise exception 'DATA_INTEGRITY_ERROR: Result insert benzersizlik ihlali.';
  end;

  update public.student_assignment_program_tasks
  set
    status = 'completed',
    result_id = v_result_id,
    completed_at = v_now,
    completion_reason = 'duration_completed'
  where id = p_task_id
    and status = 'in_progress'
    and attempt_id = p_attempt_id;

  get diagnostics v_updated_rows = row_count;
  if v_updated_rows <> 1 then
    raise exception 'DATA_INTEGRITY_ERROR: Result olustu ancak gorev atomik olarak tamamlanamadi.';
  end if;

  -- 8) Day completion uses both the configured and real task count.
  select
    count(*),
    count(*) filter (where t.status = 'completed')
  into v_total_tasks_in_day, v_completed_tasks_in_day
  from public.student_assignment_program_tasks t
  where t.program_day_id = v_program_day_id;

  if v_total_tasks_in_day <> v_tasks_per_day then
    raise exception 'DATA_INTEGRITY_ERROR: Program gunundeki gorev sayisi tasks_per_day ile uyusmuyor.';
  end if;

  if v_completed_tasks_in_day = v_total_tasks_in_day then
    update public.student_assignment_program_days
    set
      status = 'completed',
      completed_at = v_now
    where id = v_program_day_id
      and status in ('available', 'in_progress');

    get diagnostics v_updated_rows = row_count;
    if v_updated_rows <> 1 then
      raise exception 'DATA_INTEGRITY_ERROR: Tum gorevler tamamlandi ancak program gunu kapatilamadi.';
    end if;

    v_day_status := 'completed';
    v_day_completed := true;
  end if;

  -- completed_days is derived from real completed day rows, never incremented.
  select count(*)
  into v_completed_days
  from public.student_assignment_program_days d
  where d.program_id = v_program_id
    and d.status = 'completed';

  update public.student_assignment_programs
  set completed_days = v_completed_days
  where id = v_program_id;

  -- 9) Complete the program or unlock exactly day_number + 1 and only that
  --    day's locked tasks. Completed/cancelled tasks are never reopened.
  if v_day_completed and v_day_number >= v_total_days then
    if v_completed_days <> v_total_days then
      raise exception 'DATA_INTEGRITY_ERROR: Son gun tamamlandi ancak completed day sayisi total_days ile uyusmuyor.';
    end if;

    update public.student_assignment_programs
    set
      status = 'completed',
      completed_days = v_completed_days,
      completed_at = v_now
    where id = v_program_id
      and status = 'active';

    get diagnostics v_updated_rows = row_count;
    if v_updated_rows <> 1 then
      raise exception 'DATA_INTEGRITY_ERROR: Son gun tamamlandi ancak program kapatilamadi.';
    end if;

    v_program_status := 'completed';
    v_program_completed := true;
  elsif v_day_completed then
    begin
      select d.id, d.status
      into strict v_next_day_id, v_next_day_status
      from public.student_assignment_program_days d
      where d.program_id = v_program_id
        and d.day_number = v_day_number + 1
      for update;
    exception
      when no_data_found then
        raise exception 'DATA_INTEGRITY_ERROR: Sonraki program gunu bulunamadi.';
    end;

    select count(*)
    into v_next_day_task_count
    from public.student_assignment_program_tasks t
    where t.program_day_id = v_next_day_id;

    if v_next_day_task_count <> v_tasks_per_day then
      raise exception 'DATA_INTEGRITY_ERROR: Sonraki gunun gorev sayisi tasks_per_day ile uyusmuyor.';
    end if;

    if v_next_day_status = 'locked' then
      update public.student_assignment_program_days
      set
        status = 'available',
        available_at = coalesce(available_at, v_now)
      where id = v_next_day_id;

      v_next_day_status := 'available';
      v_next_day_unlocked := v_day_number + 1;
    elsif v_next_day_status in ('available', 'in_progress') then
      v_next_day_unlocked := v_day_number + 1;
    end if;

    if v_next_day_status in ('available', 'in_progress') then
      update public.student_assignment_program_tasks
      set status = 'available'
      where program_day_id = v_next_day_id
        and status = 'locked';

      get diagnostics v_unlocked_task_count = row_count;
      if v_unlocked_task_count > 0 then
        v_next_day_unlocked := v_day_number + 1;
      end if;
    end if;
  end if;

  return jsonb_build_object(
    'ok', true,
    'idempotent', false,
    'taskId', p_task_id,
    'attemptId', p_attempt_id,
    'resultId', v_result_id,
    'taskCompleted', true,
    'dayCompleted', v_day_completed,
    'completedTasksInDay', v_completed_tasks_in_day,
    'totalTasksInDay', v_total_tasks_in_day,
    'nextDayUnlocked', v_next_day_unlocked,
    'programCompleted', v_program_completed,
    'completedDays', v_completed_days,
    'totalDays', v_total_days,
    'serverCompletedAt', v_now
  );
end;
$$;

comment on function public.complete_student_assignment_program_task_v2(uuid, uuid, uuid, text, jsonb) is
  'Service-role-only V2 atomic completion. Validates owner/current day/current attempt/server '
  'deadline/common result schema; inserts and links one result; completes task/day/program; '
  'and unlocks exactly the next day plus only its locked tasks in one transaction.';

revoke all on function public.complete_student_assignment_program_task_v2(uuid, uuid, uuid, text, jsonb) from public;
revoke all on function public.complete_student_assignment_program_task_v2(uuid, uuid, uuid, text, jsonb) from anon;
revoke all on function public.complete_student_assignment_program_task_v2(uuid, uuid, uuid, text, jsonb) from authenticated;
grant execute on function public.complete_student_assignment_program_task_v2(uuid, uuid, uuid, text, jsonb) to service_role;
