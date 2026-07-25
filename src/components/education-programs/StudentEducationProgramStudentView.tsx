import type { ReactNode } from "react";
import Link from "next/link";
import { Icon } from "@/components/student-panel-preview/icons";
import {
  calculateStudentProgramProgress,
  formatStudentProgramDuration,
  selectCurrentStudentProgramDay,
  STUDENT_PROGRAM_DAY_STATUS_LABELS,
  STUDENT_PROGRAM_TASK_STATUS_LABELS,
} from "@/lib/education-programs/studentProgramPresentation";
import type {
  StudentEducationProgramDayStatus,
  StudentEducationProgramStudentTask,
  StudentEducationProgramStudentView as StudentProgramView,
  StudentEducationProgramTaskStatus,
} from "@/lib/education-programs/studentProgramTypes";
import styles from "./StudentEducationProgramStudentView.module.css";

function formatDate(value: string): string {
  if (!value || Number.isNaN(Date.parse(value))) return "Tarih bilgisi yok";

  return new Intl.DateTimeFormat("tr-TR", {
    dateStyle: "long",
    timeZone: "Europe/Istanbul",
  }).format(new Date(value));
}

function statusClass(
  status: StudentEducationProgramDayStatus | StudentEducationProgramTaskStatus,
): string {
  if (status === "completed") return styles.statusCompleted;
  if (status === "available") return styles.statusAvailable;
  if (status === "in_progress") return styles.statusInProgress;
  return styles.statusLocked;
}

function PageFrame({ children }: { children: ReactNode }) {
  return (
    <main className={styles.page}>
      <div className={styles.shell}>
        <Link href="/ogrenci" className={styles.backLink}>
          <Icon name="arrow" />
          Öğrenci Paneline Dön
        </Link>
        {children}
      </div>
    </main>
  );
}

export function StudentEducationProgramEmptyState() {
  return (
    <PageFrame>
      <section className={styles.stateCard}>
        <span className={styles.stateIcon} aria-hidden="true">
          <Icon name="bookOpen" />
        </span>
        <h1>Henüz aktif bir eğitim programınız bulunmuyor</h1>
        <p>
          Öğretmeniniz size bir eğitim programı atadığında burada
          görüntülenecektir.
        </p>
      </section>
    </PageFrame>
  );
}

export function StudentEducationProgramErrorState() {
  return (
    <PageFrame>
      <section className={`${styles.stateCard} ${styles.errorState}`} role="alert">
        <span className={styles.stateIcon} aria-hidden="true">
          <Icon name="help" />
        </span>
        <h1>Eğitim programınız şu anda görüntülenemiyor</h1>
        <p>Lütfen daha sonra tekrar deneyin.</p>
      </section>
    </PageFrame>
  );
}

function TaskCard({
  task,
  orderNumber,
}: {
  task: StudentEducationProgramStudentTask | null;
  orderNumber: number;
}) {
  if (!task) {
    return (
      <article className={`${styles.taskCard} ${styles.taskMissing}`}>
        <span className={styles.taskOrder}>Çalışma {orderNumber}</span>
        <h3>Görev bilgisi görüntülenemiyor</h3>
        <span className={styles.missingStatus}>Durum bilgisi yok</span>
      </article>
    );
  }

  return (
    <article className={styles.taskCard} data-status={task.status}>
      <div className={styles.taskTop}>
        <span className={styles.taskOrder}>Çalışma {task.orderNumber}</span>
        <span className={`${styles.statusBadge} ${statusClass(task.status)}`}>
          {STUDENT_PROGRAM_TASK_STATUS_LABELS[task.status]}
        </span>
      </div>
      <h3>{task.exerciseTitle}</h3>
      <dl className={styles.taskDetails}>
        <div>
          <dt>Süre</dt>
          <dd>{formatStudentProgramDuration(task.durationSeconds)}</dd>
        </div>
        {task.startingLevel !== null ? (
          <div>
            <dt>Başlangıç seviyesi</dt>
            <dd>{task.startingLevel}</dd>
          </div>
        ) : null}
      </dl>
    </article>
  );
}

export function StudentEducationProgramStudentView({
  program,
}: {
  program: StudentProgramView;
}) {
  const progress = calculateStudentProgramProgress(
    program.completedDays,
    program.totalDays,
  );
  const currentDay = selectCurrentStudentProgramDay(
    program.days,
    program.currentDayNumber,
  );
  const displayedCurrentDay = currentDay?.dayNumber ?? program.currentDayNumber;
  const visibleName = program.visibleName.trim() || "Eğitim Programım";

  return (
    <PageFrame>
      <header className={styles.hero}>
        <div className={styles.heroCopy}>
          <span className={styles.eyebrow}>Eğitim Programım</span>
          <h1>{visibleName}</h1>
          {program.studentMessage ? (
            <blockquote className={styles.studentMessage}>
              {program.studentMessage}
            </blockquote>
          ) : null}
        </div>

        <div className={styles.summaryGrid}>
          <div className={styles.summaryItem}>
            <span>Program süresi</span>
            <strong>{program.totalDays} günlük program</strong>
          </div>
          <div className={styles.summaryItem}>
            <span>Mevcut gün</span>
            <strong>Şu an {displayedCurrentDay}. gündesiniz</strong>
          </div>
          <div className={styles.summaryItem}>
            <span>İlerleme</span>
            <strong>
              {program.completedDays} / {program.totalDays} gün tamamlandı
            </strong>
          </div>
          <div className={styles.summaryItem}>
            <span>Atanma tarihi</span>
            <strong>{formatDate(program.assignedAt)}</strong>
          </div>
        </div>

        <div
          className={styles.progressTrack}
          role="progressbar"
          aria-label="Eğitim programı ilerlemesi"
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={progress}
        >
          <span style={{ width: `${progress}%` }} />
        </div>
        <p className={styles.progressLabel}>%{progress} tamamlandı</p>
      </header>

      <section className={styles.daysSection} aria-labelledby="program-days-title">
        <div className={styles.sectionHeading}>
          <div>
            <span className={styles.eyebrow}>Günlük plan</span>
            <h2 id="program-days-title">Program günleri</h2>
          </div>
          <p>Kilitli günler zamanı geldiğinde öğretmeninizin planına göre açılır.</p>
        </div>

        <div className={styles.dayList}>
          {program.days.map((day) => {
            const isCurrent = currentDay?.id === day.id;
            const tasksByOrder = new Map(
              day.tasks.map((task) => [task.orderNumber, task]),
            );

            return (
              <article
                key={day.id}
                className={`${styles.dayCard} ${
                  isCurrent ? styles.currentDay : ""
                } ${day.status === "completed" ? styles.completedDay : ""}`}
                aria-current={isCurrent ? "step" : undefined}
                data-status={day.status}
              >
                <header className={styles.dayHeader}>
                  <div>
                    <div className={styles.dayTitleLine}>
                      <span className={styles.dayNumber}>Gün {day.dayNumber}</span>
                      {isCurrent ? (
                        <span className={styles.currentBadge}>Mevcut gün</span>
                      ) : null}
                    </div>
                    <h2>{day.title ?? `Program günü ${day.dayNumber}`}</h2>
                    {day.description ? <p>{day.description}</p> : null}
                  </div>
                  <span className={`${styles.statusBadge} ${statusClass(day.status)}`}>
                    {STUDENT_PROGRAM_DAY_STATUS_LABELS[day.status]}
                  </span>
                </header>

                <div className={styles.taskGrid}>
                  {Array.from({ length: 5 }, (_, index) => {
                    const orderNumber = index + 1;
                    return (
                      <TaskCard
                        key={`${day.id}-${orderNumber}`}
                        task={tasksByOrder.get(orderNumber) ?? null}
                        orderNumber={orderNumber}
                      />
                    );
                  })}
                </div>
              </article>
            );
          })}
        </div>
      </section>
    </PageFrame>
  );
}

export function StudentEducationProgramLoadingState() {
  return (
    <main className={styles.page} aria-busy="true" aria-label="Eğitim programı yükleniyor">
      <div className={styles.shell}>
        <div className={`${styles.skeleton} ${styles.skeletonBack}`} />
        <div className={`${styles.skeleton} ${styles.skeletonHero}`} />
        <div className={`${styles.skeleton} ${styles.skeletonDay}`} />
        <p className={styles.loadingText}>Eğitim programınız yükleniyor…</p>
      </div>
    </main>
  );
}
