import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Kelime Yarisi ve Hafiza Yarisi HTML'leri calisma aninda diskten okunuyor;
  // dosyalar `public/` altinda olmadigi icin serverless bundle'a acikca dahil
  // edilmeli (aksi halde local calisir, Vercel'de 500 doner).
  outputFileTracingIncludes: {
    "/egzersizler/kelime-yarisi/oyun": ["src/exercise-assets/kelime-yarisi.html"],
    "/preview/kelime-yarisi/content": ["src/exercise-assets/kelime-yarisi.html"],
    "/egzersizler/hafiza-yarisi/oyun": ["src/exercise-assets/hafiza-yarisi.html"],
  },
  async headers() {
    return [
      {
        source: "/preview/:path*",
        headers: [
          { key: "X-Robots-Tag", value: "noindex, nofollow, noarchive" },
          { key: "Cache-Control", value: "no-store, max-age=0, must-revalidate" },
        ],
      },
    ];
  },
};

export default nextConfig;
