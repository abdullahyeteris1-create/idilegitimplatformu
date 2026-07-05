import { AppShell } from "@/components/layout/AppShell";
import { PanelCard } from "@/components/ui/PanelCard";
import { APP_NAV_ITEMS } from "@/lib/constants/navigation";
import { EditStudentFormClient } from "./EditStudentFormClient";

export default function EditStudentPage() {
  return (
    <AppShell
      title="Ogrenci Duzenle"
      subtitle="Mevcut ogrenci bilgilerini guncelleyebilirsin. Opsiyonel alanlari bos birakabilirsin."
      navItems={APP_NAV_ITEMS}
    >
      <PanelCard title="Ogrenci Bilgileri" subtitle="Degisiklikler kaydedildikten sonra ogrenci listesine donersin.">
        <EditStudentFormClient />
      </PanelCard>
    </AppShell>
  );
}
