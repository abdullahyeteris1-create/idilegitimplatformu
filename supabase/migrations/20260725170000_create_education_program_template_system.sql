-- ============================================================================
-- Education Program template system - Phase 1
--
-- This migration creates only reusable administrator template tables.
-- Student programs, completion flows, public API endpoints and execution
-- functions are deliberately outside this phase.
-- ============================================================================

create table if not exists public.education_program_templates (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  admin_description text,
  category text not null,
  day_count smallint not null default 20,
  status text not null default 'draft',
  created_by text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint education_program_templates_name_check
    check (char_length(btrim(name)) between 1 and 120),
  constraint education_program_templates_description_check
    check (admin_description is null or char_length(admin_description) <= 2000),
  constraint education_program_templates_category_check
    check (
      category in (
        'grade_1',
        'grade_2',
        'grade_3',
        'grade_4',
        'grade_5_6',
        'grade_7_8',
        'high_school',
        'general_adult'
      )
    ),
  constraint education_program_templates_day_count_check
    check (day_count between 1 and 60),
  constraint education_program_templates_status_check
    check (status in ('draft', 'published'))
);

create index if not exists education_program_templates_category_idx
  on public.education_program_templates (category);

create index if not exists education_program_templates_status_updated_idx
  on public.education_program_templates (status, updated_at desc);

create table if not exists public.education_program_template_days (
  id uuid primary key default gen_random_uuid(),
  template_id uuid not null
    references public.education_program_templates(id)
    on delete cascade,
  day_number smallint not null,
  title text,
  description text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint education_program_template_days_day_number_check
    check (day_number between 1 and 60),
  constraint education_program_template_days_title_check
    check (title is null or char_length(title) <= 160),
  constraint education_program_template_days_description_check
    check (description is null or char_length(description) <= 1000),
  constraint education_program_template_days_template_day_unique
    unique (template_id, day_number)
);

create index if not exists education_program_template_days_template_idx
  on public.education_program_template_days (template_id, day_number);

create table if not exists public.education_program_template_tasks (
  id uuid primary key default gen_random_uuid(),
  template_day_id uuid not null
    references public.education_program_template_days(id)
    on delete cascade,
  order_number smallint not null,
  exercise_slug text,
  exercise_title text,
  duration_seconds integer,
  starting_level smallint,
  settings jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint education_program_template_tasks_order_check
    check (order_number between 1 and 5),
  constraint education_program_template_tasks_duration_check
    check (
      duration_seconds is null
      or duration_seconds between 1 and 21600
    ),
  constraint education_program_template_tasks_level_check
    check (starting_level is null or starting_level >= 1),
  constraint education_program_template_tasks_settings_object_check
    check (jsonb_typeof(settings) = 'object'),
  constraint education_program_template_tasks_content_check
    check (
      (
        exercise_slug is null
        and exercise_title is null
        and duration_seconds is null
        and starting_level is null
        and settings = '{}'::jsonb
      )
      or
      (
        exercise_slug is not null
        and char_length(btrim(exercise_slug)) between 1 and 100
        and exercise_title is not null
        and char_length(btrim(exercise_title)) between 1 and 160
        and duration_seconds is not null
      )
    ),
  constraint education_program_template_tasks_day_order_unique
    unique (template_day_id, order_number)
);

create unique index if not exists education_program_template_tasks_day_exercise_unique
  on public.education_program_template_tasks (template_day_id, exercise_slug)
  where exercise_slug is not null;

create index if not exists education_program_template_tasks_day_idx
  on public.education_program_template_tasks (template_day_id, order_number);

-- Server-only access. The application authenticates administrators in Next.js
-- and accesses these tables through the service-role server helper.
alter table public.education_program_templates enable row level security;
alter table public.education_program_templates force row level security;
alter table public.education_program_template_days enable row level security;
alter table public.education_program_template_days force row level security;
alter table public.education_program_template_tasks enable row level security;
alter table public.education_program_template_tasks force row level security;

revoke all on public.education_program_templates from anon, authenticated;
revoke all on public.education_program_template_days from anon, authenticated;
revoke all on public.education_program_template_tasks from anon, authenticated;

grant select, insert, update, delete on public.education_program_templates to service_role;
grant select, insert, update, delete on public.education_program_template_days to service_role;
grant select, insert, update, delete on public.education_program_template_tasks to service_role;

create or replace function public.set_education_program_template_updated_at()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists set_updated_at_education_program_templates
  on public.education_program_templates;
create trigger set_updated_at_education_program_templates
before update on public.education_program_templates
for each row execute function public.set_education_program_template_updated_at();

drop trigger if exists set_updated_at_education_program_template_days
  on public.education_program_template_days;
create trigger set_updated_at_education_program_template_days
before update on public.education_program_template_days
for each row execute function public.set_education_program_template_updated_at();

drop trigger if exists set_updated_at_education_program_template_tasks
  on public.education_program_template_tasks;
create trigger set_updated_at_education_program_template_tasks
before update on public.education_program_template_tasks
for each row execute function public.set_education_program_template_updated_at();

comment on table public.education_program_templates is
  'Reusable administrator-authored education program templates.';
comment on table public.education_program_template_days is
  'Ordered days belonging to an education program template.';
comment on table public.education_program_template_tasks is
  'Five ordered exercise slots for an education program template day.';
