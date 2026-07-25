-- ============================================================================
-- ELLE KURULAN ODEV SABLONU - IKI YENI RPC
-- ============================================================================
--   (A) public.replace_program_template_tasks(p_template_id, p_tasks)
--       Bir sablonun TUM slotlarini tek transaction icinde sil + yeniden yaz.
--   (B) public.create_student_assignment_program_from_template(
--         p_student_id, p_template_id, p_assigned_by)
--       Bir sablonu bir ogrenciye atar. Client'tan HIC gorev payload'i ALMAZ -
--       tum slotlari sunucuda program_template_tasks tablosundan kendi okur.
--
-- MEVCUT RPC'LERE DOKUNULMAZ: create_student_assignment_program (eski,
-- agirlikli-rastgele akis), complete_student_assignment_program_task ve
-- repair_active_assignment_eye_brain_tasks aynen kalir - canlidaki tek aktif
-- program bu migration'dan hicbir sekilde etkilenmez.
--
-- GUVENLIK MODELI (mevcut uc RPC ile BIREBIR ayni): security definer +
-- explicit search_path pinleme + yalniz service_role'e execute. Ikisi de
-- FUNCTION'dir (PROCEDURE degil) - govde tek bir implicit transaction icinde
-- calisir, herhangi bir RAISE EXCEPTION o ana kadarki tum yazmalari otomatik
-- geri alir; BEGIN/COMMIT/ROLLBACK YAZILMAZ.
--
-- CLIENT PAYLOAD'INA GUVEN: (B) fonksiyonunda "client'in gonderdigi gorevler
-- sablonla uyusuyor mu" diye bir capraz kontrole GEREK YOKTUR - cunku client
-- hic gorev gondermez, kaynak dogrudan DB'dir. Bu, eski RPC'deki
-- ASSIGNMENT_TASK_SNAPSHOT_MISMATCH sinifi hatalari tamamen ortadan kaldirir.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- A. replace_program_template_tasks
-- ----------------------------------------------------------------------------
-- Sablon editorunun "kaydet" islemi. Kismi/yarim kaydedilmis bir sablon
-- olusmamasi icin sil+yaz tek transaction icindedir. Bos bir dizi gondermek
-- gecerlidir (tum slotlari temizler).
--
-- YAPISAL DOGRULAMA burada yapilir (tip, aralik, zorunluluk). KATALOG
-- DOGRULAMASI (slug gercekten 'ready' mi, settings o egzersizin semasina
-- uyuyor mu, category dogru mu) DB'de YAPILAMAZ - katalog yalniz uygulama
-- katmaninda (assignmentExerciseCatalog.ts) yasar; bu kontroller cagiran API
-- route'unda validateExerciseSettings/validateStartingLevel/
-- validateDurationSeconds ile ONCEDEN yapilmis olmalidir.
-- ----------------------------------------------------------------------------

create or replace function public.replace_program_template_tasks(
  p_template_id uuid,
  p_tasks jsonb
)
returns jsonb
language plpgsql
volatile
security definer
set search_path = public, pg_temp
as $$
declare
  v_program_days integer;
  v_template_is_active boolean;

  v_task jsonb;
  v_day_number integer;
  v_task_order integer;
  v_exercise_slug text;
  v_category text;
  v_starting_level integer;
  v_duration_seconds integer;
  v_settings jsonb;

  v_numeric_value numeric;
  v_inserted_count integer := 0;
begin
  if p_template_id is null then
    raise exception 'TEMPLATE_SLOTS_INVALID_INPUT: p_template_id zorunludur.';
  end if;

  if p_tasks is null or jsonb_typeof(p_tasks) <> 'array' then
    raise exception 'TEMPLATE_SLOTS_INVALID_INPUT: p_tasks bir JSON array olmalidir.';
  end if;

  -- Savunma derinligi: en fazla 5 MB.
  if octet_length(p_tasks::text) > 5242880 then
    raise exception 'TEMPLATE_SLOTS_INVALID_INPUT: p_tasks 5 MB sinirini asiyor.';
  end if;

  select t.program_days, t.is_active
  into v_program_days, v_template_is_active
  from public.program_class_templates t
  where t.id = p_template_id
  for update;

  if not found then
    raise exception 'TEMPLATE_NOT_FOUND: Sablon bulunamadi.';
  end if;

  if v_template_is_active is false then
    raise exception 'TEMPLATE_INACTIVE: Pasif bir sablon duzenlenemez.';
  end if;

  if jsonb_array_length(p_tasks) > v_program_days * 5 then
    raise exception 'TEMPLATE_SLOTS_TOO_MANY: Sablon en fazla % slot icerebilir (gelen: %).',
      v_program_days * 5, jsonb_array_length(p_tasks);
  end if;

  delete from public.program_template_tasks where template_id = p_template_id;

  for v_task in select * from jsonb_array_elements(p_tasks) loop
    if jsonb_typeof(v_task) <> 'object' then
      raise exception 'TEMPLATE_SLOTS_INVALID_INPUT: her slot bir JSON object olmalidir.';
    end if;

    if jsonb_typeof(v_task -> 'dayNumber') <> 'number' then
      raise exception 'TEMPLATE_SLOTS_INVALID_INPUT: dayNumber sayi olmalidir.';
    end if;
    v_numeric_value := (v_task ->> 'dayNumber')::numeric;
    if v_numeric_value <> trunc(v_numeric_value) then
      raise exception 'TEMPLATE_SLOTS_INVALID_INPUT: dayNumber tam sayi olmalidir.';
    end if;
    v_day_number := v_numeric_value::int;
    if v_day_number < 1 or v_day_number > v_program_days then
      raise exception 'TEMPLATE_SLOTS_INVALID_INPUT: dayNumber 1-% araliginda olmalidir (gelen: %).', v_program_days, v_day_number;
    end if;

    if jsonb_typeof(v_task -> 'taskOrder') <> 'number' then
      raise exception 'TEMPLATE_SLOTS_INVALID_INPUT: taskOrder sayi olmalidir.';
    end if;
    v_numeric_value := (v_task ->> 'taskOrder')::numeric;
    if v_numeric_value <> trunc(v_numeric_value) then
      raise exception 'TEMPLATE_SLOTS_INVALID_INPUT: taskOrder tam sayi olmalidir.';
    end if;
    v_task_order := v_numeric_value::int;
    if v_task_order < 1 or v_task_order > 5 then
      raise exception 'TEMPLATE_SLOTS_INVALID_INPUT: taskOrder 1-5 araliginda olmalidir (gelen: %).', v_task_order;
    end if;

    v_exercise_slug := v_task ->> 'exerciseSlug';
    if v_exercise_slug is null or length(trim(v_exercise_slug)) = 0 or length(v_exercise_slug) > 100 then
      raise exception 'TEMPLATE_SLOTS_INVALID_INPUT: exerciseSlug gecersiz (gun %, sira %).', v_day_number, v_task_order;
    end if;

    v_category := v_task ->> 'category';
    if v_category is null or length(trim(v_category)) = 0 or length(v_category) > 50 then
      raise exception 'TEMPLATE_SLOTS_INVALID_INPUT: category gecersiz (gun %, sira %).', v_day_number, v_task_order;
    end if;

    if jsonb_typeof(v_task -> 'startingLevel') <> 'number' then
      raise exception 'TEMPLATE_SLOTS_INVALID_INPUT: startingLevel sayi olmalidir (gun %, sira %).', v_day_number, v_task_order;
    end if;
    v_numeric_value := (v_task ->> 'startingLevel')::numeric;
    if v_numeric_value <> trunc(v_numeric_value) or v_numeric_value < 1 then
      raise exception 'TEMPLATE_SLOTS_INVALID_INPUT: startingLevel en az 1 olan tam sayi olmalidir (gun %, sira %).', v_day_number, v_task_order;
    end if;
    v_starting_level := v_numeric_value::int;

    if jsonb_typeof(v_task -> 'durationSeconds') <> 'number' then
      raise exception 'TEMPLATE_SLOTS_INVALID_INPUT: durationSeconds sayi olmalidir (gun %, sira %).', v_day_number, v_task_order;
    end if;
    v_numeric_value := (v_task ->> 'durationSeconds')::numeric;
    if v_numeric_value <> trunc(v_numeric_value) or v_numeric_value <= 0 then
      raise exception 'TEMPLATE_SLOTS_INVALID_INPUT: durationSeconds pozitif tam sayi olmalidir (gun %, sira %).', v_day_number, v_task_order;
    end if;
    v_duration_seconds := v_numeric_value::int;

    v_settings := v_task -> 'settings';
    if v_settings is null or jsonb_typeof(v_settings) <> 'object' then
      raise exception 'TEMPLATE_SLOTS_INVALID_INPUT: settings JSON object olmalidir (gun %, sira %).', v_day_number, v_task_order;
    end if;

    begin
      insert into public.program_template_tasks (
        template_id, day_number, task_order, exercise_slug, category,
        starting_level, duration_seconds, settings
      ) values (
        p_template_id, v_day_number, v_task_order, v_exercise_slug, v_category,
        v_starting_level, v_duration_seconds, v_settings
      );
    exception
      when unique_violation then
        raise exception 'TEMPLATE_SLOTS_DUPLICATE: gun % icinde tekrar eden slot veya egzersiz var (% / sira %).',
          v_day_number, v_exercise_slug, v_task_order;
    end;

    v_inserted_count := v_inserted_count + 1;
  end loop;

  return jsonb_build_object(
    'ok', true,
    'templateId', p_template_id,
    'slotCount', v_inserted_count,
    'expectedSlotCount', v_program_days * 5
  );
end;
$$;

comment on function public.replace_program_template_tasks(uuid, jsonb) is
  'Yalniz service_role tarafindan cagrilabilir. Bir odev sablonunun TUM gun/slot '
  'satirlarini tek transaction icinde sil+yeniden yazar (yarim kaydedilmis sablon '
  'olusamaz). Yalniz yapisal dogrulama yapar - slug''in ''ready'' olmasi ve settings''in '
  'egzersiz semasina uymasi cagiran API route''unda onceden dogrulanmalidir.';

revoke all on function public.replace_program_template_tasks(uuid, jsonb) from public;
revoke all on function public.replace_program_template_tasks(uuid, jsonb) from anon;
revoke all on function public.replace_program_template_tasks(uuid, jsonb) from authenticated;
grant execute on function public.replace_program_template_tasks(uuid, jsonb) to service_role;

-- ----------------------------------------------------------------------------
-- B. create_student_assignment_program_from_template
-- ----------------------------------------------------------------------------
-- SINIF GRUBU ESLESMESI ARANMAZ: kullanicinin acik kurali - ogretmen daha once
-- hazirladigi HERHANGI bir sablonu HERHANGI bir ogrenciye atayabilir (ör. 4.
-- sinif ogrencisine 2. sinif sablonu). Programa yazilan class_group degeri
-- SABLONUN grubudur ve yalniz koken (provenance) bilgisidir - ogrenci
-- tarafindaki hicbir API bu alani okumaz/dondurmez (bkz. src/app/api/student/
-- assignment-program/today/route.ts), yani ogrenciye asla gorunmez.
--
-- generation_seed (NOT NULL) icin 'manual:<template_id>' yazilir - artik
-- rastgelelik olmadigi icin sahte bir rastgele deger URETILMEZ; bu deger
-- yalniz "bu program elle kurulmus su sablondan geldi" bilgisini tasir.
-- ----------------------------------------------------------------------------

create or replace function public.create_student_assignment_program_from_template(
  p_student_id uuid,
  p_template_id uuid,
  p_assigned_by text
)
returns jsonb
language plpgsql
volatile
security definer
set search_path = public, pg_temp
as $$
declare
  -- Eski create_student_assignment_program RPC'siyle AYNI liste (6 kalici
  -- yasakli + 6 su an "ready" olmayan Okuma/Anlama slug'i). Bagimsiz, ikinci
  -- savunma katmanidir; bu 6 okuma slug'i ileride "ready" hale gelirse bu
  -- liste YENI BIR MIGRATION ile guncellenmelidir - otomatik guncellenmez.
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
  v_template_name text;
  v_program_days integer;
  v_tasks_per_day integer;

  v_slot_count integer;
  v_distinct_day_count integer;
  v_max_day_number integer;
  v_min_day_number integer;
  v_banned_slot_count integer;

  v_program_id uuid;
  v_template_snapshot jsonb;

  v_slot record;
  v_current_day_number integer := null;
  v_day_id uuid;
  v_day_count integer := 0;
  v_task_count integer := 0;

  v_constraint_name text;
begin
  -- ==========================================================================
  -- 1) TEMEL INPUT VALIDASYONU
  -- ==========================================================================
  if p_student_id is null then
    raise exception 'ASSIGNMENT_INVALID_INPUT: p_student_id zorunludur.';
  end if;

  if p_template_id is null then
    raise exception 'ASSIGNMENT_INVALID_INPUT: p_template_id zorunludur.';
  end if;

  if p_assigned_by is null or length(trim(p_assigned_by)) = 0 or length(p_assigned_by) > 100 then
    raise exception 'ASSIGNMENT_INVALID_INPUT: p_assigned_by bos olamaz ve 100 karakterden uzun olamaz.';
  end if;

  -- ==========================================================================
  -- 2) ADVISORY LOCK - ayni ogrenci icin eszamanli atama cagrilarini
  --    serilestirir. Salt (875190) eski RPC ile AYNI tutulur ki iki farkli
  --    atama yolu ayni ogrenci uzerinde birbirini de dislasin.
  -- ==========================================================================
  perform pg_advisory_xact_lock(hashtextextended(p_student_id::text, 875190));

  -- ==========================================================================
  -- 3) OGRENCI DOGRULAMASI (eski RPC ile ayni null-guvenli mantik)
  -- ==========================================================================
  select s.is_active, s.status
  into v_student_is_active, v_student_status
  from public.students s
  where s.id = p_student_id;

  if not found then
    raise exception 'ASSIGNMENT_STUDENT_NOT_FOUND: Ogrenci bulunamadi.';
  end if;

  if coalesce(v_student_is_active, false) is false
     or coalesce(v_student_status, 'passive') <> 'active' then
    raise exception 'ASSIGNMENT_STUDENT_INACTIVE: Ogrenci pasif durumda, program atanamaz.';
  end if;

  -- ==========================================================================
  -- 4) SABLON DOGRULAMASI
  -- ==========================================================================
  select t.is_active, t.class_group, t.name, t.program_days, t.tasks_per_day
  into v_template_is_active, v_template_class_group, v_template_name, v_program_days, v_tasks_per_day
  from public.program_class_templates t
  where t.id = p_template_id;

  if not found then
    raise exception 'ASSIGNMENT_TEMPLATE_NOT_FOUND: Sablon bulunamadi.';
  end if;

  if v_template_is_active is false then
    raise exception 'ASSIGNMENT_TEMPLATE_INACTIVE: Sablon pasif durumda.';
  end if;

  if v_tasks_per_day <> 5 then
    raise exception 'ASSIGNMENT_TEMPLATE_INVALID: Sablon gun basina 5 gorev yapisinda degil.';
  end if;

  -- ==========================================================================
  -- 5) AKTIF PROGRAM KONTROLU
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
  -- 6) SABLONUN TAM DOLU OLDUGU DOGRULAMASI.
  --    unique(template_id, day_number, task_order) + task_order 1..5 CHECK'i
  --    bir gunun en fazla 5 slot alabilecegini zaten garanti eder; buna
  --    ek olarak toplam sayinin program_days*5, farkli gun sayisinin
  --    program_days ve gun araliginin tam 1..program_days oldugu dogrulanirsa
  --    (guvercin yuvasi ilkesi) HER gunun tam 5 slotu oldugu kesinlesir.
  -- ==========================================================================
  select count(*), count(distinct day_number), max(day_number), min(day_number)
  into v_slot_count, v_distinct_day_count, v_max_day_number, v_min_day_number
  from public.program_template_tasks
  where template_id = p_template_id;

  if v_slot_count <> v_program_days * 5
     or v_distinct_day_count <> v_program_days
     or v_max_day_number <> v_program_days
     or v_min_day_number <> 1 then
    raise exception 'ASSIGNMENT_TEMPLATE_INCOMPLETE: Sablon eksik - % slot bekleniyordu, % bulundu (gun araligi 1-% olmali).',
      v_program_days * 5, v_slot_count, v_program_days;
  end if;

  -- Bagimsiz ikinci savunma katmani: yasakli/hazir-olmayan slug kontrolu.
  select count(*)
  into v_banned_slot_count
  from public.program_template_tasks
  where template_id = p_template_id
    and exercise_slug = any (v_disallowed_slugs);

  if v_banned_slot_count > 0 then
    raise exception 'ASSIGNMENT_EXERCISE_NOT_ALLOWED: Sablonda programa dahil edilemeyecek % egzersiz slotu var.', v_banned_slot_count;
  end if;

  -- ==========================================================================
  -- 7) SNAPSHOT + PROGRAM + GUN + GOREV YAZIMI
  -- ==========================================================================
  select jsonb_build_object(
    'schemaVersion', 2,
    'source', 'manual_template',
    'templateId', p_template_id,
    'templateName', v_template_name,
    'classGroup', v_template_class_group,
    'programDays', v_program_days,
    'tasksPerDay', v_tasks_per_day,
    'generatedAt', now(),
    'tasks', coalesce(jsonb_agg(
      jsonb_build_object(
        'dayNumber', ptt.day_number,
        'taskOrder', ptt.task_order,
        'exerciseSlug', ptt.exercise_slug,
        'category', ptt.category,
        'startingLevel', ptt.starting_level,
        'durationSeconds', ptt.duration_seconds,
        'settings', ptt.settings
      ) order by ptt.day_number, ptt.task_order
    ), '[]'::jsonb)
  )
  into v_template_snapshot
  from public.program_template_tasks ptt
  where ptt.template_id = p_template_id;

  begin
    insert into public.student_assignment_programs (
      student_id, assigned_by, template_id, class_group, generation_seed,
      status, total_days, tasks_per_day, completed_days,
      template_snapshot, activated_at, completed_at
    ) values (
      p_student_id, p_assigned_by, p_template_id, v_template_class_group,
      'manual:' || p_template_id::text,
      'active', v_program_days, 5, 0,
      v_template_snapshot, now(), null
    )
    returning id into v_program_id;

    for v_slot in
      select day_number, task_order, exercise_slug, category,
             starting_level, duration_seconds, settings
      from public.program_template_tasks
      where template_id = p_template_id
      order by day_number, task_order
    loop
      if v_current_day_number is distinct from v_slot.day_number then
        insert into public.student_assignment_program_days (
          program_id, day_number, status, available_at, started_at, completed_at
        ) values (
          v_program_id,
          v_slot.day_number,
          case when v_slot.day_number = 1 then 'available' else 'locked' end,
          case when v_slot.day_number = 1 then now() else null end,
          null,
          null
        )
        returning id into v_day_id;

        v_current_day_number := v_slot.day_number;
        v_day_count := v_day_count + 1;
      end if;

      insert into public.student_assignment_program_tasks (
        program_id, program_day_id, student_id, day_number, task_order,
        exercise_slug, exercise_title, category, status,
        starting_level, current_level, duration_seconds, settings,
        started_at, expires_at, completed_at, completion_reason, result_id, last_heartbeat_at
      ) values (
        v_program_id, v_day_id, p_student_id, v_slot.day_number, v_slot.task_order,
        v_slot.exercise_slug, null, v_slot.category,
        case when v_slot.day_number = 1 then 'available' else 'locked' end,
        v_slot.starting_level, v_slot.starting_level, v_slot.duration_seconds, v_slot.settings,
        null, null, null, null, null, null
      );

      v_task_count := v_task_count + 1;
    end loop;

    -- Bagimsiz son guvenlik agi (yukaridaki yapisal kontroller bunu zaten
    -- garanti eder - beklenmedik bir dongu hatasina karsi).
    if v_day_count <> v_program_days or v_task_count <> v_program_days * 5 then
      raise exception 'ASSIGNMENT_INSERT_COUNT_MISMATCH: beklenen % gun / % gorev, olusan % gun / % gorev.',
        v_program_days, v_program_days * 5, v_day_count, v_task_count;
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

  return jsonb_build_object(
    'ok', true,
    'programId', v_program_id,
    'templateId', p_template_id,
    'totalDays', v_program_days,
    'tasksPerDay', 5,
    'dayCount', v_day_count,
    'taskCount', v_task_count
  );
end;
$$;

comment on function public.create_student_assignment_program_from_template(uuid, uuid, text) is
  'Yalniz service_role tarafindan cagrilabilir. Elle kurulmus bir sablonu bir ogrenciye '
  'ATOMIK olarak atar: program + gunler + gorevler tek transaction icinde olusur. Gorev '
  'verisini CLIENT''TAN ALMAZ - program_template_tasks tablosundan sunucuda okur, bu yuzden '
  'payload/snapshot uyusmazligi kavrami YOKTUR. Sablonun sinif grubu ile ogrencinin kendi '
  'sinifi KASITLI olarak karsilastirilmaz (herhangi bir sablon herhangi bir ogrenciye '
  'atanabilir). Ilk gunu ve gorevlerini "available", kalanini "locked" olusturur.';

revoke all on function public.create_student_assignment_program_from_template(uuid, uuid, text) from public;
revoke all on function public.create_student_assignment_program_from_template(uuid, uuid, text) from anon;
revoke all on function public.create_student_assignment_program_from_template(uuid, uuid, text) from authenticated;
grant execute on function public.create_student_assignment_program_from_template(uuid, uuid, text) to service_role;
