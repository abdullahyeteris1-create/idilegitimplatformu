alter table if exists public.students
  add column if not exists birth_date date,
  add column if not exists status text,
  add column if not exists education_status text;

update public.students
set status = case
  when is_active = false then 'passive'
  else 'active'
end
where status is null;

update public.students
set education_status = 'general'
where education_status is null;

alter table if exists public.students
  alter column status set default 'active',
  alter column education_status set default 'general';

do $$
begin
  if to_regclass('public.students') is not null
    and not exists (
      select 1
      from pg_constraint
      where conname = 'students_status_check'
        and conrelid = to_regclass('public.students')
    )
  then
    alter table public.students
      add constraint students_status_check
      check (status in ('active', 'passive'))
      not valid;
  end if;
end
$$;

do $$
begin
  if to_regclass('public.students') is not null
    and not exists (
      select 1
      from pg_constraint
      where conname = 'students_education_status_check'
        and conrelid = to_regclass('public.students')
    )
  then
    alter table public.students
      add constraint students_education_status_check
      check (education_status in ('general', 'speed-reading'))
      not valid;
  end if;
end
$$;
