-- Additive performance indexes for Phase 3A teacher exam management and student reads.
create index if not exists paragraph_exam_answers_question_idx on public.paragraph_exam_answers (exam_question_id);
create index if not exists paragraph_exam_questions_passage_exam_idx on public.paragraph_exam_questions (passage_id, exam_id);
create index if not exists paragraph_exam_questions_source_idx on public.paragraph_exam_questions (source_question_id);
