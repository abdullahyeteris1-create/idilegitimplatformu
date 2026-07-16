create extension if not exists pgcrypto;

alter table if exists public.students
  add column if not exists education_level text,
  add column if not exists assignment_mode text not null default 'automatic';

alter table if exists public.students
  drop constraint if exists students_education_level_check,
  add constraint students_education_level_check check (
    education_level is null or education_level in (
      'primary_1',
      'primary_2',
      'primary_3',
      'primary_4',
      'middle_5_6',
      'middle_7_8',
      'high_school',
      'adult'
    )
  ),
  drop constraint if exists students_assignment_mode_check,
  add constraint students_assignment_mode_check check (
    assignment_mode in ('automatic', 'manual', 'ai_assisted')
  );

alter table if exists public.text_library
  add column if not exists education_level text;

alter table if exists public.text_library
  drop constraint if exists text_library_education_level_check,
  add constraint text_library_education_level_check check (
    education_level is null or education_level in (
      'primary_1',
      'primary_2',
      'primary_3',
      'primary_4',
      'middle_5_6',
      'middle_7_8',
      'high_school',
      'adult'
    )
  );

create table if not exists public.daily_assignments (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references public.students(id) on delete cascade,
  assignment_date date not null,
  title text not null default 'Gunluk Odev Plani',
  status text not null default 'pending',
  generation_mode text not null default 'automatic',
  education_level text,
  teacher_note text,
  warning_message text,
  created_by text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (student_id, assignment_date),
  constraint daily_assignments_status_check check (status in ('pending', 'in_progress', 'completed', 'skipped')),
  constraint daily_assignments_generation_mode_check check (generation_mode in ('automatic', 'manual', 'ai_suggested')),
  constraint daily_assignments_education_level_check check (
    education_level is null or education_level in (
      'primary_1',
      'primary_2',
      'primary_3',
      'primary_4',
      'middle_5_6',
      'middle_7_8',
      'high_school',
      'adult'
    )
  )
);

create table if not exists public.daily_assignment_items (
  id uuid primary key default gen_random_uuid(),
  assignment_id uuid not null references public.daily_assignments(id) on delete cascade,
  student_id uuid not null references public.students(id) on delete cascade,
  exercise_slug text not null,
  exercise_title text not null,
  category text not null,
  sort_order integer not null,
  settings_json jsonb not null default '{}'::jsonb,
  status text not null default 'pending',
  target_type text,
  target_value numeric,
  result_id uuid references public.exercise_results(id) on delete set null,
  assigned_text_id uuid references public.text_library(id) on delete set null,
  assigned_text_title text,
  is_repeat boolean not null default false,
  teacher_note text,
  started_at timestamptz,
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint daily_assignment_items_status_check check (status in ('pending', 'started', 'completed', 'skipped')),
  constraint daily_assignment_items_sort_order_check check (sort_order between 1 and 20)
);

create unique index if not exists daily_assignment_items_assignment_sort_order_uidx
  on public.daily_assignment_items (assignment_id, sort_order);

create index if not exists daily_assignments_student_date_idx
  on public.daily_assignments (student_id, assignment_date desc);

create index if not exists daily_assignment_items_assignment_status_idx
  on public.daily_assignment_items (assignment_id, status);

create index if not exists daily_assignment_items_student_slug_idx
  on public.daily_assignment_items (student_id, exercise_slug, created_at desc);

alter table public.daily_assignments enable row level security;
alter table public.daily_assignment_items enable row level security;

alter table public.daily_assignments force row level security;
alter table public.daily_assignment_items force row level security;

drop policy if exists daily_assignments_service_role_all on public.daily_assignments;
create policy daily_assignments_service_role_all
  on public.daily_assignments
  for all
  to service_role
  using (true)
  with check (true);

drop policy if exists daily_assignment_items_service_role_all on public.daily_assignment_items;
create policy daily_assignment_items_service_role_all
  on public.daily_assignment_items
  for all
  to service_role
  using (true)
  with check (true);

drop policy if exists daily_assignments_student_select_own on public.daily_assignments;
create policy daily_assignments_student_select_own
  on public.daily_assignments
  for select
  to authenticated
  using (false);

drop policy if exists daily_assignment_items_student_select_own on public.daily_assignment_items;
create policy daily_assignment_items_student_select_own
  on public.daily_assignment_items
  for select
  to authenticated
  using (false);

create or replace function public.set_updated_at_daily_assignments()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create or replace function public.set_updated_at_daily_assignment_items()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists set_updated_at_daily_assignments on public.daily_assignments;
create trigger set_updated_at_daily_assignments
before update on public.daily_assignments
for each row execute function public.set_updated_at_daily_assignments();

drop trigger if exists set_updated_at_daily_assignment_items on public.daily_assignment_items;
create trigger set_updated_at_daily_assignment_items
before update on public.daily_assignment_items
for each row execute function public.set_updated_at_daily_assignment_items();
