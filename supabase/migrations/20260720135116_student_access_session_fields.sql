alter table if exists public.students
  add column if not exists education_start_date date null,
  add column if not exists access_end_date date null,
  add column if not exists session_version bigint not null default 0,
  add column if not exists last_login_at timestamptz null;

do $$
begin
  if to_regclass('public.students') is not null
    and not exists (
      select 1
      from pg_constraint
      where conname = 'students_education_access_date_order_check'
        and conrelid = to_regclass('public.students')
    )
  then
    alter table public.students
      add constraint students_education_access_date_order_check
      check (
        education_start_date is null
        or access_end_date is null
        or education_start_date <= access_end_date
      );
  end if;
end
$$;
