import type { Metadata } from "next";
import { AssignmentProgramSettingsClient } from "./AssignmentProgramSettingsClient";

export const metadata: Metadata = {
  title: "20 Günlük Ödev Programı | İDİL Hızlı Okuma",
  description: "Sınıf gruplarına göre çalışma ayarlarını düzenleyin ve program önizlemesi oluşturun.",
};

export default function AssignmentProgramSettingsPage() {
  return <AssignmentProgramSettingsClient />;
}
