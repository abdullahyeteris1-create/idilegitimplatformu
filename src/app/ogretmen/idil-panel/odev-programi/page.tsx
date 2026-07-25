import type { Metadata } from "next";
import { TemplateLibraryClient } from "./TemplateLibraryClient";

export const metadata: Metadata = {
  title: "Ödev Şablonları | İDİL Hızlı Okuma",
  description: "Günlük çalışmaları tek tek belirlediğiniz ödev şablonlarını hazırlayın ve öğrencilere atayın.",
};

export default function AssignmentTemplateLibraryPage() {
  return <TemplateLibraryClient />;
}
