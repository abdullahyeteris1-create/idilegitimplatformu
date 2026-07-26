import type { ReactNode } from "react";
import Link from "next/link";
import { Icon } from "@/components/student-panel-preview/icons";
import { TaskLaunchForm } from "@/components/education-programs/TaskLaunchForm";
import { StudentEducationProgramHero } from "@/components/education-programs/StudentEducationProgramHero";
import {
  StudentEducationProgramDaysExplorer,
  type StudentEducationProgramDayNavItem,
} from "@/components/education-programs/StudentEducationProgramDaysExplorer";
import {
  calculateStudentProgramProgress,
  countCompletedStudentProgramTasks,
  formatStudentProgramDuration,
  selectCurrentStudentProgramDay,
  selectInitialStudentProgramDayId,
  STUDENT_PROGRAM_DAY_STATUS_LABELS,
  STUDENT_PROGRAM_TASK_STATUS_LABELS,
} from "@/lib/education-programs/studentProgramPresentation";
import {
  getStudentProgramTaskVisual,
  type StudentProgramTaskVisualTone,
} from "@/lib/education-programs/studentProgramTaskVisuals";
import type {
  StudentEducationProgramDayStatus,
  StudentEducationProgramStudentDay,
  StudentEducationProgramStudentTask,
  StudentEducationProgramStudentView as StudentProgramView,
  StudentEducationProgramTaskStatus,
} from "@/lib/education-programs/studentProgramTypes";
import styles from "./StudentEducationProgramStudentView.module.css";

function statusClass(
  status: StudentEducationProgramDayStatus | StudentEducationProgramTaskStatus,
): string {
  if (status === "completed") return styles.statusCompleted;
  if (status === "available") return styles.statusAvailable;
  if (status === "in_progress") return styles.statusInProgress;
  return styles.statusLocked;
}

function taskIconToneClass(tone: StudentProgramTaskVisualTone): string {
  if (tone === "purple") return styles.taskIconPurple;
  if (tone === "green") return styles.taskIconGreen;
  if (tone === "orange") return styles.taskIconOrange;
  if (tone === "cyan") return styles.taskIconCyan;
  return styles.taskIconBlue;
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
        <a href="/ogrenci/egitim-programim" className={styles.retryButton}>
          Yeniden Dene
        </a>
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

  const visual = getStudentProgramTaskVisual(task.exerciseSlug);

  return (
    <article className={styles.taskCard} data-status={task.status}>
      <div className={styles.taskTop}>
        <div className={styles.taskIdentity}>
          <span className={`${styles.taskIcon} ${taskIconToneClass(visual.tone)}`} aria-hidden="true">
            <Icon name={visual.icon} />
          </span>
          <span className={styles.taskOrder}>Çalışma {task.orderNumber}</span>
        </div>
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
      {task.status === "available" || task.status === "in_progress" ? (
        <TaskLaunchForm
          taskId={task.id}
          label={task.status === "available" ? "Başla" : "Devam Et"}
        />
      ) : null}
    </article>
  );
}

function DayArticle({
  day,
  isCurrent,
}: {
  day: StudentEducationProgramStudentDay;
  isCurrent: boolean;
}) {
  const tasksByOrder = new Map(day.tasks.map((task) => [task.orderNumber, task]));
  const completedTaskCount = countCompletedStudentProgramTasks(day.tasks);

  return (
    <article
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
          <p className={styles.dayMotivation}>
            {day.tasks.length > 0
              ? `Bugünkü ${day.tasks.length} çalışmayı sırayla tamamlayın.`
              : "Bu gün için çalışma bulunmuyor."}
          </p>
        </div>
        <div className={styles.dayHeaderMeta}>
          <span className={`${styles.statusBadge} ${statusClass(day.status)}`}>
            {STUDENT_PROGRAM_DAY_STATUS_LABELS[day.status]}
          </span>
          {day.tasks.length > 0 ? (
            <span className={styles.dayProgressText}>
              {completedTaskCount} / {day.tasks.length} çalışma tamamlandı
            </span>
          ) : null}
        </div>
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
}

export function StudentEducationProgramStudentView({
  program,
}: {
  program: StudentProgramView;
}) {
  const currentDay = selectCurrentStudentProgramDay(
    program.days,
    program.currentDayNumber,
  );
  const displayedCurrentDay = currentDay?.dayNumber ?? program.currentDayNumber;
  const visibleName = program.visibleName.trim() || "Eğitim Programım";

  const todayDay =
    program.days.find((day) => day.dayNumber === program.currentDayNumber) ??
    null;
  const todayCompletedTaskCount = todayDay
    ? countCompletedStudentProgramTasks(todayDay.tasks)
    : 0;
  const todayTotalTaskCount = todayDay ? todayDay.tasks.length : 0;

  const allTasks = program.days.flatMap((day) => day.tasks);
  const overallTaskProgress = calculateStudentProgramProgress(
    countCompletedStudentProgramTasks(allTasks),
    allTasks.length,
  );

  const dayNavItems: StudentEducationProgramDayNavItem[] = program.days.map(
    (day) => ({
      id: day.id,
      dayNumber: day.dayNumber,
      title: day.title,
      status: day.status,
      completedTaskCount: countCompletedStudentProgramTasks(day.tasks),
      totalTaskCount: day.tasks.length,
    }),
  );

  const initialSelectedDayId =
    selectInitialStudentProgramDayId(program.days, program.currentDayNumber) ??
    program.days[0]?.id ??
    "";

  return (
    <PageFrame>
      <StudentEducationProgramHero
        visibleName={visibleName}
        studentMessage={program.studentMessage}
        completedDays={program.completedDays}
        totalDays={program.totalDays}
        todayCompletedTaskCount={todayCompletedTaskCount}
        todayTotalTaskCount={todayTotalTaskCount}
        overallTaskProgress={overallTaskProgress}
        displayedCurrentDay={displayedCurrentDay}
        assignedAt={program.assignedAt}
      />

      {program.status === "completed" ? (
        <section className={styles.completionCard} role="status">
          <span className={styles.completionIcon} aria-hidden="true">
            <Icon name="checkbox" />
          </span>
          <div className={styles.completionCopy}>
            <h2>Tebrikler!</h2>
            <p>Programınızı başarıyla tamamladınız.</p>
            <span className={styles.completionProgress}>
              İlerleme: %{overallTaskProgress}
            </span>
          </div>
        </section>
      ) : null}

      <section className={styles.daysSection} aria-labelledby="program-days-title">
        <div className={styles.sectionHeading}>
          <div>
            <span className={styles.eyebrow}>Günlük plan</span>
            <h2 id="program-days-title">Program günleri</h2>
          </div>
          <p>Kilitli günler zamanı geldiğinde öğretmeninizin planına göre açılır.</p>
        </div>

        <StudentEducationProgramDaysExplorer
          initialSelectedDayId={initialSelectedDayId}
          days={dayNavItems}
        >
          {program.days.map((day) => (
            <div key={day.id} data-day-id={day.id}>
              <DayArticle day={day} isCurrent={currentDay?.id === day.id} />
            </div>
          ))}
        </StudentEducationProgramDaysExplorer>
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
