-- ============================================================================
-- EGITIM PROGRAMI - GOREV BASLATMA (LAUNCH) RPC'SI
-- ============================================================================
-- Bu migration TEK bir fonksiyon tanimlar: public.start_education_program_
-- task_v1(p_student_id, p_task_id). Assignment System V2'nin (student_
-- assignment_program_tasks) hicbir tablosuna, RPC'sine veya repository'sine
-- DOKUNMAZ - tamamen Egitim Programi (student_education_program_*) bounded
-- context'i icinde kalir.
--
-- AMAC: bir ogrencinin, kendisine atanmis aktif programdaki sirasi gelen
-- (available) veya daha once basladigi (in_progress) gorevi guvenli ve
-- atomik bicimde 'in_progress' durumuna gecirmek. Bu FAZ 3A-1 kapsaminda
-- YALNIZCA baslatma islenir - tamamlanma, puanlama, sonraki gorev/gun/
-- program gecisi bu fonksiyonun kapsami DISINDADIR.
--
-- GUN GECISI: onaylanan karara gore, gorevin ILK kez baslatilmasi aninda
-- (task.status: available -> in_progress) baglı oldugu gunun durumu da
-- (eger hala 'available' ise) 'in_progress' yapilir ve day.started_at
-- yalniz o an null ise now() ile doldurulur. Gun zaten 'in_progress' ise
-- (baska bir gorev onceden baslatilmissa) hicbir gun satirina yazma
-- yapilmaz - bu, "Tekrar Devam Et'te started_at degismez" kuralinin gun
-- seviyesindeki karsiligidir.
--
-- GUVENLIK MODELI (mevcut assign_education_program_template_v1 ve
-- Assignment V2'nin complete_student_assignment_program_task'iyla BIREBIR
-- ayni): security definer + explicit search_path pinleme + yalniz
-- service_role'e execute. p_student_id CLIENT'TAN DEGIL, cagiran Server
-- Action'in kendi dogruladigi (imzali HMAC cookie'den cozulmus) studentId'
-- sinden gelir - bu RPC bunu tekrar guvenlik katmani olarak dogrular
-- (task.student_id <> p_student_id ise reddeder), ama TEK basina bir
-- yetkilendirme mekanizmasi degildir.
--
-- IDEMPOTENCY: gorev zaten 'in_progress' ise hicbir yazma yapilmadan
-- mevcut durum jsonb olarak donulur (started_at DEGISMEZ). Ayni anda gelen
-- iki cagri, task satirinin "for update" kilidi sayesinde birbirini
-- sirayla bekler - ikinci cagri, birincisi commit olduktan sonra zaten
-- 'in_progress' gorup idempotent yolu izler.
--
-- KILITLEME: gorev ve gun satirlari "SELECT ... FOR UPDATE" ile kilitlenir;
-- program yalniz okunur (bu fazda programa yazma yoktur).
-- ============================================================================

create or replace function public.start_education_program_task_v1(
  p_student_id uuid,
  p_task_id uuid
)
returns jsonb
language plpgsql
volatile
security definer
set search_path = public, pg_temp
as $$
declare
  v_task_status text;
  v_task_student_id uuid;
  v_task_started_at timestamptz;
  v_program_day_id uuid;
  v_program_id uuid;
  v_exercise_slug text;

  v_program_status text;

  v_day_status text;

  v_result_started_at timestamptz;
begin
  -- ==========================================================================
  -- 0) TEMEL INPUT VALIDASYONU
  -- ==========================================================================
  if p_student_id is null or p_task_id is null then
    raise exception 'EDUCATION_TASK_START_INVALID_INPUT: p_student_id ve p_task_id zorunludur.';
  end if;

  -- ==========================================================================
  -- 1) GOREV: bul + kilitle + tam 1 satir garantisi.
  -- ==========================================================================
  begin
    select t.status, t.student_id, t.started_at, t.program_day_id, t.program_id, t.exercise_slug
    into strict v_task_status, v_task_student_id, v_task_started_at, v_program_day_id, v_program_id, v_exercise_slug
    from public.student_education_program_tasks t
    where t.id = p_task_id
    for update;
  exception
    when no_data_found then
      raise exception 'EDUCATION_TASK_START_TASK_NOT_FOUND: Gorev bulunamadi.';
  end;

  if v_task_student_id <> p_student_id then
    raise exception 'EDUCATION_TASK_START_STUDENT_MISMATCH: Gorev bu ogrenciye ait degil.';
  end if;

  -- ==========================================================================
  -- 2) PROGRAM: aktif mi (yalniz okunur, bu fazda programa yazma yok).
  -- ==========================================================================
  select p.status
  into v_program_status
  from public.student_education_programs p
  where p.id = v_program_id;

  if v_program_status is null then
    raise exception 'EDUCATION_TASK_START_PROGRAM_NOT_FOUND: Gorevin bagli oldugu program bulunamadi.';
  end if;

  if v_program_status <> 'active' then
    raise exception 'EDUCATION_TASK_START_PROGRAM_NOT_ACTIVE: Program artik aktif degil.';
  end if;

  -- ==========================================================================
  -- 3) GUN: bul + kilitle + baslatilabilir durumda mi.
  -- ==========================================================================
  begin
    select d.status
    into strict v_day_status
    from public.student_education_program_days d
    where d.id = v_program_day_id
    for update;
  exception
    when no_data_found then
      raise exception 'EDUCATION_TASK_START_DAY_NOT_FOUND: Gorevin bagli oldugu gun bulunamadi.';
  end;

  if v_day_status not in ('available', 'in_progress') then
    raise exception 'EDUCATION_TASK_START_DAY_NOT_STARTABLE: Gun % durumunda, yalniz available veya in_progress gunlerde gorev baslatilabilir.', v_day_status;
  end if;

  -- ==========================================================================
  -- 4) IDEMPOTENCY: gorev zaten in_progress ise hicbir yazma yapmadan don.
  --    Bu noktada gun da zaten in_progress olmak zorundadir (asagidaki 6.
  --    adimla ayni transaction'da esanli gecer) - defensif olarak yine de
  --    mevcut gun durumunu dondururuz.
  -- ==========================================================================
  if v_task_status = 'in_progress' then
    return jsonb_build_object(
      'ok', true,
      'idempotent', true,
      'taskId', p_task_id,
      'taskStatus', 'in_progress',
      'startedAt', v_task_started_at,
      'exerciseSlug', v_exercise_slug,
      'dayStatus', v_day_status
    );
  end if;

  if v_task_status <> 'available' then
    raise exception 'EDUCATION_TASK_START_TASK_NOT_STARTABLE: Gorev % durumunda, yalniz available durumundaki gorevler baslatilabilir.', v_task_status;
  end if;

  -- ==========================================================================
  -- 5) GOREVI BASLAT: available -> in_progress, started_at ilk kez yazilir.
  -- ==========================================================================
  update public.student_education_program_tasks
  set status = 'in_progress', started_at = now()
  where id = p_task_id
  returning started_at into v_result_started_at;

  -- ==========================================================================
  -- 6) GUN: yalniz hala 'available' ise 'in_progress' yap; started_at yalniz
  --    null ise doldurulur (zaten in_progress ise bu blok hic calismaz, yani
  --    tekrar baslatmada gunun started_at'i asla degismez).
  -- ==========================================================================
  if v_day_status = 'available' then
    update public.student_education_program_days
    set status = 'in_progress', started_at = coalesce(started_at, now())
    where id = v_program_day_id;
  end if;

  -- ==========================================================================
  -- 7) GUVENLI OZET.
  -- ==========================================================================
  return jsonb_build_object(
    'ok', true,
    'idempotent', false,
    'taskId', p_task_id,
    'taskStatus', 'in_progress',
    'startedAt', v_result_started_at,
    'exerciseSlug', v_exercise_slug,
    'dayStatus', 'in_progress'
  );
end;
$$;

comment on function public.start_education_program_task_v1(uuid, uuid) is
  'Yalniz service_role tarafindan cagrilabilir (anon/authenticated execute yetkisi yok). '
  'Ogrenciye ait bir Egitim Programi gorevini (student_education_program_tasks) ATOMIK '
  'olarak available -> in_progress durumuna gecirir; gorevin bagli oldugu gun hala '
  'available ise onu da in_progress yapar. Idempotenttir: gorev zaten in_progress ise '
  'hicbir yazma yapmadan mevcut durumu doner (started_at degismez). Tamamlanma, '
  'puanlama, sonraki gorev/gun/program gecisi bu fonksiyonun kapsami DISINDADIR - '
  'Assignment System V2 tablolarina/RPC''lerine hicbir bagimliligi yoktur.';

-- ----------------------------------------------------------------------------
-- Yetkiler: yalniz service_role calistirabilir (tarayicidan anon/authenticated
-- ile DOGRUDAN cagrilamaz).
-- ----------------------------------------------------------------------------
revoke all on function public.start_education_program_task_v1(uuid, uuid) from public;
revoke all on function public.start_education_program_task_v1(uuid, uuid) from anon;
revoke all on function public.start_education_program_task_v1(uuid, uuid) from authenticated;
grant execute on function public.start_education_program_task_v1(uuid, uuid) to service_role;
