-- Kelime Yarisi is now a fully integrated exercise (iframe-hosted prototype
-- with a postMessage result bridge), so it returns to the server-side
-- education-program whitelist that 20260804130000 rolled back.
--
-- Idempotent: re-running is a no-op once the slug is present, and the anchor
-- check fails loudly if the RPC body ever drifts from exerciseCatalog.ts.
do $$
declare
  v_definition text;
  v_updated_definition text;
begin
  select pg_get_functiondef(p.oid)
    into v_definition
  from pg_proc p
  join pg_namespace n on n.oid = p.pronamespace
  where n.nspname = 'public'
    and p.proname = 'assign_education_program_template_v1'
    and pg_get_function_identity_arguments(p.oid) = 'p_student_id uuid, p_template_id uuid, p_visible_name text, p_student_message text, p_admin_note text, p_assigned_by text';

  if v_definition is null then
    raise exception 'assign_education_program_template_v1 function was not found';
  end if;

  if position('''kelime-yarisi''' in v_definition) = 0 then
    v_updated_definition := replace(
      v_definition,
      '''buyuyen-sekiller-altigen'', ''golgeleme''',
      '''buyuyen-sekiller-altigen'', ''kelime-yarisi'', ''golgeleme'''
    );

    if v_updated_definition = v_definition then
      raise exception 'Education-program exercise whitelist anchor was not found';
    end if;

    execute v_updated_definition;
  end if;
end;
$$;

comment on function public.assign_education_program_template_v1(uuid, uuid, text, text, text, text)
  is 'Atomically assigns a published education-program template. Exercise whitelist synced with exerciseCatalog.ts; 2026-08-04 re-added kelime-yarisi after full integration.';
