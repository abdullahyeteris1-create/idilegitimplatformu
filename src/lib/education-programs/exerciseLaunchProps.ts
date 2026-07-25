import type { EducationProgramTaskSettings } from "@/lib/education-programs/types";

// Bir Egitim Programi gorevi, dogrulanmis imzali launch token uzerinden bir
// egzersiz client bilesenine baglandiginda tasinan, TAMAMEN sunucuda (DB
// snapshot satirindan) doldurulmus, kucuk ve tipli baglam. studentId,
// admin_note, assigned_by, service-role bilgisi veya token'in kendisi gibi
// hassas/gereksiz alanlar KASITLI OLARAK burada yer almaz - yalniz egzersizin
// calismasi icin gereken snapshot degerleri iletilir.
export type EducationProgramExerciseLaunchProps = {
  taskId: string;
  programId: string;
  dayId: string;
  durationSeconds: number;
  initialLevel: number | null;
  resultExerciseType: string | null;
  settings: EducationProgramTaskSettings;
  settingsSchemaVersion: number;
};
