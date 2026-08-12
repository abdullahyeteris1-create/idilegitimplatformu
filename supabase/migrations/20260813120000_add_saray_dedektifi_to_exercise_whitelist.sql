-- Add Saray Dedektifi to the education-program assignment whitelist.
-- This is a complete definition copied from the current production function;
-- it intentionally avoids regex/string patching of pg_proc.prosrc.
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
set search_path to 'public', 'pg_temp'
as $function$
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
  if p_student_id is null then raise exception using errcode = 'P0001', message = 'STUDENT_EDUCATION_STUDENT_NOT_FOUND'; end if;
  if p_template_id is null then raise exception using errcode = 'P0001', message = 'STUDENT_EDUCATION_TEMPLATE_NOT_FOUND'; end if;
  if char_length(v_visible_name) > 120 or (v_student_message is not null and char_length(v_student_message) > 1000) or (v_admin_note is not null and char_length(v_admin_note) > 2000) or (v_assigned_by is not null and char_length(v_assigned_by) > 120) then raise exception using errcode = 'P0001', message = 'STUDENT_EDUCATION_INPUT_INVALID'; end if;
  if not exists (select 1 from public.students where id = p_student_id) then raise exception using errcode = 'P0001', message = 'STUDENT_EDUCATION_STUDENT_NOT_FOUND'; end if;
  if not exists (select 1 from public.students where id = p_student_id and coalesce(is_active, true) = true and coalesce(status, 'active') = 'active') then raise exception using errcode = 'P0001', message = 'STUDENT_EDUCATION_STUDENT_INACTIVE'; end if;
  perform pg_advisory_xact_lock(hashtextextended(p_student_id::text, 0));
  select * into v_template from public.education_program_templates where id = p_template_id for share;
  if v_template.id is null then raise exception using errcode = 'P0001', message = 'STUDENT_EDUCATION_TEMPLATE_NOT_FOUND'; end if;
  if not v_template.is_active then raise exception using errcode = 'P0001', message = 'STUDENT_EDUCATION_TEMPLATE_INACTIVE'; end if;
  if v_template.status <> 'published' then raise exception using errcode = 'P0001', message = 'STUDENT_EDUCATION_TEMPLATE_NOT_PUBLISHED'; end if;
  if exists (select 1 from public.student_education_programs where student_id = p_student_id and status = 'active') then raise exception using errcode = 'P0001', message = 'STUDENT_EDUCATION_ACTIVE_PROGRAM_EXISTS'; end if;
  if v_template.day_count < 1 or v_template.day_count > 60 then raise exception using errcode = 'P0001', message = 'STUDENT_EDUCATION_TEMPLATE_INVALID'; end if;
  select count(*)::integer, count(distinct day_number)::integer, min(day_number)::integer, max(day_number)::integer into v_day_count, v_distinct_day_count, v_first_day, v_last_day from public.education_program_template_days where template_id = p_template_id;
  if v_day_count <> v_template.day_count or v_distinct_day_count <> v_template.day_count or v_first_day <> 1 or v_last_day <> v_template.day_count then raise exception using errcode = 'P0001', message = 'STUDENT_EDUCATION_TEMPLATE_INVALID'; end if;
  if exists (select 1 from public.education_program_template_days d left join public.education_program_template_tasks t on t.template_day_id = d.id where d.template_id = p_template_id group by d.id having count(t.id) <> 5 or count(distinct t.order_number) <> 5 or min(t.order_number) <> 1 or max(t.order_number) <> 5) then raise exception using errcode = 'P0001', message = 'STUDENT_EDUCATION_TEMPLATE_INVALID'; end if;
  if exists (select 1 from public.education_program_template_days d join public.education_program_template_tasks t on t.template_day_id = d.id where d.template_id = p_template_id and (t.exercise_slug is null or t.exercise_slug not in (
    'kare-gorme-alani', 'ayni-olani-yakala', 'benzer-kelimeler', 'kelime-bulma', 'goz-egzersizleri-kolonlar', 'takistoskop', 'harf-rakam-sayma', 'hafiza-gelistirme', 'kart-eslestirme', 'blok-okuma', 'cift-tarafli-odak', 'goz-kaslari', '13-nokta-emoji-takip', 'buyuyen-sekiller-altigen', 'kelime-yarisi', 'golgeleme', 'gruplama-calismasi', 'anlama-testi', 'okuma-hizi-testi', 'tatli-dukkani', 'kayip-nesne', 'saray-dedektifi'
  ) or t.exercise_title is null or t.duration_seconds is null or t.duration_seconds <= 0 or jsonb_typeof(t.settings) <> 'object' or t.settings_schema_version < 1)) then raise exception using errcode = 'P0001', message = 'STUDENT_EDUCATION_TEMPLATE_INVALID'; end if;
  select count(*)::integer into v_task_count from public.education_program_template_days d join public.education_program_template_tasks t on t.template_day_id = d.id where d.template_id = p_template_id;
  if v_task_count > v_template.day_count * 5 then raise exception using errcode = 'P0001', message = 'STUDENT_EDUCATION_TEMPLATE_INVALID'; end if;
  insert into public.student_education_programs (student_id, source_template_id, source_template_version, source_template_name, visible_name, student_message, admin_note, status, current_day_number, completed_days, total_days, assigned_by) values (p_student_id, v_template.id, v_template.version, v_template.name, v_visible_name, v_student_message, v_admin_note, 'active', 1, 0, v_template.day_count, v_assigned_by) returning id into v_program_id;
  insert into public.student_education_program_days (program_id, day_number, title, description, status, available_at) select v_program_id, d.day_number, d.title, d.description, case when d.day_number = 1 then 'available' else 'locked' end, case when d.day_number = 1 then now() else null end from public.education_program_template_days d where d.template_id = p_template_id order by d.day_number;
  insert into public.student_education_program_tasks (program_id, program_day_id, student_id, day_number, order_number, exercise_slug, exercise_title, result_exercise_type, starting_level, duration_seconds, settings_schema_version, settings, status) select v_program_id, snapshot_day.id, p_student_id, template_day.day_number, template_task.order_number, template_task.exercise_slug, template_task.exercise_title, template_task.result_exercise_type, template_task.starting_level, template_task.duration_seconds, template_task.settings_schema_version, template_task.settings, case when template_day.day_number = 1 and template_task.order_number = 1 then 'available' else 'locked' end from public.education_program_template_days template_day join public.education_program_template_tasks template_task on template_task.template_day_id = template_day.id join public.student_education_program_days snapshot_day on snapshot_day.program_id = v_program_id and snapshot_day.day_number = template_day.day_number where template_day.template_id = p_template_id order by template_day.day_number, template_task.order_number;
  if (select count(*) from public.student_education_program_days where program_id = v_program_id) <> v_template.day_count or (select count(*) from public.student_education_program_tasks where program_id = v_program_id) <> v_template.day_count * 5 then raise exception using errcode = 'P0001', message = 'STUDENT_EDUCATION_SNAPSHOT_COUNT_MISMATCH'; end if;
  return v_program_id;
exception when unique_violation then raise exception using errcode = 'P0001', message = 'STUDENT_EDUCATION_ACTIVE_PROGRAM_EXISTS';
end;
$function$;

comment on function public.assign_education_program_template_v1(uuid, uuid, text, text, text, text)
  is 'Atomically assigns a published education-program template. Supports custom 1-60 day templates with a catalog-synchronized exercise whitelist.';
