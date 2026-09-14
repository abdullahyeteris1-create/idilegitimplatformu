-- Repairs the UTF-8 text that was inserted as Windows-1252 mojibake.
-- Only untouched migration rows are eligible; teacher-edited rows are preserved.
update public.paragraph_questions as q
set passage = convert_from(convert_to(replace(q.passage, chr(158), 'ž'), 'WIN1252'), 'UTF8'),
    question = convert_from(convert_to(replace(q.question, chr(158), 'ž'), 'WIN1252'), 'UTF8'),
    explanation = convert_from(convert_to(replace(q.explanation, chr(158), 'ž'), 'WIN1252'), 'UTF8'),
    options = (
      select jsonb_agg(to_jsonb(convert_from(convert_to(replace(value, chr(158), 'ž'), 'WIN1252'), 'UTF8')) order by ord)
      from jsonb_array_elements_text(q.options) with ordinality as item(value, ord)
    ),
    updated_at = now()
where q.source = 'migration'
  and q.updated_at = q.created_at
  and (q.passage ~ '[ÃÄÅÂ]' or q.question ~ '[ÃÄÅÂ]' or q.explanation ~ '[ÃÄÅÂ]' or q.options::text ~ '[ÃÄÅÂ]');
