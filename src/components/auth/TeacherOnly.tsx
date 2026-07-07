"use client";

import { type ReactNode } from "react";

type TeacherOnlyProps = {
  children: ReactNode;
};

export function TeacherOnly({ children }: TeacherOnlyProps) {
  return <>{children}</>;
}
