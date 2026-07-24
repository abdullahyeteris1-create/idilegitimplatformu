import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { mapEducationLevelToClassGroup } from "@/lib/assignments/classGroups";
import { isAdminSessionValid } from "@/lib/auth/adminSession";
import { getSupabaseServerClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

const STUDENTS_TABLE = process.env.NEXT_PUBLIC_SUPABASE_STUDENTS_TABLE ?? "students";
const STUDENT_ASSIGNMENT_PROGRAMS_TABLE = "student_assignment_programs";

type AssignableStudentRow = {
  id: string;
  name: string;
  educationLevel: string;
  isActive: boolean;
  status: string;
  hasActiveProgram: boolean;
  activeProgramId: string | null;
};

/**
 * 20 gunluk odev programi atamasi icin uygun (aktif + egitim seviyesi
 * destekli) ogrencileri dondurur. Salt-okunur - hicbir tabloya yazmaz.
 *
 * GUVENLIK: service-role Supabase client'i yalniz burada, sunucu
 * tarafinda olusturulur (getSupabaseServerClient) - hicbir zaman bir
 * client bundle'ina/"use client" bilesenine gecirilmez. Admin/ogretmen
 * oturumu isAdminSessionValid ile server tarafinda dogrulanir.
 */
export async function GET(request: NextRequest) {
  if (!isAdminSessionValid(request)) {
    return NextResponse.json({ ok: false, message: "Yetkisiz erisim." }, { status: 401 });
  }

  const supabase = getSupabaseServerClient();
  if (!supabase) {
    return NextResponse.json({ ok: false, message: "Supabase baglantisi bulunamadi." }, { status: 500 });
  }

  // .eq("is_active", true) ve .eq("status", "active") - is_active veya
  // status NULL olan satirlar bu esitlik filtrelerinden HER ZAMAN elenir
  // (SQL uc-degerli mantik: NULL = true / NULL = 'active' hicbir zaman
  // dogru degildir) - "NULL degerleri aktif kabul etme" kurali boylece ek
  // bir kontrole gerek kalmadan saglanir.
  const { data, error } = await supabase
    .from(STUDENTS_TABLE)
    .select("id, name, education_level, is_active, status")
    .eq("is_active", true)
    .eq("status", "active")
    .order("name", { ascending: true });

  if (error) {
    console.error("Assignable students query failed", { code: error.code, message: error.message });
    return NextResponse.json({ ok: false, message: "Öğrenci listesi alınamadı. Lütfen tekrar deneyin." }, { status: 500 });
  }

  const rows = Array.isArray(data) ? (data as Record<string, unknown>[]) : [];

  // "Atama yapilabilecek" ogrenciler yalniz aktif olanlar degil, ayni zamanda
  // egitim seviyesi gecerli bir class_group'a eslenebilenlerdir - eslenemeyen
  // bir ogrenci secilse bile POST /programs zaten reddedecektir, bu yuzden
  // burada onceden filtrelemek gereksiz bir hata denemesini engeller.
  const students = rows
    .map((row) => ({
      id: String(row.id ?? ""),
      name: String(row.name ?? ""),
      educationLevel: typeof row.education_level === "string" ? row.education_level : "",
      isActive: row.is_active === true,
      status: typeof row.status === "string" ? row.status : "",
    }))
    .filter((student) => student.id && mapEducationLevelToClassGroup(student.educationLevel).ok);

  // Aktif programi olan ogrenciler listeden ELENMEZ - yalniz isaretlenir
  // (bkz. AssignmentProgramSettingsClient.tsx). Bu yuzden ayri, salt-okunur
  // bir ikinci sorgu ile student_assignment_programs tablosundan yalniz
  // status='active' kayitlar cekilir. PostgREST embed (foreign-key join)
  // yerine ayri sorgu tercih edildi cunku bir ogrencinin draft/completed
  // gibi baska durumlarda birden fazla kaydi olabilir - embed bu durumda
  // belirsiz (dizi) bir sonuc dondururdu.
  const activeProgramIdByStudentId = new Map<string, string>();
  const studentIds = students.map((student) => student.id);

  if (studentIds.length > 0) {
    const { data: activeProgramRows, error: activeProgramsError } = await supabase
      .from(STUDENT_ASSIGNMENT_PROGRAMS_TABLE)
      .select("id, student_id, status")
      .eq("status", "active")
      .in("student_id", studentIds);

    if (activeProgramsError) {
      console.error("Active assignment programs query failed", {
        code: activeProgramsError.code,
        message: activeProgramsError.message,
      });
      return NextResponse.json({ ok: false, message: "Öğrenci listesi alınamadı. Lütfen tekrar deneyin." }, { status: 500 });
    }

    for (const row of (activeProgramRows ?? []) as Record<string, unknown>[]) {
      const studentId = String(row.student_id ?? "");
      const programId = String(row.id ?? "");
      if (studentId && programId) {
        activeProgramIdByStudentId.set(studentId, programId);
      }
    }
  }

  const studentsWithProgramInfo: AssignableStudentRow[] = students.map((student) => {
    const activeProgramId = activeProgramIdByStudentId.get(student.id) ?? null;
    return { ...student, hasActiveProgram: activeProgramId !== null, activeProgramId };
  });

  return NextResponse.json({ ok: true, students: studentsWithProgramInfo });
}
