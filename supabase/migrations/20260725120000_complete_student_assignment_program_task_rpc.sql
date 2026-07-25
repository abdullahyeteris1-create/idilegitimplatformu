-- ============================================================================
-- 20 GUNLUK KILITLI ODEV PROGRAMI - GOREV TAMAMLAMA + GUN KILIDI ACMA RPC'SI
-- ============================================================================
-- Bu migration TEK bir fonksiyon tanimlar: public.complete_student_assignment_
-- program_task(p_task_id, p_student_id, p_result_id). Mevcut tablolara/
-- constraint'lere hicbir sekilde dokunmaz; create_student_assignment_program
-- (20260724100000) ve repair_active_assignment_eye_brain_tasks (20260725090000)
-- RPC'leriyle BIREBIR ayni guvenlik/transaction kalibini kullanir.
--
-- AMAC: bir ogrenci bir egzersizi bitirip sonucu (exercise_results) kaydettikten
-- SONRA, o sonucu ilgili gorevle (student_assignment_program_tasks) atomik
-- olarak eslestirir: gorevi 'completed' yapar, gunun 5 gorevi de tamamlandiysa
-- gunu 'completed' yapar, ve o durumda bir sonraki gunu (hala 'locked' ise)
-- 'available' yapar. v1 KASITLI OLARAK gorev-ici sure/heartbeat takibi
-- ICERMEZ - gorev dogrudan 'available' -> 'completed' gecer (kullanicinin
-- acik tercihi: sekmeyi yarida kapatan ogrenci gorevi 'available' halde
-- birakir, tekrar girip bitirebilir).
--
-- GUN KILIDI ACMA TAMAMEN ILERLEME BAZLIDIR, TAKVIME BAGLI DEGILDIR: bir
-- gunun 5 gorevi ne zaman biterse bitsin (ayni gun, 3 gun sonra, 5 gun sonra),
-- bittigi an bir sonraki gun acilir - hicbir tarih/zaman karsilastirmasi
-- yapilmaz.
--
-- GUVENLIK MODELI (mevcut iki RPC ile BIREBIR ayni): security definer +
-- explicit search_path pinleme + yalniz service_role'e execute. p_student_id
-- CLIENT'TAN DEGIL, cagiran API route'unun kendi dogruladigi (imzali HMAC
-- cookie'den cozulmus) studentId'sinden gelir - bu RPC bunu tekrar guvenlik
-- katmani olarak dogrular (task.student_id <> p_student_id ise reddeder),
-- ama TEK basina bir yetkilendirme mekanizmasi degildir.
--
-- EGZERSIZ-TURU CAPRAZ KONTROLU BURADA YOK: task.exercise_slug'in result'in
-- gercek turuyle eslesip eslesmedigi DB'de dogrulanamaz (katalog TS
-- tarafinda yasar) - bu kontrol cagiran API route'unda (mevcut assignment-
-- items/[itemId]/complete/route.ts'teki ASSIGNMENT_EXERCISE_BY_SLUG
-- kontroluyle ayni desende) yapilir, bu RPC'ye ulasan her cagrinin zaten bu
-- kontrolden gectigi varsayilir.
--
-- IDEMPOTENCY: ayni (p_task_id, p_result_id) ikilisiyle birden fazla cagri
-- (ag retry / cift tiklama) guvenlidir - gorev zaten bu sonuçla tamamlanmissa
-- hicbir yazma yapilmadan mevcut durum jsonb olarak donulur.
--
-- KILITLEME: gorev, gun ve (gun tamamlaninca) program satirlari sirayla
-- "SELECT ... FOR UPDATE" ile kilitlenir - bu, ayni gunun iki farkli
-- gorevinin es zamanli tamamlanmaya calisilmasi durumunda "5 gorev de bitti
-- mi" sayiminin ve sonraki-gun-acma isleminin race condition'siz calismasini
-- saglar (ikinci cagri, birincisi commit olana kadar gun satirinin kilidinde
-- bekler).
-- ============================================================================

create or replace function public.complete_student_assignment_program_task(
  p_task_id uuid,
  p_student_id uuid,
  p_result_id uuid
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
  v_task_result_id uuid;
  v_program_day_id uuid;
  v_day_number integer;
  v_program_id uuid;

  v_result_student_id uuid;
  v_result_program_task_id uuid;

  v_completed_task_count integer;
  v_tasks_per_day integer;

  v_total_days integer;

  v_day_status text;
  v_day_completed boolean := false;

  v_next_day_id uuid;
  v_next_day_status text;
  v_next_day_unlocked boolean := false;

  v_program_completed boolean := false;
begin
  -- ==========================================================================
  -- 0) TEMEL INPUT VALIDASYONU
  -- ==========================================================================
  if p_task_id is null or p_student_id is null or p_result_id is null then
    raise exception 'ASSIGNMENT_TASK_COMPLETE_INVALID_INPUT: p_task_id, p_student_id ve p_result_id zorunludur.';
  end if;

  -- ==========================================================================
  -- 1) GOREV: bul + kilitle + tam 1 satir garantisi.
  -- ==========================================================================
  begin
    select t.status, t.student_id, t.result_id, t.program_day_id, t.day_number, t.program_id
    into strict v_task_status, v_task_student_id, v_task_result_id, v_program_day_id, v_day_number, v_program_id
    from public.student_assignment_program_tasks t
    where t.id = p_task_id
    for update;
  exception
    when no_data_found then
      raise exception 'ASSIGNMENT_TASK_COMPLETE_TASK_NOT_FOUND: Gorev bulunamadi.';
  end;

  if v_task_student_id <> p_student_id then
    raise exception 'ASSIGNMENT_TASK_COMPLETE_STUDENT_MISMATCH: Gorev bu ogrenciye ait degil.';
  end if;

  -- ==========================================================================
  -- 2) IDEMPOTENCY: gorev zaten bu sonucla tamamlanmissa yazma yapmadan don.
  -- ==========================================================================
  if v_task_status = 'completed' then
    if v_task_result_id = p_result_id then
      return jsonb_build_object(
        'ok', true,
        'idempotent', true,
        'taskStatus', 'completed',
        'dayCompleted', false,
        'nextDayUnlocked', false,
        'programCompleted', false
      );
    end if;

    raise exception 'ASSIGNMENT_TASK_COMPLETE_ALREADY_COMPLETED_MISMATCH: Gorev farkli bir sonucla zaten tamamlanmis.';
  end if;

  if v_task_status <> 'available' then
    raise exception 'ASSIGNMENT_TASK_COMPLETE_NOT_COMPLETABLE: Gorev % durumunda, yalniz ''available'' durumundaki gorevler tamamlanabilir.', v_task_status;
  end if;

  -- ==========================================================================
  -- 3) SONUC: bul + kilitle + sahiplik/eslesme dogrulamasi.
  -- ==========================================================================
  begin
    select r.student_id, r.program_task_id
    into strict v_result_student_id, v_result_program_task_id
    from public.exercise_results r
    where r.id = p_result_id
    for update;
  exception
    when no_data_found then
      raise exception 'ASSIGNMENT_TASK_COMPLETE_RESULT_NOT_FOUND: Sonuc bulunamadi.';
  end;

  if v_result_student_id <> p_student_id then
    raise exception 'ASSIGNMENT_TASK_COMPLETE_RESULT_STUDENT_MISMATCH: Sonuc bu ogrenciye ait degil.';
  end if;

  if v_result_program_task_id is not null and v_result_program_task_id <> p_task_id then
    raise exception 'ASSIGNMENT_TASK_COMPLETE_RESULT_ALREADY_LINKED: Sonuc zaten baska bir goreve baglanmis.';
  end if;

  -- ==========================================================================
  -- 4) GOREVI TAMAMLA + SONUCU BAGLA (cift yonlu).
  -- ==========================================================================
  update public.exercise_results
  set program_task_id = p_task_id
  where id = p_result_id
    and program_task_id is null;

  update public.student_assignment_program_tasks
  set
    status = 'completed',
    completed_at = now(),
    completion_reason = 'result_submitted',
    result_id = p_result_id
  where id = p_task_id;

  -- ==========================================================================
  -- 5) GUN: kilitle + tamamlanan gorev sayisini say. Bu transaction'in kendi
  --    UPDATE'ini (yukarida) de gordugu icin (ayni transaction), sayim
  --    az once tamamlanan gorevi ZATEN icerir.
  -- ==========================================================================
  begin
    select d.status
    into strict v_day_status
    from public.student_assignment_program_days d
    where d.id = v_program_day_id
    for update;
  exception
    when no_data_found then
      raise exception 'ASSIGNMENT_TASK_COMPLETE_DAY_NOT_FOUND: Gorevin bagli oldugu gun bulunamadi.';
  end;

  select p.tasks_per_day, p.total_days
  into v_tasks_per_day, v_total_days
  from public.student_assignment_programs p
  where p.id = v_program_id;

  if v_tasks_per_day is null then
    raise exception 'ASSIGNMENT_TASK_COMPLETE_PROGRAM_NOT_FOUND: Gorevin bagli oldugu program bulunamadi.';
  end if;

  select count(*)
  into v_completed_task_count
  from public.student_assignment_program_tasks
  where program_day_id = v_program_day_id
    and status = 'completed';

  if v_completed_task_count >= v_tasks_per_day and v_day_status <> 'completed' then
    update public.student_assignment_program_days
    set status = 'completed', completed_at = now()
    where id = v_program_day_id;

    v_day_completed := true;
  end if;

  -- ==========================================================================
  -- 6) GUN TAMAMLANDIYSA: programin completed_days'ini guncelle, son gun ise
  --    programi da tamamla, degilse bir sonraki gunu (hala 'locked' ise) ac.
  -- ==========================================================================
  if v_day_completed then
    update public.student_assignment_programs
    set completed_days = v_day_number
    where id = v_program_id
      and completed_days < v_day_number;

    if v_day_number >= v_total_days then
      update public.student_assignment_programs
      set status = 'completed', completed_at = now()
      where id = v_program_id
        and status <> 'completed';

      v_program_completed := true;
    else
      begin
        select nd.id, nd.status
        into strict v_next_day_id, v_next_day_status
        from public.student_assignment_program_days nd
        where nd.program_id = v_program_id
          and nd.day_number = v_day_number + 1
        for update;
      exception
        when no_data_found then
          raise exception 'ASSIGNMENT_TASK_COMPLETE_NEXT_DAY_NOT_FOUND: % gun beklenirken sonraki gun (%) bulunamadi.', v_total_days, v_day_number + 1;
      end;

      if v_next_day_status = 'locked' then
        update public.student_assignment_program_days
        set status = 'available', available_at = now()
        where id = v_next_day_id;

        v_next_day_unlocked := true;
      end if;
    end if;
  end if;

  -- ==========================================================================
  -- 7) GUVENLI OZET - hicbir kisisel veri icermez.
  -- ==========================================================================
  return jsonb_build_object(
    'ok', true,
    'idempotent', false,
    'taskStatus', 'completed',
    'dayCompleted', v_day_completed,
    'nextDayUnlocked', v_next_day_unlocked,
    'programCompleted', v_program_completed
  );
end;
$$;

comment on function public.complete_student_assignment_program_task(uuid, uuid, uuid) is
  'Yalniz service_role tarafindan cagrilabilir (anon/authenticated execute yetkisi yok). '
  'Bir odev programi gorevini, hazirca kaydedilmis bir exercise_results satiriyla ATOMIK '
  'olarak eslestirip tamamlar (function+implicit transaction). Gunun tum gorevleri '
  'tamamlandiysa gunu, gunun 20. gun oldugu durumda programi da tamamlar; aksi halde '
  'sonraki gunu (hala kilitliyse) acar. Idempotenttir: ayni gorev/sonuc ikilisiyle tekrar '
  'cagirilirsa hicbir yazma yapmadan mevcut durumu doner. Gorev-ici sure/heartbeat takibi '
  'v1 kapsaminda YOKTUR - gorev dogrudan available -> completed gecer.';

-- ----------------------------------------------------------------------------
-- Yetkiler: yalniz service_role calistirabilir (tarayicidan anon/authenticated
-- ile DOGRUDAN cagrilamaz).
-- ----------------------------------------------------------------------------
revoke all on function public.complete_student_assignment_program_task(uuid, uuid, uuid) from public;
revoke all on function public.complete_student_assignment_program_task(uuid, uuid, uuid) from anon;
revoke all on function public.complete_student_assignment_program_task(uuid, uuid, uuid) from authenticated;
grant execute on function public.complete_student_assignment_program_task(uuid, uuid, uuid) to service_role;
