import type { Metadata } from "next";
import Link from "next/link";
import { Icon } from "@/components/student-panel-preview/icons";
import styles from "./mentalArithmetic.module.css";

export const metadata: Metadata = { title: "Mental Aritmetik | İDİL Hızlı Okuma", description: "Hızlı düşünme ve işlem becerilerini geliştiren mental aritmetik çalışmaları." };

const games = [
  { slug: "hedef-toplam", title: "Hedef Toplam", description: "Sayı kartlarını seçerek hedef toplamı zihinden bul.", tags: ["Toplama", "Dikkat"], level: "Başlangıç · İleri · Usta · Uzman", icon: "target" as const },
  { slug: "zincir-islem", title: "Zincir İşlem", description: "İşlem zincirini takip et ve son sonucu hızlıca hesapla.", tags: ["İşlem Takibi", "Hız"], level: "Başlangıç · İleri · Usta · Uzman", icon: "activity" as const },
  { slug: "para-kasasi", title: "Para Kasası", description: "Market, para üstü ve bütçe görevlerini zihinden çöz.", tags: ["Para", "Problem Çözme"], level: "Başlangıç · İleri · Usta · Uzman", icon: "calculator" as const },
  { slug: "hazine-kasasi", title: "Hazine Kasası", description: "İşlemi çöz, şifreyi gir ve hız bonuslarıyla kasayı aç.", tags: ["Zihinden İşlem", "Seri"], level: "Başlangıç · Orta · Zor · Usta", icon: "lock" as const },
];

export default function MentalArithmeticPage() {
  return <main className={styles.page}><div className={styles.shell}><Link className={styles.back} href="/egzersizler">← Egzersiz merkezine dön</Link><header className={styles.hero}><span className={styles.eyebrow}>Mental Aritmetik</span><h1>Hızlı düşün, doğru hesapla.</h1><p>Hızlı düşünme, işlem becerisi, dikkat ve problem çözme gücünü eğlenceli çalışmalarla geliştir.</p></header><section className={styles.grid} aria-label="Mental aritmetik çalışmaları">{games.map((game) => <article className={styles.card} key={game.slug}><div><span className={styles.icon}><Icon name={game.icon}/></span><h2>{game.title}</h2><p>{game.description}</p><div className={styles.tags}>{game.tags.map((tag) => <span className={styles.tag} key={tag}>{tag}</span>)}</div><div className={styles.meta}>{game.level}</div></div><Link className={styles.button} href={`/egzersizler/mental-aritmetik/${game.slug}`}>Başla <span aria-hidden="true">→</span></Link></article>)}</section></div></main>;
}
