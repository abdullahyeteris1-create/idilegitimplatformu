-- Paragraf Denemeleri Phase 2: isolated, server-authoritative exam subsystem.
-- This migration intentionally does not alter paragraph_questions, exercise_results,
-- paragraph analytics, XP, or education-program tables.

create extension if not exists pgcrypto;

create table if not exists public.paragraph_exams (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  description text,
  grade_band text not null,
  duration_seconds integer not null,
  status text not null default 'draft',
  version integer not null default 1,
  created_by text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint paragraph_exams_title_check check (char_length(btrim(title)) between 1 and 200),
  constraint paragraph_exams_grade_band_check check (grade_band in ('4-5', '6-7', '8', 'high-school')),
  constraint paragraph_exams_duration_check check (duration_seconds between 60 and 7200),
  constraint paragraph_exams_status_check check (status in ('draft', 'published', 'archived')),
  constraint paragraph_exams_version_check check (version >= 1)
);

create table if not exists public.paragraph_exam_passages (
  id uuid primary key default gen_random_uuid(),
  exam_id uuid not null references public.paragraph_exams(id) on delete restrict,
  label text,
  passage_text text not null,
  position integer not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint paragraph_exam_passages_text_check check (char_length(btrim(passage_text)) between 10 and 20000),
  constraint paragraph_exam_passages_position_check check (position >= 1),
  constraint paragraph_exam_passages_exam_position_uidx unique (exam_id, position)
);

create table if not exists public.paragraph_exam_questions (
  id uuid primary key default gen_random_uuid(),
  exam_id uuid not null references public.paragraph_exams(id) on delete restrict,
  passage_id uuid references public.paragraph_exam_passages(id) on delete restrict,
  source_question_id text references public.paragraph_questions(id) on delete set null,
  question_text text not null,
  options jsonb not null,
  correct_option smallint not null,
  explanation text not null,
  category text not null,
  difficulty text not null,
  grade_band text not null,
  position integer not null,
  points integer not null default 1,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint paragraph_exam_questions_text_check check (char_length(btrim(question_text)) between 1 and 2000),
  constraint paragraph_exam_questions_options_check check (
    jsonb_typeof(options) = 'array'
    and jsonb_array_length(options) = 5
  ),
  constraint paragraph_exam_questions_correct_option_check check (correct_option between 0 and 4),
  constraint paragraph_exam_questions_category_check check (category in ('main_idea', 'supporting_idea', 'inference', 'completion', 'flow')),
  constraint paragraph_exam_questions_difficulty_check check (difficulty in ('easy', 'medium', 'hard')),
  constraint paragraph_exam_questions_grade_band_check check (grade_band in ('4-5', '6-7', '8', 'high-school')),
  constraint paragraph_exam_questions_position_check check (position >= 1),
  constraint paragraph_exam_questions_points_check check (points between 1 and 100),
  constraint paragraph_exam_questions_exam_position_uidx unique (exam_id, position)
);

create table if not exists public.paragraph_exam_attempts (
  id uuid primary key default gen_random_uuid(),
  exam_id uuid not null references public.paragraph_exams(id) on delete restrict,
  exam_version integer not null,
  student_id uuid not null references public.students(id) on delete restrict,
  status text not null default 'in_progress',
  started_at timestamptz not null,
  expires_at timestamptz not null,
  submitted_at timestamptz,
  correct_count integer,
  wrong_count integer,
  blank_count integer,
  total_points integer,
  score numeric,
  accuracy numeric,
  duration_seconds integer,
  submission_key text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint paragraph_exam_attempts_status_check check (status in ('in_progress', 'submitted', 'expired', 'abandoned')),
  constraint paragraph_exam_attempts_version_check check (exam_version >= 1),
  constraint paragraph_exam_attempts_time_check check (expires_at > started_at),
  constraint paragraph_exam_attempts_counts_check check (
    (correct_count is null and wrong_count is null and blank_count is null)
    or (correct_count >= 0 and wrong_count >= 0 and blank_count >= 0)
  ),
  constraint paragraph_exam_attempts_score_check check (score is null or score >= 0),
  constraint paragraph_exam_attempts_accuracy_check check (accuracy is null or accuracy between 0 and 100),
  constraint paragraph_exam_attempts_duration_check check (duration_seconds is null or duration_seconds >= 0),
  constraint paragraph_exam_attempts_submission_key_check check (char_length(btrim(submission_key)) between 16 and 200),
  constraint paragraph_exam_attempts_student_submission_uidx unique (student_id, submission_key)
);

create table if not exists public.paragraph_exam_answers (
  id uuid primary key default gen_random_uuid(),
  attempt_id uuid not null references public.paragraph_exam_attempts(id) on delete cascade,
  exam_question_id uuid not null references public.paragraph_exam_questions(id) on delete restrict,
  selected_option smallint,
  saved_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint paragraph_exam_answers_selected_option_check check (selected_option is null or selected_option between 0 and 4),
  constraint paragraph_exam_answers_attempt_question_uidx unique (attempt_id, exam_question_id)
);

create unique index if not exists paragraph_exam_attempts_one_active_uidx
  on public.paragraph_exam_attempts (student_id, exam_id)
  where status = 'in_progress';

create index if not exists paragraph_exam_passages_exam_position_idx
  on public.paragraph_exam_passages (exam_id, position);

create index if not exists paragraph_exam_questions_exam_position_idx
  on public.paragraph_exam_questions (exam_id, position);

create index if not exists paragraph_exam_attempts_student_created_idx
  on public.paragraph_exam_attempts (student_id, created_at desc);

create index if not exists paragraph_exam_attempts_exam_status_idx
  on public.paragraph_exam_attempts (exam_id, status, created_at desc);

create index if not exists paragraph_exam_answers_attempt_idx
  on public.paragraph_exam_answers (attempt_id);

create or replace function public.guard_paragraph_exam_draft_content()
returns trigger
language plpgsql
set search_path = public
as $$
declare
  exam_status text;
  old_exam_status text;
begin
  if tg_op = 'DELETE' then
    select status into exam_status from public.paragraph_exams where id = old.exam_id;
  elsif tg_op = 'UPDATE' then
    select status into old_exam_status from public.paragraph_exams where id = old.exam_id;
    select status into exam_status from public.paragraph_exams where id = new.exam_id;
    if old_exam_status is distinct from 'draft' or exam_status is distinct from 'draft' then
      raise exception 'Published or archived paragraph exam content is immutable'
        using errcode = '55000';
    end if;
  else
    select status into exam_status from public.paragraph_exams where id = new.exam_id;
  end if;
  if tg_op <> 'UPDATE' and exam_status is distinct from 'draft' then
    raise exception 'Published or archived paragraph exam content is immutable'
      using errcode = '55000';
  end if;
  if tg_op = 'DELETE' then
    return old;
  end if;
  return new;
end;
$$;

drop trigger if exists paragraph_exam_passages_draft_guard on public.paragraph_exam_passages;
create trigger paragraph_exam_passages_draft_guard
before insert or update or delete on public.paragraph_exam_passages
for each row execute function public.guard_paragraph_exam_draft_content();

drop trigger if exists paragraph_exam_questions_draft_guard on public.paragraph_exam_questions;
create trigger paragraph_exam_questions_draft_guard
before insert or update or delete on public.paragraph_exam_questions
for each row execute function public.guard_paragraph_exam_draft_content();

create or replace function public.guard_paragraph_exam_status_mutation()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if old.status = 'published' and new.status = 'archived' then
    return new;
  end if;
  if old.status <> 'draft' then
    raise exception 'Published or archived paragraph exam is immutable'
      using errcode = '55000';
  end if;
  return new;
end;
$$;

drop trigger if exists paragraph_exams_status_guard on public.paragraph_exams;
create trigger paragraph_exams_status_guard
before update on public.paragraph_exams
for each row execute function public.guard_paragraph_exam_status_mutation();

create or replace function public.guard_paragraph_exam_attempt_mutation()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if old.status <> 'in_progress' then
    raise exception 'Finalized paragraph exam attempts are immutable'
      using errcode = '55000';
  end if;
  return new;
end;
$$;

drop trigger if exists paragraph_exam_attempts_immutable_guard on public.paragraph_exam_attempts;
create trigger paragraph_exam_attempts_immutable_guard
before update on public.paragraph_exam_attempts
for each row execute function public.guard_paragraph_exam_attempt_mutation();

create or replace function public.guard_paragraph_exam_answer_mutation()
returns trigger
language plpgsql
set search_path = public
as $$
declare
  attempt_status text;
  old_attempt_status text;
begin
  if tg_op = 'DELETE' then
    select status into attempt_status from public.paragraph_exam_attempts where id = old.attempt_id;
  elsif tg_op = 'UPDATE' then
    select status into old_attempt_status from public.paragraph_exam_attempts where id = old.attempt_id;
    select status into attempt_status from public.paragraph_exam_attempts where id = new.attempt_id;
    if old_attempt_status is distinct from 'in_progress' or attempt_status is distinct from 'in_progress' then
      raise exception 'Answers for finalized paragraph exam attempts are immutable'
        using errcode = '55000';
    end if;
  else
    select status into attempt_status from public.paragraph_exam_attempts where id = new.attempt_id;
  end if;
  if tg_op <> 'UPDATE' and attempt_status is distinct from 'in_progress' then
    raise exception 'Answers for finalized paragraph exam attempts are immutable'
      using errcode = '55000';
  end if;
  if tg_op = 'DELETE' then
    return old;
  end if;
  return new;
end;
$$;

drop trigger if exists paragraph_exam_answers_immutable_guard on public.paragraph_exam_answers;
create trigger paragraph_exam_answers_immutable_guard
before insert or update or delete on public.paragraph_exam_answers
for each row execute function public.guard_paragraph_exam_answer_mutation();

alter table public.paragraph_exams enable row level security;
alter table public.paragraph_exams force row level security;
alter table public.paragraph_exam_passages enable row level security;
alter table public.paragraph_exam_passages force row level security;
alter table public.paragraph_exam_questions enable row level security;
alter table public.paragraph_exam_questions force row level security;
alter table public.paragraph_exam_attempts enable row level security;
alter table public.paragraph_exam_attempts force row level security;
alter table public.paragraph_exam_answers enable row level security;
alter table public.paragraph_exam_answers force row level security;

revoke all on table public.paragraph_exams from anon, authenticated;
revoke all on table public.paragraph_exam_passages from anon, authenticated;
revoke all on table public.paragraph_exam_questions from anon, authenticated;
revoke all on table public.paragraph_exam_attempts from anon, authenticated;
revoke all on table public.paragraph_exam_answers from anon, authenticated;

grant select, insert, update, delete on table public.paragraph_exams to service_role;
grant select, insert, update, delete on table public.paragraph_exam_passages to service_role;
grant select, insert, update, delete on table public.paragraph_exam_questions to service_role;
grant select, insert, update, delete on table public.paragraph_exam_attempts to service_role;
grant select, insert, update, delete on table public.paragraph_exam_answers to service_role;

drop policy if exists paragraph_exams_service_role_all on public.paragraph_exams;
create policy paragraph_exams_service_role_all on public.paragraph_exams
  for all to service_role using (true) with check (true);

drop policy if exists paragraph_exam_passages_service_role_all on public.paragraph_exam_passages;
create policy paragraph_exam_passages_service_role_all on public.paragraph_exam_passages
  for all to service_role using (true) with check (true);

drop policy if exists paragraph_exam_questions_service_role_all on public.paragraph_exam_questions;
create policy paragraph_exam_questions_service_role_all on public.paragraph_exam_questions
  for all to service_role using (true) with check (true);

drop policy if exists paragraph_exam_attempts_service_role_all on public.paragraph_exam_attempts;
create policy paragraph_exam_attempts_service_role_all on public.paragraph_exam_attempts
  for all to service_role using (true) with check (true);

drop policy if exists paragraph_exam_answers_service_role_all on public.paragraph_exam_answers;
create policy paragraph_exam_answers_service_role_all on public.paragraph_exam_answers
  for all to service_role using (true) with check (true);
