import type { Metadata } from "next";
import Script from "next/script";
import { IdilThemeProvider } from "@/components/theme/IdilThemeProvider";
import "./globals.css";

export const metadata: Metadata = {
  title: "Idil Hizli Okuma",
  description: "Ogrenci ve ogretmenler icin hizli okuma egzersiz platformu",
};

const THEME_INIT_SCRIPT = `
(function () {
  try {
    var theme = window.localStorage.getItem("idil-theme");
    var accent = window.localStorage.getItem("idil-accent");
    document.documentElement.setAttribute("data-idil-theme", theme === "light" || theme === "dark" ? theme : "dark");
    if (accent === "red" || accent === "orange" || accent === "purple" || accent === "blue" || accent === "green") {
      document.documentElement.setAttribute("data-idil-accent", accent);
    }
  } catch (e) {}
})();
`;

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="tr">
      <head>
        <Script id="idil-theme-init" strategy="beforeInteractive">
          {THEME_INIT_SCRIPT}
        </Script>
      </head>
      <body className="min-h-screen bg-slate-50 text-slate-950 antialiased">
        <IdilThemeProvider>{children}</IdilThemeProvider>
      </body>
    </html>
  );
}
