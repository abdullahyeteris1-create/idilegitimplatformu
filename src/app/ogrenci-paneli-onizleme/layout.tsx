import type { ReactNode } from "react";
import { StudentSessionWatcher } from "@/components/auth/StudentSessionWatcher";

type StudentPanelPreviewLayoutProps = {
  children: ReactNode;
};

export default function StudentPanelPreviewLayout({ children }: StudentPanelPreviewLayoutProps) {
  return (
    <>
      <StudentSessionWatcher />
      {children}
    </>
  );
}
