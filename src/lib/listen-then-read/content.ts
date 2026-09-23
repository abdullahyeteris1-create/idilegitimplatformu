export type ListenThenReadGrade = 1 | 2 | 3 | 4;

export type ListenThenReadQuestion = {
  id: string;
  question: string;
  options: string[];
  correctAnswer: number;
};

export type ListenThenReadPassage = {
  id: string;
  title: string;
  grade: ListenThenReadGrade;
  paragraphs: string[];
  comprehensionQuestions: ListenThenReadQuestion[];
};

export const LISTEN_THEN_READ_GRADES: ListenThenReadGrade[] = [1, 2, 3, 4];

export const LISTEN_THEN_READ_PASSAGES: ListenThenReadPassage[] = [
  {
    id: "bahcedeki-kucuk-kutu",
    title: "Bahçedeki Küçük Kutu",
    grade: 1,
    paragraphs: [
      "Ada sabah bahçeye çıktı. Çimenlerin yanında küçük bir kutu gördü. Kutunun kapağını açınca içinde renkli düğmeler vardı. Ada düğmeleri hemen almadı. Önce kutunun sahibini bulmak için annesine haber verdi.",
      "Biraz sonra komşuları geldi. Düğmeleri torunlarının kaybettiğini söyledi. Ada kutuyu ona verdi. Komşuları teşekkür edince Ada çok sevindi. O gün, bulunan eşyayı sahibine teslim etmenin güzel bir davranış olduğunu öğrendi.",
    ],
    comprehensionQuestions: [
      { id: "bahcedeki-kucuk-kutu-1", question: "Ada bahçede ne gördü?", options: ["Küçük bir kutu", "Büyük bir top", "Sarı bir şemsiye"], correctAnswer: 0 },
      { id: "bahcedeki-kucuk-kutu-2", question: "Kutunun içinde ne vardı?", options: ["Taşlar", "Renkli düğmeler", "Elmalar"], correctAnswer: 1 },
      { id: "bahcedeki-kucuk-kutu-3", question: "Ada kutuyu kime verdi?", options: ["Komşusuna", "Öğretmenine", "Kardeşine"], correctAnswer: 0 },
    ],
  },
  {
    id: "ruzgarli-gun",
    title: "Rüzgârlı Gün",
    grade: 1,
    paragraphs: [
      "Mina, okuldan sonra uçurtmasını parka götürdü. Gökyüzünde beyaz bulutlar vardı. Rüzgâr başlayınca uçurtma yavaşça yükseldi. Mina ipi iki eliyle tuttu ve ağaca yaklaşınca uçurtmayı aşağı indirdi.",
      "Sonra arkadaşlarıyla birlikte çimenlere oturdu. Uçurtmanın kuyruğundaki kırmızı kurdeleleri izlediler. Eve dönmeden önce parkta bıraktıkları kâğıtları topladılar. Mina, rüzgârlı bir günde hem oyun oynamış hem de parka iyi bakmış oldu.",
    ],
    comprehensionQuestions: [
      { id: "ruzgarli-gun-1", question: "Mina parka ne götürdü?", options: ["Uçurtmasını", "Bisikletini", "Kitabını"], correctAnswer: 0 },
      { id: "ruzgarli-gun-2", question: "Mina uçurtmayı ne zaman aşağı indirdi?", options: ["Yağmur başlayınca", "Ağaca yaklaşınca", "Eve gelince"], correctAnswer: 1 },
      { id: "ruzgarli-gun-3", question: "Çocuklar eve dönmeden önce ne yaptı?", options: ["Kurdele kesti", "Kâğıtları topladı", "Uçurtmayı sattı"], correctAnswer: 1 },
    ],
  },
  {
    id: "okulun-tohum-kosesi",
    title: "Okulun Tohum Köşesi",
    grade: 2,
    paragraphs: [
      "Sınıfın pencere kenarında boş bir köşe vardı. Öğretmen bu köşeyi küçük bir bitki alanına çevirmeyi önerdi. Öğrenciler önce saksıları temizledi. Sonra fasulye, nane ve ayçiçeği tohumlarını ayrı saksılara yerleştirdiler. Her saksıya bitkinin adını yazan bir etiket taktılar.",
      "Çocuklar görev çizelgesi hazırladı. Her gün iki öğrenci toprağı kontrol ediyor, gerekirse az miktarda su veriyordu. Bir hafta sonra fasulye filizlendi. Öğrenciler filizin ışığa doğru uzandığını fark etti. Saksıyı ara sıra çevirerek bitkinin her yanının güneş almasını sağladılar.",
    ],
    comprehensionQuestions: [
      { id: "okulun-tohum-kosesi-1", question: "Öğrenciler saksılara neden etiket taktı?", options: ["Saksıları taşımak için", "Bitkinin adını göstermek için", "Toprağı ölçmek için"], correctAnswer: 1 },
      { id: "okulun-tohum-kosesi-2", question: "Her gün kaç öğrenci toprağı kontrol etti?", options: ["İki", "Dört", "On"], correctAnswer: 0 },
      { id: "okulun-tohum-kosesi-3", question: "Saksıyı çevirmelerinin amacı neydi?", options: ["Bitkinin her yanının güneş alması", "Saksının boş kalması", "Etiketin düşmesi"], correctAnswer: 0 },
    ],
  },
  {
    id: "pazar-yeri-listesi",
    title: "Pazar Yeri Listesi",
    grade: 2,
    paragraphs: [
      "Can, cumartesi günü babasıyla pazara gitti. Evden çıkmadan önce annesi bir alışveriş listesi hazırladı. Listede domates, salatalık, elma ve yoğurt vardı. Can listeyi cebine koydu, fakat pazarda kalabalık artınca babasına yakın yürümeye dikkat etti.",
      "Önce sebzeleri, sonra meyveleri aldılar. Can her ürünü aldıktan sonra listede yanına küçük bir işaret koydu. Yoğurt için süt ürünleri bölümüne gittiler. Eve dönerken listedeki her şeyi aldıklarını kontrol ettiler. Can, planlı alışverişin işleri kolaylaştırdığını söyledi.",
    ],
    comprehensionQuestions: [
      { id: "pazar-yeri-listesi-1", question: "Alışveriş listesini kim hazırladı?", options: ["Can", "Can'ın annesi", "Pazarcı"], correctAnswer: 1 },
      { id: "pazar-yeri-listesi-2", question: "Can kalabalıkta neye dikkat etti?", options: ["Babasıyla yakın yürümeye", "Koşmaya", "Listesini çöpe atmaya"], correctAnswer: 0 },
      { id: "pazar-yeri-listesi-3", question: "Can ürünleri aldıktan sonra ne yaptı?", options: ["Listeye işaret koydu", "Ürünleri geri verdi", "Eve tek başına gitti"], correctAnswer: 0 },
    ],
  },
  {
    id: "su-koruyan-okul",
    title: "Suyu Koruyan Okul",
    grade: 3,
    paragraphs: [
      "Okulun bahçesindeki musluklardan biri bazen tam kapanmıyordu. Nöbetçi öğrenciler yerde küçük bir su birikintisi fark etti. Durumu öğretmenlerine anlattılar. Öğretmen, suyun boşa akmasının hem doğaya hem de okulun bütçesine zarar verebileceğini söyledi. Birlikte musluğun yanına hatırlatıcı bir kart astılar. Kartı gören herkes musluğu kontrol etmeyi hatırladı.",
      "Ertesi gün görevli musluğu onardı. Öğrenciler de sınıflarda yeni bir su tasarrufu çalışması başlattı. Ellerini sabunlarken musluğu gereksiz yere açık bırakmamaya karar verdiler. Bahçedeki bitkileri sulamak için yağmur suyunun biriktirilebileceğini araştırdılar. Küçük önlemlerin zamanla büyük bir fark oluşturduğunu birlikte ve dikkatle hep birlikte gördüler.",
    ],
    comprehensionQuestions: [
      { id: "su-koruyan-okul-1", question: "Öğrenciler bahçede ne fark etti?", options: ["Kırık bir bank", "Su birikintisi", "Yeni bir çiçek"], correctAnswer: 1 },
      { id: "su-koruyan-okul-2", question: "Musluğun yanına ne astılar?", options: ["Bir harita", "Bir hatırlatıcı kart", "Bir oyuncak"], correctAnswer: 1 },
      { id: "su-koruyan-okul-3", question: "Öğrenciler yağmur suyunu ne için araştırdı?", options: ["Biriktirip kullanmak için", "Sokağı yıkamak için", "Musluğu boyamak için"], correctAnswer: 0 },
    ],
  },
  {
    id: "haritanin-sirri",
    title: "Haritanın Sırrı",
    grade: 3,
    paragraphs: [
      "Elif, dedesinin eski sandığında küçük bir mahalle haritası buldu. Haritanın üzerinde okul, park ve dere mavi kalemle işaretlenmişti. Dedesine sorunca haritanın yıllar önce mahalledeki ağaçları incelemek için hazırlandığını öğrendi. Elif, bugün hangi ağaçların hâlâ yaşadığını merak etti.",
      "Ertesi hafta arkadaşı Bora ile aynı yolu yürüdüler. Haritadaki işaretleri kontrol ederken yaşlı çınarın yanına yeni bir fidan dikildiğini gördüler. Fidanın çevresinde koruyucu bir çit vardı. Elif gözlemlerini defterine yazdı. Bora da fidanın çevresindeki toprağın nemini dikkatle inceledi. Dedesine göre eski bir harita, geçmişi anlamaya ve bugünü dikkatle incelemeye yardımcı olabilirdi. Bora bu fikri çok ilginç buldu.",
    ],
    comprehensionQuestions: [
      { id: "haritanin-sirri-1", question: "Elif haritayı nerede buldu?", options: ["Okul çantasında", "Dedesinin sandığında", "Parkta"], correctAnswer: 1 },
      { id: "haritanin-sirri-2", question: "Harita geçmişte ne için hazırlanmıştı?", options: ["Ağaçları incelemek için", "Yol yarışı yapmak için", "Evleri boyamak için"], correctAnswer: 0 },
      { id: "haritanin-sirri-3", question: "Elif gözlemlerini nereye yazdı?", options: ["Defterine", "Taşın üzerine", "Haritanın arkasına"], correctAnswer: 0 },
    ],
  },
  {
    id: "sessiz-kutuphanenin-sesi",
    title: "Sessiz Kütüphanenin Sesi",
    grade: 4,
    paragraphs: [
      "Okul kütüphanesinde yeni bir okuma köşesi hazırlanıyordu. Öğrenciler raflardaki kitapları türlerine göre ayırdı. Görevli, kitapları yalnızca kapaklarına bakarak değil, içlerindeki konu ve yaş bilgilerini okuyarak yerleştirmelerini istedi. Böylece aranan kitabı bulmak kolaylaşacaktı. Pencere kenarına da rahat bir sandalye kondu. Sandalyenin yanına kitapları taşımak için küçük bir sepet yerleştirildi. Köşeye sessizce okunacak kitaplar için ayrı bir raf eklendi. Rafın üzerine yaş gruplarını gösteren küçük bir etiket kondu.",
      "Zeynep, okuma köşesi için kısa bir kullanım listesi yazdı. Kitap seçerken ellerin temiz olması, sayfaların kıvrılmaması ve okuma bitince kitabın yerine bırakılması gerekiyordu. Listeyi herkesin görebileceği bir panoya astı. Birkaç gün sonra öğrenciler kitapları daha düzenli kullanmaya başladı. Kütüphane sessiz kaldı, fakat okuyanların merakı her gün biraz daha büyüdü.",
    ],
    comprehensionQuestions: [
      { id: "sessiz-kutuphanenin-sesi-1", question: "Öğrenciler kitapları neye göre ayırdı?", options: ["Türlerine göre", "Renklerine göre", "Ağırlıklarına göre"], correctAnswer: 0 },
      { id: "sessiz-kutuphanenin-sesi-2", question: "Görevli kitapları yerleştirirken neyi okumalarını istedi?", options: ["İçlerindeki konu ve yaş bilgilerini", "Yalnızca fiyatlarını", "Rafların numarasını"], correctAnswer: 0 },
      { id: "sessiz-kutuphanenin-sesi-3", question: "Zeynep kullanım listesini nereye astı?", options: ["Pencereye", "Panoya", "Sandalye altına"], correctAnswer: 1 },
    ],
  },
  {
    id: "yolculuk-eden-tohum",
    title: "Yolculuk Eden Tohum",
    grade: 4,
    paragraphs: [
      "Bir sonbahar günü, akçaağaç ağacının kanatlı tohumlarından biri rüzgârla havalandı. Tohum, döne döne bahçenin dışına taşındı ve alçak bir duvarın arkasındaki yumuşak toprağa düştü. Yağmurdan sonra toprak nemlendi. Tohumun sert kabuğu yavaşça açılırken gece sıcaklığı oldukça düşüktü.",
      "İlkbaharda güneş daha uzun süre parladı. Küçük kök toprağın içine ilerledi, ince gövde ise yukarı doğru uzandı. Bahçeden geçen çocuklar yeni filizi fark etti. Üzerine basılmaması için çevresine üç küçük dal yerleştirdiler. Öğretmenleri, bazı ağaçların yaşamına böyle küçük ve uzak bir yolculukla başladığını anlattı. Çocuklar filizi korumayı ve büyümesini sabırla izlemeyi seçti. Her hafta boyunu ölçüp değişiklikleri sınıf panosunda paylaştılar. Böylece herkes doğadaki küçük değişimleri fark etmeyi öğrendi. Bu gözlemler onları daha dikkatli yaptı.",
    ],
    comprehensionQuestions: [
      { id: "yolculuk-eden-tohum-1", question: "Tohum nereye düştü?", options: ["Yumuşak toprağa", "Bir kitabın arasına", "Dere suyuna"], correctAnswer: 0 },
      { id: "yolculuk-eden-tohum-2", question: "Küçük kök hangi yöne ilerledi?", options: ["Toprağın içine", "Gökyüzüne", "Duvarın üzerine"], correctAnswer: 0 },
      { id: "yolculuk-eden-tohum-3", question: "Çocuklar filizi nasıl korudu?", options: ["Çevresine dallar koydu", "Filizi başka yere taşıdı", "Üzerine su dökmedi"], correctAnswer: 0 },
    ],
  },
];

export function getListenThenReadPassagesForGrade(grade: ListenThenReadGrade): ListenThenReadPassage[] {
  return LISTEN_THEN_READ_PASSAGES.filter((passage) => passage.grade === grade);
}

export function getRandomListenThenReadPassage(
  grade: ListenThenReadGrade,
  excludedId?: string,
): ListenThenReadPassage {
  const candidates = getListenThenReadPassagesForGrade(grade).filter((passage) => passage.id !== excludedId);
  const pool = candidates.length > 0 ? candidates : getListenThenReadPassagesForGrade(grade);
  return pool[Math.floor(Math.random() * pool.length)] ?? LISTEN_THEN_READ_PASSAGES[0];
}
