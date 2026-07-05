export type ReadingQuestion = {
  id: string;
  question: string;
  options: string[];
  correctAnswerIndex: number;
};

export type ReadingComprehensionText = {
  id: string;
  category: string;
  title: string;
  text: string;
  questions: ReadingQuestion[];
};

export const READING_COMPREHENSION_TEXTS: ReadingComprehensionText[] = [
  {
    id: "ilkokul-ormanlarin-onemi",
    category: "Ilkokul",
    title: "Ormanlarin Onemi",
    text: "Ormanlar, dogadaki en degerli yasam alanlarindan biridir. Agaclar havayi temizler, hayvanlara yuva olur ve insanlara serin bir ortam sunar. Bir ormanda kuslar, sincaplar, karincalar ve daha pek cok canli birlikte yasar. Ormanlar yagmur sularinin toprakta tutulmasina da yardim eder. Bu sayede seller azalir ve toprak daha verimli kalir. Insanlar ormanda yuruyus yapabilir, temiz hava alabilir ve dogayi daha yakindan taniyabilir. Ancak ormanlari korumak icin dikkatli olmak gerekir. Copleri yere atmamak, ates yakmamak ve fidan dikmek ormanlara yardim eder. Her cocuk, dogaya saygili davranarak ormanlarin gelecegini koruyabilir.",
    questions: [
      { id: "q1", question: "Ormanlar havaya nasil yardim eder?", options: ["Havayi temizler", "Havayi karartir", "Havayi kurutur", "Havayi saklar"], correctAnswerIndex: 0 },
      { id: "q2", question: "Metne gore ormanda hangi canlilar yasar?", options: ["Sadece baliklar", "Kuslar ve sincaplar", "Yalniz insanlar", "Sadece kediler"], correctAnswerIndex: 1 },
      { id: "q3", question: "Ormanlar yagmur sulari icin ne yapar?", options: ["Toprakta tutulmasina yardim eder", "Tamamen yok eder", "Denize firlatir", "Rengini degistirir"], correctAnswerIndex: 0 },
      { id: "q4", question: "Ormani korumak icin hangisi yapilmalidir?", options: ["Copleri yere atmak", "Ates yakmak", "Fidan dikmek", "Dallari kirmak"], correctAnswerIndex: 2 },
      { id: "q5", question: "Metnin ana dusuncesi nedir?", options: ["Ormanlar korunmalidir", "Ormanlar gereksizdir", "Hayvanlar sehirde yasamalidir", "Yagmur zarar verir"], correctAnswerIndex: 0 },
    ],
  },
  {
    id: "ortaokul-zaman-yonetimi",
    category: "Ortaokul",
    title: "Zaman Yonetimi",
    text: "Zaman yonetimi, gun icindeki isleri daha planli yapabilme becerisidir. Ogrenciler icin bu beceri ders calisma, dinlenme ve sosyal etkinlikler arasinda denge kurmayi kolaylastirir. Plansiz calisan bir ogrenci, onemli odevleri son ana birakabilir ve gereksiz stres yasayabilir. Oysa kisa bir gunluk plan, hangi isin ne zaman yapilacagini gosterir. Plan hazirlarken en zor gorevleri zihnin daha dinck oldugu saatlere koymak yararlidir. Ayrica her calisma arasina kisa molalar eklemek dikkati taze tutar. Zamanini iyi kullanan ogrenci daha az yorulur, daha duzenli ilerler ve basarilarini daha kolay fark eder.",
    questions: [
      { id: "q1", question: "Zaman yonetimi neyi kolaylastirir?", options: ["Isleri planli yapmayi", "Dersleri unutmayi", "Sureyi durdurmayi", "Kitaplari saklamayi"], correctAnswerIndex: 0 },
      { id: "q2", question: "Plansiz calisan ogrenci ne yasayabilir?", options: ["Daha cok tatil", "Gereksiz stres", "Daha az odev", "Surekli basari"], correctAnswerIndex: 1 },
      { id: "q3", question: "Zor gorevler hangi zamana konmalidir?", options: ["Zihin dinc oldugunda", "Uykudan hemen once", "Yemek sirasinda", "Plansiz bir saate"], correctAnswerIndex: 0 },
      { id: "q4", question: "Molalar ne ise yarar?", options: ["Dikkati taze tutar", "Odevleri siler", "Zamani cogaltir", "Konuyu zorlastirir"], correctAnswerIndex: 0 },
      { id: "q5", question: "Metne gore zamanini iyi kullanan ogrenci nasil ilerler?", options: ["Daha duzensiz", "Daha duzenli", "Daha yavas ve karisik", "Hic ilerlemez"], correctAnswerIndex: 1 },
    ],
  },
  {
    id: "genel-kultur-kutuphaneler",
    category: "Genel Kultur",
    title: "Kutuphaneler",
    text: "Kutuphaneler, bilginin duzenli bicimde saklandigi ve paylasildigi yerlerdir. Geleneksel kutuphanelerde kitaplar raflara konularak konu basliklarina gore siniflandirilir. Gunumuzde bircok kutuphane dijital kaynaklar da sunar. Bu sayede arastirma yapan kisiler makalelere, ansiklopedilere ve e-kitaplara daha hizli ulasabilir. Kutuphaneler yalnizca kitap odunc alinan yerler degildir; ayni zamanda sessiz calisma, okuma aliskanligi kazanma ve kultur etkinliklerine katilma alanlaridir. Bir kutuphaneyi etkili kullanmak icin katalog taramayi bilmek, kaynaklari dikkatle incelemek ve alinan materyalleri zamaninda iade etmek gerekir.",
    questions: [
      { id: "q1", question: "Kutuphaneler bilginin nasil saklandigi yerlerdir?", options: ["Duzensiz", "Duzenli", "Gizli", "Rastgele"], correctAnswerIndex: 1 },
      { id: "q2", question: "Gunumuz kutuphaneleri hangi kaynagi da sunar?", options: ["Dijital kaynaklar", "Sadece oyuncak", "Sadece yemek", "Sadece spor alani"], correctAnswerIndex: 0 },
      { id: "q3", question: "Kutuphanelerde hangi etkinlik yapilabilir?", options: ["Sessiz calisma", "Gurultulu oyun", "Kaynaklari yok etme", "Raflari bosaltma"], correctAnswerIndex: 0 },
      { id: "q4", question: "Katalog taramak ne icin onemlidir?", options: ["Kaynak bulmak", "Kitaplari saklamak", "Sureyi durdurmak", "Raflari boyamak"], correctAnswerIndex: 0 },
      { id: "q5", question: "Alinan materyaller ne zaman iade edilmelidir?", options: ["Zamaninda", "Asla", "Yillar sonra", "Kaybolunca"], correctAnswerIndex: 0 },
    ],
  },
  {
    id: "bilim-suyun-dongusu",
    category: "Bilim",
    title: "Suyun Dongusu",
    text: "Suyun dongusu, suyun yeryuzu ile atmosfer arasinda surekli hareket etmesidir. Gunes, denizlerdeki ve gollerdeki suyu isitinca buharlasma baslar. Su buhari yukselir, soguk hava katmanlarinda yogunlasir ve bulutlari olusturur. Bulutlardaki su damlaciklari agirlastiginda yagmur, kar veya dolu olarak yeryuzune iner. Yeryuzune inen suyun bir bolumu akarsulara ve denizlere karisir, bir bolumu ise topraga sizar. Bu surec dogadaki canlilar icin temiz suyun yenilenmesine yardim eder. Suyun dongusu olmasaydi, yasam icin gerekli su kaynaklari hizla azalirdi.",
    questions: [
      { id: "q1", question: "Buharlasma hangi etkiyle baslar?", options: ["Gunesin isitmasi", "Ay isigiyla", "Ruzgarin durmasiyla", "Topragin donmasiyla"], correctAnswerIndex: 0 },
      { id: "q2", question: "Su buhari soguk havada ne yapar?", options: ["Yogunlasir", "Kaybolur", "Tas olur", "Rengini degistirir"], correctAnswerIndex: 0 },
      { id: "q3", question: "Bulutlardaki damlaciklar agirlasinca ne olur?", options: ["Yagis olur", "Hicbir sey olmaz", "Gunes olur", "Toprak olur"], correctAnswerIndex: 0 },
      { id: "q4", question: "Yeryuzune inen suyun bir bolumu nereye sizar?", options: ["Topraga", "Gokyuzune", "Kitaplara", "Camurluga donusmeden kaybolur"], correctAnswerIndex: 0 },
      { id: "q5", question: "Suyun dongusu neye yardim eder?", options: ["Temiz suyun yenilenmesine", "Suyun tamamen bitmesine", "Bulutlarin yok olmasina", "Gunesin sogumasina"], correctAnswerIndex: 0 },
    ],
  },
  {
    id: "hikaye-kayip-anahtar",
    category: "Hikaye",
    title: "Kayip Anahtar",
    text: "Mina, okuldan eve geldiginde cantasinin kucuk cebindeki anahtari bulamadi. Once panikledi, sonra derin bir nefes alip gun boyunca nerelere gittigini dusundu. Sabah kutuphanede kitap degistirmis, teneffuste bahcede arkadaslariyla oturmus ve son derste resim sinifina gecmisti. Mina once bahceye baktirdi ama anahtar orada yoktu. Kutuphaneye gittiginde gorevli, masanin altinda kucuk bir anahtar bulduklarini soyledi. Mina anahtarini alinca cok sevindi. O gunden sonra cantasindaki onemli esyalari her zaman ayni bolmeye koymaya karar verdi.",
    questions: [
      { id: "q1", question: "Mina neyi kaybetti?", options: ["Anahtarini", "Defterini", "Ayakkabisini", "Kalemligini"], correctAnswerIndex: 0 },
      { id: "q2", question: "Mina once ne yapti?", options: ["Panikledi", "Uyudu", "Eve girdi", "Sarki soyledi"], correctAnswerIndex: 0 },
      { id: "q3", question: "Anahtar nerede bulunmustu?", options: ["Kutuphanede masanin altinda", "Bahcede agacta", "Resim sinifinda dolapta", "Serviste koltukta"], correctAnswerIndex: 0 },
      { id: "q4", question: "Mina hangi karar verdi?", options: ["Onemli esyalari ayni bolmeye koymak", "Cantayi hic kullanmamak", "Okula gitmemek", "Kitap okumamak"], correctAnswerIndex: 0 },
      { id: "q5", question: "Hikayede Mina nasil davrandi?", options: ["Dustu ve dusundu", "Sadece agladi", "Hic aramadi", "Anahtari atti"], correctAnswerIndex: 0 },
    ],
  },
  {
    id: "tarih-ipek-yolu",
    category: "Tarih",
    title: "Ipek Yolu",
    text: "Ipek Yolu, Asya ile Avrupa arasinda ticaret ve kultur alisverisini saglayan tarihi yollarin genel adidir. Bu yol uzerinde ipek, baharat, kagit, porselen ve degerli taslar tasinirdi. Kervanlar uzun yolculuklar yapar, konaklama yerlerinde dinlenir ve farkli toplumlarla temas kurardi. Ipek Yolu yalnizca mal tasimadi; fikirlerin, buluslarin, sanat anlayislarinin ve dillerin yayilmasina da katki sagladi. Yolun guvenli olmasi ticareti canlandirirken, savaslar ve siyasi karisikliklar ticareti zorlastirirdi. Bu nedenle Ipek Yolu, tarihte hem ekonomik hem de kulturel acidan buyuk oneme sahiptir.",
    questions: [
      { id: "q1", question: "Ipek Yolu hangi bolgeler arasindaydi?", options: ["Asya ve Avrupa", "Sadece Afrika", "Kuzey ve Guney Kutbu", "Ay ve Dunya"], correctAnswerIndex: 0 },
      { id: "q2", question: "Bu yolda hangisi tasinirdi?", options: ["Ipek ve baharat", "Sadece buz", "Sadece oyuncak", "Sadece su"], correctAnswerIndex: 0 },
      { id: "q3", question: "Kervanlar nerede dinlenirdi?", options: ["Konaklama yerlerinde", "Denizin altinda", "Bulutlarda", "Magarada zorunlu olarak"], correctAnswerIndex: 0 },
      { id: "q4", question: "Ipek Yolu neyin yayilmasina katki sagladi?", options: ["Fikirlerin ve buluslarin", "Sessizligin", "Karanligin", "Sadece yagmurun"], correctAnswerIndex: 0 },
      { id: "q5", question: "Savaslar ticareti nasil etkilerdi?", options: ["Zorlastirirdi", "Her zaman kolaylastirirdi", "Tamamen ilgisizdi", "Hizlandirirdi"], correctAnswerIndex: 0 },
    ],
  },
  {
    id: "yasam-saglikli-uyku",
    category: "Yasam",
    title: "Saglikli Uyku",
    text: "Saglikli uyku, bedenin ve zihnin yenilenmesi icin gereklidir. Yeterli uyku alan kisiler gune daha dikkatli, enerjik ve dengeli baslar. Uyku duzeni bozuldugunda odaklanma guclugu, cabuk yorulma ve unutkanlik gorulebilir. Daha iyi uyumak icin her gun benzer saatlerde yatmak, yatmadan once ekran suresini azaltmak ve odanin sessiz olmasina dikkat etmek yararlidir. Ayrica agir yemeklerden hemen sonra yatmamak ve gun icinde hareket etmek uyku kalitesini destekler. Uyku, yalnizca dinlenme degil, ogrenilen bilgilerin zihinde duzenlenmesi icin de onemli bir surectir.",
    questions: [
      { id: "q1", question: "Saglikli uyku ne icin gereklidir?", options: ["Beden ve zihin yenilenmesi", "Daha cok yorulmak", "Bilgileri silmek", "Daha az dikkat"], correctAnswerIndex: 0 },
      { id: "q2", question: "Yeterli uyku alan kisiler gune nasil baslar?", options: ["Daha dikkatli", "Daha karisik", "Daha uykusuz", "Daha sinirli olmak zorunda"], correctAnswerIndex: 0 },
      { id: "q3", question: "Uyku duzeni bozulursa ne olabilir?", options: ["Odaklanma guclugu", "Daha kolay ogrenme garanti olur", "Hic yorulmama", "Surekli enerji"], correctAnswerIndex: 0 },
      { id: "q4", question: "Yatmadan once ne azaltilmalidir?", options: ["Ekran suresi", "Sessizlik", "Duzen", "Temiz hava"], correctAnswerIndex: 0 },
      { id: "q5", question: "Uyku hangi bilgiler icin de onemlidir?", options: ["Ogrenilen bilgilerin duzenlenmesi", "Bilgilerin kaybolmasi", "Kitaplarin kapanmasi", "Sadece ruyalar"], correctAnswerIndex: 0 },
    ],
  },
];

export function getReadingComprehensionCategories(): string[] {
  return Array.from(new Set(READING_COMPREHENSION_TEXTS.map((item) => item.category)));
}

export function getReadingTextsByCategory(category: string): ReadingComprehensionText[] {
  return READING_COMPREHENSION_TEXTS.filter((item) => item.category === category);
}

export function getReadingTextById(textId: string): ReadingComprehensionText {
  return READING_COMPREHENSION_TEXTS.find((item) => item.id === textId) ?? READING_COMPREHENSION_TEXTS[0];
}
