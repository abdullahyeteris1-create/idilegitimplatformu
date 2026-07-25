"use client";

import { useCallback, useEffect, useLayoutEffect, useRef } from "react";
import {
  useAssignmentV2,
  type AssignmentResultSnapshotProvider,
} from "@/components/assignments/AssignmentTaskProvider";

type LocalStart = () => void;

/**
 * Egzersizin mevcut serbest/legacy davranisini korurken Ödev V2'nin
 * server-authoritative start, deadline ve snapshot yasam dongusunu baglar.
 */
export function useAssignmentExerciseAdapter(
  getResultSnapshot: AssignmentResultSnapshotProvider,
) {
  const {
    assignmentMode,
    assignmentV2Enabled,
    assignmentState,
    adapterReady,
    remainingSeconds,
    registerResultSnapshotProvider,
    startAssignment,
  } = useAssignmentV2();
  const snapshotRef = useRef(getResultSnapshot);
  const pendingLocalStartRef = useRef<LocalStart | null>(null);

  const isAssignmentV2 =
    assignmentMode && assignmentV2Enabled;
  const isLegacyAssignment =
    assignmentMode && assignmentState === "legacy";
  const isRunning =
    isAssignmentV2 && assignmentState === "running";
  const isStartPending =
    isAssignmentV2 && assignmentState === "start-pending";
  const canStart =
    !assignmentMode ||
    isLegacyAssignment ||
    (isAssignmentV2 &&
      assignmentState === "config-ready" &&
      adapterReady);
  const isInteractionLocked =
    isAssignmentV2 && assignmentState !== "running";
  const canInteractRef = useRef(!isAssignmentV2 || isRunning);

  useLayoutEffect(() => {
    snapshotRef.current = getResultSnapshot;
  }, [getResultSnapshot]);

  useLayoutEffect(() => {
    canInteractRef.current = !isAssignmentV2 || isRunning;
  }, [isAssignmentV2, isRunning]);

  useEffect(() => {
    if (!isAssignmentV2) return;
    const provider: AssignmentResultSnapshotProvider = () =>
      snapshotRef.current();
    return registerResultSnapshotProvider(provider);
  }, [isAssignmentV2, registerResultSnapshotProvider]);

  useEffect(() => {
    if (!isRunning || !pendingLocalStartRef.current) return;
    const startLocalExercise = pendingLocalStartRef.current;
    pendingLocalStartRef.current = null;
    startLocalExercise();
  }, [isRunning]);

  const startExercise = useCallback(
    async (startLocalExercise: LocalStart): Promise<boolean> => {
      if (!assignmentMode || isLegacyAssignment) {
        startLocalExercise();
        return true;
      }
      if (
        !isAssignmentV2 ||
        assignmentState !== "config-ready"
      ) {
        return false;
      }
      pendingLocalStartRef.current = startLocalExercise;
      const started = await startAssignment();
      if (!started) return false;
      canInteractRef.current = true;
      if (pendingLocalStartRef.current) {
        pendingLocalStartRef.current = null;
        startLocalExercise();
      }
      return true;
    },
    [
      assignmentMode,
      assignmentState,
      isAssignmentV2,
      isLegacyAssignment,
      startAssignment,
    ],
  );

  return {
    isAssignmentV2,
    isRunning,
    isStartPending,
    canStart,
    isInteractionLocked,
    canInteractRef,
    remainingSeconds,
    startExercise,
  };
}
