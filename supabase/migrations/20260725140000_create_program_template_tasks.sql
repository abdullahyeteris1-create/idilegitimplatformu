-- ============================================================================
-- ELLE KURULAN ODEV SABLONU - GUN/SLOT TABLOSU + DEGISKEN GUN SAYISI
-- ============================================================================
-- Bu migration iki sey yapar:
--   (A) Yeni `program_template_tasks` tablosu - bir sablonun HER gun/slot
--       satirini kalici olarak saklar (ogretmen 20 gun x 5 gorevin her birini
--       tek tek elle secer; rastgele uretim tamamen kalkiyor).
--   (B) Gun sayisi kilidini GEVSETIR: mevcut tablolardaki "= 20" / "between 1
--       and 20" CHECK'leri "between 1 and 60" olarak degistirir - boylece bir
--       sablon 10 gunluk kisa veya 30 gunluk uzun olabilir. Gun basina gorev
--       sayisi (tasks_per_day = 5) KASITLI olarak sabit birakilir.
--
-- GERIYE DONUK GUVENLIK: (B) bir GEVSETMEDIR - mevcut hicbir satiri gecersiz
-- kilmaz (20 hala 1..60 araliginda). Mevcut RPC'lerin (create_student_
-- assignment_program, repair_active_assignment_eye_brain_tasks) govdesindeki
-- 20 sabitleri DEGISTIRILMEZ - o RPC'ler yalniz 20 gunluk programlarla
-- calismaya devam eder, canlidaki tek aktif program da 20 gunluk oldugu icin
-- hicbir sekilde etkilenmez.
--
-- `program_class_exercise_settings` tablosuna DOKUNULMAZ (satirlari dahil) -
-- eski create_student_assignment_program RPC'si ona capraz kontrol yapiyor ve
-- o RPC bozulmamalidir. Yeni akis o tabloya hic yazmaz; asagida yalniz bir
-- "deprecated" yorumu eklenir.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- A. program_template_tasks
-- ----------------------------------------------------------------------------
-- Mevcut student_assignment_program_tasks tablosuyla AYNI alan adlandirmasini
-- kullanir (exercise_slug/category/starting_level/duration_seconds/settings) -
-- boylece program olusturma RPC'si sablon satirlarini gorev satirlarina
-- dogrudan, alan adi cevirisi yapmadan kopyalayabilir.
--
-- category KOLONU BILINCLI OLARAK BURADA SAKLANIR: uygulama katmanindaki
-- katalog (assignmentExerciseCatalog.ts) DB'de yoktur, bu yuzden program
-- uretim RPC'sinin category degerini turetebilecegi bir kaynak gerekir. API
-- katmani bu degeri client'tan DEGIL, katalogdan turetip yazar.
-- ----------------------------------------------------------------------------

create table if not exists public.program_template_tasks (
  id uuid primary key default gen_random_uuid(),
  template_id uuid not null references public.program_class_templates(id) on delete cascade,
  day_number integer not null,
  task_order integer not null,
  exercise_slug text not null,
  category text not null,
  starting_level integer not null default 1,
  duration_seconds integer not null default 300,
  settings jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint program_template_tasks_day_number_check check (day_number between 1 and 60),
  constraint program_template_tasks_task_order_check check (task_order between 1 and 5),
  constraint program_template_tasks_starting_level_check check (starting_level >= 1),
  constraint program_template_tasks_duration_check check (duration_seconds > 0),
  constraint program_template_tasks_settings_is_object_check check (
    jsonb_typeof(settings) = 'object'
  ),
  constraint program_template_tasks_category_not_blank_check check (length(trim(category)) > 0),
  -- Sert dislama listesi - mevcut program_class_exercise_settings ve
  -- student_assignment_program_tasks tablolarindaki AYNI 6 slug. Gelecekte
  -- Akil/Zeka Oyunlari grubuna yeni bir egzersiz eklenirse bu CHECK OTOMATIK
  -- GUNCELLENMEZ; API katmanindaki katalog-tabanli allowlist (yalniz
  -- integrationStatus='ready' olan slug'lar) ikinci savunma katmanidir.
  constraint program_template_tasks_exercise_slug_not_banned check (
    exercise_slug not in (
      'kelime-tahmin',
      'adam-asmaca',
      'gorsel-puzzle',
      'dikkat-labirenti',
      'goz-calismasi',
      'parcali-resim-kelime'
    )
  ),
  -- Bir sablonda ayni gun/sira ikilisi yalniz bir kez bulunabilir.
  constraint program_template_tasks_template_day_order_uidx unique (template_id, day_number, task_order),
  -- KULLANICI KURALI: ayni gun icinde ayni egzersiz birden fazla kez
  -- kullanilamaz. Bu, yalniz UI seviyesinde degil DB seviyesinde de garanti
  -- edilir (mevcut create_student_assignment_program RPC'sindeki ayni-gun
  -- tekrar yasagiyla tutarli).
  constraint program_template_tasks_template_day_slug_uidx unique (template_id, day_number, exercise_slug)
);

-- Sablon editorunun ve program uretim RPC'sinin ana okuma deseni:
-- "bir sablonun tum slotlarini gun/sira sirasiyla getir".
create index if not exists program_template_tasks_template_order_idx
  on public.program_template_tasks (template_id, day_number, task_order);

alter table public.program_template_tasks enable row level security;
alter table public.program_template_tasks force row level security;

revoke all on public.program_template_tasks from anon, authenticated;

drop trigger if exists set_updated_at_program_template_tasks on public.program_template_tasks;
create trigger set_updated_at_program_template_tasks
before update on public.program_template_tasks
for each row execute function public.set_student_assignment_updated_at();

comment on table public.program_template_tasks is
  'Bir odev sablonunun elle kurulmus gun/slot satirlari (gun x 5 gorev). Ogretmen her '
  'slotu tek tek secer - rastgele uretim YOKTUR. Program olusturma RPC''si '
  '(create_student_assignment_program_from_template) bu satirlari client payload''i '
  'olmadan, dogrudan sunucuda okuyup ogrencinin gorev satirlarina kopyalar.';

comment on table public.program_class_exercise_settings is
  'DEPRECATED (elle kurulan sablon sistemine gecildi): bu tablo yalniz eski, artik '
  'kullanilmayan agirlikli-rastgele uretim akisi ve onun create_student_assignment_program '
  'RPC''si icin durur. Yeni sablonlar program_template_tasks tablosunda yasar. Mevcut '
  'satirlar ve RPC bagimliligi bozulmasin diye tablo KALDIRILMADI.';

-- ----------------------------------------------------------------------------
-- B. Gun sayisi kilidinin gevsetilmesi (= 20  ->  1..60)
-- ----------------------------------------------------------------------------
-- Her constraint once dusurulur, sonra genis haliyle yeniden eklenir. "if
-- exists" / "if not exists" desenleri migration'i idempotent tutar.
-- ----------------------------------------------------------------------------

alter table public.program_class_templates
  drop constraint if exists program_class_templates_program_days_check;

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'program_class_templates_program_days_range_check'
      and conrelid = 'public.program_class_templates'::regclass
  ) then
    alter table public.program_class_templates
      add constraint program_class_templates_program_days_range_check
      check (program_days between 1 and 60);
  end if;
end
$$;

alter table public.student_assignment_programs
  drop constraint if exists student_assignment_programs_total_days_check;

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'student_assignment_programs_total_days_range_check'
      and conrelid = 'public.student_assignment_programs'::regclass
  ) then
    alter table public.student_assignment_programs
      add constraint student_assignment_programs_total_days_range_check
      check (total_days between 1 and 60);
  end if;
end
$$;

alter table public.student_assignment_program_days
  drop constraint if exists student_assignment_program_days_day_number_check;

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'student_assignment_program_days_day_number_range_check'
      and conrelid = 'public.student_assignment_program_days'::regclass
  ) then
    alter table public.student_assignment_program_days
      add constraint student_assignment_program_days_day_number_range_check
      check (day_number between 1 and 60);
  end if;
end
$$;

alter table public.student_assignment_program_tasks
  drop constraint if exists student_assignment_program_tasks_day_number_check;

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'student_assignment_program_tasks_day_number_range_check'
      and conrelid = 'public.student_assignment_program_tasks'::regclass
  ) then
    alter table public.student_assignment_program_tasks
      add constraint student_assignment_program_tasks_day_number_range_check
      check (day_number between 1 and 60);
  end if;
end
$$;
