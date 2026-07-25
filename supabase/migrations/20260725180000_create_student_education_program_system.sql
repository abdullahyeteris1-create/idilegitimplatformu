-- ============================================================================
-- Student Education Program system - Phase 2A
--
-- This migration extends the independent Education Program domain with
-- immutable student snapshots and one server-only atomic assignment RPC.
-- It deliberately does not reference or modify the assignment/homework domain.
-- ============================================================================

alter table public.education_program_templates
  add column if not exists is_active boolean not null default true,
  add column if not exists version integer not null default 1;

alter table public.education_program_templates
  add constraint education_program_templates_version_check
  check (version >= 1);

alter table public.education_program_template_tasks
  add column if not exists result_exercise_type text,
  add column if not exists settings_schema_version smallint not null default 1;

alter table public.education_program_template_tasks
  add constraint education_program_template_tasks_settings_version_check
  check (settings_schema_version >= 1);

update public.education_program_template_tasks
set result_exercise_type = case exercise_slug
  when 'kare-gorme-alani' then 'square-vision'
  when 'ayni-olani-yakala' then 'catch-same'
  when 'benzer-kelimeler' then 'similar-words'
  when 'kelime-bulma' then 'word-finding'
  when 'goz-egzersizleri-kolonlar' then 'eye-columns'
  when 'takistoskop' then 'tachistoscope'
  when 'harf-rakam-sayma' then 'letter-number-counting-focus'
  when 'hafiza-gelistirme' then 'memory-game'
  when 'kart-eslestirme' then 'card-matching'
  else exercise_slug
end
where exercise_slug is not null
  and result_exercise_type is null;

create table if not exists public.student_education_programs (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null
    references public.students(id)
    on delete restrict,
  source_template_id uuid
    references public.education_program_templates(id)
    on delete set null,
  source_template_version integer not null default 1,
  source_template_name text not null,
  visible_name text not null default 'Eğitim Programım',
  student_message text,
  admin_note text,
  status text not null default 'active',
  current_day_number smallint not null default 1,
  completed_days smallint not null default 0,
  total_days smallint not null,
  assigned_by text,
  assigned_at timestamptz not null default now(),
  started_at timestamptz,
  completed_at timestamptz,
  cancelled_at timestamptz,
  cancel_reason text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint student_education_programs_source_version_check
    check (source_template_version >= 1),
  constraint student_education_programs_source_name_check
    check (char_length(btrim(source_template_name)) between 1 and 120),
  constraint student_education_programs_visible_name_check
    check (char_length(btrim(visible_name)) between 1 and 120),
  constraint student_education_programs_student_message_check
    check (student_message is null or char_length(student_message) <= 1000),
  constraint student_education_programs_admin_note_check
    check (admin_note is null or char_length(admin_note) <= 2000),
  constraint student_education_programs_assigned_by_check
    check (assigned_by is null or char_length(assigned_by) <= 120),
  constraint student_education_programs_cancel_reason_check
    check (cancel_reason is null or char_length(cancel_reason) <= 500),
  constraint student_education_programs_status_check
    check (status in ('active', 'completed', 'cancelled')),
  constraint student_education_programs_total_days_check
    check (total_days between 1 and 60),
  constraint student_education_programs_current_day_check
    check (current_day_number between 1 and 60),
  constraint student_education_programs_completed_days_check
    check (completed_days between 0 and 60),
  constraint student_education_programs_progress_check
    check (
      completed_days <= total_days
      and current_day_number <= total_days
    )
);

create unique index if not exists student_education_programs_one_active_per_student
  on public.student_education_programs (student_id)
  where status = 'active';

create index if not exists student_education_programs_student_assigned_idx
  on public.student_education_programs (student_id, assigned_at desc);

create index if not exists student_education_programs_status_assigned_idx
  on public.student_education_programs (status, assigned_at desc);

create table if not exists public.student_education_program_days (
  id uuid primary key default gen_random_uuid(),
  program_id uuid not null
    references public.student_education_programs(id)
    on delete cascade,
  day_number smallint not null,
  title text,
  description text,
  status text not null default 'locked',
  available_at timestamptz,
  started_at timestamptz,
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint student_education_program_days_number_check
    check (day_number between 1 and 60),
  constraint student_education_program_days_title_check
    check (title is null or char_length(title) <= 160),
  constraint student_education_program_days_description_check
    check (description is null or char_length(description) <= 1000),
  constraint student_education_program_days_status_check
    check (status in ('locked', 'available', 'in_progress', 'completed')),
  constraint student_education_program_days_program_day_unique
    unique (program_id, day_number)
);

create index if not exists student_education_program_days_program_idx
  on public.student_education_program_days (program_id, day_number);

create table if not exists public.student_education_program_tasks (
  id uuid primary key default gen_random_uuid(),
  program_id uuid not null
    references public.student_education_programs(id)
    on delete cascade,
  program_day_id uuid not null
    references public.student_education_program_days(id)
    on delete cascade,
  student_id uuid not null
    references public.students(id)
    on delete restrict,
  day_number smallint not null,
  order_number smallint not null,
  exercise_slug text not null,
  exercise_title text not null,
  result_exercise_type text,
  starting_level smallint,
  duration_seconds integer not null,
  settings_schema_version smallint not null default 1,
  settings jsonb not null default '{}'::jsonb,
  status text not null default 'locked',
  started_at timestamptz,
  completed_at timestamptz,
  result_id uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint student_education_program_tasks_day_number_check
    check (day_number between 1 and 60),
  constraint student_education_program_tasks_order_check
    check (order_number between 1 and 5),
  constraint student_education_program_tasks_slug_check
    check (char_length(btrim(exercise_slug)) between 1 and 100),
  constraint student_education_program_tasks_title_check
    check (char_length(btrim(exercise_title)) between 1 and 160),
  constraint student_education_program_tasks_level_check
    check (starting_level is null or starting_level >= 1),
  constraint student_education_program_tasks_duration_check
    check (duration_seconds > 0 and duration_seconds <= 21600),
  constraint student_education_program_tasks_settings_version_check
    check (settings_schema_version >= 1),
  constraint student_education_program_tasks_settings_object_check
    check (jsonb_typeof(settings) = 'object'),
  constraint student_education_program_tasks_status_check
    check (status in ('locked', 'available', 'in_progress', 'completed')),
  constraint student_education_program_tasks_day_order_unique
    unique (program_day_id, order_number)
);

create index if not exists student_education_program_tasks_program_idx
  on public.student_education_program_tasks (program_id, day_number, order_number);

create index if not exists student_education_program_tasks_student_idx
  on public.student_education_program_tasks (student_id, status);

alter table public.student_education_programs enable row level security;
alter table public.student_education_programs force row level security;
alter table public.student_education_program_days enable row level security;
alter table public.student_education_program_days force row level security;
alter table public.student_education_program_tasks enable row level security;
alter table public.student_education_program_tasks force row level security;

revoke all on public.student_education_programs from anon, authenticated;
revoke all on public.student_education_program_days from anon, authenticated;
revoke all on public.student_education_program_tasks from anon, authenticated;

grant select, insert, update, delete on public.student_education_programs to service_role;
grant select, insert, update, delete on public.student_education_program_days to service_role;
grant select, insert, update, delete on public.student_education_program_tasks to service_role;

create or replace function public.set_student_education_program_updated_at()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists set_updated_at_student_education_programs
  on public.student_education_programs;
create trigger set_updated_at_student_education_programs
before update on public.student_education_programs
for each row execute function public.set_student_education_program_updated_at();

drop trigger if exists set_updated_at_student_education_program_days
  on public.student_education_program_days;
create trigger set_updated_at_student_education_program_days
before update on public.student_education_program_days
for each row execute function public.set_student_education_program_updated_at();

drop trigger if exists set_updated_at_student_education_program_tasks
  on public.student_education_program_tasks;
create trigger set_updated_at_student_education_program_tasks
before update on public.student_education_program_tasks
for each row execute function public.set_student_education_program_updated_at();

create or replace function public.assign_education_program_template_v1(
  p_student_id uuid,
  p_template_id uuid,
  p_visible_name text default null,
  p_student_message text default null,
  p_admin_note text default null,
  p_assigned_by text default null
)
returns uuid
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_template public.education_program_templates%rowtype;
  v_program_id uuid;
  v_visible_name text := coalesce(nullif(btrim(p_visible_name), ''), 'Eğitim Programım');
  v_student_message text := nullif(btrim(p_student_message), '');
  v_admin_note text := nullif(btrim(p_admin_note), '');
  v_assigned_by text := nullif(btrim(p_assigned_by), '');
  v_day_count integer;
  v_distinct_day_count integer;
  v_first_day integer;
  v_last_day integer;
  v_task_count integer;
begin
  if p_student_id is null then
    raise exception using errcode = 'P0001', message = 'STUDENT_EDUCATION_STUDENT_NOT_FOUND';
  end if;

  if p_template_id is null then
    raise exception using errcode = 'P0001', message = 'STUDENT_EDUCATION_TEMPLATE_NOT_FOUND';
  end if;

  if char_length(v_visible_name) > 120
    or (v_student_message is not null and char_length(v_student_message) > 1000)
    or (v_admin_note is not null and char_length(v_admin_note) > 2000)
    or (v_assigned_by is not null and char_length(v_assigned_by) > 120)
  then
    raise exception using errcode = 'P0001', message = 'STUDENT_EDUCATION_INPUT_INVALID';
  end if;

  if not exists (
    select 1
    from public.students
    where id = p_student_id
  ) then
    raise exception using errcode = 'P0001', message = 'STUDENT_EDUCATION_STUDENT_NOT_FOUND';
  end if;

  if not exists (
    select 1
    from public.students
    where id = p_student_id
      and coalesce(is_active, true) = true
      and coalesce(status, 'active') = 'active'
  ) then
    raise exception using errcode = 'P0001', message = 'STUDENT_EDUCATION_STUDENT_INACTIVE';
  end if;

  perform pg_advisory_xact_lock(hashtextextended(p_student_id::text, 0));

  select *
  into v_template
  from public.education_program_templates
  where id = p_template_id
  for share;

  if v_template.id is null then
    raise exception using errcode = 'P0001', message = 'STUDENT_EDUCATION_TEMPLATE_NOT_FOUND';
  end if;

  if not v_template.is_active then
    raise exception using errcode = 'P0001', message = 'STUDENT_EDUCATION_TEMPLATE_INACTIVE';
  end if;

  if v_template.status <> 'published' then
    raise exception using errcode = 'P0001', message = 'STUDENT_EDUCATION_TEMPLATE_NOT_PUBLISHED';
  end if;

  if exists (
    select 1
    from public.student_education_programs
    where student_id = p_student_id
      and status = 'active'
  ) then
    raise exception using errcode = 'P0001', message = 'STUDENT_EDUCATION_ACTIVE_PROGRAM_EXISTS';
  end if;

  if v_template.day_count < 1 or v_template.day_count > 60 then
    raise exception using errcode = 'P0001', message = 'STUDENT_EDUCATION_TEMPLATE_INVALID';
  end if;

  select
    count(*)::integer,
    count(distinct day_number)::integer,
    min(day_number)::integer,
    max(day_number)::integer
  into
    v_day_count,
    v_distinct_day_count,
    v_first_day,
    v_last_day
  from public.education_program_template_days
  where template_id = p_template_id;

  if v_day_count <> v_template.day_count
    or v_distinct_day_count <> v_template.day_count
    or v_first_day <> 1
    or v_last_day <> v_template.day_count
  then
    raise exception using errcode = 'P0001', message = 'STUDENT_EDUCATION_TEMPLATE_INVALID';
  end if;

  if exists (
    select 1
    from public.education_program_template_days d
    left join public.education_program_template_tasks t
      on t.template_day_id = d.id
    where d.template_id = p_template_id
    group by d.id
    having count(t.id) <> 5
      or count(distinct t.order_number) <> 5
      or min(t.order_number) <> 1
      or max(t.order_number) <> 5
  ) then
    raise exception using errcode = 'P0001', message = 'STUDENT_EDUCATION_TEMPLATE_INVALID';
  end if;

  if exists (
    select 1
    from public.education_program_template_days d
    join public.education_program_template_tasks t
      on t.template_day_id = d.id
    where d.template_id = p_template_id
      and (
        t.exercise_slug is null
        or t.exercise_slug not in (
          'kare-gorme-alani',
          'ayni-olani-yakala',
          'benzer-kelimeler',
          'kelime-bulma',
          'goz-egzersizleri-kolonlar',
          'takistoskop',
          'harf-rakam-sayma',
          'hafiza-gelistirme',
          'kart-eslestirme'
        )
        or t.exercise_title is null
        or t.duration_seconds is null
        or t.duration_seconds <= 0
        or jsonb_typeof(t.settings) <> 'object'
        or t.settings_schema_version < 1
      )
  ) then
    raise exception using errcode = 'P0001', message = 'STUDENT_EDUCATION_TEMPLATE_INVALID';
  end if;

  select count(*)::integer
  into v_task_count
  from public.education_program_template_days d
  join public.education_program_template_tasks t
    on t.template_day_id = d.id
  where d.template_id = p_template_id;

  if v_task_count <> v_template.day_count * 5 then
    raise exception using errcode = 'P0001', message = 'STUDENT_EDUCATION_TEMPLATE_INVALID';
  end if;

  insert into public.student_education_programs (
    student_id,
    source_template_id,
    source_template_version,
    source_template_name,
    visible_name,
    student_message,
    admin_note,
    status,
    current_day_number,
    completed_days,
    total_days,
    assigned_by
  )
  values (
    p_student_id,
    v_template.id,
    v_template.version,
    v_template.name,
    v_visible_name,
    v_student_message,
    v_admin_note,
    'active',
    1,
    0,
    v_template.day_count,
    v_assigned_by
  )
  returning id into v_program_id;

  insert into public.student_education_program_days (
    program_id,
    day_number,
    title,
    description,
    status,
    available_at
  )
  select
    v_program_id,
    d.day_number,
    d.title,
    d.description,
    case when d.day_number = 1 then 'available' else 'locked' end,
    case when d.day_number = 1 then now() else null end
  from public.education_program_template_days d
  where d.template_id = p_template_id
  order by d.day_number;

  insert into public.student_education_program_tasks (
    program_id,
    program_day_id,
    student_id,
    day_number,
    order_number,
    exercise_slug,
    exercise_title,
    result_exercise_type,
    starting_level,
    duration_seconds,
    settings_schema_version,
    settings,
    status
  )
  select
    v_program_id,
    snapshot_day.id,
    p_student_id,
    template_day.day_number,
    template_task.order_number,
    template_task.exercise_slug,
    template_task.exercise_title,
    template_task.result_exercise_type,
    template_task.starting_level,
    template_task.duration_seconds,
    template_task.settings_schema_version,
    template_task.settings,
    case
      when template_day.day_number = 1 and template_task.order_number = 1
        then 'available'
      else 'locked'
    end
  from public.education_program_template_days template_day
  join public.education_program_template_tasks template_task
    on template_task.template_day_id = template_day.id
  join public.student_education_program_days snapshot_day
    on snapshot_day.program_id = v_program_id
    and snapshot_day.day_number = template_day.day_number
  where template_day.template_id = p_template_id
  order by template_day.day_number, template_task.order_number;

  if (
    select count(*)
    from public.student_education_program_days
    where program_id = v_program_id
  ) <> v_template.day_count then
    raise exception using errcode = 'P0001', message = 'STUDENT_EDUCATION_SNAPSHOT_COUNT_MISMATCH';
  end if;

  if (
    select count(*)
    from public.student_education_program_tasks
    where program_id = v_program_id
  ) <> v_template.day_count * 5 then
    raise exception using errcode = 'P0001', message = 'STUDENT_EDUCATION_SNAPSHOT_COUNT_MISMATCH';
  end if;

  return v_program_id;
exception
  when unique_violation then
    raise exception using errcode = 'P0001', message = 'STUDENT_EDUCATION_ACTIVE_PROGRAM_EXISTS';
end;
$$;

revoke all on function public.assign_education_program_template_v1(
  uuid, uuid, text, text, text, text
) from public;
revoke all on function public.assign_education_program_template_v1(
  uuid, uuid, text, text, text, text
) from anon;
revoke all on function public.assign_education_program_template_v1(
  uuid, uuid, text, text, text, text
) from authenticated;
grant execute on function public.assign_education_program_template_v1(
  uuid, uuid, text, text, text, text
) to service_role;

comment on table public.student_education_programs is
  'Administrator-assigned immutable education program snapshot headers.';
comment on table public.student_education_program_days is
  'Snapshot days belonging to a student education program.';
comment on table public.student_education_program_tasks is
  'Snapshot exercise tasks belonging to a student education program day.';
comment on function public.assign_education_program_template_v1(
  uuid, uuid, text, text, text, text
) is
  'Atomically assigns one published active education program template as an immutable student snapshot.';
