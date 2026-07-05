import { AppShell } from "@/components/layout/AppShell";
import { PanelCard } from "@/components/ui/PanelCard";
import { APP_NAV_ITEMS } from "@/lib/constants/navigation";
import { NewStudentFormClient } from "./NewStudentFormClient";

export default function NewStudentPage() {
  return (
    <AppShell
      title="Yeni Ogrenci Olustur"
      subtitle="Zorunlu alanlar: Ad Soyad, Kullanici Adi, Sifre. Diger alanlar opsiyoneldir."
      navItems={APP_NAV_ITEMS}
    >
      <PanelCard title="Ogrenci Bilgileri" subtitle="Kayit sonrasi ogrenci listesinde gorunur.">
        <NewStudentFormClient />
      </PanelCard>
    </AppShell>
  );
}
