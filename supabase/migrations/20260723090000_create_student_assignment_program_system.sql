-- ============================================================================
-- 20 GUNLUK KILITLI ODEV PROGRAMI - FAZ 0 VERI MODELI (denetim sonrasi revize)
-- ============================================================================
-- Bu migration tamamen EKLEYICI (additive) bir paralel sistemdir.
-- Mevcut daily_assignments / daily_assignment_items tablolarina, onlarin
-- kodlarina veya davranisina HICBIR sekilde dokunulmaz; o sistem calismaya
-- devam eder. Yeni "20 gun x 5 gorev = 100 gorev, sabit/kilitli, sinif
-- grubuna gore ayarlanabilir" program modeli asagidaki yeni tablolarda yasar.
--
-- ISIMLENDIRME KARARI: Tablo adlari "reading_programs/.../..." yerine
-- "student_assignment_program*" olarak seçildi, cunku program yalniz okuma
-- degil; dikkat, hafiza ve goz kategorilerini de icerir ("reading" yanlis
-- cagrisim yapardi). Ayni zamanda mevcut "daily_assignment*" isimlendirmesiyle
-- karismayacak, ama ayni "assignment" kavram ailesinde oldugunu acikca
-- gosteren bir on ek secildi.
--
-- ALAN ADI DUZELTMESI: Katalogdaki (src/lib/assignments/exerciseCatalog.ts)
-- "resultExerciseType" alani BENZERSIZ DEGIL - ornegin "eye-muscle" hem
-- goz-kaslari hem goz-calismasi slug'larinda, "memory-game" ise hem
-- hafiza-gelistirme hem kart-hafiza hem parcali-resim-kelime slug'larinda
-- tekrar ediyor. Bu yuzden asagidaki tablolarda egzersiz kimligi icin
-- "exercise_type" degil, mevcut daily_assignment_items tablosuyla ayni
-- tutarlilikta ve benzersiz olan "exercise_slug" (katalogdaki gercek `slug`
-- alani, ör. "kare-gorme-alani", "takistoskop") kullanilir. Ayni sebeple
-- teklif edilen "category_key" yerine mevcut tabloyla birebir tutarli olan
-- "category" adi kullanilir.
--
-- v1 SABITLERI: Program tam 20 gun, gun basina tam 5 gorev olacak sekilde
-- sabitlenmistir (program_class_templates VE student_assignment_programs
-- uzerinde `= 20` / `= 5` CHECK'leri ile). Ileride bu degerleri esnetmek
-- istenirse yeni bir migration gerekir - bu v1 icin bilincli bir tercihtir.
--
-- GENERATION_SEED: student_assignment_programs.generation_seed, program
-- uretiminin deterministic ve izlenebilir olmasi icindir (ayni taslak tekrar
-- uretildiginde ayni dagilimin uretilebilmesi, onizleme/onay akisinin
-- izlenebilir olmasi). Migration bu degeri KENDISI URETMEZ (rastgele veya
-- zaman damgasi tabanli bir DEFAULT yok) - deger program olusturma
-- API/RPC'si tarafindan (henuz bu turda yazilmiyor) acikca saglanmalidir;
-- kolon NOT NULL oldugu icin bu deger olmadan insert yapilamaz. Mevcut kod
-- henuz bu tabloya insert yapmadigi icin bunun geriye donuk uyumluluk etkisi
-- yoktur.
--
-- DISLANAN EGZERSIZLER - iki ayri kategori (katalogdan dogrulanmis gercek
-- slug degerleri):
--   (a) KULLANICI TARAFINDAN PASIF (katalogda assignmentEnabled:false):
--       - goz-calismasi        ("Goz Calismasi", resultExerciseType=eye-muscle)
--       - parcali-resim-kelime ("Parcali Resim Kelime", resultExerciseType=memory-game)
--   (b) AKIL VE ZEKA OYUNLARI NEDENIYLE DISLANAN (katalogda assignmentEnabled:true,
--       yalniz src/app/egzersizler/ExercisesCenterClient.tsx ve
--       src/components/exercises-preview/exercisePreviewGroups.ts'teki UI
--       gruplamasindan dislaniyor - katalogun kendi `category` alaninda
--       "word-games" diye bir deger YOK, bu 4 slug "attention"/"memory"
--       olarak isaretli):
--       - kelime-tahmin (word-guess)
--       - adam-asmaca (hangman)
--       - gorsel-puzzle (visual-puzzle)
--       - dikkat-labirenti (attention-maze)
-- Bu 6 slug, program_class_exercise_settings VE
-- student_assignment_program_tasks tablolarina CHECK constraint ile DB
-- seviyesinde hic satir olarak eklenemez hale getirilir. Bu, "yalniz UI
-- seviyesinde dislama olmamali" gereksinimini migration/veri seviyesinde
-- karsilayan sert bir guvenlik agidir - ama DB CHECK yalniz BUGUN BILINEN
-- slug'lari engeller. Akil ve Zeka Oyunlari kategorisine ileride yeni bir
-- egzersiz eklenirse (katalogda "word-games" diye ayri bir deger olmadigi
-- icin kategoriye dayali bir CHECK yazilamaz), bu CHECK'i otomatik
-- GUNCELLEMEZ - hem yeni slug'i buraya ekleyen ek bir migration, HEM DE
-- program uretim API/RPC'sinde katalog tabanli acik bir server-side
-- allowlist (bu CHECK'ten bagimsiz, ikinci bir savunma katmani) gerekir.
--
-- SNAPSHOT PRENSIBI: student_assignment_program_tasks, olusturuldugu anda
-- program_class_exercise_settings'ten starting_level/duration_seconds/
-- settings degerlerini KOPYALAR (current_level de starting_level ile ayni
-- deger olarak, program uretim RPC'si tarafindan insert aninda yazilir -
-- SQL DEFAULT bir kolonun degerini baska bir kolona esitleyemedigi icin bu
-- kolonda varsayilan deger YOKTUR, RPC acikca saglamalidir). Sinif sablonu
-- sonradan degisirse zaten olusturulmus programlar ETKILENMEZ - hicbir
-- foreign key veya view bu degerleri sablondan "canli" okumaz.
--
-- GUN/GOREV KILIDI: Bir gunun 5 gorevi ayni anda `available` olabilir (gorev
-- ici zorunlu sira YOK, kullanicinin kurali yalniz gun seviyesinde kilit
-- istiyor). Sonraki gun, YALNIZ mevcut gunun 5 gorevi de tamamlandiginda
-- acilir. Tam-5-gorev / tam-100-gorev sayisi CHECK/FK ile garanti
-- EDILEMEZ (Postgres tek-satir/cross-tablo sayim yapamaz) - bu, program
-- uretim RPC'sinin (henuz yazilmiyor) transaction icinde dogrulamasi
-- gereken bir sorumluluktur.
--
-- SURE DOLUMU: Sure dolan bir gorev BASARISIZ/expired sayilmaz - kullanicinin
-- acik kurali: "Tebrikler, calismayi tamamladiniz." mesaji gosterilip gorev
-- GUVENLI BICIMDE TAMAMLANIR. Bu yuzden status listesinde ayri bir 'expired'
-- degeri YOKTUR; sure dolumu da normal tamamlanmis sonuc da ayni
-- `status='completed'` degerine gider, aralarindaki tek fark
-- `completion_reason` alanidir ('result_submitted' | 'time_expired').
--
-- RESULT ILISKISI (cift yonlu, kasitli): student_assignment_program_tasks.
-- result_id -> exercise_results.id (gorev-merkezli okuma, ör. 20 gunluk
-- programi render ederken tek tablo okumasi yeterli olsun diye) VE
-- exercise_results.program_task_id -> student_assignment_program_tasks.id
-- (result-merkezli okuma/raporlama icin) ikisi de korunmustur - bunlar
-- FARKLI, mesru sorgu yonlerine hizmet eder. SQL seviyesinde bu iki
-- kolonun BIRBIRINE dogru eslestigi (task.result_id=A iken A.program_task_id
-- de ayni task'a isaret etsin) garanti EDILEMEZ - bu, gelecekteki tamamlama
-- RPC'sinin YALNIZ KENDISI bu iki kolona atomik olarak yazmasi gereken,
-- prosedurel (semaya degil, is kuraliyla saglanan) bir invaryanttir.
--
-- HARD DELETE YERINE CANCELLED: Aktif/tamamlanmis programlarin fiziksel
-- olarak silinmesi ONERILMEZ - uygulama katmani `status='cancelled'`
-- kullanmalidir. Foreign key'ler yapisal olarak cascade silmeyi
-- DESTEKLER (ör. bir program silinirse gunleri ve gorevleri de silinir),
-- ama bu, gecmisin korunmasi gereken normal akis DEGILDIR.
--
-- BU MIGRATION UYGULANMAYACAK (yalniz taslak olarak yazilir).
-- ============================================================================

create extension if not exists pgcrypto;

-- ----------------------------------------------------------------------------
-- A. program_class_templates
-- Sinif grubu basina genel program sablonu (20 gun / 5 gorev / varsayilan
-- gorev suresi gibi ust-duzey ayarlar).
-- ----------------------------------------------------------------------------
create table if not exists public.program_class_templates (
  id uuid primary key default gen_random_uuid(),
  class_group text not null,
  name text not null,
  description text,
  -- v1 sabiti: program her zaman 20 gun, gun basina her zaman 5 gorev
  -- olacak sekilde tasarlandi (bkz. dosya basindaki "v1 SABITLERI" notu).
  program_days integer not null default 20,
  tasks_per_day integer not null default 5,
  default_task_duration_seconds integer not null default 300,
  is_active boolean not null default true,
  created_by text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint program_class_templates_class_group_check check (
    class_group in (
      'grade_1',
      'grade_2',
      'grade_3',
      'grade_4',
      'grade_5_6',
      'grade_7_8',
      'high_school',
      'general'
    )
  ),
  constraint program_class_templates_program_days_check check (program_days = 20),
  constraint program_class_templates_tasks_per_day_check check (tasks_per_day = 5),
  constraint program_class_templates_duration_check check (default_task_duration_seconds > 0)
);

-- Not: class_group uzerinde UNIQUE kasten konmadi - bir sinif grubu icin
-- birden fazla sablon (taslak/varyant) bulunabilir; hangisinin kullanilacagi
-- program olusturma aninda (bu turda yazilmayan) uygulama katmaninda secilir.
-- is_active alani "su an onerilen/gecerli" sablonu isaretlemek icindir.

create index if not exists program_class_templates_class_group_idx
  on public.program_class_templates (class_group);

-- ----------------------------------------------------------------------------
-- B. program_class_exercise_settings
-- Bir sablon icin egzersiz bazli ayarlar (baslangic seviyesi, sure, JSON
-- ayarlar). Program uretimi bu tablodaki satirlardan gorev havuzunu olusturur
-- (uretim kodu bu turda yazilmiyor).
-- ----------------------------------------------------------------------------
create table if not exists public.program_class_exercise_settings (
  id uuid primary key default gen_random_uuid(),
  template_id uuid not null references public.program_class_templates(id) on delete cascade,
  exercise_slug text not null,
  enabled boolean not null default true,
  starting_level integer not null default 1,
  duration_seconds integer not null default 300,
  settings jsonb not null default '{}'::jsonb,
  -- enabled=true iken daily_weight=0 bilincli olarak IZINLI birakildi:
  -- ogretmenin bir egzersizi satiri silmeden/tamamen kapatmadan gecici
  -- olarak "havuzda ama hic secilmesin" yapmasi icin kullanilabilir. Bu
  -- ikisinin birlikte ne anlama geldigine (ör. weight=0 -> asla secme)
  -- program uretim API'si karar verecek, migration seviyesinde
  -- yasaklanmiyor.
  daily_weight integer not null default 1,
  repeat_cooldown_days integer not null default 0,
  max_occurrences_per_program integer,
  display_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint program_class_exercise_settings_starting_level_check check (starting_level >= 1),
  constraint program_class_exercise_settings_duration_check check (duration_seconds > 0),
  constraint program_class_exercise_settings_daily_weight_check check (daily_weight >= 0),
  constraint program_class_exercise_settings_cooldown_check check (repeat_cooldown_days >= 0),
  constraint program_class_exercise_settings_max_occurrences_check check (
    max_occurrences_per_program is null or max_occurrences_per_program > 0
  ),
  constraint program_class_exercise_settings_display_order_check check (display_order >= 0),
  constraint program_class_exercise_settings_settings_is_object_check check (
    jsonb_typeof(settings) = 'object'
  ),
  -- Sert dislama listesi (bkz. dosya basindaki "DISLANAN EGZERSIZLER" notu):
  --   (a) kullanici tarafindan pasif: goz-calismasi, parcali-resim-kelime
  --   (b) Akil ve Zeka Oyunlari nedeniyle dislanan: kelime-tahmin,
  --       adam-asmaca, gorsel-puzzle, dikkat-labirenti
  -- Bu 6 slug icin bu tabloda HICBIR satir olusturulamaz (enabled degeri ne
  -- olursa olsun). Gelecekte (b) grubuna yeni egzersiz eklenirse bu CHECK
  -- otomatik guncellenmez - server allowlist ile ayrica korunmalidir
  -- (bkz. dosya basi).
  constraint program_class_exercise_settings_exercise_slug_not_banned check (
    exercise_slug not in (
      'kelime-tahmin',
      'adam-asmaca',
      'gorsel-puzzle',
      'dikkat-labirenti',
      'goz-calismasi',
      'parcali-resim-kelime'
    )
  ),
  constraint program_class_exercise_settings_template_slug_uidx unique (template_id, exercise_slug)
);

create index if not exists program_class_exercise_settings_template_idx
  on public.program_class_exercise_settings (template_id, display_order);

-- ----------------------------------------------------------------------------
-- C. student_assignment_programs
-- Bir ogrenciye atanmis 20 gunluk program basligi.
-- ----------------------------------------------------------------------------
create table if not exists public.student_assignment_programs (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references public.students(id) on delete cascade,
  assigned_by text,
  template_id uuid references public.program_class_templates(id) on delete set null,
  class_group text not null,
  -- Program uretiminin deterministic/izlenebilir olmasi icin zorunlu;
  -- migration varsayimsal bir deger URETMEZ, program olusturma
  -- API/RPC'si acikca saglamalidir (bkz. dosya basi "GENERATION_SEED" notu).
  generation_seed text not null,
  status text not null default 'draft',
  start_date date,
  -- v1 sabiti: bkz. program_class_templates'teki ayni not.
  total_days integer not null default 20,
  tasks_per_day integer not null default 5,
  completed_days integer not null default 0,
  activated_at timestamptz,
  completed_at timestamptz,
  cancelled_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint student_assignment_programs_class_group_check check (
    class_group in (
      'grade_1',
      'grade_2',
      'grade_3',
      'grade_4',
      'grade_5_6',
      'grade_7_8',
      'high_school',
      'general'
    )
  ),
  constraint student_assignment_programs_status_check check (
    status in ('draft', 'active', 'completed', 'cancelled')
  ),
  constraint student_assignment_programs_total_days_check check (total_days = 20),
  constraint student_assignment_programs_tasks_per_day_check check (tasks_per_day = 5),
  constraint student_assignment_programs_completed_days_check check (completed_days >= 0),
  -- Basit, tek-satir status/zaman butunlugu (cross-table olmadigi icin
  -- trigger gerekmez). Bilerek asiri siki tutulmadi: `active` icin
  -- `activated_at` zorunlulugu ya da result_id'ye bagli bir kural YOK.
  constraint student_assignment_programs_completed_at_check check (
    status <> 'completed' or completed_at is not null
  ),
  constraint student_assignment_programs_cancelled_at_check check (
    status <> 'cancelled' or cancelled_at is not null
  ),
  -- Composite FK hedefi: student_assignment_program_tasks(program_id,
  -- student_id) buraya (id, student_id) olarak baglanacak. id zaten PRIMARY
  -- KEY oldugu icin bu constraint mantiken bir "superset" ama Postgres
  -- composite FK hedefinin TAM olarak bu iki kolonu kapsayan kendi unique
  -- constraint'ine ihtiyaç duyuyor - bu yuzden ayrica tanimlanmasi gerekir.
  constraint student_assignment_programs_id_student_uidx unique (id, student_id)
);

-- template_id kasten ON DELETE SET NULL: sablon silinse bile atanmis
-- programlarin gecmisi kaybolmamali (snapshot prensibi zaten tum calisan
-- degerleri task satirlarina kopyalar, bu FK yalniz provenance/izlenebilirlik
-- icindir).

-- Yalniz "active" durumundaki program tekil olsun (kullanicinin bu turdaki
-- kesin kurali: "Aynı öğrenci için aynı anda yalnızca bir active program").
-- Taslaklar (draft) bu kisitlamanin DISINDA tutuldu - bir ogretmenin, mevcut
-- aktif program surerken sonraki programi taslak olarak onceden hazirlamasi
-- engellenmemeli. Ayni ogrenci icin ayni anda birden fazla taslak teknik
-- olarak mumkun; bunu sinirlayan ikinci bir is kurali (istenirse) program
-- olusturma API/RPC katmaninda uygulanacak, bu migration'da degil.
create unique index if not exists student_assignment_programs_one_active_per_student_uidx
  on public.student_assignment_programs (student_id)
  where status = 'active';

create index if not exists student_assignment_programs_student_idx
  on public.student_assignment_programs (student_id);

create index if not exists student_assignment_programs_status_idx
  on public.student_assignment_programs (status);

-- ----------------------------------------------------------------------------
-- D. student_assignment_program_days
-- Programin 20 kilitli/acilir gunu.
-- ----------------------------------------------------------------------------
create table if not exists public.student_assignment_program_days (
  id uuid primary key default gen_random_uuid(),
  program_id uuid not null references public.student_assignment_programs(id) on delete cascade,
  day_number integer not null,
  status text not null default 'locked',
  available_at timestamptz,
  started_at timestamptz,
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint student_assignment_program_days_status_check check (
    status in ('locked', 'available', 'in_progress', 'completed')
  ),
  -- day_number'in gercek ust siniri ebeveyn satirdaki total_days'e baglidir;
  -- total_days artik v1'de sabit 20 oldugu icin (bkz. yukarida), bu sabit
  -- ust sinir gercek is kuraliyla tam uyumludur.
  constraint student_assignment_program_days_day_number_check check (day_number between 1 and 20),
  -- Gercek is kurali: bir programda ayni day_number'dan yalniz bir tane olsun.
  constraint student_assignment_program_days_program_day_uidx unique (program_id, day_number),
  -- Composite FK hedefi: student_assignment_program_tasks(program_day_id,
  -- program_id, day_number) buraya (id, program_id, day_number) olarak
  -- baglanacak. Yukaridaki unique(program_id, day_number) ile AYNI SEY
  -- DEGIL: o gercek is kuralini (bir programda tekil day_number) saglar, bu
  -- ise composite FK'nin teknik olarak ihtiyac duydugu, id'yi de iceren ayri
  -- bir unique hedefidir - ikisi de gereklidir, birbirinin yerine gecmez.
  constraint student_assignment_program_days_id_program_daynum_uidx unique (id, program_id, day_number),
  -- Basit, tek-satir status/zaman butunlugu.
  constraint student_assignment_program_days_completed_at_check check (
    status <> 'completed' or completed_at is not null
  ),
  constraint student_assignment_program_days_in_progress_started_check check (
    status <> 'in_progress' or started_at is not null
  )
);

create index if not exists student_assignment_program_days_status_idx
  on public.student_assignment_program_days (status);

-- ----------------------------------------------------------------------------
-- E. student_assignment_program_tasks
-- Her gunun kalici 5 gorevi + sablon-anlik-goruntusu (snapshot) ayarlari.
-- ----------------------------------------------------------------------------
create table if not exists public.student_assignment_program_tasks (
  id uuid primary key default gen_random_uuid(),
  program_id uuid not null,
  program_day_id uuid not null,
  -- student_id icin dogrudan students(id) FK'si BILINCLI olarak korunuyor
  -- (asagidaki composite FK ile teorik olarak transitif kapsansa da) -
  -- mevcut daily_assignment_items tablosu da assignment_id uzerinden
  -- dolayli baglantiya ragmen student_id icin ayri, dogrudan bir FK
  -- tutuyor; ayni desen, ayni gerekce ile burada da korunur (acik,
  -- kendi kendini belgeleyen, tek-hop bir garanti).
  student_id uuid not null references public.students(id) on delete cascade,
  day_number integer not null,
  task_order integer not null,
  exercise_slug text not null,
  exercise_title text,
  category text,
  status text not null default 'locked',
  starting_level integer not null default 1,
  -- current_level icin KASITLI olarak DEFAULT YOK: SQL DEFAULT bir kolonun
  -- degerini ayni satirdaki baska bir kolona (starting_level) esitleyemez.
  -- current_level, starting_level ile ayni degerde baslamalidir - bu yuzden
  -- program uretim RPC'si (henuz yazilmiyor) insert aninda starting_level
  -- ve current_level'a ACIKCA AYNI degeri yazmak ZORUNDADIR; kolon NOT NULL
  -- oldugu icin bunu atlayan bir insert basarisiz olur. Mevcut kod henuz bu
  -- tabloya insert yapmadigi icin geriye donuk uyumluluk etkisi yoktur.
  current_level integer not null,
  duration_seconds integer not null default 300,
  settings jsonb not null default '{}'::jsonb,
  started_at timestamptz,
  expires_at timestamptz,
  completed_at timestamptz,
  completion_reason text,
  result_id uuid references public.exercise_results(id) on delete set null,
  last_heartbeat_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint student_assignment_program_tasks_day_number_check check (day_number between 1 and 20),
  -- task_order araligi DB tarafindan korunur (1..5); bir gunde GERCEKTEN tam
  -- 5 satir (ne eksik ne fazla) bulundugunu CHECK/FK garanti EDEMEZ -
  -- Postgres tek-satir/cross-tablo sayim yapamaz. Bu, program uretim
  -- RPC'sinin (henuz yazilmiyor) transaction icinde ("her gun icin tam 5
  -- satir olusturuldu mu") dogrulamasi gereken bir sorumluluktur.
  constraint student_assignment_program_tasks_task_order_check check (task_order between 1 and 5),
  -- 'expired' durumu KASITLI olarak YOK: sure dolumu basarisizlik degil,
  -- guvenli bir tamamlanma halidir (bkz. dosya basi "SURE DOLUMU" notu).
  -- Hem gercek sonucla hem sure dolumuyla tamamlanma `status='completed'`
  -- olur; aralarindaki fark yalniz `completion_reason` alanindadir.
  constraint student_assignment_program_tasks_status_check check (
    status in ('locked', 'available', 'in_progress', 'completed', 'cancelled')
  ),
  constraint student_assignment_program_tasks_starting_level_check check (starting_level >= 1),
  constraint student_assignment_program_tasks_current_level_check check (current_level >= 1),
  constraint student_assignment_program_tasks_duration_check check (duration_seconds > 0),
  constraint student_assignment_program_tasks_settings_is_object_check check (
    jsonb_typeof(settings) = 'object'
  ),
  -- En guvenli minimum yaklasim: yalniz izinli deger listesi. Status ile
  -- birebir zorunluluk (ör. "completed+result_submitted ise result_id NOT
  -- NULL olsun") KASITLI olarak eklenmedi - result_id'nin mevcut
  -- `ON DELETE SET NULL` davranisiyla (bir exercise_results satiri
  -- silindiginde) cakisir ve o DELETE islemini basarisiz kilabilirdi.
  constraint student_assignment_program_tasks_completion_reason_check check (
    completion_reason is null or completion_reason in ('result_submitted', 'time_expired')
  ),
  -- Basit, tek-satir status/zaman butunlugu. Bilerek asiri siki tutulmadi:
  -- result_id'ye zorunluluk YOK (yukaridaki gerekce); locked/available icin
  -- started_at'in kesin NULL olmasi ZORUNLU KILINMADI (yalniz completed_at
  -- icin), cunku bu gereksiz yere kisitlayici olabilir; cancelled durumunda
  -- eski started_at/expires_at/completed_at degerlerinin kalabilmesine izin
  -- verilir (bilerek kisitlanmadi).
  constraint student_assignment_program_tasks_completed_at_check check (
    (status in ('locked', 'available') and completed_at is null)
    or (status = 'completed' and completed_at is not null)
    or status in ('in_progress', 'cancelled')
  ),
  constraint student_assignment_program_tasks_in_progress_times_check check (
    status <> 'in_progress' or (started_at is not null and expires_at is not null)
  ),
  constraint student_assignment_program_tasks_expires_needs_started_check check (
    expires_at is null or started_at is not null
  ),
  constraint student_assignment_program_tasks_expires_after_start_check check (
    started_at is null or expires_at is null or expires_at > started_at
  ),
  -- Sert dislama listesi: program_class_exercise_settings'teki ayni liste
  -- (bkz. yukarida, ayni iki kategori ayrimi gecerli). Program uretim
  -- kodunda bir hata olsa bile yasakli bir egzersiz gorev olarak DB'ye
  -- yazilamaz; gelecekte yeni bir Akil/Zeka egzersizi eklenirse bu CHECK
  -- otomatik guncellenmez, server allowlist ile ayrica korunmalidir.
  constraint student_assignment_program_tasks_exercise_slug_not_banned check (
    exercise_slug not in (
      'kelime-tahmin',
      'adam-asmaca',
      'gorsel-puzzle',
      'dikkat-labirenti',
      'goz-calismasi',
      'parcali-resim-kelime'
    )
  ),
  constraint student_assignment_program_tasks_day_task_order_uidx unique (program_day_id, task_order),
  -- KRITIK BUTUNLUK DUZELTMESI (denetimde bulundu): tek-kolon FK'ler yerine
  -- composite FK'ler kullanilarak, bir gorevin YALNIZ dogru programa, dogru
  -- gune, dogru day_number'a VE dogru ogrenciye bagli olabilmesi trigger
  -- olmadan, veritabani seviyesinde garanti edilir:
  --   - (program_day_id, program_id, day_number) referansi, task'in
  --     program_id/day_number degerlerinin, isaret ettigi program_day
  --     satirinin GERCEK program_id/day_number'iyla ayni olmasini zorunlu
  --     kilar (baska bir programa/gune ait program_day_id kullanilamaz).
  --   - (program_id, student_id) referansi, task'in student_id'sinin,
  --     isaret ettigi programin GERCEK student_id'siyle ayni olmasini
  --     zorunlu kilar (baska bir ogrenciye ait program_id ile yanlis
  --     student_id kombinasyonu olusturulamaz).
  -- Bu iki composite FK, eski tek-kolon program_id/program_day_id FK'lerinin
  -- sagladigi "gecerli bir satire isaret ediyor" garantisini de kapsadigi
  -- icin (id, composite unique'in bir parcasi oldugundan otomatik dogrulanir),
  -- eski tek-kolon FK'ler KALDIRILDI - ayni iliskiyi iki kez dogrulayan
  -- gereksiz tekrar birakilmadi.
  constraint student_assignment_program_tasks_day_program_daynum_fkey
    foreign key (program_day_id, program_id, day_number)
    references public.student_assignment_program_days (id, program_id, day_number)
    on delete cascade,
  constraint student_assignment_program_tasks_program_student_fkey
    foreign key (program_id, student_id)
    references public.student_assignment_programs (id, student_id)
    on delete cascade
);

-- result_id: bir gorev icin en fazla bir "sayilan" sonuc (idempotent
-- tamamlama garantisi); NULL degerler kisitlanmaz (henuz baslamamis/devam
-- eden gorevlerin result_id'si dogal olarak NULL'dur).
create unique index if not exists student_assignment_program_tasks_result_id_uidx
  on public.student_assignment_program_tasks (result_id)
  where result_id is not null;

-- Composite FK'lerin referans eden (child) tarafinda ayri, ozel bir index
-- BILINCLI olarak eklenmedi: composite FK'lerin ilk kolonlari (program_day_id,
-- program_id) zaten asagidaki/yukaridaki mevcut index'lerin en soldaki
-- (leftmost) kolonlariyla ortusuyor -
--   - (program_day_id, task_order) unique index'i program_day_id icin,
--   - (program_id, day_number) index'i (asagida) program_id icin
-- leftmost-prefix eslesmesiyle yeterli sorgu/FK kontrolu destegi sagliyor.
-- Bu, "composite unique'lerin mevcut sorgu indexleriyle ortustugunu kontrol
-- et, tamamen duplicate index birakma" gereksinimine uygun secimdir.
create index if not exists student_assignment_program_tasks_program_idx
  on public.student_assignment_program_tasks (program_id, day_number);

create index if not exists student_assignment_program_tasks_student_status_idx
  on public.student_assignment_program_tasks (student_id, status);

-- Ileride yazilacak "sekme kapandiysa suresi dolan gorevi tembel (lazy)
-- olarak tamamla" sorgusu icin: yalniz in_progress durumundaki gorevleri
-- tarar, kucuk ve hedefli bir kismi (partial) indekstir.
create index if not exists student_assignment_program_tasks_expiring_idx
  on public.student_assignment_program_tasks (expires_at)
  where status = 'in_progress';

-- ----------------------------------------------------------------------------
-- F. exercise_results.program_task_id
-- Mevcut exercise_results tablosuna EKLEYICI, nullable bir FK kolonu.
-- Bu, repo icindeki migration'larda exercise_results'a dokunan ILK migration'
-- dir; yalniz "add column if not exists" + nullable FK + partial unique index
-- iceriyor - mevcut satirlar, mevcut kolonlar veya mevcut RLS/policy'ler
-- HICBIR sekilde degistirilmiyor.
-- ----------------------------------------------------------------------------
alter table if exists public.exercise_results
  add column if not exists program_task_id uuid;

do $$
begin
  if to_regclass('public.exercise_results') is not null
    and not exists (
      select 1
      from pg_constraint
      where conname = 'exercise_results_program_task_id_fkey'
        and conrelid = to_regclass('public.exercise_results')
    )
  then
    alter table public.exercise_results
      add constraint exercise_results_program_task_id_fkey
      foreign key (program_task_id)
      references public.student_assignment_program_tasks(id)
      on delete set null;
  end if;
end
$$;

-- Bir gorev icin en fazla bir sonuc satirinin "sayilmasi" gerektigi icin
-- (tekrar-yapmayi engelleme garantisi); normal (program disi) sonuclarda
-- program_task_id NULL kalir ve bu kisitlamadan etkilenmez.
create unique index if not exists exercise_results_program_task_id_uidx
  on public.exercise_results (program_task_id)
  where program_task_id is not null;

-- ============================================================================
-- RLS / GRANT / REVOKE - server-only erisim modeli
-- ============================================================================
-- Proje ogrenci kimligini Supabase Auth ile degil, ozel imzali bir HMAC
-- cookie ile dogruluyor (src/lib/auth/studentSession.ts) - yani `auth.uid()`
-- temelli bir RLS politikasi bu projede ANLAMSIZ olur (hicbir gercek istek
-- boyle bir oturuma sahip degildir); bu yuzden burada YAZILMADI.
--
-- Gercek yetkilendirme, service-role Supabase client'i kullanan Next.js API
-- route'larinda yapiliyor (src/lib/supabase/server.ts). `service_role`,
-- Supabase'in standart saglamasinda zaten BYPASSRLS niteligine sahiptir -
-- FORCE ROW LEVEL SECURITY dahi bunu etkilemez - ve genel semadaki
-- varsayilan yetkilerle (bu migration disinda, proje/Supabase seviyesinde
-- saglanir) tablolara erisebilir; bu yuzden service_role icin ayrica
-- ACIKCA bir CREATE POLICY veya GRANT YAZILMADI (mevcut daily_assignments
-- deseni boyle bir policy iceriyordu, ama denetim bunun teknik olarak
-- gereksiz oldugunu belirledi - burada tekrarlanmadi).
--
-- Buna karsilik, Supabase projelerinde `anon`/`authenticated` rollerine
-- public semadaki tablolar uzerinde VARSAYILAN OLARAK genis GRANT
-- yetkileri verilir (RLS'nin tek basina yeterli oldugu varsayilir) - bu
-- yuzden bu iki rolun bu 5 yeni tabloya dogrudan erisimi ACIKCA REVOKE
-- edilir. RLS enable+force de ayrica birakildi (savunma katmani; REVOKE
-- her nasilsa geri alinirsa dahi varsayilan-red devam eder).
-- ============================================================================

alter table public.program_class_templates enable row level security;
alter table public.program_class_templates force row level security;
alter table public.program_class_exercise_settings enable row level security;
alter table public.program_class_exercise_settings force row level security;
alter table public.student_assignment_programs enable row level security;
alter table public.student_assignment_programs force row level security;
alter table public.student_assignment_program_days enable row level security;
alter table public.student_assignment_program_days force row level security;
alter table public.student_assignment_program_tasks enable row level security;
alter table public.student_assignment_program_tasks force row level security;

revoke all on public.program_class_templates from anon, authenticated;
revoke all on public.program_class_exercise_settings from anon, authenticated;
revoke all on public.student_assignment_programs from anon, authenticated;
revoke all on public.student_assignment_program_days from anon, authenticated;
revoke all on public.student_assignment_program_tasks from anon, authenticated;

-- ============================================================================
-- updated_at TRIGGER'I - TEK ORTAK fonksiyon
-- ============================================================================
-- Mevcut projedeki daily_assignments/daily_assignment_items her tablo icin
-- AYRI bir fonksiyon tanimliyordu; bu yeni sistemdeki 5 tablo hepsi bu
-- migration'da ilk kez olusturuldugu icin (henuz hicbir kod bunlara
-- bagimli degil), tek, paylasilan bir fonksiyon kullanmanin riski yok ve
-- tekrar/gereksiz bakim yukunu azaltir. Mevcut daily_assignments
-- fonksiyonlarina DOKUNULMADI, isim çakismasi yok.
-- ============================================================================

create or replace function public.set_student_assignment_updated_at()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists set_updated_at_program_class_templates on public.program_class_templates;
create trigger set_updated_at_program_class_templates
before update on public.program_class_templates
for each row execute function public.set_student_assignment_updated_at();

drop trigger if exists set_updated_at_program_class_exercise_settings on public.program_class_exercise_settings;
create trigger set_updated_at_program_class_exercise_settings
before update on public.program_class_exercise_settings
for each row execute function public.set_student_assignment_updated_at();

drop trigger if exists set_updated_at_student_assignment_programs on public.student_assignment_programs;
create trigger set_updated_at_student_assignment_programs
before update on public.student_assignment_programs
for each row execute function public.set_student_assignment_updated_at();

drop trigger if exists set_updated_at_student_assignment_program_days on public.student_assignment_program_days;
create trigger set_updated_at_student_assignment_program_days
before update on public.student_assignment_program_days
for each row execute function public.set_student_assignment_updated_at();

drop trigger if exists set_updated_at_student_assignment_program_tasks on public.student_assignment_program_tasks;
create trigger set_updated_at_student_assignment_program_tasks
before update on public.student_assignment_program_tasks
for each row execute function public.set_student_assignment_updated_at();
