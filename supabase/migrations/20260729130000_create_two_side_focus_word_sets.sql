create extension if not exists pgcrypto;

create table if not exists public.two_side_focus_word_sets (
  id uuid primary key default gen_random_uuid(),
  base_word text not null,
  variants jsonb not null,
  normalized_key text not null,
  is_active boolean not null default true,
  sort_order integer not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint two_side_focus_word_sets_base_word_check
    check (char_length(btrim(base_word)) > 0),
  constraint two_side_focus_word_sets_variants_check
    check (
      jsonb_typeof(variants) = 'array'
      and jsonb_array_length(variants) > 0
    ),
  constraint two_side_focus_word_sets_normalized_key_check
    check (char_length(btrim(normalized_key)) > 0),
  constraint two_side_focus_word_sets_sort_order_check
    check (sort_order >= 0),
  constraint two_side_focus_word_sets_normalized_key_unique
    unique (normalized_key)
);

create index if not exists two_side_focus_word_sets_active_sort_idx
  on public.two_side_focus_word_sets (is_active, sort_order);

alter table public.two_side_focus_word_sets enable row level security;
alter table public.two_side_focus_word_sets force row level security;

revoke all on public.two_side_focus_word_sets from anon, authenticated;
grant select, insert, update, delete on public.two_side_focus_word_sets to service_role;

create or replace function public.set_updated_at_two_side_focus_word_sets()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists set_updated_at_two_side_focus_word_sets on public.two_side_focus_word_sets;
create trigger set_updated_at_two_side_focus_word_sets
before update on public.two_side_focus_word_sets
for each row execute function public.set_updated_at_two_side_focus_word_sets();

insert into public.two_side_focus_word_sets (
  base_word,
  variants,
  normalized_key,
  is_active,
  sort_order
) values
  ('kalem', '["kelam","kalen","kalım"]'::jsonb, 'kalem|kalen|kalım|kelam', true, 0),
  ('kitap', '["katip","kıtap","kitapç"]'::jsonb, 'kitap|katip|kıtap|kitapç', true, 1),
  ('masa', '["masal","musa","maşa"]'::jsonb, 'masa|masal|maşa|musa', true, 2),
  ('deniz', '["denir","beniz","deniş"]'::jsonb, 'deniz|beniz|denir|deniş', true, 3),
  ('çiçek', '["çilek","çiçem","çicek"]'::jsonb, 'çiçek|çicek|çiçem|çilek', true, 4),
  ('sahil', '["sahip","sakin","sahir"]'::jsonb, 'sahil|sahip|sahir|sakin', true, 5),
  ('orman', '["organ","ortam","orhan"]'::jsonb, 'orman|organ|orhan|ortam', true, 6),
  ('güneş', '["güreş","gümüş","günel"]'::jsonb, 'güneş|gümüş|günel|güreş', true, 7),
  ('yıldız', '["yalnız","yıldır","yıldızlı"]'::jsonb, 'yıldız|yalnız|yıldır|yıldızlı', true, 8),
  ('ırmak', '["ırgat","irmik","ırmaklı"]'::jsonb, 'ırmak|ırgat|ırmaklı|irmik', true, 9),
  ('bahçe', '["bahane","bahri","bahçem"]'::jsonb, 'bahçe|bahane|bahçem|bahri', true, 10),
  ('defter', '["defne","defterim","defterci"]'::jsonb, 'defter|defne|defterci|defterim', true, 11),
  ('renkli', '["renkler","renki","renkçe"]'::jsonb, 'renkli|renkçe|renki|renkler', true, 12),
  ('oyuncu', '["oyunçu","oyuncak","oyunlu"]'::jsonb, 'oyuncu|oyuncak|oyunçu|oyunlu', true, 13),
  ('sevgi', '["sezgi","sergi","sevim"]'::jsonb, 'sevgi|sergi|sevim|sezgi', true, 14),
  ('umutlu', '["unuttu","umuttu","umutla"]'::jsonb, 'umutlu|umutla|umuttu|unuttu', true, 15),
  ('zaman', '["saman","zamanı","zamans"]'::jsonb, 'zaman|saman|zamanı|zamans', true, 16),
  ('şehir', '["nehir","sehir","şehirli"]'::jsonb, 'şehir|nehir|sehir|şehirli', true, 17),
  ('köprü', '["köpük","kömür","köprüm"]'::jsonb, 'köprü|kömür|köprüm|köpük', true, 18),
  ('rüzgar', '["rüzgâr","rüzgarı","rüzgarlı"]'::jsonb, 'rüzgar|rüzgâr|rüzgarı|rüzgarlı', true, 19),
  ('yağmur', '["yamuk","yağma","yağmurlu"]'::jsonb, 'yağmur|yağma|yağmurlu|yamuk', true, 20),
  ('toprak', '["yaprak","toplam","topraklı"]'::jsonb, 'toprak|toplam|topraklı|yaprak', true, 21),
  ('dikkat', '["dikat","dikkât","dikkatli"]'::jsonb, 'dikkat|dikat|dikkât|dikkatli', true, 22),
  ('odaklı', '["odakla","ocaklı","odakçı"]'::jsonb, 'odaklı|ocaklı|odakçı|odakla', true, 23),
  ('hedef', '["heves","heder","hedefli"]'::jsonb, 'hedef|hedefli|heder|heves', true, 24),
  ('başarı', '["başka","başari","başarılı"]'::jsonb, 'başarı|başarılı|başari|başka', true, 25),
  ('anlama', '["anlatma","anlams","anlayan"]'::jsonb, 'anlama|anlams|anlatma|anlayan', true, 26),
  ('okuma', '["okumu","dokuma","okuyan"]'::jsonb, 'okuma|dokuma|okumu|okuyan', true, 27)
on conflict (normalized_key) do update
set
  base_word = excluded.base_word,
  variants = excluded.variants,
  is_active = excluded.is_active,
  sort_order = excluded.sort_order,
  updated_at = now();
