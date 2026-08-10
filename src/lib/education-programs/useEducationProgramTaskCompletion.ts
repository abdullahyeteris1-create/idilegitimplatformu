"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { completeEducationProgramTask } from "@/lib/education-programs/completeEducationProgramTaskClient";
import { emitProgramTaskCompleted } from "@/lib/results/programTaskEvents";

const COMPLETION_CONFLICT_CODES = new Set([
  "program_not_active",
  "day_not_available",
  "task_not_in_progress",
  "completion_conflict",
  "exercise_mismatch",
]);

export type EducationProgramTaskCompletionStatus =
  | { state: "idle"; message: "" }
  | { state: "pending"; message: string }
  | { state: "success"; message: string }
  | {
      state: "error";
      code: string;
      message: string;
      canRetry: boolean;
    };

const IDLE_STATUS: EducationProgramTaskCompletionStatus = {
  state: "idle",
  message: "",
};

function getFailureStatus(
  code: string,
): Extract<EducationProgramTaskCompletionStatus, { state: "error" }> {
  if (code === "task_not_found") {
    return {
      state: "error",
      code,
      message:
        "Bu program görevi artık bulunamıyor. Program sayfasına dönüp yenileyin.",
      canRetry: false,
    };
  }

  if (COMPLETION_CONFLICT_CODES.has(code)) {
    return {
      state: "error",
      code,
      message:
        "Program görevi şu anda tamamlanamadı. Program sayfasına dönüp yenileyin.",
      canRetry: false,
    };
  }

  return {
    state: "error",
    code,
    message:
      "Sonucunuz kaydedildi ancak program ilerlemeniz güncellenemedi.",
    canRetry: true,
  };
}

export function useEducationProgramTaskCompletion(
  taskId: string | undefined,
  expectedResultExerciseType: string,
) {
  const [completionStatus, setCompletionStatus] =
    useState<EducationProgramTaskCompletionStatus>(IDLE_STATUS);
  const completedTaskKeyRef = useRef<string | null>(null);
  const inFlightCompletionRef = useRef<{
    taskKey: string;
    promise: Promise<boolean>;
  } | null>(null);
  const isMountedRef = useRef(true);

  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      // Devam eden completion istegini navigation/unmount sirasinda abort
      // etmiyoruz. Yalniz unmount sonrasi state guncellemesini engelliyoruz.
      isMountedRef.current = false;
    };
  }, []);

  const completeTaskAfterResultSave = useCallback((): Promise<boolean> => {
    if (!taskId) {
      return Promise.resolve(true);
    }

    const taskKey = `${taskId}:${expectedResultExerciseType}`;
    if (completedTaskKeyRef.current === taskKey) {
      return Promise.resolve(true);
    }

    if (inFlightCompletionRef.current?.taskKey === taskKey) {
      return inFlightCompletionRef.current.promise;
    }

    if (isMountedRef.current) {
      setCompletionStatus({
        state: "pending",
        message: "Program ilerlemeniz güncelleniyor…",
      });
    }

    const promise = (async () => {
      const result = await completeEducationProgramTask(
        taskId,
        expectedResultExerciseType,
      );

      if (result.ok) {
        // alreadyCompleted da ayni ok:true basari yolundan gelir.
        completedTaskKeyRef.current = taskKey;
        if (isMountedRef.current) {
          setCompletionStatus({
            state: "success",
            message: "Program ilerlemeniz güncellendi.",
          });
        }
        emitProgramTaskCompleted();
        return true;
      }

      if (isMountedRef.current) {
        setCompletionStatus(getFailureStatus(result.code));
      }
      return false;
    })()
      .catch(() => {
        if (isMountedRef.current) {
          setCompletionStatus(getFailureStatus("completion_failed"));
        }
        return false;
      })
      .finally(() => {
        if (inFlightCompletionRef.current?.promise === promise) {
          inFlightCompletionRef.current = null;
        }
      });

    inFlightCompletionRef.current = { taskKey, promise };
    return promise;
  }, [expectedResultExerciseType, taskId]);

  return {
    completionStatus,
    completeTaskAfterResultSave,
    retryTaskCompletion: completeTaskAfterResultSave,
  };
}
