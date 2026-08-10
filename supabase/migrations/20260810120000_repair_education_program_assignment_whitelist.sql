-- Repair the Education Program assignment RPC without changing its security
-- model or its template/day/task validation rules.
--
-- The assignment RPC is stored in the database and its exercise whitelist has
-- historically been extended by several migrations. If a database is missing
-- one of those forward migrations, a valid custom 1-60 day template can still
-- fail with STUDENT_EDUCATION_TEMPLATE_INVALID. Keep the template snapshot
-- source-of-truth and replace only the stale whitelist block.

do $$
declare
  v_definition text;
  v_updated_definition text;
  v_whitelist text := $whitelist$
t.exercise_slug not in (
  'kare-gorme-alani',
  'ayni-olani-yakala',
  'benzer-kelimeler',
  'kelime-bulma',
  'goz-egzersizleri-kolonlar',
  'takistoskop',
  'harf-rakam-sayma',
  'hafiza-gelistirme',
  'kart-eslestirme',
  'blok-okuma',
  'cift-tarafli-odak',
  'goz-kaslari',
  '13-nokta-emoji-takip',
  'buyuyen-sekiller-altigen',
  'kelime-yarisi',
  'golgeleme',
  'gruplama-calismasi',
  'anlama-testi',
  'okuma-hizi-testi'
)
$whitelist$;
begin
  select pg_get_functiondef(p.oid)
    into v_definition
  from pg_proc p
  join pg_namespace n on n.oid = p.pronamespace
  where n.nspname = 'public'
    and p.proname = 'assign_education_program_template_v1'
    and pg_get_function_identity_arguments(p.oid) =
      'p_student_id uuid, p_template_id uuid, p_visible_name text, p_student_message text, p_admin_note text, p_assigned_by text';

  if v_definition is null then
    raise exception 'assign_education_program_template_v1 function was not found';
  end if;

  v_updated_definition := regexp_replace(
    v_definition,
    't[[:space:]]*\.[[:space:]]*exercise_slug[[:space:]]+not[[:space:]]+in[[:space:]]*\([^)]*\)',
    v_whitelist,
    1,
    1,
    'n'
  );

  if v_updated_definition = v_definition then
    raise exception 'Education-program exercise whitelist block was not found';
  end if;

  execute v_updated_definition;
end;
$$;

comment on function public.assign_education_program_template_v1(uuid, uuid, text, text, text, text)
  is 'Atomically assigns a published education-program template. Supports custom 1-60 day templates with a catalog-synchronized exercise whitelist.';
