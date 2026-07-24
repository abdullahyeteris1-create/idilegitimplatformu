-- ============================================================================
-- FAZ 2.6A.2 - TEK KULLANIMLIK, TRANSACTION-SAFE "goz-beyin" ONARIM RPC'SI
-- ============================================================================
-- Bu migration, Faz 2.6A.1'de dogrulanan bakim script'inin (scripts/
-- maintenance/repair-eye-brain-assignment.mjs) "guvenli execute" adimini
-- gerceklestirecek TEK bir fonksiyon tanimlar:
--   public.repair_active_assignment_eye_brain_tasks(p_confirmation_token,
--   p_expected_head_commit)
--
-- AMAC: Su an TEK olan aktif ogrenci programindaki 14 adet "goz-beyin"
-- gorevini, PL/pgSQL fonksiyon govdesinin kendisi zaten tek bir implicit
-- transaction oldugu icin ATOMIK olarak (ya hep ya hic) baska, assignment-
-- ready egzersizlerle degistirir. Bu dosya HICBIR ornek/seed veri INSERT
-- etmez ve fonksiyonu CAGIRMAZ - yalniz TANIMLAR. Mevcut daily_assignments/
-- daily_assignment_items sistemine ve create_student_assignment_program
-- RPC'sine hicbir sekilde dokunulmaz.
--
-- ISIM KASITLI OLARAK ACIK VE TEK-KULLANIMLIK: fonksiyon adi, mapping'i VE
-- guard'lari "goz-beyin"e ve bu tek onarima ozel olarak hardcode eder -
-- genel-amacli bir "gorev degistirme" araci DEGILDIR, ileride baska bir
-- onarim gerekirse yeni bir migration/fonksiyon yazilmalidir.
--
-- pgcrypto / digest(): bu extension zaten 20260716093000_daily_assignments.sql
-- ve 20260723090000_create_student_assignment_program_system.sql tarafindan
-- "create extension if not exists pgcrypto" ile etkinlestirilmis durumda
-- (gen_random_uuid() zaten bu extension'dan geliyor). Ayni idempotent
-- deseni burada da tekrar etmek (mevcut repo konvansiyonu - her migration
-- kendi bagimliligini kendi bildirir) guvenlidir ve digest()/encode()
-- fonksiyonlarini garanti eder.
-- ============================================================================

create extension if not exists pgcrypto;

-- ----------------------------------------------------------------------------
-- public.repair_active_assignment_eye_brain_tasks(...)
-- ----------------------------------------------------------------------------
-- GUVENLIK MODELI (mevcut create_student_assignment_program /
-- increment_student_session_version RPC'leriyle BIREBIR ayni): security
-- definer + explicit search_path pinleme + yalniz service_role'e execute.
--
-- TRANSACTION/LOCK MODELI: bu bir FUNCTION'dir (PROCEDURE degil) - cagrinin
-- tamami PostgreSQL tarafindan otomatik olarak TEK bir implicit transaction
-- icinde calistirilir; govde icinde BEGIN/COMMIT/ROLLBACK YAZILMAZ, herhangi
-- bir RAISE EXCEPTION (fonksiyonun sonundaki bir kontrolde dahi olsa) o ana
-- kadarki TUM degisiklikleri (varsa) otomatik geri alir. Aktif program
-- satiri "SELECT ... FOR UPDATE" (STRICT ile birlikte, tam 1 satir garantisi
-- icin), 20 gun satiri ve 100 gorev satiri "PERFORM ... FOR UPDATE" ile
-- fonksiyonun basinda kilitlenir - boylece guard kontrolleri ile asil UPDATE
-- arasinda baska bir transaction bu satirlari degistiremez (PostgreSQL
-- varsayilan READ COMMITTED izolasyonunda FOR UPDATE olmadan bu garanti
-- olmazdi).
--
-- HEAD COMMIT DOGRULAMASI HAKKINDA ONEMLI NOT: bu fonksiyon p_expected_
-- head_commit degerini VERITABANINDAN dogrulayamaz (Postgres'in git repo'su
-- hakkinda hicbir bilgisi yoktur) - yalniz formatinin gecerli bir 40
-- karakterlik hex git SHA'si oldugunu kontrol eder VE onay token'inin
-- (p_confirmation_token) hesaplanmasina bir girdi olarak dahil eder. Boylece
-- token'i URETEN bakim script'i, farkli bir commit'ten (ör. mapping
-- degismis bir versiyon) yanlislikla eski/gecersiz bir onay token'i
-- kullanamaz - ama bu "baglama" (binding) amaclidir, DB tarafinda bagimsiz
-- bir git dogrulamasi DEGILDIR.
--
-- KATALOG DOGRULAMASI SINIRI: integrationStatus/route/resultExerciseType
-- degerleri src/lib/assignments/exerciseCatalog.ts icinde yasar, DB'de
-- KARSILIGI YOKTUR - bu yuzden bu RPC bunlari dogrulayamaz/dogrulamaz. Bu
-- kontroller bakim script'inin dry-run asamasinda (computeReplacementCandidates/
-- validateReplacementEligibility, bkz. scripts/maintenance/lib/
-- eyeBrainRepairPlan.mjs) UYGULAMA KATALOGUNA karsi ONCEDEN dogrulanmis
-- olmalidir - bu RPC yalniz DB'de var olan alanlari (enabled, daily_weight,
-- starting_level, duration_seconds, settings) dogrular.
--
-- TOKEN ALGORITMASI - bakim script'indeki deriveConfirmationToken() ile
-- BIREBIR uyumlu olmalidir (bkz. scripts/maintenance/lib/
-- eyeBrainRepairPlan.mjs):
--   sha256(operationName || '|' || headCommit || '|' || programId || '|' ||
--          sortedTaskIds.join(','))
-- Operation name sabiti asagida v_operation_name ile birebir ayni string
-- olmalidir ("repair-eye-brain-assignment-2.6A.1"); bu iki sabit birbirinden
-- BAGIMSIZ olarak elle senkron tutulur (JS tarafinda OPERATION_NAME, SQL
-- tarafinda v_operation_name) - biri degisirse digeri de guncellenmelidir.
-- Task id'lerin sirasi: hem JS (Array.prototype.sort(), varsayilan UTF-16
-- kod-birimi karsilastirmasi) hem SQL (asagida "collate "C"" ile ZORLANMIS
-- byte-sirali karsilastirma) tarafinda ayni sonucu vermesi icin, UUID'lerin
-- text temsili YALNIZCA ASCII (rakam/kucuk-harf-hex/tire) icerdiginden bu
-- iki siralama pratikte HER ZAMAN ayni sirayi uretir; SQL tarafinda
-- "collate "C"" EKLENMISTIR ki bu, veritabaninin varsayilan (locale'e bagli
-- olabilecek) collation'indan BAGIMSIZ, JS'nin davranisiyla ayni byte-sirali
-- sonucu garanti etsin.
-- ----------------------------------------------------------------------------

create or replace function public.repair_active_assignment_eye_brain_tasks(
  p_confirmation_token text,
  p_expected_head_commit text
)
returns jsonb
language plpgsql
volatile
security definer
set search_path = public, pg_temp
as $$
declare
  v_operation_name text := 'repair-eye-brain-assignment-2.6A.1';

  v_program_id uuid;
  v_total_days integer;
  v_tasks_per_day integer;
  v_template_id uuid;

  v_day_count integer;
  v_task_count integer;
  v_eye_brain_count integer;

  v_task_ids_sorted text[];
  v_canonical text;
  v_computed_token text;

  v_mapping_match_count integer;
  v_template_mismatch_count integer;

  v_updated_count integer;

  v_available_count integer;
  v_locked_count integer;
  v_other_status_count integer;
  v_available_day_count integer;
  v_locked_day_count integer;

  v_result jsonb;
begin
  -- ==========================================================================
  -- 1) AKTIF PROGRAM: bul + kilitle + tam 1 satir garantisi (STRICT).
  -- ==========================================================================
  begin
    select id, total_days, tasks_per_day, template_id
    into strict v_program_id, v_total_days, v_tasks_per_day, v_template_id
    from public.student_assignment_programs
    where status = 'active'
    for update;
  exception
    when too_many_rows then
      raise exception 'EYE_BRAIN_REPAIR_ACTIVE_PROGRAM_COUNT_MISMATCH: status=''active'' olan birden fazla program bulundu.';
    when no_data_found then
      raise exception 'EYE_BRAIN_REPAIR_ACTIVE_PROGRAM_COUNT_MISMATCH: status=''active'' olan hicbir program bulunamadi.';
  end;

  if v_total_days <> 20 or v_tasks_per_day <> 5 then
    raise exception 'EYE_BRAIN_REPAIR_PROGRAM_SHAPE_MISMATCH: total_days=20 & tasks_per_day=5 bekleniyordu (bulunan: %/%).', v_total_days, v_tasks_per_day;
  end if;

  if v_template_id is null then
    raise exception 'EYE_BRAIN_REPAIR_TEMPLATE_ID_MISSING: programin template_id alani NULL, kaynak template dogrulanamaz.';
  end if;

  -- ==========================================================================
  -- 2) GUN VE GOREV SATIRLARINI KILITLE (aggregate ile FOR UPDATE ayni
  --    statement'ta kullanilamadigi icin once PERFORM ile satir-satir
  --    kilitlenir, ardindan ayri SELECT'lerle sayilir - kilitler ayni
  --    transaction icinde kaldigindan bu iki adim arasinda tutarlilik bozulmaz).
  -- ==========================================================================
  perform 1 from public.student_assignment_program_days where program_id = v_program_id for update;

  select count(*) into v_day_count
  from public.student_assignment_program_days
  where program_id = v_program_id;

  if v_day_count <> 20 then
    raise exception 'EYE_BRAIN_REPAIR_DAY_COUNT_MISMATCH: 20 gun bekleniyordu, bulunan: %.', v_day_count;
  end if;

  perform 1 from public.student_assignment_program_tasks where program_id = v_program_id for update;

  select count(*) into v_task_count
  from public.student_assignment_program_tasks
  where program_id = v_program_id;

  if v_task_count <> 100 then
    raise exception 'EYE_BRAIN_REPAIR_TASK_COUNT_MISMATCH: 100 gorev bekleniyordu, bulunan: %.', v_task_count;
  end if;

  select count(*) into v_eye_brain_count
  from public.student_assignment_program_tasks
  where program_id = v_program_id
    and exercise_slug = 'goz-beyin';

  if v_eye_brain_count <> 14 then
    raise exception 'EYE_BRAIN_REPAIR_EYE_BRAIN_COUNT_MISMATCH: 14 "goz-beyin" gorevi bekleniyordu, bulunan: %.', v_eye_brain_count;
  end if;

  -- ==========================================================================
  -- 3) HEAD COMMIT FORMATI + ONAY TOKEN'I DOGRULAMASI.
  -- ==========================================================================
  if p_expected_head_commit is null or p_expected_head_commit !~ '^[0-9a-f]{40}$' then
    raise exception 'EYE_BRAIN_REPAIR_HEAD_COMMIT_INVALID: p_expected_head_commit gecerli, 40 karakterlik hex bir git SHA-1 olmalidir.';
  end if;

  if p_confirmation_token is null or length(trim(p_confirmation_token)) = 0 then
    raise exception 'EYE_BRAIN_REPAIR_CONFIRMATION_TOKEN_MISMATCH: p_confirmation_token zorunludur.';
  end if;

  v_task_ids_sorted := array(
    select t.id::text
    from public.student_assignment_program_tasks t
    where t.program_id = v_program_id
      and t.exercise_slug = 'goz-beyin'
    order by t.id::text collate "C" asc
  );

  v_canonical := v_operation_name || '|' || p_expected_head_commit || '|' || v_program_id::text || '|' || array_to_string(v_task_ids_sorted, ',');
  v_computed_token := encode(digest(v_canonical, 'sha256'), 'hex');

  if p_confirmation_token <> v_computed_token then
    raise exception 'EYE_BRAIN_REPAIR_CONFIRMATION_TOKEN_MISMATCH: saglanan token guncel canli veriyle uyusmuyor (program/gorevler dry-run''dan beri degismis olabilir).';
  end if;

  -- ==========================================================================
  -- 4) DETERMINISTIK REPLACEMENT MAPPING - bakim script'indeki (scripts/
  --    maintenance/lib/eyeBrainRepairPlan.mjs -> EYE_BRAIN_REPLACEMENT_MAPPING)
  --    14 satirla BIREBIR ayni. "on commit drop" ile bu gecici tablo, bu
  --    fonksiyon cagrisinin transaction'i bittiginde (basarili veya
  --    basarisiz fark etmeksizin) otomatik silinir - hicbir kalici sema
  --    degisikligi birakmaz.
  -- ==========================================================================
  create temporary table pg_temp.eye_brain_replacement_mapping (
    day_number integer,
    task_order integer,
    exercise_slug text,
    exercise_title text,
    category text,
    starting_level integer,
    current_level integer,
    duration_seconds integer,
    settings jsonb
  ) on commit drop;

  insert into pg_temp.eye_brain_replacement_mapping
    (day_number, task_order, exercise_slug, exercise_title, category, starting_level, current_level, duration_seconds, settings)
  values
    (1, 3, 'goz-egzersizleri-kolonlar', 'Göz Egzersizleri Kolonlar', 'eye', 1, 1, 300, '{"columnCount":3,"flowDirection":"column","jumpSpeed":2500}'::jsonb),
    (4, 1, 'ayni-olani-yakala', 'Aynı Olanı Yakala', 'attention', 1, 1, 300, '{"mode":"symbol","speed":1500}'::jsonb),
    (7, 4, 'ayni-olani-yakala', 'Aynı Olanı Yakala', 'attention', 1, 1, 300, '{"mode":"symbol","speed":1500}'::jsonb),
    (8, 5, 'ayni-olani-yakala', 'Aynı Olanı Yakala', 'attention', 1, 1, 300, '{"mode":"symbol","speed":1500}'::jsonb),
    (9, 5, 'ayni-olani-yakala', 'Aynı Olanı Yakala', 'attention', 1, 1, 300, '{"mode":"symbol","speed":1500}'::jsonb),
    (10, 3, 'hafiza-gelistirme', 'Hafıza Geliştirme', 'memory', 2, 2, 300, '{"displayMs":1000,"fontSize":16,"gridLayout":"5x5"}'::jsonb),
    (11, 3, 'ayni-olani-yakala', 'Aynı Olanı Yakala', 'attention', 1, 1, 300, '{"mode":"symbol","speed":1500}'::jsonb),
    (12, 3, 'hafiza-gelistirme', 'Hafıza Geliştirme', 'memory', 2, 2, 300, '{"displayMs":1000,"fontSize":16,"gridLayout":"5x5"}'::jsonb),
    (13, 3, 'ayni-olani-yakala', 'Aynı Olanı Yakala', 'attention', 1, 1, 300, '{"mode":"symbol","speed":1500}'::jsonb),
    (14, 5, 'hafiza-gelistirme', 'Hafıza Geliştirme', 'memory', 2, 2, 300, '{"displayMs":1000,"fontSize":16,"gridLayout":"5x5"}'::jsonb),
    (15, 5, 'ayni-olani-yakala', 'Aynı Olanı Yakala', 'attention', 1, 1, 300, '{"mode":"symbol","speed":1500}'::jsonb),
    (16, 4, 'hafiza-gelistirme', 'Hafıza Geliştirme', 'memory', 2, 2, 300, '{"displayMs":1000,"fontSize":16,"gridLayout":"5x5"}'::jsonb),
    (18, 4, 'ayni-olani-yakala', 'Aynı Olanı Yakala', 'attention', 1, 1, 300, '{"mode":"symbol","speed":1500}'::jsonb),
    (20, 4, 'hafiza-gelistirme', 'Hafıza Geliştirme', 'memory', 2, 2, 300, '{"displayMs":1000,"fontSize":16,"gridLayout":"5x5"}'::jsonb);

  -- ==========================================================================
  -- 5) MAPPING <-> CANLI VERI ESLESMESI: 14 pozisyonun HER BIRINDE canlida
  --    hala "goz-beyin", status locked/available VE tum ilerleme/result
  --    alanlari NULL olan bir gorev olmali (baslamis/tamamlanmis bir gorev
  --    varsa bu sayi 14'ten dusuk cikar ve asagida reddedilir).
  -- ==========================================================================
  select count(*) into v_mapping_match_count
  from pg_temp.eye_brain_replacement_mapping m
  join public.student_assignment_program_tasks t
    on t.program_id = v_program_id
   and t.day_number = m.day_number
   and t.task_order = m.task_order
  where t.exercise_slug = 'goz-beyin'
    and t.status in ('locked', 'available')
    and t.started_at is null
    and t.expires_at is null
    and t.completed_at is null
    and t.completion_reason is null
    and t.result_id is null
    and t.last_heartbeat_at is null;

  if v_mapping_match_count <> 14 then
    raise exception 'EYE_BRAIN_REPAIR_MAPPING_TARGET_NOT_FOUND: 14 hedef pozisyondan yalniz % tanesi canlida guvenli sekilde eslesti (baslamis/tamamlanmis bir gorev olabilir).', v_mapping_match_count;
  end if;

  -- ==========================================================================
  -- 6) KAYNAK TEMPLATE GUARD'LARI: her replacement slug'i icin enabled,
  --    daily_weight>0 VE mapping'le birebir ayni starting_level/duration_
  --    seconds/settings (jsonb '=' anahtar sirasindan BAGIMSIZDIR).
  --    integrationStatus/route/resultExerciseType DB'de YOKTUR - bunlar
  --    bakim script'inin dry-run asamasinda katalogdan zaten dogrulanmistir.
  -- ==========================================================================
  select count(*) into v_template_mismatch_count
  from pg_temp.eye_brain_replacement_mapping m
  left join public.program_class_exercise_settings pces
    on pces.template_id = v_template_id
   and pces.exercise_slug = m.exercise_slug
  where pces.id is null
     or pces.enabled is distinct from true
     or coalesce(pces.daily_weight, 0) <= 0
     or pces.starting_level <> m.starting_level
     or pces.duration_seconds <> m.duration_seconds
     or pces.settings <> m.settings;

  if v_template_mismatch_count > 0 then
    raise exception 'EYE_BRAIN_REPAIR_TEMPLATE_SETTING_MISMATCH: % replacement satiri kaynak template (program_class_exercise_settings) ile uyusmuyor.', v_template_mismatch_count;
  end if;

  -- ==========================================================================
  -- 7) TEK UPDATE STATEMENT'I - tam 14 satir, yalniz izin verilen kolonlar,
  --    WHERE guard'lari (goz-beyin + status + tum ilerleme alanlari NULL)
  --    UPDATE'in KENDISINDE de tekrarlanir (savunma derinligi - yukaridaki
  --    5. adimdaki kontrolle ayni sonucu bagimsiz olarak dogrular).
  -- ==========================================================================
  update public.student_assignment_program_tasks t
  set
    exercise_slug = m.exercise_slug,
    exercise_title = m.exercise_title,
    category = m.category,
    starting_level = m.starting_level,
    current_level = m.current_level,
    duration_seconds = m.duration_seconds,
    settings = m.settings,
    updated_at = now()
  from pg_temp.eye_brain_replacement_mapping m
  where t.program_id = v_program_id
    and t.day_number = m.day_number
    and t.task_order = m.task_order
    and t.exercise_slug = 'goz-beyin'
    and t.status in ('locked', 'available')
    and t.started_at is null
    and t.expires_at is null
    and t.completed_at is null
    and t.completion_reason is null
    and t.result_id is null
    and t.last_heartbeat_at is null;

  get diagnostics v_updated_count = row_count;

  if v_updated_count <> 14 then
    raise exception 'EYE_BRAIN_REPAIR_UPDATE_COUNT_MISMATCH: tam 14 satir guncellenmesi bekleniyordu, guncellenen: %.', v_updated_count;
  end if;

  -- ==========================================================================
  -- 8) COMMIT'TEN ONCE, TRANSACTION ICINDE SON DOGRULAMA - herhangi biri
  --    basarisiz olursa RAISE EXCEPTION tum transaction'i (UPDATE dahil)
  --    otomatik geri alir.
  -- ==========================================================================
  select count(*) into v_eye_brain_count
  from public.student_assignment_program_tasks
  where program_id = v_program_id
    and exercise_slug = 'goz-beyin';

  if v_eye_brain_count <> 0 then
    raise exception 'EYE_BRAIN_REPAIR_POST_UPDATE_INVARIANT_FAILED: guncelleme sonrasi "goz-beyin" sayisi 0 olmali, bulunan: %.', v_eye_brain_count;
  end if;

  select count(*) into v_task_count
  from public.student_assignment_program_tasks
  where program_id = v_program_id;

  if v_task_count <> 100 then
    raise exception 'EYE_BRAIN_REPAIR_POST_UPDATE_INVARIANT_FAILED: guncelleme sonrasi 100 gorev bekleniyordu, bulunan: %.', v_task_count;
  end if;

  select count(*) into v_day_count
  from public.student_assignment_program_days
  where program_id = v_program_id;

  if v_day_count <> 20 then
    raise exception 'EYE_BRAIN_REPAIR_POST_UPDATE_INVARIANT_FAILED: guncelleme sonrasi 20 gun bekleniyordu, bulunan: %.', v_day_count;
  end if;

  if exists (
    select 1
    from public.student_assignment_program_tasks
    where program_id = v_program_id
    group by day_number
    having count(*) <> 5 or count(distinct exercise_slug) <> 5
  ) then
    raise exception 'EYE_BRAIN_REPAIR_POST_UPDATE_INVARIANT_FAILED: bir veya daha fazla gunde 5 gorev / 5 benzersiz slug korunmadi.';
  end if;

  select
    count(*) filter (where status = 'available'),
    count(*) filter (where status = 'locked'),
    count(*) filter (where status in ('in_progress', 'completed', 'cancelled'))
  into v_available_count, v_locked_count, v_other_status_count
  from public.student_assignment_program_tasks
  where program_id = v_program_id;

  if v_available_count <> 5 or v_locked_count <> 95 or v_other_status_count <> 0 then
    raise exception 'EYE_BRAIN_REPAIR_POST_UPDATE_INVARIANT_FAILED: durum dagilimi bozuldu (available=%, locked=%, diger=%).', v_available_count, v_locked_count, v_other_status_count;
  end if;

  select
    count(*) filter (where status = 'available'),
    count(*) filter (where status = 'locked')
  into v_available_day_count, v_locked_day_count
  from public.student_assignment_program_days
  where program_id = v_program_id;

  if v_available_day_count <> 1 or v_locked_day_count <> 19 then
    raise exception 'EYE_BRAIN_REPAIR_POST_UPDATE_INVARIANT_FAILED: gun durum dagilimi bozuldu (available=%, locked=%).', v_available_day_count, v_locked_day_count;
  end if;

  if not exists (
    select 1 from public.student_assignment_programs
    where id = v_program_id and status = 'active'
  ) then
    raise exception 'EYE_BRAIN_REPAIR_POST_UPDATE_INVARIANT_FAILED: program status ''active'' olmaktan cikti.';
  end if;

  if exists (
    select 1
    from public.student_assignment_program_tasks t
    join pg_temp.eye_brain_replacement_mapping m
      on t.program_id = v_program_id
     and t.day_number = m.day_number
     and t.task_order = m.task_order
    where t.result_id is not null
  ) then
    raise exception 'EYE_BRAIN_REPAIR_POST_UPDATE_INVARIANT_FAILED: guncellenen satirlarin result_id alani bos olmali.';
  end if;

  if exists (
    select 1
    from pg_temp.eye_brain_replacement_mapping m
    join public.student_assignment_program_tasks t
      on t.program_id = v_program_id
     and t.day_number = m.day_number
     and t.task_order = m.task_order
    where t.exercise_slug <> m.exercise_slug
  ) then
    raise exception 'EYE_BRAIN_REPAIR_POST_UPDATE_INVARIANT_FAILED: bir veya daha fazla hedef pozisyon beklenen slug''a sahip degil.';
  end if;

  -- ==========================================================================
  -- 9) GUVENLI OZET - hicbir kisisel veri veya UUID icermez.
  -- ==========================================================================
  v_result := jsonb_build_object(
    'ok', true,
    'operation', v_operation_name,
    'updated_count', v_updated_count,
    'day_count', v_day_count,
    'task_count', v_task_count,
    'eye_brain_remaining', v_eye_brain_count,
    'available_count', v_available_count,
    'locked_count', v_locked_count,
    'message', 'goz-beyin gorevleri basariyla degistirildi.'
  );

  return v_result;
end;
$$;

comment on function public.repair_active_assignment_eye_brain_tasks(text, text) is
  'TEK KULLANIMLIK bakim RPC''si (Faz 2.6A.2) - yalniz service_role tarafindan cagrilabilir. '
  'Su an TEK olan aktif ogrenci programindaki 14 "goz-beyin" gorevini, fonksiyonun implicit '
  'transaction''i icinde ATOMIK olarak baska egzersizlerle degistirir (hata durumunda TUM '
  'degisiklikler geri alinir). p_confirmation_token, bakim script''inin (scripts/maintenance/'
  'repair-eye-brain-assignment.mjs) urettigi sha256 digest ile birebir uyusmalidir - program/'
  'gorev kumesi dry-run''dan beri degismisse token uyusmaz ve fonksiyon hicbir yazma yapmadan '
  'reddeder. Mevcut daily_assignments/daily_assignment_items sistemine ve '
  'create_student_assignment_program RPC''sine hicbir sekilde dokunmaz.';

-- ----------------------------------------------------------------------------
-- Yetkiler: yalniz service_role calistirabilir (tarayicidan anon/authenticated
-- ile DOGRUDAN cagrilamaz).
-- ----------------------------------------------------------------------------
revoke all on function public.repair_active_assignment_eye_brain_tasks(text, text) from public;
revoke all on function public.repair_active_assignment_eye_brain_tasks(text, text) from anon;
revoke all on function public.repair_active_assignment_eye_brain_tasks(text, text) from authenticated;
grant execute on function public.repair_active_assignment_eye_brain_tasks(text, text) to service_role;
