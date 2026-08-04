import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import {
  createWordRacePreviewToken,
  isValidWordRacePreviewKey,
} from "@/lib/preview/wordRacePreview";

export const metadata: Metadata = {
  title: "Kelime Yarışı Önizleme",
  robots: {
    index: false,
    follow: false,
    noarchive: true,
  },
};

type PreviewPageProps = {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
};

export default async function KelimeYarisiPreviewPage({ searchParams }: PreviewPageProps) {
  const rawKey = (await searchParams).key;
  const key = Array.isArray(rawKey) ? rawKey[0] : rawKey;

  // Onizleme kapaliysa veya anahtar hataliysa oyunun varligi hakkinda bilgi
  // vermeden standart 404 doner.
  if (!isValidWordRacePreviewKey(key)) {
    notFound();
  }

  const token = createWordRacePreviewToken();

  if (!token) {
    notFound();
  }

  return (
    <main className="flex min-h-screen w-full flex-col bg-slate-950">
      <div className="flex shrink-0 items-center justify-between gap-3 px-3 py-2 text-xs text-slate-300">
        <span className="rounded-full bg-slate-800 px-2 py-1 font-medium uppercase tracking-wide">
          Önizleme
        </span>
        <Link href="/" className="underline underline-offset-2 hover:text-white">
          Ana sayfa
        </Link>
      </div>
      <iframe
        title="Kelime Yarışı Önizleme"
        src={`/preview/kelime-yarisi/content?token=${encodeURIComponent(token)}`}
        sandbox="allow-scripts"
        className="w-full flex-1 border-0"
        style={{ minHeight: "calc(100dvh - 2.5rem)" }}
      />
    </main>
  );
}
