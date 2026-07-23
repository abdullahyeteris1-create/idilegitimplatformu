/**
 * create_student_assignment_program RPC'sinin RAISE EXCEPTION mesajlari
 * "KOD: aciklama" seklindedir (bkz.
 * supabase/migrations/20260724100000_create_student_assignment_program_rpc.sql).
 * Bu dosya, o GERCEK kodlari (tahmin edilmeden, migration'dan birebir
 * alinarak) guvenli HTTP status + kullanici-dostu Turkce mesaja esler. Ham
 * Postgres/RPC hata metni hicbir zaman dogrudan client'a donmemelidir.
 */

export type AssignmentProgramErrorMapping = { status: number; message: string };

const ERROR_CODE_MAP: Record<string, AssignmentProgramErrorMapping> = {
  ASSIGNMENT_INVALID_INPUT: { status: 400, message: "Gönderilen bilgiler geçersiz." },
  ASSIGNMENT_INVALID_DAYS: { status: 500, message: "Program oluşturulamadı, lütfen tekrar deneyin." },
  ASSIGNMENT_INVALID_TASK: { status: 500, message: "Program oluşturulamadı, lütfen tekrar deneyin." },
  ASSIGNMENT_EXERCISE_NOT_ALLOWED: { status: 500, message: "Program oluşturulamadı, lütfen tekrar deneyin." },
  ASSIGNMENT_STUDENT_NOT_FOUND: { status: 404, message: "Öğrenci bulunamadı." },
  ASSIGNMENT_STUDENT_INACTIVE: { status: 400, message: "Öğrenci pasif durumda, program atanamaz." },
  ASSIGNMENT_TEMPLATE_NOT_FOUND: { status: 404, message: "Şablon bulunamadı." },
  ASSIGNMENT_TEMPLATE_INACTIVE: { status: 400, message: "Şablon pasif durumda." },
  ASSIGNMENT_CLASS_GROUP_MISMATCH: { status: 400, message: "Şablonun sınıf grubu öğrenciyle uyuşmuyor." },
  ASSIGNMENT_TEMPLATE_INVALID: { status: 400, message: "Şablon 20 gün / 5 görev yapısında değil." },
  ASSIGNMENT_ACTIVE_PROGRAM_EXISTS: { status: 409, message: "Bu öğrencinin zaten aktif bir programı var." },
  ASSIGNMENT_TASK_SNAPSHOT_MISMATCH: {
    status: 409,
    message: "Şablon değişmiş olabilir, lütfen önizlemeyi yeniden oluşturup tekrar deneyin.",
  },
  ASSIGNMENT_INSERT_COUNT_MISMATCH: { status: 500, message: "Program oluşturulamadı, lütfen tekrar deneyin." },
};

const DEFAULT_MAPPING: AssignmentProgramErrorMapping = {
  status: 500,
  message: "Program oluşturulamadı, lütfen tekrar deneyin.",
};

/**
 * RPC/Postgres hata mesajindan (ör. "ASSIGNMENT_ACTIVE_PROGRAM_EXISTS: Ogrencinin ...")
 * yalniz ilk ":" isaretine kadar olan kod kismini ayiklar ve bilinen bir
 * esleme varsa onu, yoksa guvenli varsayilan (500 + genel mesaj) esleyicisini
 * doner. Ham mesaj (aciklama kismi) hicbir zaman donen degere dahil edilmez.
 */
export function mapAssignmentProgramRpcError(rawMessage: string): AssignmentProgramErrorMapping {
  const separatorIndex = rawMessage.indexOf(":");
  const code = separatorIndex === -1 ? rawMessage.trim() : rawMessage.slice(0, separatorIndex).trim();
  return ERROR_CODE_MAP[code] ?? DEFAULT_MAPPING;
}
