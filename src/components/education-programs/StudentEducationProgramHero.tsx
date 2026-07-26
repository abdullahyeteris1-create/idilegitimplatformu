import styles from "./StudentEducationProgramHero.module.css";

function formatDate(value: string): string {
  if (!value || Number.isNaN(Date.parse(value))) return "Tarih bilgisi yok";

  return new Intl.DateTimeFormat("tr-TR", {
    dateStyle: "long",
    timeZone: "Europe/Istanbul",
  }).format(new Date(value));
}

export type StudentEducationProgramHeroProps = {
  visibleName: string;
  studentMessage: string | null;
  completedDays: number;
  totalDays: number;
  todayCompletedTaskCount: number;
  todayTotalTaskCount: number;
  overallTaskProgress: number;
  displayedCurrentDay: number;
  assignedAt: string;
};

export function StudentEducationProgramHero({
  visibleName,
  studentMessage,
  completedDays,
  totalDays,
  todayCompletedTaskCount,
  todayTotalTaskCount,
  overallTaskProgress,
  displayedCurrentDay,
  assignedAt,
}: StudentEducationProgramHeroProps) {
  return (
    <header className={styles.hero}>
      <div className={styles.heroTop}>
        <div className={styles.heroCopy}>
          <span className={styles.eyebrow}>Eğitim Programım</span>
          <h1>{visibleName}</h1>
          {studentMessage ? (
            <blockquote className={styles.studentMessage}>
              {studentMessage}
            </blockquote>
          ) : null}
        </div>

        <div className={styles.dayBadge} aria-hidden="true">
          <span className={styles.dayBadgeLabel}>Gün</span>
          <span className={styles.dayBadgeNumber}>{displayedCurrentDay}</span>
          <span className={styles.dayBadgeTotal}>/ {totalDays}</span>
        </div>
      </div>

      <div className={styles.summaryGrid}>
        <div className={styles.summaryItem}>
          <span>Tamamlanan gün</span>
          <strong>
            {completedDays} / {totalDays}
          </strong>
        </div>
        <div className={styles.summaryItem}>
          <span>Bugünkü çalışma</span>
          <strong>
            {todayCompletedTaskCount} / {todayTotalTaskCount}
          </strong>
        </div>
        <div className={styles.summaryItem}>
          <span>Genel ilerleme</span>
          <strong>%{overallTaskProgress}</strong>
        </div>
        <div className={styles.summaryItem}>
          <span>Atanma tarihi</span>
          <strong>{formatDate(assignedAt)}</strong>
        </div>
      </div>

      <div
        className={styles.progressTrack}
        role="progressbar"
        aria-label="Eğitim programı ilerlemesi"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={overallTaskProgress}
      >
        <span style={{ width: `${overallTaskProgress}%` }} />
      </div>
      <p className={styles.progressLabel}>
        %{overallTaskProgress} tamamlandı · Şu an {displayedCurrentDay}. gündesiniz
      </p>
    </header>
  );
}
