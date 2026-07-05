import { LoginForm } from "@/components/auth/LoginForm";
import { AppShell } from "@/components/layout/AppShell";
import { APP_NAV_ITEMS } from "@/lib/constants/navigation";

export default function LoginPage() {
  return (
    <AppShell
      title="Platform Girisi"
      subtitle="Ogrenci girisi ile kisisel egzersiz akisini baslat."
      navItems={APP_NAV_ITEMS}
    >
      <LoginForm />
    </AppShell>
  );
}
