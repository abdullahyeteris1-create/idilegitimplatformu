"use client";

import Link from "next/link";
import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { EducationProgramCountdownBadge } from "@/components/education-programs/EducationProgramCountdownBadge";
import { PROGRAM_TASK_COMPLETED_EVENT } from "@/lib/results/programTaskEvents";
import type { EducationProgramExerciseLaunchProps } from "@/lib/education-programs/exerciseLaunchProps";

const EDUCATION_PROGRAM_ROUTE = "/ogrenci/egitim-programim";

type EducationProgramExerciseChromeProps = {
  launch: EducationProgramExerciseLaunchProps | null | undefined;
  showCountdown?: boolean;
  children: ReactNode;
};

type ExerciseRunningContextValue = {
  setExerciseRunning: (isRunning: boolean) => void;
};

const ExerciseRunningContext = createContext<ExerciseRunningContextValue | null>(null);

export function useEducationProgramExerciseRunning(isRunning: boolean): void {
  const context = useContext(ExerciseRunningContext);

  useEffect(() => {
    context?.setExerciseRunning(isRunning);
    return () => context?.setExerciseRunning(false);
  }, [context, isRunning]);
}

function EducationProgramCountdown({
  launch,
  isRunning,
}: {
  launch: EducationProgramExerciseLaunchProps;
  isRunning: boolean;
}) {
  const [remainingSeconds, setRemainingSeconds] = useState(launch.durationSeconds);

  useEffect(() => {
    if (!isRunning || remainingSeconds <= 0) return;

    const intervalId = window.setInterval(() => {
      setRemainingSeconds((current) => Math.max(0, current - 1));
    }, 1000);
    return () => window.clearInterval(intervalId);
  }, [isRunning, remainingSeconds]);

  return <EducationProgramCountdownBadge remainingSeconds={remainingSeconds} />;
}

function EducationProgramContinueButton() {
  return (
    <div className="fixed inset-x-0 bottom-4 z-[9999] flex justify-center px-4">
      <Link
        href={EDUCATION_PROGRAM_ROUTE}
        className="inline-flex min-h-12 w-full max-w-sm items-center justify-center rounded-2xl bg-[var(--brand,#b91c1c)] px-6 py-3 text-center text-base font-extrabold text-white shadow-xl shadow-red-300/40 transition hover:-translate-y-0.5 hover:shadow-2xl"
      >
        Eğitim Programıma Devam Et
      </Link>
    </div>
  );
}

export function EducationProgramExerciseChrome({
  launch,
  showCountdown = true,
  children,
}: EducationProgramExerciseChromeProps) {
  const [completed, setCompleted] = useState(false);
  const [isExerciseRunning, setIsExerciseRunning] = useState(false);
  const hasCountdown = showCountdown && Boolean(
    launch && Number.isFinite(launch.durationSeconds) && launch.durationSeconds > 0,
  );
  const countdownLaunch = launch && hasCountdown ? launch : null;
  const runningContext = useMemo(
    () => ({ setExerciseRunning: setIsExerciseRunning }),
    [],
  );

  useEffect(() => {
    if (!launch) return;
    const handleCompleted = () => setCompleted(true);
    window.addEventListener(PROGRAM_TASK_COMPLETED_EVENT, handleCompleted);
    return () => window.removeEventListener(PROGRAM_TASK_COMPLETED_EVENT, handleCompleted);
  }, [launch]);

  return (
    <>
      <ExerciseRunningContext.Provider value={runningContext}>{children}</ExerciseRunningContext.Provider>
      {countdownLaunch ? (
        <EducationProgramCountdown launch={countdownLaunch} isRunning={isExerciseRunning && !completed} />
      ) : null}
      {completed && launch ? <EducationProgramContinueButton /> : null}
    </>
  );
}
