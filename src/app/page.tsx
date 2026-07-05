import Link from "next/link";

export default function Home() {
  return (
    <div className="min-h-screen bg-[var(--background)]">
      <main className="idil-shell py-6 md:py-10">
        <section className="idil-card p-6 md:p-10">

          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[var(--brand)]">Idil Hizli Okuma</p>
          <h1 className="mt-3 max-w-3xl text-3xl font-extrabold leading-tight md:text-5xl">
            Ogrenci girisli, mobil uyumlu hizli okuma egzersiz platformu
          </h1>
          <p className="mt-4 max-w-2xl text-base leading-7 text-[var(--muted)] md:text-lg">
            Telefon, tablet ve bilgisayarda akici deneyim. Ilk egzersiz olarak Takistoskop ile hizli algi
            becerini olc, sonuc ekraninda performansini aninda gor.
          </p>

          <div className="mt-8 grid gap-3 sm:grid-cols-2 lg:flex lg:flex-wrap">
            <Link
              href="/giris"
              className="w-full rounded-2xl border border-red-900/30 bg-[var(--brand)] px-5 py-4 text-center text-base font-bold text-white shadow-md shadow-red-200 transition hover:bg-[var(--brand-strong)] lg:w-auto"
            >
              Ogrenci Girisi
            </Link>
            <Link
              href="/egzersizler"
              className="w-full rounded-2xl border border-red-200 bg-white px-5 py-4 text-center text-base font-bold text-red-800 transition hover:bg-red-50 lg:w-auto"
            >
              Egzersizleri Gor
            </Link>
            <Link
              href="/ogretmen"
              className="w-full rounded-2xl border border-red-200 bg-white px-5 py-4 text-center text-base font-bold text-red-800 transition hover:bg-red-50 lg:w-auto"
            >
              Ogretmen Paneli Taslagi
            </Link>
          </div>

          <div className="mt-8 grid gap-3 md:grid-cols-3">
            {[
              "Mobil oncelikli arayuz",
              "Egzersiz mantigi UI'dan bagimsiz",
              "Supabase/PostgreSQL'e uygun genisleyebilir yapi",
            ].map((item) => (
              <article key={item} className="rounded-2xl border border-red-100 bg-red-50 p-4 text-sm font-semibold text-slate-700">
                {item}
              </article>
            ))}
          </div>
        </section>
      </main>
    </div>
  );
}
