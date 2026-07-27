-- ============================================================================
-- Education Program template duplication - atomic RPC
--
-- Teachers/admins need to duplicate an existing template (draft or
-- published) into a brand new, independent draft template with all of its
-- days and tasks copied by value. This must be atomic: if any step fails,
-- nothing should be left half-created.
--
-- This mirrors the exact deep-copy pattern already proven by
-- assign_education_program_template_v1 (20260725180000) - insert parent,
-- insert days by value, then insert tasks by joining source days -> source
-- tasks -> new days (matched by day_number), followed by row-count
-- invariant checks. A PL/pgSQL function body is implicitly one transaction:
-- any raised exception rolls back everything inserted so far.
--
-- Naming-collision resolution ("- Kopya", "- Kopya 2", ...) is resolved in
-- the application layer (repository.ts) BEFORE calling this RPC - the
-- final, already-unique name is passed in as p_new_name. This function is
-- scoped ENTIRELY to the education_program_templates/_days/_tasks tables;
-- it never reads from or writes to any student-assigned snapshot table.
-- ============================================================================

create or replace function public.duplicate_education_program_template_v1(
  p_source_template_id uuid,
  p_new_name text,
  p_created_by text default null
)
returns uuid
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_source public.education_program_templates%rowtype;
  v_new_template_id uuid;
  v_new_name text := btrim(coalesce(p_new_name, ''));
  v_created_by text := nullif(btrim(coalesce(p_created_by, '')), '');
  v_source_day_count integer;
  v_new_day_count integer;
  v_source_task_count integer;
  v_new_task_count integer;
begin
  if p_source_template_id is null then
    raise exception using errcode = 'P0001', message = 'EDUCATION_PROGRAM_TEMPLATE_NOT_FOUND';
  end if;

  if char_length(v_new_name) < 1 or char_length(v_new_name) > 120 then
    raise exception using errcode = 'P0001', message = 'EDUCATION_PROGRAM_TEMPLATE_NAME_INVALID';
  end if;

  if v_created_by is not null and char_length(v_created_by) > 120 then
    raise exception using errcode = 'P0001', message = 'EDUCATION_PROGRAM_TEMPLATE_INPUT_INVALID';
  end if;

  select *
  into v_source
  from public.education_program_templates
  where id = p_source_template_id
  for share;

  if v_source.id is null then
    raise exception using errcode = 'P0001', message = 'EDUCATION_PROGRAM_TEMPLATE_NOT_FOUND';
  end if;

  select count(*)::integer
  into v_source_day_count
  from public.education_program_template_days
  where template_id = p_source_template_id;

  select count(*)::integer
  into v_source_task_count
  from public.education_program_template_days d
  join public.education_program_template_tasks t on t.template_day_id = d.id
  where d.template_id = p_source_template_id;

  -- Kaynak sablon her zaman kendi orijinal durumu, kategorisi ve gun sayisiyla
  -- kopyalanir; kopya HER ZAMAN 'draft' olarak baslar (version 1, is_active
  -- true) - kullanicinin acikca istedigi davranis.
  insert into public.education_program_templates (
    name,
    admin_description,
    category,
    day_count,
    status,
    is_active,
    version,
    created_by
  )
  values (
    v_new_name,
    v_source.admin_description,
    v_source.category,
    v_source.day_count,
    'draft',
    true,
    1,
    v_created_by
  )
  returning id into v_new_template_id;

  insert into public.education_program_template_days (
    template_id,
    day_number,
    title,
    description
  )
  select
    v_new_template_id,
    d.day_number,
    d.title,
    d.description
  from public.education_program_template_days d
  where d.template_id = p_source_template_id
  order by d.day_number;

  insert into public.education_program_template_tasks (
    template_day_id,
    order_number,
    exercise_slug,
    exercise_title,
    result_exercise_type,
    duration_seconds,
    starting_level,
    settings_schema_version,
    settings
  )
  select
    new_day.id,
    source_task.order_number,
    source_task.exercise_slug,
    source_task.exercise_title,
    source_task.result_exercise_type,
    source_task.duration_seconds,
    source_task.starting_level,
    source_task.settings_schema_version,
    source_task.settings
  from public.education_program_template_days source_day
  join public.education_program_template_tasks source_task
    on source_task.template_day_id = source_day.id
  join public.education_program_template_days new_day
    on new_day.template_id = v_new_template_id
    and new_day.day_number = source_day.day_number
  where source_day.template_id = p_source_template_id
  order by source_day.day_number, source_task.order_number;

  select count(*)::integer
  into v_new_day_count
  from public.education_program_template_days
  where template_id = v_new_template_id;

  if v_new_day_count <> v_source_day_count then
    raise exception using errcode = 'P0001', message = 'EDUCATION_PROGRAM_TEMPLATE_DUPLICATE_COUNT_MISMATCH';
  end if;

  select count(*)::integer
  into v_new_task_count
  from public.education_program_template_tasks t
  join public.education_program_template_days d on d.id = t.template_day_id
  where d.template_id = v_new_template_id;

  if v_new_task_count <> v_source_task_count then
    raise exception using errcode = 'P0001', message = 'EDUCATION_PROGRAM_TEMPLATE_DUPLICATE_COUNT_MISMATCH';
  end if;

  return v_new_template_id;
end;
$$;

revoke all on function public.duplicate_education_program_template_v1(
  uuid, text, text
) from public;
revoke all on function public.duplicate_education_program_template_v1(
  uuid, text, text
) from anon;
revoke all on function public.duplicate_education_program_template_v1(
  uuid, text, text
) from authenticated;
grant execute on function public.duplicate_education_program_template_v1(
  uuid, text, text
) to service_role;

comment on function public.duplicate_education_program_template_v1(
  uuid, text, text
) is
  'Atomically duplicates an education program template (draft or published) with all its days/tasks into a new independent draft template.';
