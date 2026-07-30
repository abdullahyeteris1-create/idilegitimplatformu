alter table if exists public.students
  add column if not exists school_name text;
