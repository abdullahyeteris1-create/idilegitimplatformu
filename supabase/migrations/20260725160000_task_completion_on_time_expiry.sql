-- ============================================================================
-- GOREV TAMAMLAMA: SURE DOLUMUNU (result'siz tamamlama) DESTEKLE
-- ============================================================================
-- Bu migration public.complete_student_assignment_program_task fonksiyonunu
-- AYNI IMZAYLA (uuid, uuid, uuid) "create or replace" eder - hicbir yeni
-- fonksiyon/overload olusturmaz, hicbir tablo/constraint degistirmez, hicbir
-- veri INSERT/UPDATE etmez. Cagiran mevcut API route'u degismeden calismaya
-- devam eder.
--
-- NEDEN: 20260723090000 semasinin basindaki "SURE DOLUMU" notu su kurali
-- koyuyordu: "Sure dolan bir gorev BASARISIZ/expired sayilmaz - 'Tebrikler,
-- calismayi tamamladiniz.' mesaji gosterilip gorev GUVENLI BICIMDE
-- TAMAMLANIR." Tablo bunu `completion_reason IN ('result_submitted',
-- 'time_expired')` ile zaten destekliyordu, ancak ilk tamamlama RPC'si
-- p_result_id'yi ZORUNLU tuttugu icin 'time_expired' yolu pratikte
-- kullanilamiyordu. Bu migration o eksigi kapatir.
--
-- YENI SOZLESME - tamamlama sebebi, sonucun VARLIGINDAN turetilir (ayri bir
-- parametre EKLENMEZ, boylece imza degismez ve overload karmasasi olusmaz):
--   p_result_id NOT NULL -> egzersiz gercekten bitirildi ve sonucu kaydedildi
--                           -> completion_reason = 'result_submitted'
--   p_result_id NULL     -> gorev suresi doldu (ogrenci egzersizi bitirmemis
--                           olabilir) -> completion_reason = 'time_expired'
--
-- IDEMPOTENCY GENISLETMESI (kritik): sure dolumu, ogrencinin egzersizi zaten
-- normal sekilde bitirdigi bir gorevde de tetiklenebilir (sayac, ogrenci
-- calismayi erken bitirse bile arka planda islemeye devam eder). Bu durumda
-- gorev ZATEN 'completed' olur ve result_id doludur. Boyle bir cagri HATA
-- DEGILDIR - sessizce basarili (idempotent) doner. Yalniz "farkli bir
-- result_id ile tekrar tamamlama" girisimi hata olarak reddedilmeye devam
-- eder (gercek bir tutarsizlik sinyalidir).
--
-- Gun tamamlama / sonraki gunu acma / program tamamlama mantigi AYNEN korunur -
-- sure dolumuyla tamamlanan bir gorev de gunun 5 gorevinden biri olarak sayilir.
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

  -- Tamamlama sebebi yalniz p_result_id'nin varligindan turetilir.
  v_completion_reason text;

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
  -- 0) TEMEL INPUT VALIDASYONU - p_result_id artik OPSIYONELDIR.
  -- ==========================================================================
  if p_task_id is null or p_student_id is null then
    raise exception 'ASSIGNMENT_TASK_COMPLETE_INVALID_INPUT: p_task_id ve p_student_id zorunludur.';
  end if;

  v_completion_reason := case when p_result_id is null then 'time_expired' else 'result_submitted' end;

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
  -- 2) IDEMPOTENCY: gorev zaten tamamlanmissa yazma yapmadan don.
  --    Sure dolumu (p_result_id IS NULL) her zaman idempotent kabul edilir -
  --    ogrenci calismayi normal bitirmis olsa bile sayacin arkadan gelen
  --    "sure doldu" cagrisi bir HATA degildir.
  -- ==========================================================================
  if v_task_status = 'completed' then
    if p_result_id is null or v_task_result_id is not distinct from p_result_id then
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
  -- 3) SONUC DOGRULAMASI - yalniz gercek bir sonucla tamamlaniyorsa yapilir.
  -- ==========================================================================
  if p_result_id is not null then
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

    update public.exercise_results
    set program_task_id = p_task_id
    where id = p_result_id
      and program_task_id is null;
  end if;

  -- ==========================================================================
  -- 4) GOREVI TAMAMLA. Sure dolumunda result_id NULL kalir - bu, semadaki
  --    "completed + result_id null" durumunu KASITLI olarak uretir (ilgili
  --    CHECK yalniz completed_at'i zorunlu tutar, result_id'yi degil).
  -- ==========================================================================
  update public.student_assignment_program_tasks
  set
    status = 'completed',
    completed_at = now(),
    completion_reason = v_completion_reason,
    result_id = p_result_id
  where id = p_task_id;

  -- ==========================================================================
  -- 5) GUN: kilitle + tamamlanan gorev sayisini say.
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
  -- 6) GUN TAMAMLANDIYSA: sonraki gunu ac / programi tamamla.
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
    'completionReason', v_completion_reason,
    'dayCompleted', v_day_completed,
    'nextDayUnlocked', v_next_day_unlocked,
    'programCompleted', v_program_completed
  );
end;
$$;

comment on function public.complete_student_assignment_program_task(uuid, uuid, uuid) is
  'Yalniz service_role tarafindan cagrilabilir. Bir odev programi gorevini ATOMIK olarak tamamlar. '
  'p_result_id verilirse gorev o exercise_results satiriyla eslestirilir (completion_reason='
  '''result_submitted''); p_result_id NULL ise gorev sure dolumu nedeniyle tamamlanmis sayilir '
  '(completion_reason=''time_expired'') - bu bir basarisizlik DEGILDIR. Gunun tum gorevleri '
  'tamamlandiysa gunu, son gunse programi da tamamlar; aksi halde sonraki gunu (hala kilitliyse) '
  'acar. Idempotenttir: zaten tamamlanmis bir gorev icin sure dolumu cagrisi sessizce basarili doner.';

revoke all on function public.complete_student_assignment_program_task(uuid, uuid, uuid) from public;
revoke all on function public.complete_student_assignment_program_task(uuid, uuid, uuid) from anon;
revoke all on function public.complete_student_assignment_program_task(uuid, uuid, uuid) from authenticated;
grant execute on function public.complete_student_assignment_program_task(uuid, uuid, uuid) to service_role;
