alter table if exists public.students
  drop constraint if exists students_status_check;

alter table if exists public.students
  add constraint students_status_check
  check (status in ('active', 'passive', 'completed'));
