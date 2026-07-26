import { Icon } from "@/components/student-panel-preview/icons";
import {
  calculateStudentProgramProgress,
  formatStudentProgramDuration,
} from "@/lib/education-programs/studentProgramPresentation";
import styles from "./EducationProgramProgressPanel.module.css";

// Egitim Programi sag ilerleme paneli - SALT SUNUM. Yalniz parent'in zaten
// hesapladigi/sahip oldugu alanlari (program.totalDays/completedDays, gorev
// sayaclari, overallTaskProgress, secili gunun sure toplami) prop olarak
// alir; hicbir yeni veri kaynagina, hesaplamaya veya API'ye baglanmaz. Gunluk
// oturum zinciri, puan, dogru/yanlis gibi bu bounded context'te bulunmayan
// alanlar KASITLI olarak yok - bkz. FAZ 4-2B-2 talimati.
export type EducationProgramProgressPanelProps = {
  overallTaskProgress: number;
  completedTaskCount: number;
  totalTaskCount: number;
  completedDays: number;
  totalDays: number;
  currentDayNumber: number;
  todayCompletedTaskCount: number;
  todayTotalTaskCount: number;
  selectedDayDurationSeconds: number;
};

const RING_RADIUS = 54;
const RING_CIRCUMFERENCE = 2 * Math.PI * RING_RADIUS;

export function EducationProgramProgressPanel({
  overallTaskProgress,
  completedTaskCount,
  totalTaskCount,
  completedDays,
  totalDays,
  currentDayNumber,
  todayCompletedTaskCount,
  todayTotalTaskCount,
  selectedDayDurationSeconds,
}: EducationProgramProgressPanelProps) {
  const remainingDays = Math.max(0, totalDays - completedDays);
  const todayPercent = calculateStudentProgramProgress(
    todayCompletedTaskCount,
    todayTotalTaskCount,
  );
  const ringOffset =
    RING_CIRCUMFERENCE - (overallTaskProgress / 100) * RING_CIRCUMFERENCE;

  return (
    <aside className={styles.panel} aria-label="Program ilerleme paneli">
      <section>
        <div
          className={styles.ringWrap}
          role="progressbar"
          aria-label="Genel program ilerlemesi"
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={overallTaskProgress}
        >
          <svg viewBox="0 0 120 120" className={styles.ring} aria-hidden="true">
            <circle cx="60" cy="60" r={RING_RADIUS} className={styles.ringTrack} />
            <circle
              cx="60"
              cy="60"
              r={RING_RADIUS}
              className={styles.ringFill}
              style={{
                strokeDasharray: RING_CIRCUMFERENCE,
                strokeDashoffset: ringOffset,
              }}
            />
          </svg>
          <div className={styles.ringCenter}>
            <span className={styles.ringPercent}>%{overallTaskProgress}</span>
            <span className={styles.ringCaption}>Genel ilerleme</span>
          </div>
        </div>
        <p className={styles.overallSummary}>
          {completedTaskCount} / {totalTaskCount} görev tamamlandı
        </p>
      </section>

      <section className={styles.section}>
        <h3 className={styles.sectionTitle}>Bugünün ilerlemesi</h3>
        <p className={styles.todayText}>
          {todayCompletedTaskCount} / {todayTotalTaskCount} görev · Gün {currentDayNumber}
        </p>
        <div
          className={styles.todayBar}
          role="progressbar"
          aria-label="Bugünkü gün ilerlemesi"
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={todayPercent}
        >
          <span className={styles.todayBarFill} style={{ width: `${todayPercent}%` }} />
        </div>
      </section>

      <section className={styles.section}>
        <h3 className={styles.sectionTitle}>Program günleri</h3>

        <div className={styles.statRow}>
          <span className={`${styles.statIcon} ${styles.statIconSuccess}`} aria-hidden="true">
            <Icon name="checkbox" />
          </span>
          <span className={styles.statLabel}>Tamamlanan gün</span>
          <span className={styles.statValue}>{completedDays}</span>
        </div>

        <div className={styles.statRow}>
          <span className={styles.statIcon} aria-hidden="true">
            <Icon name="clock" />
          </span>
          <span className={styles.statLabel}>Kalan gün</span>
          <span className={styles.statValue}>{remainingDays}</span>
        </div>

        <div className={styles.statRow}>
          <span className={styles.statIcon} aria-hidden="true">
            <Icon name="grid" />
          </span>
          <span className={styles.statLabel}>Toplam gün</span>
          <span className={styles.statValue}>{totalDays}</span>
        </div>

        {selectedDayDurationSeconds > 0 ? (
          <div className={styles.statRow}>
            <span className={styles.statIcon} aria-hidden="true">
              <Icon name="gauge" />
            </span>
            <span className={styles.statLabel}>Seçili günün tahmini süresi</span>
            <span className={styles.statValue}>
              {formatStudentProgramDuration(selectedDayDurationSeconds)}
            </span>
          </div>
        ) : null}
      </section>

      <p className={styles.motivation}>
        <Icon name="sparkles" aria-hidden="true" />
        <span>Her tamamlanan görev sizi hedefinize biraz daha yaklaştırır.</span>
      </p>
    </aside>
  );
}
