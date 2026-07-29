create extension if not exists pgcrypto;

create table if not exists public.similar_word_pools (
  id uuid primary key default gen_random_uuid(),
  difficulty text not null,
  base_word text not null,
  variants jsonb not null,
  normalized_key text not null,
  is_active boolean not null default true,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint similar_word_pools_difficulty_check
    check (difficulty in ('easy', 'medium', 'hard')),
  constraint similar_word_pools_base_word_check
    check (char_length(btrim(base_word)) between 1 and 80),
  constraint similar_word_pools_variants_check
    check (
      case
        when jsonb_typeof(variants) = 'array' then jsonb_array_length(variants) > 0
        else false
      end
    ),
  constraint similar_word_pools_normalized_key_check
    check (char_length(btrim(normalized_key)) between 1 and 240),
  constraint similar_word_pools_sort_order_check
    check (sort_order >= 0),
  constraint similar_word_pools_difficulty_normalized_key_unique
    unique (difficulty, normalized_key)
);

create index if not exists similar_word_pools_difficulty_active_sort_idx
  on public.similar_word_pools (difficulty, is_active, sort_order);

-- Safe transition phase: server-side reads use the service role helper.
-- Student access will be added explicitly in a later phase once the auth model is finalized.
alter table public.similar_word_pools enable row level security;
alter table public.similar_word_pools force row level security;

revoke all on public.similar_word_pools from anon, authenticated;
grant select, insert, update, delete on public.similar_word_pools to service_role;

create or replace function public.set_updated_at_similar_word_pools()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists set_updated_at_similar_word_pools
  on public.similar_word_pools;
create trigger set_updated_at_similar_word_pools
before update on public.similar_word_pools
for each row execute function public.set_updated_at_similar_word_pools();

insert into public.similar_word_pools (
  difficulty,
  base_word,
  variants,
  normalized_key,
  is_active,
  sort_order
) values
  ('easy', 'masa', '["nasa", "masa"]'::jsonb, 'masa::masa::nasa', true, 0),
  ('easy', 'dere', '["deve", "dore"]'::jsonb, 'dere::deve::dore', true, 1),
  ('easy', 'kitap', '["kitab", "kidap"]'::jsonb, 'kitap::kidap::kitab', true, 2),
  ('easy', 'kalem', '["kalem", "kalen"]'::jsonb, 'kalem::kalem::kalen', true, 3),
  ('easy', 'yol', '["sol", "yol"]'::jsonb, 'yol::sol::yol', true, 4),
  ('easy', 'agac', '["agac", "agaz"]'::jsonb, 'agac::agac::agaz', true, 5),
  ('easy', 'oyun', '["oyun", "oyum"]'::jsonb, 'oyun::oyum::oyun', true, 6),
  ('easy', 'renk', '["denk", "renk"]'::jsonb, 'renk::denk::renk', true, 7),
  ('easy', 'zihin', '["zihim", "zihin"]'::jsonb, 'zihin::zihim::zihin', true, 8),
  ('easy', 'canta', '["santa", "canta"]'::jsonb, 'canta::canta::santa', true, 9),
  ('medium', 'odak', '["odag", "odak"]'::jsonb, 'odak::odag::odak', true, 0),
  ('medium', 'sure', '["sure", "surec"]'::jsonb, 'sure::sure::surec', true, 1),
  ('medium', 'panel', '["panel", "panel"]'::jsonb, 'panel::panel::panel', true, 2),
  ('medium', 'denge', '["denge", "denle"]'::jsonb, 'denge::denge::denle', true, 3),
  ('medium', 'islem', '["islen", "islem"]'::jsonb, 'islem::islem::islen', true, 4),
  ('medium', 'izlem', '["izlen", "izlem"]'::jsonb, 'izlem::izlem::izlen', true, 5),
  ('medium', 'gorus', '["gorus", "gorul"]'::jsonb, 'gorus::gorul::gorus', true, 6),
  ('medium', 'secim', '["secin", "secim"]'::jsonb, 'secim::secim::secin', true, 7),
  ('medium', 'anlam', '["anlam", "anlan"]'::jsonb, 'anlam::anlam::anlan', true, 8),
  ('medium', 'algim', '["algin", "algim"]'::jsonb, 'algim::algim::algin', true, 9),
  ('medium', 'kural', '["kural", "kural"]'::jsonb, 'kural::kural::kural', true, 10),
  ('medium', 'hedef', '["hedef", "hedaf"]'::jsonb, 'hedef::hedaf::hedef', true, 11),
  ('hard', 'kavrama', '["kavrama", "kavrma"]'::jsonb, 'kavrama::kavrama::kavrma', true, 0),
  ('hard', 'farkindalik', '["farkindalik", "farkindaljk"]'::jsonb, 'farkindalik::farkindalik::farkindaljk', true, 1),
  ('hard', 'algilama', '["algilama", "algilana"]'::jsonb, 'algilama::algilama::algilana', true, 2),
  ('hard', 'gorsellik', '["gorsellik", "gorselllk"]'::jsonb, 'gorsellik::gorsellik::gorselllk', true, 3),
  ('hard', 'degerlendirme', '["degerlendirme", "degerlendlrme"]'::jsonb, 'degerlendirme::degerlendirme::degerlendlrme', true, 4),
  ('hard', 'odaklanma', '["odaklanma", "odaklanva"]'::jsonb, 'odaklanma::odaklanma::odaklanva', true, 5),
  ('hard', 'tekrarlama', '["tekrarlama", "tekrarIama"]'::jsonb, 'tekrarlama::tekrarıama::tekrarlama', true, 6),
  ('hard', 'karsilastirma', '["karsilastirma", "karsilastlrma"]'::jsonb, 'karsilastirma::karsilastirma::karsilastlrma', true, 7),
  ('hard', 'secicilik', '["secicilik", "secicllik"]'::jsonb, 'secicilik::secicilik::secicllik', true, 8),
  ('hard', 'uyumluluk', '["uyumluluk", "uyumluluh"]'::jsonb, 'uyumluluk::uyumluluh::uyumluluk', true, 9),
  ('hard', 'strateji', '["strateji", "strateli"]'::jsonb, 'strateji::strateji::strateli', true, 10),
  ('hard', 'performans', '["performans", "performanr"]'::jsonb, 'performans::performanr::performans', true, 11)
on conflict (difficulty, normalized_key) do update
set
  base_word = excluded.base_word,
  variants = excluded.variants,
  is_active = excluded.is_active,
  sort_order = excluded.sort_order,
  updated_at = now();
