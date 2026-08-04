import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Kelime Yarisi onizleme prototipi calisma aninda diskten okunuyor; dosya
  // `public/` altinda olmadigi icin serverless bundle'a acikca dahil edilmeli.
  outputFileTracingIncludes: {
    "/preview/kelime-yarisi/content": ["src/private-previews/kelime-yarisi.html"],
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
