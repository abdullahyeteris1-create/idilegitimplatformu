"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import {
  assignmentV2Error,
  calculateAssignmentDeadlineMs,
  calculateAssignmentRemainingSeconds,
  isAssignmentResultSnapshot,
  isAssignmentUuid,
  isAssignmentV2ErrorCode,
  isPlainRecord,
  normalizeAssignmentCompletionResponse,
  normalizeAssignmentStartResponse,
  type AssignmentCompletionResponse,
  type AssignmentResultSnapshot,
  type AssignmentTaskConfig,
  type AssignmentV2Error,
} from "@/lib/assignments/assignmentV2";

export type AssignmentState =
  | "free"
  | "config-loading"
  | "config-ready"
  | "legacy"
  | "start-pending"
  | "running"
  | "result-preparing"
  | "completion-pending"
  | "completed"
  | "error"
  | "stale-attempt";

export type AssignmentResultSnapshotProvider = () =>
  | AssignmentResultSnapshot
  | Promise<AssignmentResultSnapshot>;

export type AssignmentV2ContextValue = {
  assignmentMode: boolean;
  assignmentV2Enabled: boolean;
  taskConfig: AssignmentTaskConfig | null;
  assignmentState: AssignmentState;
  attemptId: string | null;
  startedAt: string | null;
  expiresAt: string | null;
  serverNow: string | null;
  remainingSeconds: number | null;
  isLastThirtySeconds: boolean;
  completionResult: AssignmentCompletionResponse | null;
  error: AssignmentV2Error | null;
  adapterReady: boolean;
  startAssignment: () => Promise<boolean>;
  completeAssignment: (result: AssignmentResultSnapshot) => Promise<boolean>;
  retryCompletion: () => Promise<boolean>;
  resetAfterStaleAttempt: () => void;
  retryConfig: () => Promise<void>;
  registerResultSnapshotProvider: (provider: AssignmentResultSnapshotProvider) => () => void;
};

const AssignmentV2Context = createContext<AssignmentV2ContextValue | null>(null);

function readProgramTaskId(): string | null {
  if (typeof window === "undefined") return null;
  return new URLSearchParams(window.location.search).get("programTaskId")?.trim() || null;
}

function normalizePathname(value: string): string {
  if (value.length > 1 && value.endsWith("/")) return value.slice(0, -1);
  return value;
}

function isAssignmentTaskConfig(value: unknown): value is AssignmentTaskConfig {
  if (!isPlainRecord(value) || !isPlainRecord(value.settings)) return false;
  return (
    isAssignmentUuid(value.taskId) &&
    typeof value.exerciseSlug === "string" &&
    Boolean(value.exerciseSlug) &&
    typeof value.route === "string" &&
    value.route.startsWith("/egzersizler/") &&
    typeof value.title === "string" &&
    Number.isSafeInteger(value.dayNumber) &&
    Number(value.dayNumber) > 0 &&
    Number.isSafeInteger(value.taskOrder) &&
    Number(value.taskOrder) > 0 &&
    Number.isSafeInteger(value.startingLevel) &&
    Number(value.startingLevel) > 0 &&
    Number.isSafeInteger(value.durationSeconds) &&
    Number(value.durationSeconds) > 0 &&
    typeof value.taskStatus === "string" &&
    typeof value.dayStatus === "string" &&
    typeof value.canStart === "boolean" &&
    typeof value.assignmentV2Enabled === "boolean" &&
    Object.values(value.settings).every(
      (setting) =>
        typeof setting === "string" || typeof setting === "number" || typeof setting === "boolean",
    )
  );
}

function safeApiError(payload: unknown, fallbackCode: AssignmentV2Error["code"]): AssignmentV2Error {
  if (!isPlainRecord(payload) || !isPlainRecord(payload.error)) {
    const fallback = assignmentV2Error(fallbackCode);
    return { code: fallback.code, message: fallback.message };
  }

  const code = isAssignmentV2ErrorCode(payload.error.code) ? payload.error.code : fallbackCode;
  const mapped = assignmentV2Error(code);
  const remainingSeconds =
    Number.isSafeInteger(payload.error.remainingSeconds) && Number(payload.error.remainingSeconds) >= 0
      ? Number(payload.error.remainingSeconds)
      : undefined;
  return {
    code,
    message: typeof payload.error.message === "string" && payload.error.message
      ? payload.error.message
      : mapped.message,
    ...(remainingSeconds === undefined ? {} : { remainingSeconds }),
  };
}

export function useAssignmentV2(): AssignmentV2ContextValue {
  const value = useContext(AssignmentV2Context);
  if (!value) throw new Error("useAssignmentV2, AssignmentTaskProvider içinde kullanılmalıdır.");
  return value;
}

/** Egzersizlerin mevcut ayar hook'u; serbest çalışmada null döner. */
export function useAssignmentTask(): AssignmentTaskConfig | null {
  return useAssignmentV2().taskConfig;
}

export function useAssignmentSetting<T extends string | number | boolean>(
  key: string,
  fallback: T,
): T {
  const task = useAssignmentTask();
  if (!task) return fallback;
  const value = task.settings[key];
  return typeof value === typeof fallback ? (value as T) : fallback;
}

export function useAssignedDurationSeconds(fallbackSeconds: number): number {
  const task = useAssignmentTask();
  if (!task || task.durationSeconds <= 0) return fallbackSeconds;
  return task.durationSeconds;
}

export function useIsAssignmentMode(): boolean {
  return useAssignmentV2().assignmentMode;
}

export function AssignmentTaskProvider({ children }: { children: ReactNode }) {
  const [assignmentMode, setAssignmentMode] = useState(false);
  const [assignmentV2Enabled, setAssignmentV2Enabled] = useState(false);
  const [taskConfig, setTaskConfig] = useState<AssignmentTaskConfig | null>(null);
  const [assignmentState, setAssignmentState] = useState<AssignmentState>("free");
  const [attemptId, setAttemptId] = useState<string | null>(null);
  const [startedAt, setStartedAt] = useState<string | null>(null);
  const [expiresAt, setExpiresAt] = useState<string | null>(null);
  const [serverNow, setServerNow] = useState<string | null>(null);
  const [remainingSeconds, setRemainingSeconds] = useState<number | null>(null);
  const [completionResult, setCompletionResult] = useState<AssignmentCompletionResponse | null>(null);
  const [error, setError] = useState<AssignmentV2Error | null>(null);
  const [adapterReady, setAdapterReady] = useState(false);

  const taskIdRef = useRef<string | null>(null);
  const taskConfigRef = useRef<AssignmentTaskConfig | null>(null);
  const assignmentStateRef = useRef<AssignmentState>("free");
  const attemptIdRef = useRef<string | null>(null);
  const hasStartedRef = useRef(false);
  const deadlineMsRef = useRef<number | null>(null);
  const deadlineHandledRef = useRef(false);
  const resultProviderRef = useRef<AssignmentResultSnapshotProvider | null>(null);
  const pendingResultRef = useRef<AssignmentResultSnapshot | null>(null);
  const configRequestRef = useRef(0);
  const errorRef = useRef<AssignmentV2Error | null>(null);

  useEffect(() => {
    errorRef.current = error;
  }, [error]);

  const transition = useCallback((nextState: AssignmentState) => {
    assignmentStateRef.current = nextState;
    setAssignmentState(nextState);
  }, []);

  const updateTaskConfig = useCallback((config: AssignmentTaskConfig | null) => {
    taskConfigRef.current = config;
    setTaskConfig(config);
  }, []);

  const loadConfig = useCallback(async (taskId: string) => {
    const requestId = ++configRequestRef.current;
    setError(null);
    updateTaskConfig(null);
    transition("config-loading");

    try {
      const response = await fetch(
        `/api/student/assignment-program-tasks/${encodeURIComponent(taskId)}`,
        { credentials: "same-origin", cache: "no-store" },
      );
      const payload = (await response.json().catch(() => null)) as unknown;
      if (requestId !== configRequestRef.current) return;

      if (!response.ok || !isPlainRecord(payload) || payload.ok !== true || !isAssignmentTaskConfig(payload.task)) {
        setError(safeApiError(payload, "CONFIG_UNAVAILABLE"));
        transition("error");
        return;
      }

      const config = payload.task;
      if (normalizePathname(window.location.pathname) !== normalizePathname(config.route)) {
        const routeError = assignmentV2Error("EXERCISE_ROUTE_MISMATCH");
        setError({ code: routeError.code, message: routeError.message });
        transition("error");
        return;
      }

      updateTaskConfig(config);
      setAssignmentV2Enabled(config.assignmentV2Enabled);

      if (!config.canStart) {
        const code =
          config.taskStatus === "completed"
            ? "TASK_ALREADY_COMPLETED"
            : config.taskStatus === "cancelled"
              ? "TASK_CANCELLED"
              : "TASK_LOCKED";
        const stateError = assignmentV2Error(code);
        setError({ code: stateError.code, message: stateError.message });
        transition("error");
        return;
      }

      transition(config.assignmentV2Enabled ? "config-ready" : "legacy");
    } catch {
      if (requestId !== configRequestRef.current) return;
      const networkError = assignmentV2Error("NETWORK_ERROR");
      setError({ code: networkError.code, message: networkError.message });
      transition("error");
    }
  }, [transition, updateTaskConfig]);

  useEffect(() => {
    const taskId = readProgramTaskId();
    if (!taskId) return;

    taskIdRef.current = taskId;
    let cancelled = false;
    queueMicrotask(() => {
      if (cancelled) return;
      setAssignmentMode(true);
      void loadConfig(taskId);
    });

    return () => {
      cancelled = true;
      configRequestRef.current += 1;
    };
  }, [loadConfig]);

  const sendCompletion = useCallback(async (result: AssignmentResultSnapshot): Promise<boolean> => {
    const config = taskConfigRef.current;
    const currentAttemptId = attemptIdRef.current;
    if (!config || !config.assignmentV2Enabled || !currentAttemptId) {
      const stateError = assignmentV2Error("INVALID_ATTEMPT_STATE");
      setError({ code: stateError.code, message: stateError.message });
      transition("error");
      return false;
    }

    pendingResultRef.current = result;
    setError(null);
    transition("completion-pending");

    try {
      const response = await fetch(
        `/api/student/assignment-program-tasks/${encodeURIComponent(config.taskId)}/complete-v2`,
        {
          method: "POST",
          credentials: "same-origin",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            attemptId: currentAttemptId,
            exerciseSlug: config.exerciseSlug,
            result,
          }),
        },
      );
      const payload = (await response.json().catch(() => null)) as unknown;

      if (!response.ok) {
        const apiError = safeApiError(payload, "UNKNOWN_ERROR");
        setError(apiError);

        if (apiError.code === "STALE_ATTEMPT") {
          transition("stale-attempt");
          return false;
        }

        if (apiError.code === "DURATION_NOT_ELAPSED" && apiError.remainingSeconds !== undefined) {
          const resyncNow = new Date();
          const resyncExpiresAt = new Date(resyncNow.getTime() + apiError.remainingSeconds * 1000);
          setServerNow(resyncNow.toISOString());
          setExpiresAt(resyncExpiresAt.toISOString());
          deadlineMsRef.current = resyncExpiresAt.getTime();
          deadlineHandledRef.current = false;
          setRemainingSeconds(apiError.remainingSeconds);
          setError(null);
          transition("running");
          return false;
        }

        transition("error");
        return false;
      }

      const normalized = normalizeAssignmentCompletionResponse(payload);
      if (
        !normalized ||
        normalized.taskId !== config.taskId ||
        normalized.attemptId !== currentAttemptId ||
        !normalized.taskCompleted
      ) {
        const responseError = assignmentV2Error("UNKNOWN_ERROR");
        setError({ code: responseError.code, message: responseError.message });
        transition("error");
        return false;
      }

      pendingResultRef.current = null;
      setCompletionResult(normalized);
      setRemainingSeconds(0);
      transition("completed");
      return true;
    } catch {
      const networkError = assignmentV2Error("NETWORK_ERROR");
      setError({ code: networkError.code, message: networkError.message });
      transition("error");
      return false;
    }
  }, [transition]);

  const completeAssignment = useCallback(async (result: AssignmentResultSnapshot): Promise<boolean> => {
    if (assignmentStateRef.current !== "running") {
      const stateError = assignmentV2Error("INVALID_ATTEMPT_STATE");
      setError({ code: stateError.code, message: stateError.message });
      transition("error");
      return false;
    }
    if (!isAssignmentResultSnapshot(result)) {
      const resultError = assignmentV2Error("RESULT_SCHEMA_INVALID");
      setError({ code: resultError.code, message: resultError.message });
      transition("error");
      return false;
    }
    return sendCompletion(result);
  }, [sendCompletion, transition]);

  const prepareDeadlineResult = useCallback(async () => {
    if (assignmentStateRef.current !== "running") return;
    transition("result-preparing");

    const snapshotProvider = resultProviderRef.current;
    if (!snapshotProvider) {
      const adapterError = assignmentV2Error("V2_ADAPTER_NOT_READY");
      setError({ code: adapterError.code, message: adapterError.message });
      transition("error");
      return;
    }

    try {
      const snapshot = await snapshotProvider();
      if (!isAssignmentResultSnapshot(snapshot)) {
        const resultError = assignmentV2Error("RESULT_SCHEMA_INVALID");
        setError({ code: resultError.code, message: resultError.message });
        transition("error");
        return;
      }
      await sendCompletion(snapshot);
    } catch {
      const resultError = assignmentV2Error("RESULT_SCHEMA_INVALID");
      setError({ code: resultError.code, message: resultError.message });
      transition("error");
    }
  }, [sendCompletion, transition]);

  useEffect(() => {
    if (assignmentState !== "running" || deadlineMsRef.current === null) return;

    const synchronize = () => {
      const deadline = deadlineMsRef.current;
      if (deadline === null) return;
      const nextRemaining = calculateAssignmentRemainingSeconds(deadline, Date.now());
      setRemainingSeconds(nextRemaining);
      if (nextRemaining === 0 && !deadlineHandledRef.current) {
        deadlineHandledRef.current = true;
        void prepareDeadlineResult();
      }
    };

    synchronize();
    const intervalId = window.setInterval(synchronize, 250);
    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") synchronize();
    };
    window.addEventListener("focus", synchronize);
    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      window.clearInterval(intervalId);
      window.removeEventListener("focus", synchronize);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [assignmentState, prepareDeadlineResult]);

  const startAssignment = useCallback(async (): Promise<boolean> => {
    const config = taskConfigRef.current;
    if (!config || !config.assignmentV2Enabled) {
      const disabledError = assignmentV2Error("ASSIGNMENT_V2_DISABLED");
      setError({ code: disabledError.code, message: disabledError.message });
      transition("error");
      return false;
    }
    if (
      assignmentStateRef.current !== "config-ready" &&
      !(assignmentStateRef.current === "error" && !hasStartedRef.current)
    ) {
      return false;
    }
    if (!resultProviderRef.current) {
      const adapterError = assignmentV2Error("V2_ADAPTER_NOT_READY");
      setError({ code: adapterError.code, message: adapterError.message });
      transition("error");
      return false;
    }

    let currentAttemptId = attemptIdRef.current;
    if (!currentAttemptId) {
      currentAttemptId = crypto.randomUUID();
      attemptIdRef.current = currentAttemptId;
      setAttemptId(currentAttemptId);
    }

    setError(null);
    transition("start-pending");

    try {
      const response = await fetch(
        `/api/student/assignment-program-tasks/${encodeURIComponent(config.taskId)}/start`,
        {
          method: "POST",
          credentials: "same-origin",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            attemptId: currentAttemptId,
            exerciseSlug: config.exerciseSlug,
          }),
        },
      );
      const payload = (await response.json().catch(() => null)) as unknown;
      if (!response.ok) {
        const apiError = safeApiError(payload, "UNKNOWN_ERROR");
        setError(apiError);
        transition(apiError.code === "STALE_ATTEMPT" ? "stale-attempt" : "error");
        return false;
      }

      const normalized = normalizeAssignmentStartResponse(payload);
      if (
        !normalized ||
        normalized.taskId !== config.taskId ||
        normalized.attemptId !== currentAttemptId
      ) {
        const responseError = assignmentV2Error("UNKNOWN_ERROR");
        setError({ code: responseError.code, message: responseError.message });
        transition("error");
        return false;
      }

      const receivedAt = Date.now();
      const deadline = calculateAssignmentDeadlineMs(
        normalized.serverNow,
        normalized.expiresAt,
        receivedAt,
      );
      if (deadline === null) {
        const timeError = assignmentV2Error("INVALID_ATTEMPT_STATE");
        setError({ code: timeError.code, message: timeError.message });
        transition("error");
        return false;
      }

      setStartedAt(normalized.startedAt);
      hasStartedRef.current = true;
      setExpiresAt(normalized.expiresAt);
      setServerNow(normalized.serverNow);
      deadlineMsRef.current = deadline;
      deadlineHandledRef.current = false;
      setRemainingSeconds(calculateAssignmentRemainingSeconds(deadline, receivedAt));
      transition("running");
      return true;
    } catch {
      const networkError = assignmentV2Error("NETWORK_ERROR");
      setError({ code: networkError.code, message: networkError.message });
      transition("error");
      return false;
    }
  }, [transition]);

  const retryCompletion = useCallback(async (): Promise<boolean> => {
    const pendingResult = pendingResultRef.current;
    if (!pendingResult) return false;
    return sendCompletion(pendingResult);
  }, [sendCompletion]);

  const resetAfterStaleAttempt = useCallback(() => {
    attemptIdRef.current = null;
    hasStartedRef.current = false;
    deadlineMsRef.current = null;
    deadlineHandledRef.current = false;
    pendingResultRef.current = null;
    setAttemptId(null);
    setStartedAt(null);
    setExpiresAt(null);
    setServerNow(null);
    setRemainingSeconds(null);
    setCompletionResult(null);
    setError(null);
    transition("config-ready");
  }, [transition]);

  const retryConfig = useCallback(async () => {
    const taskId = taskIdRef.current;
    if (taskId) await loadConfig(taskId);
  }, [loadConfig]);

  const registerResultSnapshotProvider = useCallback(
    (provider: AssignmentResultSnapshotProvider) => {
      resultProviderRef.current = provider;
      setAdapterReady(true);
      if (
        assignmentStateRef.current === "error" &&
        errorRef.current?.code === "V2_ADAPTER_NOT_READY"
      ) {
        setError(null);
        transition("config-ready");
      }

      return () => {
        if (resultProviderRef.current === provider) {
          resultProviderRef.current = null;
          setAdapterReady(false);
        }
      };
    },
    [transition],
  );

  const value = useMemo<AssignmentV2ContextValue>(
    () => ({
      assignmentMode,
      assignmentV2Enabled,
      taskConfig,
      assignmentState,
      attemptId,
      startedAt,
      expiresAt,
      serverNow,
      remainingSeconds,
      isLastThirtySeconds:
        assignmentState === "running" &&
        remainingSeconds !== null &&
        remainingSeconds > 0 &&
        remainingSeconds <= 30,
      completionResult,
      error,
      adapterReady,
      startAssignment,
      completeAssignment,
      retryCompletion,
      resetAfterStaleAttempt,
      retryConfig,
      registerResultSnapshotProvider,
    }),
    [
      adapterReady,
      assignmentMode,
      assignmentState,
      assignmentV2Enabled,
      attemptId,
      completeAssignment,
      completionResult,
      error,
      expiresAt,
      registerResultSnapshotProvider,
      remainingSeconds,
      resetAfterStaleAttempt,
      retryCompletion,
      retryConfig,
      serverNow,
      startAssignment,
      startedAt,
      taskConfig,
    ],
  );

  return <AssignmentV2Context.Provider value={value}>{children}</AssignmentV2Context.Provider>;
}

export type {
  AssignmentCompletionResponse,
  AssignmentResultSnapshot,
  AssignmentTaskConfig,
};
