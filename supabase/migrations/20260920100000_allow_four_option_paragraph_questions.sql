-- Allow paragraph question records to contain four or five options.
-- This migration is intentionally schema-only; it does not write production data.

alter table public.paragraph_questions
  drop constraint if exists paragraph_questions_options_array_check,
  drop constraint if exists paragraph_questions_correct_index_check;

alter table public.paragraph_questions
  add constraint paragraph_questions_options_array_check check (
    jsonb_typeof(options) = 'array'
    and jsonb_array_length(options) between 4 and 5
    and char_length(btrim(options ->> 0)) > 0
    and char_length(btrim(options ->> 1)) > 0
    and char_length(btrim(options ->> 2)) > 0
    and char_length(btrim(options ->> 3)) > 0
    and (
      jsonb_array_length(options) = 4
      or char_length(btrim(options ->> 4)) > 0
    )
  ),
  add constraint paragraph_questions_correct_index_check
    check (correct_index >= 0 and correct_index < jsonb_array_length(options));

alter table public.paragraph_exam_questions
  drop constraint if exists paragraph_exam_questions_options_check,
  drop constraint if exists paragraph_exam_questions_correct_option_check;

alter table public.paragraph_exam_questions
  add constraint paragraph_exam_questions_options_check check (
    jsonb_typeof(options) = 'array'
    and jsonb_array_length(options) between 4 and 5
    and char_length(btrim(options ->> 0)) > 0
    and char_length(btrim(options ->> 1)) > 0
    and char_length(btrim(options ->> 2)) > 0
    and char_length(btrim(options ->> 3)) > 0
    and (
      jsonb_array_length(options) = 4
      or char_length(btrim(options ->> 4)) > 0
    )
  ),
  add constraint paragraph_exam_questions_correct_option_check
    check (correct_option >= 0 and correct_option < jsonb_array_length(options));