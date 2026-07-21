import { ASSIGNMENT_EXERCISE_BY_SLUG } from "@/lib/assignments/exerciseCatalog";
import { categories as panelCategories, type Category } from "@/components/student-panel-preview/data";

export type PreviewExerciseCard = {
  slug: string;
  title: string;
  href: string;
  description: string;
  tags: string[];
};

export type PreviewExerciseGroup = {
  id: string;
  title: string;
  description: string;
  icon: Category["icon"];
  toneColor: string;
  href: string;
  exercises: PreviewExerciseCard[];
};

const CATEGORY_TONE_COLOR: Record<string, string> = {
  eye: "#38a9ff",
  "brain-exercises": "#ffae27",
  attention: "#ff4d80",
  focus: "#c94fff",
  "word-games": "#46dc74",
  fluency: "#31def6",
  assessment: "#778cff",
  memory: "#fb7185",
};

const CATEGORY_DESCRIPTIONS: Record<string, string> = {
  eye: "Göz takibi, kas kontrolü ve göz-beyin koordinasyonunu güçlendiren çalışmalar.",
  attention: "Görsel algı, hızlı fark etme ve seçici dikkati destekleyen çalışmalar.",
  fluency: "Okuma alanını genişleten, metin takibini ve akıcılığı geliştiren çalışmalar.",
  focus: "Dikkati sürdürme, hedefe odaklanma ve hızlı karar verme becerilerini geliştirir.",
  "brain-exercises": "Dikkat, tepki hızı ve zihinsel esnekliği güçlendiren çalışmalar.",
  "word-games": "Kelime bilgisi, hafıza ve hızlı karar verme becerilerini destekler.",
  assessment: "Okuma hızını ve anlama performansını birlikte değerlendirir.",
  memory: "Görsel hafıza, eşleştirme ve parça-bütün algısını geliştiren çalışmalar.",
};

const CATEGORY_EXERCISE_SLUGS: Record<string, string[]> = {
  eye: ["goz-beyin", "goz-kaslari", "goz-calismasi"],
  attention: ["takistoskop", "benzer-kelimeler", "kelime-bulma", "goz-egzersizleri-kolonlar", "kare-gorme-alani"],
  fluency: ["blok-okuma", "golgeleme", "odakli-okuma", "gruplama-calismasi"],
  focus: ["cift-tarafli-odak", "harf-rakam-sayma", "ayni-olani-yakala", "sayi-tablosu"],
  "brain-exercises": ["renk-uyumu", "yeni-karti-bul"],
  "word-games": ["kelime-tahmin", "adam-asmaca", "gorsel-puzzle", "dikkat-labirenti"],
  assessment: ["anlama-testi"],
  memory: ["kart-hafiza", "kart-eslestirme", "parcali-resim-kelime"],
};

const EXERCISE_CARD_TEXT: Record<string, { description: string; tags: string[] }> = {
  "goz-beyin": { description: "Simgeleri gözlerinle takip ederek göz-beyin koordinasyonunu geliştir.", tags: ["Takip", "Koordinasyon"] },
  "goz-kaslari": { description: "Noktasal takip çalışmalarıyla göz kaslarını ve odak sürekliliğini destekle.", tags: ["Göz", "Odak"] },
  "goz-calismasi": { description: "Kısa tekrarlarla göz kaslarını ısındıran temel takip çalışması.", tags: ["Göz", "Isınma"] },
  takistoskop: { description: "Kısa süreli kelime gösterimiyle algı hızını geliştir.", tags: ["Algı", "Hız"] },
  "benzer-kelimeler": { description: "Benzer kelimeleri karşılaştır ve aralarındaki farkı hızlı yakala.", tags: ["Ayırt Etme", "Dikkat"] },
  "kelime-bulma": { description: "Metin içindeki hedef kelimeyi hızla tara ve bul.", tags: ["Tarama", "Kelime"] },
  "goz-egzersizleri-kolonlar": { description: "Farklı kelimeleri kolonlar boyunca ritmik göz hareketleriyle takip et.", tags: ["Göz Hareketi", "Ritim"] },
  "kare-gorme-alani": { description: "Merkeze odaklanırken çevredeki iki harfi karşılaştırarak görme alanını genişlet.", tags: ["Görme Alanı", "Odak"] },
  "blok-okuma": { description: "Kelimeleri bloklar halinde görerek okuma alanını genişlet.", tags: ["Okuma", "Ritim"] },
  golgeleme: { description: "Aktif kelime gruplarını takip ederek ritimli okuma alışkanlığı kazan.", tags: ["Takip", "Ritim"] },
  "odakli-okuma": { description: "Seçilen metni odak alanında kelime grupları halinde oku.", tags: ["Odak", "Metin"] },
  "gruplama-calismasi": { description: "Kelime gruplarını tek bakışta algılayarak okuma alanını geliştir.", tags: ["Gruplama", "Okuma Alanı"] },
  "cift-tarafli-odak": { description: "İki tarafı aynı anda takip ederek karar verme hızını güçlendir.", tags: ["Odak", "Hız"] },
  "harf-rakam-sayma": { description: "Dağınık karakterler arasından hedef harf veya rakamı hızla say.", tags: ["Sayma", "Odak"] },
  "ayni-olani-yakala": { description: "Arka arkaya aynı gelen öğeyi yakala; dikkat ve tepki hızını güçlendir.", tags: ["Dikkat", "Tepki"] },
  "sayi-tablosu": { description: "Sayıları doğru sırayla bularak görsel tarama becerini geliştir.", tags: ["Sayı", "Tarama"] },
  "renk-uyumu": { description: "Yazının anlamına değil rengine odaklanarak zihinsel esnekliği geliştir.", tags: ["Dikkat", "Tepki"] },
  "yeni-karti-bul": { description: "Kartları hafızanda tut ve sonraki ekranda yeni eklenen kartı bul.", tags: ["Hafıza", "Dikkat"] },
  "kelime-tahmin": { description: "Gizli kelimeyi tahmin ederek kelime farkındalığını geliştir.", tags: ["Kelime", "Tahmin"] },
  "adam-asmaca": { description: "Gizli kelimeyi harf tahminleriyle bul, kelime hafızanı güçlendir.", tags: ["Hafıza", "Kelime"] },
  "gorsel-puzzle": { description: "Parçalara ayrılmış görselleri tamamlayarak parça-bütün algını geliştir.", tags: ["Puzzle", "Görsel"] },
  "dikkat-labirenti": { description: "Yolu gözlerinle takip et, doğru çıkışı bularak dikkatini güçlendir.", tags: ["Takip", "Odak"] },
  "anlama-testi": { description: "Metni oku, hızını ölç ve sorularla anlama oranını gör.", tags: ["Anlama", "Hız"] },
  "kart-hafiza": { description: "Gördüğün kartları aklında tut, tekrar edeni doğru seç.", tags: ["Hafıza", "Odak"] },
  "kart-eslestirme": { description: "Aynı görselleri bularak görsel hafızanı güçlendir.", tags: ["Eşleştirme", "Hafıza"] },
  "parcali-resim-kelime": { description: "Parçalı görseli tamamlayarak kelime ve görsel hafızanı birlikte çalıştır.", tags: ["Hafıza", "Görsel"] },
};

const FALLBACK_ROUTE_BY_SLUG: Record<string, { title: string; route: string }> = {
  "sayi-tablosu": { title: "Sayı Tablosu", route: "/egzersizler/sayi-tablosu" },
  "yeni-karti-bul": { title: "Yeni Kartı Bul", route: "/egzersizler/yeni-karti-bul" },
};

function buildExerciseCard(slug: string): PreviewExerciseCard | null {
  const catalogEntry = ASSIGNMENT_EXERCISE_BY_SLUG.get(slug);
  const fallback = FALLBACK_ROUTE_BY_SLUG[slug];
  const title = catalogEntry?.title ?? fallback?.title;
  const href = catalogEntry?.route ?? fallback?.route;
  const text = EXERCISE_CARD_TEXT[slug];

  if (!title || !href || !text) {
    return null;
  }

  return { slug, title, href, description: text.description, tags: text.tags };
}

export const PREVIEW_EXERCISE_GROUPS: PreviewExerciseGroup[] = panelCategories.map((category) => {
  const slugs = CATEGORY_EXERCISE_SLUGS[category.id] ?? [];
  const exercises = slugs
    .map((slug) => buildExerciseCard(slug))
    .filter((card): card is PreviewExerciseCard => card !== null);

  return {
    id: category.id,
    title: category.title,
    description: CATEGORY_DESCRIPTIONS[category.id] ?? category.title,
    icon: category.icon,
    toneColor: CATEGORY_TONE_COLOR[category.id] ?? "#38a9ff",
    href: category.href,
    exercises,
  };
});

export const DEFAULT_PREVIEW_GROUP_ID = PREVIEW_EXERCISE_GROUPS[0]?.id ?? "eye";

export function resolvePreviewGroupId(value: string | null): string {
  if (value && PREVIEW_EXERCISE_GROUPS.some((group) => group.id === value)) {
    return value;
  }

  return DEFAULT_PREVIEW_GROUP_ID;
}
