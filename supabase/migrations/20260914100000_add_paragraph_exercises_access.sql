alter table public.students
  add column if not exists paragraph_exercises_enabled boolean
  not null default false;
