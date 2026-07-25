import type { Metadata } from "next";
import { TemplateEditorClient } from "./TemplateEditorClient";

export const metadata: Metadata = {
  title: "Şablon Düzenle | İDİL Hızlı Okuma",
  description: "Ödev şablonunun her günü için çalışmaları ve ayarlarını tek tek belirleyin.",
};

export default async function TemplateEditorPage({
  params,
}: {
  params: Promise<{ templateId: string }>;
}) {
  const { templateId } = await params;
  return <TemplateEditorClient templateId={templateId} />;
}
