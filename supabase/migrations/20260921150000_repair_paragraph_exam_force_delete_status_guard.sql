-- Allow the existing paragraph exam status guard to cooperate with the
-- protected force-delete RPC without weakening normal direct deletes.

create or replace function public.guard_paragraph_exam_status_mutation()
returns trigger
language plpgsql
set search_path = public, pg_catalog
as $$
begin
  if tg_op = 'DELETE' then
    if coalesce(current_setting('app.paragraph_exam_force_delete', true), 'off') = 'on' then
      return old;
    end if;
    raise exception 'Paragraph exams cannot be deleted; archive them instead'
      using errcode = '55000';
  end if;

  if old.status = 'published' and new.status = 'archived' then
    return new;
  end if;

  if old.status <> 'draft' then
    raise exception 'Published or archived paragraph exams are immutable'
      using errcode = '55000';
  end if;

  return new;
end;
$$;

