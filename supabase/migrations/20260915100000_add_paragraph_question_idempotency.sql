-- Stores application-generated fingerprints for new rows only.
alter table public.paragraph_questions
  add column if not exists content_fingerprint text;

create unique index if not exists paragraph_questions_content_fingerprint_uidx
  on public.paragraph_questions (content_fingerprint)
  where content_fingerprint is not null;
