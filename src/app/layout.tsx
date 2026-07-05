import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Idil Hizli Okuma",
  description: "Ogrenci ve ogretmenler icin hizli okuma egzersiz platformu",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="tr">
      <body className="min-h-screen bg-slate-50 text-slate-950 antialiased">{children}</body>
    </html>
  );
}
