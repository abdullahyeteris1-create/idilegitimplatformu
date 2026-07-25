-- ============================================================================
-- EGITIM PROGRAMI - GOREV TAMAMLAMA VE ILERLEME RPC'SI
-- ============================================================================
-- Bu migration TEK bir fonksiyon tanimlar: public.complete_education_program_
-- task_v1(p_student_id, p_task_id). Assignment System V2'nin (student_
-- assignment_program_tasks) hicbir tablosuna, RPC'sine veya repository'sine
-- DOKUNMAZ - tamamen Egitim Programi (student_education_program_*) bounded
-- context'i icinde kalir. Mevcut gorev baslatma (launch) RPC'siyle (bkz.
-- 20260725190000) BIREBIR ayni tablolara, kolonlara ve guvenlik/kilitleme
-- kalibina dayanir; hicbir yeni tablo/kolon/index eklemez.
--
-- AMAC: bir ogrencinin, kendisine ait ve halihazirda 'in_progress' durumunda
-- olan bir gorevi atomik ve idempotent bicimde 'completed' yapmak; ardindan
-- ayni gun icinde SIRADAKI (order_number'a gore) kilitli gorevi 'available'
-- yapmak; gunun tum gorevleri tamamlandiysa gunu 'completed' yapip sonraki
-- gunu (varsa) 've onun ilk gorevini) 'available' yapmak; sonraki gun
-- yoksa (son gun tamamlandiysa) programi 'completed' yapmak.
--
-- SIRALI GUN-ICI GOREV ACMA MODELI (Assignment V2'den KASITLI FARKLI): bu
-- bounded context'te bir gunun 5 gorevi HEP BIRDEN degil, SIRAYLA acilir
-- (assign_education_program_template_v1 zaten yalniz gun1/gorev1'i
-- 'available' yapar, digerleri 'locked' kalir - bkz. 20260725180000). Bu
-- RPC de ayni sirali modeli korur: bir gorev tamamlaninca yalniz BIR
-- SONRAKI kilitli gorev acilir, gunun kalan gorevleri kilitli kalir.
--
-- GUVENLIK MODELI (mevcut gorev baslatma RPC'siyle ve Assignment V2'nin
-- odev-gorevi-tamamlama RPC'siyle BIREBIR ayni):
-- security definer + explicit search_path pinleme + yalniz service_role'e
-- execute. p_student_id CLIENT'TAN DEGIL, cagiran server-only kod
-- katmaninin kendi dogruladigi (imzali HMAC cookie'den cozulmus)
-- studentId'sinden gelir - bu RPC bunu tekrar guvenlik katmani olarak
-- dogrular (task.student_id <> p_student_id ise reddeder), ama TEK basina
-- bir yetkilendirme mekanizmasi degildir. Bu migration hicbir yeni
-- ogrenci/authenticated UPDATE yetkisi acmaz - tum gecis service_role
-- araciligiyla bu RPC uzerinden yurur.
--
-- IDEMPOTENCY: gorev zaten 'completed' ise, PROGRAM/GUN STATUS GUARD'LARI
-- HIC CALISTIRILMADAN (kasitli tasarim karari - asagidaki nota bakin)
-- hicbir yazma yapilmadan mevcut ilerleme ozeti jsonb olarak donulur.
--
-- ONEMLI TASARIM KARARI (kullanicinin verdigi adim sirasindan kasitli
-- sapma): FAZ 3B-1A talimati, program/gun status guard'larinin (madde 6-7)
-- idempotency kisa-devresinden (madde 9) ONCE calistirilmasini oneriyordu.
-- Ancak bu SIRAYLA uygulanirsa gercek bir idempotency kirilmasi olusur:
-- bir gorev BASARIYLA tamamlandiktan ve onun gunu de 'completed' olduktan
-- SONRA gelen bir tekrar cagri (cift tiklama/ag retry), "gun artik
-- available/in_progress degil" guard'ina takilip HATA donerdi - halbuki
-- gorev zaten completed oldugu icin bu cagri idempotent success
-- DONDURMELIYDI. Bu yuzden idempotency kontrolu, sahiplik dogrulamasindan
-- HEMEN SONRA, program/gun guard'larindan ONCE yapilir (Assignment V2'nin
-- odev-gorevi-tamamlama RPC'sindeki sirayla ayni ilke).
-- Program/gun status guard'lari yalniz GERCEK (henuz completed olmamis)
-- tamamlama denemesinde uygulanir.
--
-- KILITLEME SIRASI (deadlock'u onlemek icin HER cagride sabit): task ->
-- program -> gun(mevcut) -> [varsa] gun(sonraki) -> gorev(sirdaki/sonraki
-- gunun ilki). Ayni programin farkli gorevlerinin es zamanli tamamlanma
-- denemesi, hepsi ayni sirayla program satirini kilitlemeye calistigi icin
-- capraz-bekleme (deadlock) uretmez - ikinci cagri, birincisi commit olana
-- kadar program kilidinde bekler.
-- ============================================================================

create or replace function public.complete_education_program_task_v1(
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
  v_program_day_id uuid;
  v_program_id uuid;
  v_order_number smallint;

  v_program_status text;
  v_program_total_days smallint;
  v_program_completed_days smallint;
  v_program_current_day_number smallint;

  v_day_status text;
  v_day_number smallint;

  v_completed_task_count integer;
  v_total_task_count integer;

  v_unlocked_task_id uuid;
  v_day_completed boolean := false;

  v_next_day_id uuid;
  v_next_day_status text;
  v_next_day_number smallint;
  v_next_day_unlocked boolean := false;
  v_next_day_first_task_id uuid;

  v_program_completed boolean := false;
  v_result_current_day_number smallint;
  v_result_completed_days smallint;
begin
  -- ==========================================================================
  -- 0) TEMEL INPUT VALIDASYONU
  -- ==========================================================================
  if p_student_id is null or p_task_id is null then
    raise exception 'EDUCATION_TASK_COMPLETE_INVALID_INPUT: p_student_id ve p_task_id zorunludur.';
  end if;

  -- ==========================================================================
  -- 1) GOREV: bul + kilitle + tam 1 satir garantisi.
  -- ==========================================================================
  begin
    select t.status, t.student_id, t.program_day_id, t.program_id, t.order_number
    into strict v_task_status, v_task_student_id, v_program_day_id, v_program_id, v_order_number
    from public.student_education_program_tasks t
    where t.id = p_task_id
    for update;
  exception
    when no_data_found then
      raise exception 'EDUCATION_TASK_COMPLETE_TASK_NOT_FOUND: Gorev bulunamadi.';
  end;

  if v_task_student_id <> p_student_id then
    raise exception 'EDUCATION_TASK_COMPLETE_STUDENT_MISMATCH: Gorev bu ogrenciye ait degil.';
  end if;

  -- ==========================================================================
  -- 2) IDEMPOTENCY: gorev zaten completed ise, program/gun guard'lari
  --    calistirilmadan (yukaridaki tasarim notuna bakin) hicbir yazma
  --    yapilmadan mevcut ilerleme ozeti donulur.
  -- ==========================================================================
  if v_task_status = 'completed' then
    select p.status, p.total_days, p.completed_days, p.current_day_number
    into v_program_status, v_program_total_days, v_program_completed_days, v_program_current_day_number
    from public.student_education_programs p
    where p.id = v_program_id;

    select d.status
    into v_day_status
    from public.student_education_program_days d
    where d.id = v_program_day_id;

    return jsonb_build_object(
      'success', true,
      'outcome', 'already_completed',
      'already_completed', true,
      'task_id', p_task_id,
      'task_status', 'completed',
      'day_id', v_program_day_id,
      'day_status', v_day_status,
      'program_id', v_program_id,
      'program_status', v_program_status,
      'unlocked_task_id', null,
      'unlocked_day_id', null,
      'current_day_number', v_program_current_day_number,
      'completed_days', v_program_completed_days,
      'total_days', v_program_total_days,
      'program_completed', v_program_status = 'completed'
    );
  end if;

  -- ==========================================================================
  -- 3) GECERSIZ GECISLER: locked/available gorev dogrudan completed olamaz.
  -- ==========================================================================
  if v_task_status <> 'in_progress' then
    raise exception 'EDUCATION_TASK_COMPLETE_TASK_NOT_IN_PROGRESS: Gorev % durumunda, yalniz in_progress durumundaki gorevler tamamlanabilir.', v_task_status;
  end if;

  -- ==========================================================================
  -- 4) PROGRAM: kilitle (ilerleme alanlarina yazilacagi icin for update).
  -- ==========================================================================
  begin
    select p.status, p.total_days, p.completed_days, p.current_day_number
    into strict v_program_status, v_program_total_days, v_program_completed_days, v_program_current_day_number
    from public.student_education_programs p
    where p.id = v_program_id
    for update;
  exception
    when no_data_found then
      raise exception 'EDUCATION_TASK_COMPLETE_PROGRAM_NOT_FOUND: Gorevin bagli oldugu program bulunamadi.';
  end;

  if v_program_status <> 'active' then
    raise exception 'EDUCATION_TASK_COMPLETE_PROGRAM_NOT_ACTIVE: Program artik aktif degil.';
  end if;

  -- ==========================================================================
  -- 5) GUN: kilitle + baslatilabilir/tamamlanabilir durumda mi.
  -- ==========================================================================
  begin
    select d.status, d.day_number
    into strict v_day_status, v_day_number
    from public.student_education_program_days d
    where d.id = v_program_day_id
    for update;
  exception
    when no_data_found then
      raise exception 'EDUCATION_TASK_COMPLETE_DAY_NOT_FOUND: Gorevin bagli oldugu gun bulunamadi.';
  end;

  if v_day_status not in ('available', 'in_progress') then
    raise exception 'EDUCATION_TASK_COMPLETE_DAY_NOT_AVAILABLE: Gun % durumunda, tamamlama yalniz available veya in_progress gunlerde yapilabilir.', v_day_status;
  end if;

  -- ==========================================================================
  -- 6) GOREVI TAMAMLA: in_progress -> completed, completed_at ilk kez yazilir.
  -- ==========================================================================
  update public.student_education_program_tasks
  set status = 'completed', completed_at = now()
  where id = p_task_id;

  -- ==========================================================================
  -- 7) AYNI GUNUN TAMAMLANAN/TOPLAM GOREV SAYISI (bu transaction'daki
  --    az onceki UPDATE'i de gorur - ayni transaction icinde okunuyor).
  -- ==========================================================================
  select
    count(*) filter (where status = 'completed'),
    count(*)
  into v_completed_task_count, v_total_task_count
  from public.student_education_program_tasks
  where program_day_id = v_program_day_id;

  -- ==========================================================================
  -- 8) SIRADAKI GOREVI AC: yalniz gunun tum gorevleri henuz bitmediyse,
  --    order_number'a gore SIRADAKI TEK kilitli gorevi 'available' yap.
  -- ==========================================================================
  if v_completed_task_count < v_total_task_count then
    select id
    into v_unlocked_task_id
    from public.student_education_program_tasks
    where program_day_id = v_program_day_id
      and order_number > v_order_number
      and status = 'locked'
    order by order_number asc
    limit 1
    for update;

    if v_unlocked_task_id is not null then
      update public.student_education_program_tasks
      set status = 'available'
      where id = v_unlocked_task_id
        and status = 'locked';
    end if;
  end if;

  -- ==========================================================================
  -- 9) GUN TAMAMLANDI MI? (tum gorevler completed ve gun henuz completed
  --    degilse) - completed_at yalniz ilk kez yazilir.
  -- ==========================================================================
  if v_completed_task_count >= v_total_task_count and v_day_status <> 'completed' then
    update public.student_education_program_days
    set status = 'completed', completed_at = now()
    where id = v_program_day_id
      and status <> 'completed';

    v_day_completed := true;
  end if;

  -- ==========================================================================
  -- 10) GUN TAMAMLANDIYSA: completed_days'i COUNT ile drift-safe guncelle
  --     (kor +1 YOK), son gun ise programi tamamla, degilse sonraki gunu
  --     (ve onun ilk gorevini) ac.
  -- ==========================================================================
  if v_day_completed then
    select count(*)
    into v_result_completed_days
    from public.student_education_program_days
    where program_id = v_program_id
      and status = 'completed';

    update public.student_education_programs
    set completed_days = v_result_completed_days
    where id = v_program_id;

    if v_day_number >= v_program_total_days then
      update public.student_education_programs
      set status = 'completed', completed_at = now()
      where id = v_program_id
        and status <> 'completed';

      v_program_completed := true;
      v_result_current_day_number := v_program_current_day_number;
    else
      begin
        select id, status, day_number
        into strict v_next_day_id, v_next_day_status, v_next_day_number
        from public.student_education_program_days
        where program_id = v_program_id
          and day_number > v_day_number
        order by day_number asc
        limit 1
        for update;
      exception
        when no_data_found then
          raise exception 'EDUCATION_TASK_COMPLETE_NEXT_DAY_NOT_FOUND: % toplam gun beklenirken sonraki gun (%. gunden sonra) bulunamadi.', v_program_total_days, v_day_number;
      end;

      if v_next_day_status = 'locked' then
        update public.student_education_program_days
        set status = 'available', available_at = now()
        where id = v_next_day_id
          and status = 'locked';

        select id
        into v_next_day_first_task_id
        from public.student_education_program_tasks
        where program_day_id = v_next_day_id
          and order_number = 1
        for update;

        if v_next_day_first_task_id is not null then
          update public.student_education_program_tasks
          set status = 'available'
          where id = v_next_day_first_task_id
            and status = 'locked';
        end if;

        v_next_day_unlocked := true;
      end if;

      update public.student_education_programs
      set current_day_number = v_next_day_number
      where id = v_program_id
        and current_day_number < v_next_day_number;

      v_result_current_day_number := v_next_day_number;
    end if;
  else
    v_result_completed_days := v_program_completed_days;
    v_result_current_day_number := v_program_current_day_number;
  end if;

  -- ==========================================================================
  -- 11) GUVENLI OZET - hicbir kisisel veri/ham DB satiri icermez.
  -- ==========================================================================
  return jsonb_build_object(
    'success', true,
    'outcome', case
      when v_program_completed then 'program_completed'
      when v_next_day_unlocked then 'day_completed_next_day_unlocked'
      when v_day_completed then 'day_completed'
      when v_unlocked_task_id is not null then 'task_completed_next_task_unlocked'
      else 'task_completed'
    end,
    'already_completed', false,
    'task_id', p_task_id,
    'task_status', 'completed',
    'day_id', v_program_day_id,
    'day_status', case when v_day_completed then 'completed' else v_day_status end,
    'program_id', v_program_id,
    'program_status', case when v_program_completed then 'completed' else v_program_status end,
    'unlocked_task_id', coalesce(v_next_day_first_task_id, v_unlocked_task_id),
    'unlocked_day_id', v_next_day_id,
    'current_day_number', v_result_current_day_number,
    'completed_days', v_result_completed_days,
    'total_days', v_program_total_days,
    'program_completed', v_program_completed
  );
end;
$$;

comment on function public.complete_education_program_task_v1(uuid, uuid) is
  'Yalniz service_role tarafindan cagrilabilir (anon/authenticated execute yetkisi yok). '
  'Ogrenciye ait, in_progress durumundaki bir Egitim Programi gorevini (student_education_'
  'program_tasks) ATOMIK olarak completed yapar; ayni gun icinde SIRADAKI kilitli gorevi '
  'acar (sirali gun-ici model); gunun tum gorevleri bittiyse gunu completed yapar ve '
  'sonraki gunu (varsa, ve onun ilk gorevini) acar; son gun ise programi completed yapar. '
  'Idempotenttir: gorev zaten completed ise program/gun guard''lari calismadan hicbir '
  'yazma yapmadan mevcut ilerleme ozetini doner. Assignment System V2 tablolarina/'
  'RPC''lerine hicbir bagimliligi yoktur.';

-- ----------------------------------------------------------------------------
-- Yetkiler: yalniz service_role calistirabilir (tarayicidan anon/authenticated
-- ile DOGRUDAN cagrilamaz). Bu migration hicbir ogrenci/authenticated UPDATE
-- yetkisi acmaz.
-- ----------------------------------------------------------------------------
revoke all on function public.complete_education_program_task_v1(uuid, uuid) from public;
revoke all on function public.complete_education_program_task_v1(uuid, uuid) from anon;
revoke all on function public.complete_education_program_task_v1(uuid, uuid) from authenticated;
grant execute on function public.complete_education_program_task_v1(uuid, uuid) to service_role;
