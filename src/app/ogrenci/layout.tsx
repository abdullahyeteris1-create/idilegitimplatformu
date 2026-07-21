import type { ReactNode } from "react";
import { StudentSessionWatcher } from "@/components/auth/StudentSessionWatcher";

type StudentLayoutProps = {
  children: ReactNode;
};

export default function StudentLayout({ children }: StudentLayoutProps) {
  return (
    <>
      <StudentSessionWatcher />
      {children}
    </>
  );
}
