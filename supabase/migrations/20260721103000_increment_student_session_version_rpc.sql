create or replace function public.increment_student_session_version(
  p_student_id uuid
)
returns table (
  session_version bigint,
  last_login_at timestamptz
)
language sql
volatile
security definer
set search_path = public, pg_temp
as $$
  update public.students
  set
    session_version = coalesce(session_version, 0) + 1,
    last_login_at = now()
  where id = p_student_id
  returning
    public.students.session_version,
    public.students.last_login_at;
$$;

revoke all on function public.increment_student_session_version(uuid) from public;
revoke all on function public.increment_student_session_version(uuid) from anon;
revoke all on function public.increment_student_session_version(uuid) from authenticated;
grant execute on function public.increment_student_session_version(uuid) to service_role;
