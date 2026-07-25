/**
 * Ogrenci bir egzersizi DOGAL akisinda bitirip sonucu kaydettiginde ve bu
 * sonuc bir odev gorevine baglandiginda yayinlanan tarayici olayi.
 *
 * NEDEN: oturum sayaci (AssignmentTaskTimer) egzersizin DISINDA, ortak bir
 * katmanda calisir ve egzersizin ic durumunu goremez. Ogrenci calismayi
 * suresinden once bitirdiginde sayacin bunu ogrenip durmasi ve "Tebrikler"
 * ekranini gostermesi icin bu olay kullanilir - sayacin egzersiz bilesenlerine
 * hicbir sekilde bagimli olmasi gerekmez.
 *
 * Sabit tek bir yerde tutulur ki yayinlayan (secureResultStorage) ve dinleyen
 * (AssignmentTaskTimer) taraflar birbirinden bagimsiz kalsin.
 */
export const PROGRAM_TASK_COMPLETED_EVENT = "idil:program-task-completed";

/** Odev gorevi tamamlandiginda sayaca haber verir. Sunucuda no-op'tur. */
export function emitProgramTaskCompleted(): void {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent(PROGRAM_TASK_COMPLETED_EVENT));
}
