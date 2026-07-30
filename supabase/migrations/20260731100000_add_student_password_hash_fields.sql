alter table public.students
  add column if not exists password_hash text null,
  add column if not exists password_hash_version smallint null,
  add column if not exists password_changed_at timestamptz null;
