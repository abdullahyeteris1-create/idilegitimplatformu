"use client";

import { Children, isValidElement, useState, type ReactNode } from "react";
import { Icon } from "@/components/student-panel-preview/icons";
import { STUDENT_PROGRAM_DAY_STATUS_LABELS } from "@/lib/education-programs/studentProgramPresentation";
import type { StudentEducationProgramDayStatus } from "@/lib/education-programs/studentProgramTypes";
import styles from "./StudentEducationProgramDaysExplorer.module.css";

export type StudentEducationProgramDayNavItem = {
  id: string;
  dayNumber: number;
  title: string | null;
  status: StudentEducationProgramDayStatus;
  completedTaskCount: number;
  totalTaskCount: number;
};

function dayStatusIcon(status: StudentEducationProgramDayStatus) {
  if (status === "completed") return "checkbox" as const;
  if (status === "in_progress") return "play" as const;
  if (status === "locked") return "lock" as const;
  return "circle" as const;
}

function dayStatusClassName(status: StudentEducationProgramDayStatus): string {
  if (status === "completed") return styles.navItemCompleted;
  if (status === "in_progress") return styles.navItemInProgress;
  if (status === "available") return styles.navItemAvailable;
  return styles.navItemLocked;
}

// Sunucuda onceden render edilmis gun kartlarini (server component cikti)
// data-day-id ile isaretlenmis children olarak alir, yalniz secili olanin
// gorunmesini saglar. Bu bileşen kendisi hicbir gun/gorev verisini render
// etmez - yalniz HANGI onceden-render-edilmis cocugun gosterilecegine karar
// verir. Gorev baslatma butonu ve gorev alanlari sunucu tarafinda kalir.
export function StudentEducationProgramDaysExplorer({
  initialSelectedDayId,
  days,
  children,
}: {
  initialSelectedDayId: string;
  days: StudentEducationProgramDayNavItem[];
  children: ReactNode;
}) {
  const [selectedDayId, setSelectedDayId] = useState(initialSelectedDayId);

  const visibleChild = Children.toArray(children).find((child) => {
    if (!isValidElement<{ "data-day-id"?: string }>(child)) return false;
    return child.props["data-day-id"] === selectedDayId;
  });

  return (
    <div className={styles.layout}>
      <nav className={styles.dayNav} aria-label="Program Günleri">
        <span className={styles.dayNavTitle}>Program Günleri</span>
        <div className={styles.dayNavList}>
          {days.map((day) => {
            const isLocked = day.status === "locked";
            const isSelected = day.id === selectedDayId;

            return (
              <button
                key={day.id}
                type="button"
                disabled={isLocked}
                aria-current={isSelected ? "true" : undefined}
                onClick={() => setSelectedDayId(day.id)}
                className={`${styles.navItem} ${dayStatusClassName(day.status)} ${
                  isSelected ? styles.navItemSelected : ""
                }`}
              >
                <span className={styles.navItemIcon} aria-hidden="true">
                  <Icon name={dayStatusIcon(day.status)} />
                </span>
                <span className={styles.navItemBody}>
                  <span className={styles.navItemDayNumber}>
                    Gün {day.dayNumber}
                  </span>
                  <span className={styles.navItemStatusLabel}>
                    {STUDENT_PROGRAM_DAY_STATUS_LABELS[day.status]}
                  </span>
                  {!isLocked ? (
                    <span className={styles.navItemProgress}>
                      {day.completedTaskCount} / {day.totalTaskCount} çalışma
                    </span>
                  ) : null}
                </span>
              </button>
            );
          })}
        </div>
      </nav>

      <div className={styles.dayContent}>{visibleChild ?? null}</div>
    </div>
  );
}
