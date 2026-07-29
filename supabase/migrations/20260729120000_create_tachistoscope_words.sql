create extension if not exists pgcrypto;

create table if not exists public.tachistoscope_words (
  id uuid primary key default gen_random_uuid(),
  level integer not null,
  word text not null,
  normalized_key text not null,
  is_active boolean not null default true,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint tachistoscope_words_level_check
    check (level between 1 and 15),
  constraint tachistoscope_words_word_check
    check (char_length(btrim(word)) between 1 and 80),
  constraint tachistoscope_words_normalized_key_check
    check (char_length(btrim(normalized_key)) between 1 and 80),
  constraint tachistoscope_words_sort_order_check
    check (sort_order >= 0),
  constraint tachistoscope_words_level_normalized_key_unique
    unique (level, normalized_key)
);

create index if not exists tachistoscope_words_level_active_sort_idx
  on public.tachistoscope_words (level, is_active, sort_order);

alter table public.tachistoscope_words enable row level security;
alter table public.tachistoscope_words force row level security;

revoke all on public.tachistoscope_words from anon, authenticated;
grant select, insert, update, delete on public.tachistoscope_words to service_role;

create or replace function public.set_updated_at_tachistoscope_words()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists set_updated_at_tachistoscope_words on public.tachistoscope_words;
create trigger set_updated_at_tachistoscope_words
before update on public.tachistoscope_words
for each row execute function public.set_updated_at_tachistoscope_words();

with seed_rows(level, word, sort_order) as (
  select 1 as level, word, ordinality - 1 as sort_order
  from unnest(array['a', 'e', 'ı', 'i', 'o', 'ö', 'u', 'ü']) with ordinality as items(word, ordinality)

  union all

  select 2 as level, word, ordinality - 1 as sort_order
  from unnest(array['su', 'ev', 'el', 'at', 'ok', 'ay', 'ot', 'ip', 'iz', 'un', 'ad', 'an']) with ordinality as items(word, ordinality)

  union all

  select 3 as level, word, ordinality - 1 as sort_order
  from unnest(array['kuş', 'top', 'gül', 'arı', 'yol', 'oda', 'cam', 'kar', 'yaz', 'göz', 'ses', 'bal', 'taş', 'çay', 'köy', 'nar', 'fil', 'dal']) with ordinality as items(word, ordinality)

  union all

  select 4 as level, word, ordinality - 1 as sort_order
  from unnest(array['masa', 'kedi', 'okul', 'renk', 'oyun', 'spor', 'mavi', 'sarı', 'anne', 'baba', 'aile', 'elma', 'kapı', 'hava', 'dere', 'saat', 'park', 'ders', 'kule', 'lale']) with ordinality as items(word, ordinality)

  union all

  select 5 as level, word, ordinality - 1 as sort_order
  from unnest(array['kitap', 'kalem', 'köpek', 'çiçek', 'bulut', 'güneş', 'deniz', 'orman', 'bahçe', 'tahta', 'sevgi', 'saygı', 'masal', 'bilgi', 'şeker', 'çanta', 'meyve', 'güzel', 'mutlu', 'ekran']) with ordinality as items(word, ordinality)

  union all

  select 6 as level, word, ordinality - 1 as sort_order
  from unnest(array['defter', 'hikaye', 'başarı', 'dikkat', 'yardım', 'oyuncu', 'sevinç', 'hayvan', 'doktor', 'ressam', 'sinema', 'bilmek', 'görmek', 'yazmak', 'gezmek', 'sevmek']) with ordinality as items(word, ordinality)

  union all

  select 7 as level, word, ordinality - 1 as sort_order
  from unnest(array['öğrenci', 'arkadaş', 'kelebek', 'çalışma', 'meraklı', 'oyuncak', 'uçurtma', 'resimli', 'müzikli', 'bulutlu', 'güneşli', 'denizci', 'çiçekçi', 'okuyucu']) with ordinality as items(word, ordinality)

  union all

  select 8 as level, word, ordinality - 1 as sort_order
  from unnest(array['öğretmen', 'yardımcı', 'başarılı', 'çalışkan', 'düşünmek', 'kitaplık', 'bilimsel', 'dikkatli', 'anlatmak', 'dinlemek', 'öğrenmek', 'gelişmek', 'mutluluk', 'güvenmek', 'başlamak', 'hazırlık', 'bisiklet', 'telefon']) with ordinality as items(word, ordinality)

  union all

  select 9 as level, word, ordinality - 1 as sort_order
  from unnest(array['kütüphane', 'anlayışlı', 'paylaşmak', 'cesaretli', 'odaklanma', 'araştırma', 'deneyimli', 'düşünceli', 'planlama', 'başarılar', 'gözlemler', 'yenilikçi']) with ordinality as items(word, ordinality)

  union all

  select 10 as level, word, ordinality - 1 as sort_order
  from unnest(array['bilgisayar', 'sorumluluk', 'gülümsemek', 'öğrenciler', 'arkadaşlar', 'alışkanlık', 'odaklanmak', 'paylaşmayı', 'gözlemleme', 'güvenilir', 'hazırlanmak']) with ordinality as items(word, ordinality)

  union all

  select 11 as level, word, ordinality - 1 as sort_order
  from unnest(array['kütüphaneci', 'gözlemlemek', 'dikkatlilik', 'çalışkanlık', 'geliştirmek', 'hızlandırmak', 'güvenilirlik', 'okuyabilmek', 'bilinçlenmek', 'değerlendir', 'odaklanıyor']) with ordinality as items(word, ordinality)

  union all

  select 12 as level, word, ordinality - 1 as sort_order
  from unnest(array['başarabiliriz', 'öğrencilerim', 'alışkanlıklar', 'paylaşabilmek', 'başarılarımız', 'deneyimlerim', 'okuduklarımız', 'anladıkların', 'gözlemliyord', 'odaklanırsın']) with ordinality as items(word, ordinality)

  union all

  select 13 as level, word, ordinality - 1 as sort_order
  from unnest(array['karşılaştırma', 'sonuçlandırma', 'hazırlanabilir', 'odaklanıyoruz', 'geliştiriyoruz', 'dinleyebiliriz', 'uygulamalarım', 'öğrenebilirim']) with ordinality as items(word, ordinality)

  union all

  select 14 as level, word, ordinality - 1 as sort_order
  from unnest(array['sorumlulukları', 'öğrendiklerimiz', 'hatırlayabilir', 'yorumlayabilir', 'odaklanabilmek', 'bilgilendirme', 'değerlendirme']) with ordinality as items(word, ordinality)

  union all

  select 15 as level, word, ordinality - 1 as sort_order
  from unnest(array['odaklanabilmeli', 'değerlendirmeli', 'anlamlandırmalı', 'sorumluluklarım', 'hatırlayabilecek', 'yorumlayabilecek', 'öğretmenlerimiz', 'karşılaştıracak']) with ordinality as items(word, ordinality)
)
insert into public.tachistoscope_words (
  level,
  word,
  normalized_key,
  is_active,
  sort_order
)
select
  level,
  word,
  word as normalized_key,
  true as is_active,
  sort_order
from seed_rows
on conflict (level, normalized_key) do update
set
  word = excluded.word,
  is_active = excluded.is_active,
  sort_order = excluded.sort_order,
  updated_at = now();
