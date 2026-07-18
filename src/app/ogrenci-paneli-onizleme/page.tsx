import type { Metadata } from "next";
import { StudentPanelPreview } from "@/components/student-panel-preview/StudentPanelPreview";

export const metadata: Metadata = {
  title: "Öğrenci Paneli Önizleme | İDİL Hızlı Okuma",
  description: "İDİL Hızlı Okuma öğrenci paneli tasarım prototipi",
};

export default function StudentPanelPreviewPage() {
  return <StudentPanelPreview />;
}
