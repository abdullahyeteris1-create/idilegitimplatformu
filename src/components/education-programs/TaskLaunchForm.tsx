"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { startEducationProgramTaskAction } from "@/app/ogrenci/egitim-programim/actions";
import type { StudentEducationProgramActionState } from "@/lib/education-programs/studentProgramTypes";
import styles from "./TaskLaunchForm.module.css";

const INITIAL_STATE: StudentEducationProgramActionState = {
  status: "idle",
  message: "",
};

function LaunchSubmitButton({ label }: { label: string }) {
  const { pending } = useFormStatus();

  return (
    <button type="submit" className={styles.launchButton} disabled={pending}>
      {pending ? "Başlatılıyor…" : label}
    </button>
  );
}

export function TaskLaunchForm({
  taskId,
  label,
}: {
  taskId: string;
  label: "Başla" | "Devam Et";
}) {
  const [state, formAction] = useActionState(
    startEducationProgramTaskAction,
    INITIAL_STATE,
  );

  return (
    <form action={formAction} className={styles.launchForm}>
      <input type="hidden" name="taskId" value={taskId} />
      <LaunchSubmitButton label={label} />
      {state.status === "error" ? (
        <p className={styles.launchError} role="alert">
          {state.message}
        </p>
      ) : null}
    </form>
  );
}
