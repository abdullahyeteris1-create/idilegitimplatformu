alter table if exists public.students
  alter column password drop not null;

create or replace function public.admin_update_student_password_v1(
  p_student_id uuid,
  p_password_hash text,
  p_password_hash_version smallint
)
returns table (
  session_version bigint,
  password_changed_at timestamptz
)
language plpgsql
volatile
security definer
set search_path = public, pg_temp
as $$
begin
  if p_student_id is null then
    raise exception 'student id is required';
  end if;

  if p_password_hash is null or btrim(p_password_hash) = '' then
    raise exception 'password hash is required';
  end if;

  if p_password_hash_version is distinct from 1 then
    raise exception 'unsupported password hash version';
  end if;

  return query
    update public.students
    set
      password = null,
      password_hash = p_password_hash,
      password_hash_version = p_password_hash_version,
      password_changed_at = now(),
      session_version = coalesce(public.students.session_version, 0) + 1,
      updated_at = now()
    where public.students.id = p_student_id
    returning
      public.students.session_version,
      public.students.password_changed_at;

  if not found then
    raise exception 'student not found';
  end if;
end;
$$;

revoke all on function public.admin_update_student_password_v1(uuid, text, smallint) from public;
revoke all on function public.admin_update_student_password_v1(uuid, text, smallint) from anon;
revoke all on function public.admin_update_student_password_v1(uuid, text, smallint) from authenticated;
grant execute on function public.admin_update_student_password_v1(uuid, text, smallint) to service_role;
