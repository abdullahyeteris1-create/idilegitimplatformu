export type FocusedReadingCategory =
  | "Bilim"
  | "Biyografi"
  | "Coğrafya"
  | "Edebiyat"
  | "Genel Kültür"
  | "Hikayeler"
  | "Hikayeler Uzun"
  | "İlkokul Hikayeleri"
  | "Makaleler"
  | "Ortaokul Hikayeleri"
  | "Romanlar"
  | "Spor"
  | "Tarih"
  | "Yaşam";

export type FocusedReadingText = {
  id: string;
  title: string;
  category: FocusedReadingCategory;
  text: string;
};

export const FOCUSED_READING_CATEGORIES: FocusedReadingCategory[] = [
  "Bilim",
  "Biyografi",
  "Coğrafya",
  "Edebiyat",
  "Genel Kültür",
  "Hikayeler",
  "Hikayeler Uzun",
  "İlkokul Hikayeleri",
  "Makaleler",
  "Ortaokul Hikayeleri",
  "Romanlar",
  "Spor",
  "Tarih",
  "Yaşam",
];

export const FOCUSED_READING_TEXTS: FocusedReadingText[] = [
  {
    id: "bilim-01",
    title: "Beynin Odak Ritmi",
    category: "Bilim",
    text: "Odakli okuma sirasinda beyin dikkatini kisa bilgi parcalarinda toplar. Gozler yalnizca gerekli kelime grubunu izlediginde gereksiz uyaranlar azalir. Bu tekrarlar okuma ritmini, algi hizini ve zihinsel esnekligi guclendirir.",
  },
  {
    id: "biyografi-01",
    title: "Azimli Bir Arastirmaci",
    category: "Biyografi",
    text: "Kucuk yaslarda kitaplara merak duyan arastirmaci her gun yeni bir soru sormayi aliskanlik haline getirdi. Yillar sonra yaptigi calismalarda sabirli gozlemin ve duzenli not tutmanin basaridaki payini anlatti.",
  },
  {
    id: "cografya-01",
    title: "Akarsularin Yolculugu",
    category: "Coğrafya",
    text: "Akarsular daglardan dogar, vadilerden ilerler ve ovalara can verir. Tasidiklari mineraller topragi beslerken cevredeki yasami da sekillendirir. Bu yolculuk doga icin sessiz ama guclu bir dongudur.",
  },
  {
    id: "edebiyat-01",
    title: "Kelimelerin Izinde",
    category: "Edebiyat",
    text: "Bir metni anlamak yalnizca kelimeleri okumak degildir. Yazar secilen her cumleyle okurun zihninde yeni bir pencere acar. Dikkatli okur bu pencerelerden gecerek anlamin derinligine ulasir.",
  },
  {
    id: "genel-kultur-01",
    title: "Gunluk Bilgi",
    category: "Genel Kültür",
    text: "Genel kultur farkli alanlardan gelen bilgileri bir araya getirir. Bilim, sanat, tarih ve spor hakkinda kisa okumalar yapmak dusunmeyi zenginlestirir. Duzenli okuma meraki canli tutar.",
  },
  {
    id: "hikayeler-01",
    title: "Kirmizi Defter",
    category: "Hikayeler",
    text: "Elif eski bir cekmecede kirmizi kapakli bir defter buldu. Defterin ilk sayfasinda yarim kalmis bir harita vardi. Haritayi takip ettikce evin bahcesindeki sakli kutuya yaklasti.",
  },
  {
    id: "hikayeler-uzun-01",
    title: "Sessiz Kutuphane",
    category: "Hikayeler Uzun",
    text: "Kutuphane her cuma aksami biraz daha sessiz olurdu. Deniz raflar arasinda dolasirken eski bir ansiklopedinin icinden dusen notu fark etti. Notta bir kitabın sayfa numarasi yaziyordu. Sayfayi actiginda kasabanin unutulmus saat kulesiyle ilgili ilginc bir ipucu buldu. Ertesi gun arkadaslariyla kuleye gidip gecmisin izlerini aramaya karar verdi.",
  },
  {
    id: "ilkokul-01",
    title: "Okul Bahcesi",
    category: "İlkokul Hikayeleri",
    text: "Teneffus zili calinca cocuklar bahceye cikti. Ali topunu getirdi, Zeynep ip atladi. Kisa mola bitince herkes gulumseyerek sinifina dondu.",
  },
  {
    id: "makaleler-01",
    title: "Dikkatli Calisma",
    category: "Makaleler",
    text: "Verimli calisma icin kisa hedefler belirlemek onemlidir. Her hedef tamamlandiginda kucuk bir mola vermek zihnin toparlanmasina yardim eder. Bu yontem ogrenme surecini daha duzenli hale getirir.",
  },
  {
    id: "ortaokul-01",
    title: "Bilim Sergisi",
    category: "Ortaokul Hikayeleri",
    text: "Ogrenciler bilim sergisi icin takimlara ayrildi. Her takim basit bir deney hazirladi ve sonucunu posterle anlatti. Sunum gunu herkes birbirinin projesinden yeni bir sey ogrendi.",
  },
  {
    id: "romanlar-01",
    title: "Yolun Baslangici",
    category: "Romanlar",
    text: "Sabah sisinin icinden gecen yol kasabanin disina uzaniyordu. Mert cantasini omzuna alip ilk adimi atti. Onu bekleyen yolculugun hangi sorulara cevap verecegini henuz bilmiyordu.",
  },
  {
    id: "spor-01",
    title: "Antrenman Disiplini",
    category: "Spor",
    text: "Basarili sporcular yalnizca mac gunu degil, her antrenmanda dikkatli calisir. Isinma, tekrar ve dinlenme dengesi performansi belirler. Duzenli emek zamanla guvenli harekete donusur.",
  },
  {
    id: "tarih-01",
    title: "Eski Yollar",
    category: "Tarih",
    text: "Tarih boyunca ticaret yollari sehirlerin gelismesini sagladi. Kervanlar yalnizca esya degil, bilgi ve kultur de tasidi. Bu yollar toplumlar arasinda kalici baglar kurdu.",
  },
  {
    id: "yasam-01",
    title: "Kucuk Aliskanliklar",
    category: "Yaşam",
    text: "Gune sakin baslamak gunun geri kalanini etkiler. Kisa bir plan yapmak, su icmek ve derin nefes almak zihni toplar. Kucuk aliskanliklar buyuk degisimlerin temelini olusturur.",
  },
];
