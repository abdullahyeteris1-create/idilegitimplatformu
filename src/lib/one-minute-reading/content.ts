export type OneMinuteReadingGrade = 1 | 2 | 3 | 4;

export type OneMinuteComprehensionQuestion = {
  id: string;
  question: string;
  options: string[];
  correctAnswer: number;
};

export type OneMinuteReadingText = {
  id: string;
  title: string;
  grade: OneMinuteReadingGrade;
  paragraphs: string[];
  comprehensionQuestions: OneMinuteComprehensionQuestion[];
};

export const ONE_MINUTE_READING_GRADES: OneMinuteReadingGrade[] = [1, 2, 3, 4];

export const ONE_MINUTE_READING_TEXTS: OneMinuteReadingText[] = [
  {
    id: "ormanda-ilkbahar",
    title: "Ormanda İlkbahar",
    grade: 1,
    paragraphs: [
      "Sabah güneşi doğunca orman yavaşça uyandı. Küçük kuşlar dallara kondu ve neşeli sesler çıkardı. Bir sincap, ağacın altında ceviz aradı. Çocuklar öğretmenleriyle ormana yürüyüşe geldi. Yerde sarı bir çiçek gördüler. Çiçeğe dokunmadılar. Öğretmen, çiçeklerin korunması gerektiğini söyledi.",
      "Çocuklar biraz ileride küçük bir dere buldu. Suyun yanında dinlenip kuşları dinlediler. Sonra çöplerini çantalarına koyarak ormandan ayrıldılar. Herkes doğayı temiz bırakmanın önemini öğrendi.",
    ],
    comprehensionQuestions: [
      { id: "ormanda-ilkbahar-1", question: "Sincap ne aradı?", options: ["Ceviz", "Çiçek", "Taş"], correctAnswer: 0 },
      { id: "ormanda-ilkbahar-2", question: "Çocuklar ormanda ne yaptı?", options: ["Uyudu", "Yürüyüş yaptı", "Yüzdü"], correctAnswer: 1 },
      { id: "ormanda-ilkbahar-3", question: "Çocuklar çiçeğe nasıl davrandı?", options: ["Kopardı", "Üzerine bastı", "Uzaktan izledi"], correctAnswer: 2 },
    ],
  },
  {
    id: "mavi-bisiklet",
    title: "Mavi Bisiklet",
    grade: 1,
    paragraphs: [
      "Ece'nin mavi bir bisikleti vardı. Bisikletinin zilini çok severdi. Her sabah kaskını takar, bahçede birkaç tur atardı. Bir gün zilin sesi çıkmadı. Ece bisikletini babasına gösterdi. Babası zili dikkatle sıktı ve tekerlekleri kontrol etti.",
      "Zil yeniden çalınca Ece babasına teşekkür etti. Sonra önce yavaşça sürdü. Kapının önünde durdu, iki yana baktı ve güvenli yolda devam etti. Ece, bisiklet sürerken kask takmanın ve dikkatli olmanın önemli olduğunu hatırladı.",
    ],
    comprehensionQuestions: [
      { id: "mavi-bisiklet-1", question: "Ece'nin bisikleti ne renkti?", options: ["Kırmızı", "Mavi", "Yeşil"], correctAnswer: 1 },
      { id: "mavi-bisiklet-2", question: "Ece bisiklete binerken ne takıyordu?", options: ["Kask", "Atkı", "Şemsiye"], correctAnswer: 0 },
      { id: "mavi-bisiklet-3", question: "Zili kim düzeltti?", options: ["Ece'nin arkadaşı", "Ece'nin öğretmeni", "Ece'nin babası"], correctAnswer: 2 },
    ],
  },
  {
    id: "tohumdan-cicege",
    title: "Tohumdan Çiçeğe",
    grade: 2,
    paragraphs: [
      "Mert, sınıfta küçük bir saksıya fasulye tohumu ekti. Önce toprağı yumuşattı, sonra tohumu içine bıraktı. Üzerini ince bir toprakla kapattı. Saksıyı pencerenin yanına koydu. Böylece bitki gün içinde güneş ışığı alabilecekti.",
      "Mert her gün saksıya biraz su verdi. Fazla suyun toprağı çamur yapabileceğini öğretmeninden öğrendi. Birkaç gün sonra topraktan yeşil bir filiz çıktı. Mert filizin boyunu cetvelle ölçüp defterine yazdı. Filiz büyüdükçe sınıftaki arkadaşları da onu merakla izledi. Bir süre sonra küçük beyaz çiçekler açtı.",
    ],
    comprehensionQuestions: [
      { id: "tohumdan-cicege-1", question: "Mert saksıya hangi tohumu ekti?", options: ["Fasulye", "Ayçiçeği", "Mısır"], correctAnswer: 0 },
      { id: "tohumdan-cicege-2", question: "Mert tohumu ektikten sonra saksıyı nereye koydu?", options: ["Dolabın içine", "Pencerenin yanına", "Koridora"], correctAnswer: 1 },
      { id: "tohumdan-cicege-3", question: "Mert filizin boyunu nasıl takip etti?", options: ["Cetvelle ölçüp yazdı", "Filizi kopardı", "Saksıyı dışarı attı"], correctAnswer: 0 },
    ],
  },
  {
    id: "kayip-sapka",
    title: "Kayıp Şapka",
    grade: 2,
    paragraphs: [
      "Ali, parktaki oyunlardan sonra kırmızı şapkasını bulamadı. Önce kaydırağın yanına baktı. Sonra bankın altını ve çantasının içini kontrol etti. Şapka hiçbir yerde görünmüyordu. Ali, nerelerden geçtiğini düşünmek için bir an durdu. Parka gelirken uğradığı kitaplığın önünü de hatırladı.",
      "Ali kitaplığın önüne geri döndü. Şapkasını bir ağacın dalında görünce çok şaşırdı. Rüzgâr onu oraya taşımıştı. Ali, şapkasını alıp kenarındaki yaprakları temizledi. Sonra parka döndü ve arkadaşlarına eşyalarını oyun alanında bırakmamaları gerektiğini anlattı. Arkadaşları da onu dikkatle dinledi.",
    ],
    comprehensionQuestions: [
      { id: "kayip-sapka-1", question: "Ali neyi bulamıyordu?", options: ["Çantasını", "Şapkasını", "Kitabını"], correctAnswer: 1 },
      { id: "kayip-sapka-2", question: "Ali önce nerelere baktı?", options: ["Kaydırak ve bankın çevresine", "Okulun bahçesine", "Evdeki dolaba"], correctAnswer: 0 },
      { id: "kayip-sapka-3", question: "Şapka neredeydi?", options: ["Bir ağacın dalında", "Bankın altında", "Çantanın içinde"], correctAnswer: 0 },
    ],
  },
  {
    id: "arilarin-gorevi",
    title: "Arıların Görevi",
    grade: 3,
    paragraphs: [
      "Bahçedeki çiçekler açınca arılar da çalışmaya başladı. Bir arı, sarı bir çiçeğin üzerine kondu ve çiçekten nektar topladı. Sonra başka bir çiçeğe uçtu. Arıların üzerinde ince tüyler vardı. Bu tüyler, çiçekten aldıkları polenlerin bir bölümünün taşınmasına yardım ediyordu.",
      "Arılar çiçekten çiçeğe giderken polenleri taşır. Bu hareket, bazı bitkilerin yeni tohumlar oluşturmasına yardım eder. Bahçıvan Zeynep, arıların bahçe için ne kadar önemli olduğunu çocuklara anlattı. Çocuklar arıları rahatsız etmeden izledi. Ayrıca bahçeye renkli çiçekler dikmenin arılara yiyecek sağlayacağını öğrendiler. Zeynep, çiçeklerin arasına küçük bir su kabı da koydu. Böylece arılar sıcak günlerde dinlenebilecekti.",
    ],
    comprehensionQuestions: [
      { id: "arilarin-gorevi-1", question: "Arı çiçekten ne topladı?", options: ["Su", "Nektar", "Kum"], correctAnswer: 1 },
      { id: "arilarin-gorevi-2", question: "Arılar giderken ne taşır?", options: ["Polen", "Yaprak", "Çakıl"], correctAnswer: 0 },
      { id: "arilarin-gorevi-3", question: "Arıların hareketi bitkilere nasıl yardım eder?", options: ["Yeni tohum oluşmasına yardım eder", "Çiçekleri kapatır", "Toprağı sertleştirir"], correctAnswer: 0 },
    ],
  },
  {
    id: "kutuphane-kurali",
    title: "Kütüphanedeki Küçük Kural",
    grade: 3,
    paragraphs: [
      "Deniz, okul kütüphanesinden bir macera kitabı seçti. Kitabı okumaya başlamadan önce görevli, kitapların sayfalarının dikkatle çevrilmesi gerektiğini söyledi. Deniz bu küçük kuralı arkadaşlarına da hatırlattı. Kitabı sessizce okurken önemli yerleri küçük ayraçlarla işaretledi. Sayfaları kıvırmamaya özellikle dikkat etti.",
      "Okuma bitince kitabı masanın üzerinde bırakmak yerine görevliye teslim etti. Görevli, kitabın yerine konulabilmesi için üzerindeki etikete baktı. Deniz, kitaplığın raflarını karıştırmadan önce görevliye sormayı da öğrendi. Düzenli bir kütüphanede aradığı kitabı bulmanın daha kolay olduğunu fark etti. Böylece başka çocukların da kitaplara kolayca ulaşabileceğini düşündü. Deniz kitabı yerine koymadan önce masasını da topladı. Arkadaşları bu davranışı örnek aldı.",
    ],
    comprehensionQuestions: [
      { id: "kutuphane-kurali-1", question: "Deniz kütüphaneden ne seçti?", options: ["Bir macera kitabı", "Bir harita", "Bir oyun"], correctAnswer: 0 },
      { id: "kutuphane-kurali-2", question: "Görevli hangi konuda uyardı?", options: ["Sessizce yürümek", "Sayfaları dikkatle çevirmek", "Pencereyi açmak"], correctAnswer: 1 },
      { id: "kutuphane-kurali-3", question: "Deniz düzenli bir kütüphane hakkında ne fark etti?", options: ["Kitap bulmanın kolay olduğunu", "Kitapların çok ağır olduğunu", "Masaların küçük olduğunu"], correctAnswer: 0 },
    ],
  },
  {
    id: "yagmurun-yolculugu",
    title: "Yağmur Damlasının Yolculuğu",
    grade: 4,
    paragraphs: [
      "Bir yağmur damlası, bulutun içindeki serin yolculuğunu tamamlayıp yeryüzüne düştü. Önce geniş bir yaprağın üzerine kondu, sonra yaprağın kenarından süzülerek toprağa ulaştı. Toprak damlayı hemen içine çekmedi; küçük bir çukurda bir süre bekletti. Çukur dolunca damla, toprağın içindeki ince boşluklara doğru ilerledi.",
      "Güneş açınca suyun bir bölümü buharlaşıp yeniden gökyüzüne yükseldi. Başka bir bölümü ise bitkinin köklerine ilerledi. Kökler suyu gövdeye taşıdı ve bitkinin yaprakları canlı kaldı. Çukurda kalan suyun bir kısmı da yakındaki dereye karıştı. Böylece aynı su, doğada farklı yollar izleyerek canlıların yaşamına katkı sağladı. Bu döngü hiç durmadan devam eder. Bu olay çocuklara suyu boşa akıtmamanın neden önemli olduğunu düşündürdü. Öğretmenleri, her damlanın uzun bir yolculuk yaptığını söyledi.",
    ],
    comprehensionQuestions: [
      { id: "yagmurun-yolculugu-1", question: "Yağmur damlası önce nereye kondu?", options: ["Bir yaprağın üzerine", "Bir taşın altına", "Bir kuş yuvasına"], correctAnswer: 0 },
      { id: "yagmurun-yolculugu-2", question: "Güneş açınca suyun bir bölümü ne yaptı?", options: ["Buz oldu", "Buharlaşıp gökyüzüne yükseldi", "Rengini değiştirdi"], correctAnswer: 1 },
      { id: "yagmurun-yolculugu-3", question: "Metne göre su canlılara nasıl katkı sağladı?", options: ["Farklı yollarla yaşamı destekledi", "Bütün bitkileri kuruttu", "Toprağı tamamen kapattı"], correctAnswer: 0 },
    ],
  },
  {
    id: "sokak-lambalari",
    title: "Sokak Lambaları",
    grade: 4,
    paragraphs: [
      "Mahallenin çocukları akşamüstü parktan dönerken sokak lambalarının birer birer yandığını gördü. Lambalar, hava tamamen kararmadan önce yolu aydınlatmaya başladı. Böylece yayalar ve bisikletliler birbirlerini daha kolay fark etti. Çocuklar, karşıdan karşıya geçerken lambaların ışığına güvenmek yerine yaya geçidini kullanmaları gerektiğini de biliyordu.",
      "Apartman yöneticisi, lambaların düzenli kontrol edildiğini anlattı. Bir lamba sönükse görevliye haber veriliyordu. Görevli bozuk lambayı değiştiriyor, sonra sokağın yeniden aydınlandığını kontrol ediyordu. Çocuklar da güvenli bir sokak için yalnızca ışıkların değil, dikkatli davranmanın ve trafik kurallarına uymanın önemli olduğunu öğrendi. O akşam eve giderken birbirlerine hatırlatma yaptılar. Çocuklardan biri yansıtıcı şerit takmıştı. Diğerleri de karanlıkta görünür olmanın yollarını konuştu. Eve yaklaşınca lambaların çevresinde uçan küçük böcekleri fark ettiler.",
    ],
    comprehensionQuestions: [
      { id: "sokak-lambalari-1", question: "Lambalar ne zaman yanmaya başladı?", options: ["Hava tamamen aydınlıkken", "Hava tamamen kararmadan önce", "Sabah erken"], correctAnswer: 1 },
      { id: "sokak-lambalari-2", question: "Işıklar yayalara ve bisikletlilere nasıl yardım etti?", options: ["Birbirlerini fark etmelerini kolaylaştırdı", "Daha hızlı koşmalarını sağladı", "Yolu kapattı"], correctAnswer: 0 },
      { id: "sokak-lambalari-3", question: "Güvenli bir sokak için başka ne gereklidir?", options: ["Dikkatli davranmak ve trafik kurallarına uymak", "Lambaları kapatmak", "Parkta daha uzun kalmak"], correctAnswer: 0 },
    ],
  },
];

export function getTextsForGrade(grade: OneMinuteReadingGrade): OneMinuteReadingText[] {
  return ONE_MINUTE_READING_TEXTS.filter((text) => text.grade === grade);
}

export function getRandomTextForGrade(grade: OneMinuteReadingGrade, excludedId?: string): OneMinuteReadingText {
  const candidates = getTextsForGrade(grade).filter((text) => text.id !== excludedId);
  const pool = candidates.length > 0 ? candidates : getTextsForGrade(grade);
  return pool[Math.floor(Math.random() * pool.length)] ?? ONE_MINUTE_READING_TEXTS[0];
}