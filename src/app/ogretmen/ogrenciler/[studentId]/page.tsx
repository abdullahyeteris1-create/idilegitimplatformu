import { AppShell } from "@/components/layout/AppShell";
import { PanelCard } from "@/components/ui/PanelCard";
import { APP_NAV_ITEMS } from "@/lib/constants/navigation";
import { StudentDetailClient } from "./StudentDetailClient";

export default function StudentDetailPage() {
  return (
    <AppShell
      title="Ogrenci Detayi"
      subtitle="Ogrenci bilgileri, performans ozeti ve sonuc gecmisi"
      navItems={APP_NAV_ITEMS}
    >
      <PanelCard title="Detayli Ogrenci Raporu" subtitle="Performans takip ve disa aktarma alani">
        <StudentDetailClient />
      </PanelCard>
    </AppShell>
  );
}
