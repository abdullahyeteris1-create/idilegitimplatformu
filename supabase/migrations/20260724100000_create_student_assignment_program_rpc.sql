-- ============================================================================
-- 20 GUNLUK KILITLI ODEV PROGRAMI - FAZ A: template_snapshot KOLONU + RPC
-- ============================================================================
-- Bu migration, 20260723090000_create_student_assignment_program_system.sql
-- ile olusturulan paralel program semasina EKLEYICI iki degisiklik yapar:
--   (A) student_assignment_programs.template_snapshot (yeni jsonb kolon)
--   (B) public.create_student_assignment_program(...) RPC fonksiyonu
-- Mevcut tablolarin hicbir kolonu/constraint'i degistirilmez veya silinmez;
-- daily_assignments/daily_assignment_items sistemine HICBIR sekilde
-- dokunulmaz. Bu migration hicbir ornek/seed veri INSERT etmez - butun
-- INSERT/UPDATE/DELETE ifadeleri yalniz asagida tanimlanan fonksiyonun
-- GOVDESI icindedir; migration'in kendisi calistirildiginda fonksiyon
-- CAGRILMAZ, yalniz TANIMLANIR.
--
-- ONEMLI: Bu dosya yalniz bir TASLAKTIR - bu turda Supabase'e
-- UYGULANMAMISTIR (`supabase db push` calistirilmadi).
-- ============================================================================

-- ----------------------------------------------------------------------------
-- A. student_assignment_programs.template_snapshot
-- ----------------------------------------------------------------------------
-- GUVENLI DESEN (tablonun su an gercekten bos oldugu bilinse bile, migration
-- tekrar kullanilabilir/genel-amacli kalsin diye asagidaki 4 adimli desen
-- tercih edildi - dogrudan NOT NULL eklemek yalniz tablo kesin bos ise
-- calisir, bu ise kirilgan bir varsayimdir):
--   1) nullable kolon ekle
--   2) (varsa) mevcut satirlari yalniz teknik/is-verisi-olmayan bir
--      metadata JSON'u ile backfill et (sahte is verisi UYDURULMADI -
--      yalniz "bu satir yeni snapshot semasindan ONCE olusturuldu" anlamina
--      gelen schemaVersion/legacy bayraklari)
--   3) NOT NULL yap
--   4) jsonb_typeof(...) = 'object' CHECK'i ekle
-- Yeni programlar icin bu deger DAIMA RPC tarafindan acikca saglanir; DB
-- seviyesinde bir DEFAULT KASITLI olarak yok (generation_seed ile ayni
-- felsefe: uretim koduna ait bir deger DB varsayimina birakilmaz).
-- ----------------------------------------------------------------------------

alter table public.student_assignment_programs
  add column if not exists template_snapshot jsonb;

update public.student_assignment_programs
set template_snapshot = jsonb_build_object('schemaVersion', 1, 'legacy', true)
where template_snapshot is null;

alter table public.student_assignment_programs
  alter column template_snapshot set not null;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'student_assignment_programs_template_snapshot_is_object_check'
      and conrelid = 'public.student_assignment_programs'::regclass
  ) then
    alter table public.student_assignment_programs
      add constraint student_assignment_programs_template_snapshot_is_object_check
      check (jsonb_typeof(template_snapshot) = 'object');
  end if;
end
$$;

-- ----------------------------------------------------------------------------
-- B. public.create_student_assignment_program(...)
-- ----------------------------------------------------------------------------
-- Tek cagrida (tek implicit transaction) 1 program + 20 gun + 100 gorev
-- satirini ATOMIK olarak yazar. Bu bir FUNCTION'dir (PROCEDURE degil) -
-- boylece cagrinin tamami tek bir SQL ifadesi olarak calisir ve icindeki
-- herhangi bir RAISE EXCEPTION (100. satirda dahi olsa) o ana kadarki TUM
-- insert'leri otomatik geri alir; ayrica BEGIN/COMMIT/ROLLBACK YAZILMAZ.
--
-- GUVENLIK MODELI (mevcut increment_student_session_version RPC'sindeki
-- GERCEK, dogrulanmis emsalle BIREBIR ayni): security definer + explicit
-- search_path pinleme + yalniz service_role'e execute. Bu guvenlidir cunku
-- execute yalniz zaten RLS'i bypass eden service_role'e verilir - definer
-- yetkisi anon/authenticated icin hicbir ek yuzey acmaz (onlarin zaten
-- execute hakki yok).
--
-- CLIENT PAYLOAD'INA GUVEN YOK: p_days icindeki hicbir "status" alani asla
-- okunmaz (fonksiyon yalniz dayNumber/taskOrder/exerciseSlug/category/
-- startingLevel/durationSeconds/settings alanlarini isimle okur); durum
-- degerleri (available/locked) SADECE bu fonksiyon tarafindan, gun
-- numarasina gore belirlenir. Ayrica her gorev, program_class_exercise_
-- settings tablosundaki GERCEK, enabled=true satirla CAPRAZ KONTROL edilir
-- (bkz. asagida ASSIGNMENT_TASK_SNAPSHOT_MISMATCH) - bu, onizleme ile
-- create arasindaki zaman araliginda sablon degisirse eski/gecersiz bir
-- onizlemenin yazilmasini engeller.
--
-- HAZIR OLMAYAN OKUMA/ANLAMA SLUGLARI: su an icin (okuma-hizi-testi,
-- blok-okuma, gruplama-calismasi, golgeleme, odakli-okuma, anlama-testi)
-- KESIN OLARAK reddedilir - bunlar "ready" olmadigi icin program_class_
-- exercise_settings'te zaten enabled=true bir satirlari olamaz (bu da
-- ayni sonucu dolayli verir), ancak acik bir blocklist ile BAGIMSIZ,
-- ikinci bir savunma katmani eklendi. Bu 6 slug ileride "ready" hale
-- gelirse, bu blocklist YENI BIR MIGRATION ile guncellenmelidir - otomatik
-- guncellenmez.
--
-- ADVISORY LOCK: hashtext(uuid) yalniz 32-bit'lik bir hash urettigi icin
-- (teorik carpisma riski), bunun yerine hashtextextended(...) kullanilir -
-- bu, tek bir pg_advisory_xact_lock(bigint) cagrisinda dogrudan kullanilan
-- 64-bit'lik bir hash dondurur (ek extension gerekmez, dinamik SQL yoktur,
-- PostgreSQL cekirdeginin bir parcasidir). Ikinci parametre (875190) yalniz
-- bu ozelligin kilit ad alanini projedeki OLASI baska bir advisory-lock
-- kullanimindan ayirmak icin sabit, keyfi bir tuz (salt) degeridir - is
-- anlami tasimaz. Kilit, transaction sonunda (basarili veya basarisiz
-- fark etmeksizin) OTOMATIK serbest kalir.
--
-- category ICIN program_class_exercise_settings CAPRAZ KONTROLU
-- YAPILMIYOR: o tabloda gercekte boyle bir kolon YOK (gercek kolonlar:
-- id, template_id, exercise_slug, enabled, starting_level, duration_
-- seconds, settings, daily_weight, repeat_cooldown_days, max_occurrences_
-- per_program, display_order, created_at, updated_at) - category yalniz
-- uygulama katmanindaki statik katalogdan (exerciseCatalog.ts) gelir, bu
-- yuzden burada yalniz yapisal (bos-degil/uzunluk) dogrulanir.
--
-- exercise_title HER ZAMAN null yazilir: verilen p_days JSON semasinda
-- (bkz. gorev talimati) boyle bir alan YOK - kolon nullable oldugu icin
-- bu güvenlidir; ileride API bu alani payload'a eklerse burasi guncellenir,
-- simdiden UYDURULMAZ.
--
-- PIGEONHOLE NOTU: hem gunler (tam 20 eleman + 1..20 araliginda + tekil)
-- hem gorevler (gunde tam 5 eleman + 1..5 araliginda + tekil) icin ayrica
-- bir "hepsi mevcut mu" kontrolu YAPILMIYOR - sayim+aralik+tekillik ucu
-- birlikte matematiksel olarak (guvercin yuvasi ilkesi) tam kapsamayi zaten
-- garanti eder.
--
-- ADMIN AUTH GUVENLIK NOTU (onceki tur analizinden tasindi): isAdminSessionValid
-- (src/lib/auth/adminSession.ts) su an yalniz cookie uzunlugunu kontrol ediyor,
-- gercek bir admin/ogretmen kimligi tasimiyor. Bu RPC'nin service_role-only
-- olmasi, fonksiyonun TARAYICIDAN DOGRUDAN cagrilmasini engeller - ama bunu
-- cagiran gelecekteki create API route'unun KENDI admin-auth katmani hala
-- zayiftir; bu migration bunu COZMEZ, yalniz RPC seviyesindeki riski kapatir.
-- Gercek production kullanimindan once admin session dogrulamasinin
-- guclendirilmesi ayri bir is kalemidir (bu turda DEGISTIRILMEDI).
-- ----------------------------------------------------------------------------

create or replace function public.create_student_assignment_program(
  p_student_id uuid,
  p_template_id uuid,
  p_class_group text,
  p_generation_seed text,
  p_template_snapshot jsonb,
  p_days jsonb,
  p_assigned_by text
)
returns table (
  program_id uuid,
  student_id uuid,
  class_group text,
  status text,
  total_days integer,
  tasks_per_day integer,
  generation_seed text,
  created_at timestamptz
)
language plpgsql
volatile
security definer
set search_path = public, pg_temp
as $$
declare
  v_valid_class_groups text[] := array[
    'grade_1', 'grade_2', 'grade_3', 'grade_4',
    'grade_5_6', 'grade_7_8', 'high_school', 'general'
  ];
  -- 6 kesin yasakli slug (mevcut CHECK constraint'lerle ayni liste) +
  -- 6 su an icin "ready" olmayan Okuma/Anlama slug'u (bkz. dosya basi not).
  v_disallowed_slugs text[] := array[
    'goz-calismasi', 'parcali-resim-kelime', 'kelime-tahmin',
    'adam-asmaca', 'gorsel-puzzle', 'dikkat-labirenti',
    'okuma-hizi-testi', 'blok-okuma', 'gruplama-calismasi',
    'golgeleme', 'odakli-okuma', 'anlama-testi'
  ];

  v_student_is_active boolean;
  v_student_status text;

  v_template_is_active boolean;
  v_template_class_group text;
  v_template_program_days integer;
  v_template_tasks_per_day integer;

  v_program_id uuid;

  v_day jsonb;
  v_day_number integer;
  v_day_id uuid;
  v_day_seen boolean[] := array_fill(false, array[20]);
  v_day_count integer := 0;

  v_task jsonb;
  v_task_order integer;
  v_task_seen boolean[];
  v_day_slugs text[];
  v_exercise_slug text;
  v_category text;
  v_starting_level integer;
  v_duration_seconds integer;
  v_settings jsonb;
  v_setting_row record;
  v_task_count integer := 0;

  v_constraint_name text;

  -- Kesirli JSON sayilarini (1.5, 1.9999999 vb.) sessizce yuvarlamak yerine
  -- acikca reddetmek icin: her integer alan once bu ortak numeric degiskene
  -- okunur, "deger = trunc(deger)" ile tam sayi oldugu dogrulanir, ancak
  -- BUNDAN SONRA ::int donusumu yapilir. Farkli kontrol noktalarinda
  -- sirayla (hemen okunup tuketilerek) yeniden kullanilir.
  v_numeric_value numeric;
begin
  -- ==========================================================================
  -- 1) TEMEL INPUT VALIDASYONU (henuz kilit alinmadi - ucuz, hizli-basarisiz
  --    kontroller once yapilir)
  -- ==========================================================================
  if p_student_id is null then
    raise exception 'ASSIGNMENT_INVALID_INPUT: p_student_id zorunludur.';
  end if;

  if p_template_id is null then
    raise exception 'ASSIGNMENT_INVALID_INPUT: p_template_id zorunludur.';
  end if;

  if p_class_group is null or not (p_class_group = any (v_valid_class_groups)) then
    raise exception 'ASSIGNMENT_INVALID_INPUT: p_class_group gecerli 8 degerden biri olmalidir.';
  end if;

  -- 200 karakter siniri, mevcut preview route'undaki MAX_SEED_LENGTH ile
  -- tutarli olsun diye secildi (DB kolonu text oldugu icin kendi basina bir
  -- uzunluk siniri yok, bu uygulama-katmani tutarliligi icindir).
  if p_generation_seed is null or length(trim(p_generation_seed)) = 0 or length(p_generation_seed) > 200 then
    raise exception 'ASSIGNMENT_INVALID_INPUT: p_generation_seed bos olamaz ve 200 karakterden uzun olamaz.';
  end if;

  if p_assigned_by is null or length(trim(p_assigned_by)) = 0 or length(p_assigned_by) > 100 then
    raise exception 'ASSIGNMENT_INVALID_INPUT: p_assigned_by bos olamaz ve 100 karakterden uzun olamaz.';
  end if;

  if p_template_snapshot is null or jsonb_typeof(p_template_snapshot) <> 'object' then
    raise exception 'ASSIGNMENT_INVALID_INPUT: p_template_snapshot JSON object olmalidir.';
  end if;

  -- Savunma derinligi: p_template_snapshot en fazla 1 MB (1048576 bayt).
  -- RPC yalniz service_role'e acik olsa da, boyut siniri olmayan bir jsonb
  -- girdisi asiri buyuk satirlar/depolama sismesine karsi ek bir korumadir.
  if octet_length(p_template_snapshot::text) > 1048576 then
    raise exception 'ASSIGNMENT_INVALID_INPUT: p_template_snapshot 1 MB sinirini asiyor.';
  end if;

  if jsonb_typeof(p_template_snapshot -> 'schemaVersion') <> 'number' then
    raise exception 'ASSIGNMENT_INVALID_INPUT: p_template_snapshot.schemaVersion sayi olmalidir.';
  end if;

  -- Kesirli deger reddi: once trunc(deger)=deger ile tam sayi oldugu
  -- dogrulanir, ancak BUNDAN SONRA ::int donusumu yapilir - aksi halde
  -- Postgres'in numeric->int cast'i (yuvarlama yapar, hata vermez) 1.5 gibi
  -- degerleri sessizce 2'ye yuvarlayip kabul ederdi.
  v_numeric_value := (p_template_snapshot ->> 'schemaVersion')::numeric;
  if v_numeric_value <> trunc(v_numeric_value) then
    raise exception 'ASSIGNMENT_INVALID_INPUT: p_template_snapshot.schemaVersion tam sayi olmalidir (kesirli deger kabul edilmez).';
  end if;

  if v_numeric_value::int <> 1 then
    raise exception 'ASSIGNMENT_INVALID_INPUT: p_template_snapshot.schemaVersion tam olarak 1 olmalidir.';
  end if;

  if p_days is null or jsonb_typeof(p_days) <> 'array' or jsonb_array_length(p_days) <> 20 then
    raise exception 'ASSIGNMENT_INVALID_DAYS: p_days tam 20 elemanli bir JSON array olmalidir.';
  end if;

  -- Savunma derinligi: p_days en fazla 5 MB (5242880 bayt).
  if octet_length(p_days::text) > 5242880 then
    raise exception 'ASSIGNMENT_INVALID_DAYS: p_days 5 MB sinirini asiyor.';
  end if;

  -- ==========================================================================
  -- 2) ADVISORY LOCK - ayni ogrenci icin eszamanli create cagrilarini
  --    serilestirir (cift-tiklama/network-retry korumasi, yeni kolon
  --    gerektirmez, transaction sonunda otomatik serbest kalir).
  -- ==========================================================================
  perform pg_advisory_xact_lock(hashtextextended(p_student_id::text, 875190));

  -- ==========================================================================
  -- 3) OGRENCI DOGRULAMASI
  -- ==========================================================================
  select s.is_active, s.status
  into v_student_is_active, v_student_status
  from public.students s
  where s.id = p_student_id;

  if not found then
    raise exception 'ASSIGNMENT_STUDENT_NOT_FOUND: Ogrenci bulunamadi.';
  end if;

  -- students.is_active/status gercek, dogrulanmis kolonlardir (bkz.
  -- verifyStudentAccess.ts'teki isStudentActiveStatus ile ayni mantik).
  -- NULL-GUVENLI KONTROL: students.status kolonu DB seviyesinde NOT NULL
  -- DEGILDIR (bkz. 20260721120000_add_missing_student_profile_fields.sql -
  -- yalniz DEFAULT eklendi, NOT NULL hic uygulanmadi; CHECK de NOT VALID
  -- oldugu ve zaten NULL'u reddetmedigi icin status NULL olabilir) ve
  -- students tablosunun kendisi hicbir tracked migration'da olusturulmadigi
  -- icin is_active'in NOT NULL oldugu da kesin dogrulanamaz. Bu yuzden
  -- coalesce ile HER IKI alan da NULL ise "pasif" tarafina dusecek sekilde
  -- guvenli varsayilana baglanir - yalniz is_active=true VE status='active'
  -- olan bir ogrenci program olusturabilir.
  if coalesce(v_student_is_active, false) is false
     or coalesce(v_student_status, 'passive') <> 'active' then
    raise exception 'ASSIGNMENT_STUDENT_INACTIVE: Ogrenci pasif durumda, program atanamaz.';
  end if;

  -- ==========================================================================
  -- 4) SABLON DOGRULAMASI
  -- ==========================================================================
  select t.is_active, t.class_group, t.program_days, t.tasks_per_day
  into v_template_is_active, v_template_class_group, v_template_program_days, v_template_tasks_per_day
  from public.program_class_templates t
  where t.id = p_template_id;

  if not found then
    raise exception 'ASSIGNMENT_TEMPLATE_NOT_FOUND: Sablon bulunamadi.';
  end if;

  if v_template_is_active is false then
    raise exception 'ASSIGNMENT_TEMPLATE_INACTIVE: Sablon pasif durumda.';
  end if;

  if v_template_class_group <> p_class_group then
    raise exception 'ASSIGNMENT_CLASS_GROUP_MISMATCH: Sablonun sinif grubu parametre ile uyusmuyor.';
  end if;

  if v_template_program_days <> 20 or v_template_tasks_per_day <> 5 then
    raise exception 'ASSIGNMENT_TEMPLATE_INVALID: Sablon 20 gun / 5 gorev yapisinda degil.';
  end if;

  -- ==========================================================================
  -- 5) AKTIF PROGRAM KONTROLU (lock alindiktan sonra - partial unique index
  --    son savunma katmani olarak asagidaki exception blogunda ayrica ele
  --    alinir).
  -- ==========================================================================
  if exists (
    select 1
    from public.student_assignment_programs sap
    where sap.student_id = p_student_id
      and sap.status = 'active'
  ) then
    raise exception 'ASSIGNMENT_ACTIVE_PROGRAM_EXISTS: Ogrencinin zaten aktif bir programi var.';
  end if;

  -- ==========================================================================
  -- 6) PROGRAM + GUN + GOREV YAZIMI (unique_violation icin ozel yakalama)
  -- ==========================================================================
  begin
    insert into public.student_assignment_programs (
      student_id, assigned_by, template_id, class_group, generation_seed,
      status, total_days, tasks_per_day, completed_days,
      template_snapshot, activated_at, completed_at
    ) values (
      p_student_id, p_assigned_by, p_template_id, p_class_group, p_generation_seed,
      'active', 20, 5, 0,
      p_template_snapshot, now(), null
    )
    returning id into v_program_id;

    for v_day in select * from jsonb_array_elements(p_days) loop
      if jsonb_typeof(v_day) <> 'object' then
        raise exception 'ASSIGNMENT_INVALID_DAYS: p_days icindeki her eleman JSON object olmalidir.';
      end if;

      if jsonb_typeof(v_day -> 'dayNumber') <> 'number' then
        raise exception 'ASSIGNMENT_INVALID_DAYS: dayNumber sayi olmalidir.';
      end if;

      v_numeric_value := (v_day ->> 'dayNumber')::numeric;
      if v_numeric_value <> trunc(v_numeric_value) then
        raise exception 'ASSIGNMENT_INVALID_DAYS: dayNumber tam sayi olmalidir (kesirli deger kabul edilmez).';
      end if;

      v_day_number := v_numeric_value::int;

      if v_day_number < 1 or v_day_number > 20 then
        raise exception 'ASSIGNMENT_INVALID_DAYS: dayNumber 1-20 araliginda olmalidir (gelen: %).', v_day_number;
      end if;

      if v_day_seen[v_day_number] then
        raise exception 'ASSIGNMENT_INVALID_DAYS: dayNumber % birden fazla kez gonderildi.', v_day_number;
      end if;
      v_day_seen[v_day_number] := true;

      if jsonb_typeof(v_day -> 'tasks') <> 'array' or jsonb_array_length(v_day -> 'tasks') <> 5 then
        raise exception 'ASSIGNMENT_INVALID_DAYS: gun % icin tam 5 gorev olmalidir.', v_day_number;
      end if;

      insert into public.student_assignment_program_days (
        program_id, day_number, status, available_at, started_at, completed_at
      ) values (
        v_program_id,
        v_day_number,
        case when v_day_number = 1 then 'available' else 'locked' end,
        case when v_day_number = 1 then now() else null end,
        null,
        null
      )
      returning id into v_day_id;

      v_day_count := v_day_count + 1;
      v_task_seen := array_fill(false, array[5]);
      v_day_slugs := array[]::text[];

      for v_task in select * from jsonb_array_elements(v_day -> 'tasks') loop
        if jsonb_typeof(v_task) <> 'object' then
          raise exception 'ASSIGNMENT_INVALID_TASK: gorev JSON object olmalidir (gun %).', v_day_number;
        end if;

        if jsonb_typeof(v_task -> 'taskOrder') <> 'number' then
          raise exception 'ASSIGNMENT_INVALID_TASK: taskOrder sayi olmalidir (gun %).', v_day_number;
        end if;

        v_numeric_value := (v_task ->> 'taskOrder')::numeric;
        if v_numeric_value <> trunc(v_numeric_value) then
          raise exception 'ASSIGNMENT_INVALID_TASK: taskOrder tam sayi olmalidir, kesirli deger kabul edilmez (gun %).', v_day_number;
        end if;

        v_task_order := v_numeric_value::int;

        if v_task_order < 1 or v_task_order > 5 then
          raise exception 'ASSIGNMENT_INVALID_TASK: taskOrder 1-5 araliginda olmalidir (gun %, gelen: %).', v_day_number, v_task_order;
        end if;

        if v_task_seen[v_task_order] then
          raise exception 'ASSIGNMENT_INVALID_TASK: taskOrder % gun % icinde birden fazla kez gonderildi.', v_task_order, v_day_number;
        end if;
        v_task_seen[v_task_order] := true;

        v_exercise_slug := v_task ->> 'exerciseSlug';
        if v_exercise_slug is null or length(trim(v_exercise_slug)) = 0 or length(v_exercise_slug) > 100 then
          raise exception 'ASSIGNMENT_INVALID_TASK: exerciseSlug gecersiz (gun %, sira %).', v_day_number, v_task_order;
        end if;

        if v_exercise_slug = any (v_disallowed_slugs) then
          raise exception 'ASSIGNMENT_EXERCISE_NOT_ALLOWED: % egzersizi programa dahil edilemez.', v_exercise_slug;
        end if;

        if v_exercise_slug = any (v_day_slugs) then
          raise exception 'ASSIGNMENT_INVALID_TASK: % egzersizi ayni gun icinde birden fazla kez kullanildi (gun %).', v_exercise_slug, v_day_number;
        end if;
        v_day_slugs := array_append(v_day_slugs, v_exercise_slug);

        v_category := v_task ->> 'category';
        if v_category is null or length(trim(v_category)) = 0 or length(v_category) > 50 then
          raise exception 'ASSIGNMENT_INVALID_TASK: category gecersiz (gun %, sira %).', v_day_number, v_task_order;
        end if;

        if jsonb_typeof(v_task -> 'startingLevel') <> 'number' then
          raise exception 'ASSIGNMENT_INVALID_TASK: startingLevel sayi olmalidir (gun %, sira %).', v_day_number, v_task_order;
        end if;
        v_numeric_value := (v_task ->> 'startingLevel')::numeric;
        if v_numeric_value <> trunc(v_numeric_value) then
          raise exception 'ASSIGNMENT_INVALID_TASK: startingLevel tam sayi olmalidir, kesirli deger kabul edilmez (gun %, sira %).', v_day_number, v_task_order;
        end if;
        v_starting_level := v_numeric_value::int;
        if v_starting_level < 1 then
          raise exception 'ASSIGNMENT_INVALID_TASK: startingLevel en az 1 olmalidir (gun %, sira %).', v_day_number, v_task_order;
        end if;

        if jsonb_typeof(v_task -> 'durationSeconds') <> 'number' then
          raise exception 'ASSIGNMENT_INVALID_TASK: durationSeconds sayi olmalidir (gun %, sira %).', v_day_number, v_task_order;
        end if;
        v_numeric_value := (v_task ->> 'durationSeconds')::numeric;
        if v_numeric_value <> trunc(v_numeric_value) then
          raise exception 'ASSIGNMENT_INVALID_TASK: durationSeconds tam sayi olmalidir, kesirli deger kabul edilmez (gun %, sira %).', v_day_number, v_task_order;
        end if;
        v_duration_seconds := v_numeric_value::int;
        if v_duration_seconds <= 0 then
          raise exception 'ASSIGNMENT_INVALID_TASK: durationSeconds pozitif olmalidir (gun %, sira %).', v_day_number, v_task_order;
        end if;

        v_settings := v_task -> 'settings';
        if v_settings is null or jsonb_typeof(v_settings) <> 'object' then
          raise exception 'ASSIGNMENT_INVALID_TASK: settings JSON object olmalidir (gun %, sira %).', v_day_number, v_task_order;
        end if;

        -- SABLON AYARLARIYLA CAPRAZ KONTROL: client'in (server generator'un)
        -- gonderdigi degerler, DB'deki GERCEK enabled=true satirla birebir
        -- uyusmali. Bu, onizleme uretildikten sonra sablon degisirse eski
        -- degerlerin yazilmasini engeller.
        select pces.starting_level, pces.duration_seconds, pces.settings
        into v_setting_row
        from public.program_class_exercise_settings pces
        where pces.template_id = p_template_id
          and pces.exercise_slug = v_exercise_slug
          and pces.enabled = true
          and pces.daily_weight > 0;

        if not found then
          raise exception 'ASSIGNMENT_TASK_SNAPSHOT_MISMATCH: % sablonda etkin bir ayar olarak bulunamadi (gun %, sira %).', v_exercise_slug, v_day_number, v_task_order;
        end if;

        if v_setting_row.starting_level <> v_starting_level
           or v_setting_row.duration_seconds <> v_duration_seconds
           or v_setting_row.settings <> v_settings then
          raise exception 'ASSIGNMENT_TASK_SNAPSHOT_MISMATCH: % icin gonderilen degerler sablon ayariyla uyusmuyor (gun %, sira %).', v_exercise_slug, v_day_number, v_task_order;
        end if;

        insert into public.student_assignment_program_tasks (
          program_id, program_day_id, student_id, day_number, task_order,
          exercise_slug, exercise_title, category, status,
          starting_level, current_level, duration_seconds, settings,
          started_at, expires_at, completed_at, completion_reason, result_id, last_heartbeat_at
        ) values (
          v_program_id, v_day_id, p_student_id, v_day_number, v_task_order,
          v_exercise_slug, null, v_category,
          case when v_day_number = 1 then 'available' else 'locked' end,
          v_starting_level, v_starting_level, v_duration_seconds, v_settings,
          null, null, null, null, null, null
        );

        v_task_count := v_task_count + 1;
      end loop;
    end loop;

    -- ========================================================================
    -- 7) INSERT SAYISI SON DOGRULAMASI (yukaridaki yapisal kontroller zaten
    --    bunu matematiksel olarak garanti eder - bu, beklenmedik bir dongu
    --    hatasina karsi ek, bagimsiz bir guvenlik agidir).
    -- ========================================================================
    if v_day_count <> 20 or v_task_count <> 100 then
      raise exception 'ASSIGNMENT_INSERT_COUNT_MISMATCH: beklenen 20 gun / 100 gorev, olusan % gun / % gorev.', v_day_count, v_task_count;
    end if;
  exception
    when unique_violation then
      get stacked diagnostics v_constraint_name = constraint_name;
      if v_constraint_name = 'student_assignment_programs_one_active_per_student_uidx' then
        raise exception 'ASSIGNMENT_ACTIVE_PROGRAM_EXISTS: Ogrencinin zaten aktif bir programi var (unique constraint devreye girdi).';
      else
        raise;
      end if;
  end;

  return query
  select
    p.id,
    p.student_id,
    p.class_group,
    p.status,
    p.total_days,
    p.tasks_per_day,
    p.generation_seed,
    p.created_at
  from public.student_assignment_programs p
  where p.id = v_program_id;
end;
$$;

comment on function public.create_student_assignment_program(uuid, uuid, text, text, jsonb, jsonb, text) is
  'Yalniz service_role tarafindan cagrilabilir (anon/authenticated execute yetkisi yok). '
  'Bir ogrenciye 20 gun x 5 gorev = 100 gorevlik kilitli bir odev programini TEK transaction icinde, '
  'ya hep ya hic olarak olusturur (function+implicit transaction; hata durumunda tum satirlar geri alinir). '
  'Client (p_days) payload''ina dogrudan guvenmez - her gorevi program_class_exercise_settings tablosundaki '
  'gercek, enabled=true satirla capraz kontrol eder. Ilk gunu ve ilk gunun 5 gorevini "available", '
  'kalan 19 gunu ve 95 gorevi "locked" olarak olusturur. Mevcut gunluk odev sistemine (daily_assignments/'
  'daily_assignment_items) hicbir sekilde dokunmaz.';

-- ----------------------------------------------------------------------------
-- Yetkiler: yalniz service_role calistirabilir (tarayicidan anon/authenticated
-- ile DOGRUDAN cagrilamaz).
-- ----------------------------------------------------------------------------
revoke all on function public.create_student_assignment_program(uuid, uuid, text, text, jsonb, jsonb, text) from public;
revoke all on function public.create_student_assignment_program(uuid, uuid, text, text, jsonb, jsonb, text) from anon;
revoke all on function public.create_student_assignment_program(uuid, uuid, text, text, jsonb, jsonb, text) from authenticated;
grant execute on function public.create_student_assignment_program(uuid, uuid, text, text, jsonb, jsonb, text) to service_role;
