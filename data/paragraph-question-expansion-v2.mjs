/*
 * V2 paragraph question bank (131 records).
 * The 15 pilot records are imported and cloned so their runtime values remain
 * byte-for-byte unchanged. This artifact is review-only; it has no DB write path.
 */
import { paragraphQuestionExpansionV2Pilot } from "./paragraph-question-expansion-v2-pilot.mjs";

const usedQuestionTexts = new Set();
const uniquenessLeads = [
  "Metindeki olaylar birlikte düşünüldüğünde",
  "Parçanın bütünü değerlendirildiğinde",
  "Anlatılan gelişmeler dikkate alındığında",
  "Bu metnin verdiği bilgiler ışığında",
  "Parçada ulaşılan sonuç göz önüne alındığında",
  "Metindeki neden-sonuç ilişkisi izlendiğinde",
  "Anlatıcının vurguladığı noktalar dikkate alındığında",
  "Verilen örnekler bir arada ele alındığında",
  "Parçadaki uygulama ve sonuçlar düşünüldüğünde",
  "Bu anlatının bağlamı göz önüne alındığında",
];

const makeCategory = (gradePrefix, gradeBand, category, rows) =>
  rows.map((r, i) => {
    let question = r[2];
    const key = question.trim().normalize("NFKC").replace(/\s+/gu, " ").toLocaleLowerCase("tr-TR");
    if (usedQuestionTexts.has(key)) {
      const lowerQuestion = question.charAt(0).toLocaleLowerCase("tr-TR") + question.slice(1);
      const gradeOffset = gradeBand === "4-5" ? 0 : gradeBand === "8" ? 3 : 6;
      let leadIndex = (i + gradeOffset) % uniquenessLeads.length;
      let candidate = `${uniquenessLeads[leadIndex]}, ${lowerQuestion}`;
      while (usedQuestionTexts.has(candidate.trim().normalize("NFKC").replace(/\s+/gu, " ").toLocaleLowerCase("tr-TR"))) {
        leadIndex = (leadIndex + 1) % uniquenessLeads.length;
        candidate = `${uniquenessLeads[leadIndex]}, ${lowerQuestion}`;
      }
      question = candidate;
    }
    usedQuestionTexts.add(question.trim().normalize("NFKC").replace(/\s+/gu, " ").toLocaleLowerCase("tr-TR"));
    return {
    id: `v2-${gradePrefix}-${category}-${String(i + 2).padStart(2, "0")}`,
    category,
    difficulty: r[0],
    grade_band: gradeBand,
    passage: r[1],
    question,
    options: r[3],
    correct_index: r[4],
    explanation: r[5],
    };
  });

const clonePilot = paragraphQuestionExpansionV2Pilot.map((r) => ({
  ...r,
  options: [...r.options],
}));

const fourFive = [
  ...makeCategory("4-5", "4-5", "main_idea", [
    ["easy", "Ece, okul bahçesindeki karıncaların hep aynı taşın yanından geçtiğini gördü. Taşın önüne küçük bir dal koyunca karıncalar bir süre durdu, sonra başka bir yoldan ilerledi. Ece, yollarının rastgele değil, çevredeki işaretlere göre oluştuğunu arkadaşlarına anlattı.", "Bu parçadan çıkarılabilecek ana düşünce aşağıdakilerden hangisidir?", ["Karıncalar yalnızca taşların üzerinden yürür.", "Karıncaların izlediği yollar çevrelerindeki değişikliklerden etkilenebilir.", "Ece bütün karıncaları bahçeden uzaklaştırmıştır.", "Dallar karıncalar için yiyecek kaynağıdır.", "Okul bahçesinde her gün yeni taşlar bulunur."], 1, "B seçeneği, karıncaların yolunun dal konunca değişmesini ve bunun çevresel etkisini birlikte verir. Diğer seçenekler parçadaki gözlemi ya daraltır ya da desteklenmeyen bir bilgi ekler."],
    ["easy", "Mert, ip atlama çalışırken ilk günlerde sık sık takıldı. İpi daha yavaş çevirmeyi ve ayaklarını aynı ritimde kaldırmayı deneyince atlayışları arttı. Bir hafta sonra arkadaşlarına, başarının tek seferde değil, küçük düzeltmelerle geliştiğini söyledi.", "Mert'in deneyimi en çok hangi düşünceyi desteklemektedir?", ["Spor yapmak yalnızca yarış kazanmak için gereklidir.", "İp atlamak için hızlı hareket etmek yeterlidir.", "Düzenli deneme ve küçük düzeltmeler beceriyi geliştirebilir.", "Arkadaşlarla çalışmak her hatayı hemen yok eder.", "İlk denemede başarısız olan biri ilerleyemez."], 2, "C seçeneği, Mert'in ritmini değiştirip düzenli çalışmayla ilerlemesini özetler. A, B, D ve E metindeki süreçle uyuşmaz."],
    ["easy", "Nehir, dedesinin tarif defterinde aynı çorbanın iki farklı ölçüsünü buldu. Dedesine sorunca birinin dört kişilik, diğerinin kalabalık bir aile toplantısı için yazıldığını öğrendi. Nehir, tarifi kullanmadan önce kaç kişiye yemek hazırlayacağını belirlemeye başladı.", "Parçanın ana düşüncesi aşağıdakilerden hangisidir?", ["Eski tarif defterleri kullanılmamalıdır.", "Çorbalar yalnızca aile toplantılarında yapılır.", "Bir tarifi doğru uygulamak için miktarın hangi koşula göre verildiği bilinmelidir.", "Nehir artık yemek yapmayı bırakmıştır.", "Dedesinin bütün tarifleri aynı ölçüdedir."], 2, "C seçeneği, ölçülerin kişi sayısına göre değiştiğini ve Nehir'in bundan çıkardığı yöntemi kapsar. Diğerleri metinde bulunmayan genellemelerdir."],
    ["medium", "Kütüphanede bozulan okuma lambaları için önce tek tek ampuller değiştirildi, ancak bazı lambalar yine yanmadı. Görevli, kabloları ve prizleri de kontrol edince sorunun birkaç farklı nedenden kaynaklandığını gördü. Bakım listesi hazırlanıp her lamba için ayrı kontrol yapılınca arızalar daha çabuk giderildi.", "Bu parçada vurgulanan temel düşünce nedir?", ["Bütün lambaların ampulleri aynı anda değiştirilmelidir.", "Arızaları çözmek için tek bir nedeni varsaymak yerine sistemli kontrol yapmak gerekir.", "Kütüphanelerde yalnızca yeni lamba kullanılmalıdır.", "Prizler kablolardan daha önemsizdir.", "Bakım listeleri arızaları artırır."], 1, "B seçeneği, ampul değişiminin yetmediğini ve farklı parçaların planlı biçimde incelendiğini anlatır. Diğer seçenekler gözlemi yanlış yorumlar."],
    ["medium", "Selin, bulutların rengine bakarak yağmur yağacağını tahmin ediyordu. Öğretmeni, üç gün boyunca bulut türünü, rüzgârı ve yağış miktarını not etmelerini istedi. Notlar karşılaştırılınca yalnızca renge bakmanın yeterli olmadığı, birkaç işaretin birlikte değerlendirilmesi gerektiği ortaya çıktı.", "Paragrafın ana düşüncesi hangi seçenekte doğru verilmiştir?", ["Bulutların rengi hava durumunu her zaman kesin gösterir.", "Hava tahmini yapmak için yalnızca öğretmenin görüşü gereklidir.", "Yağış hakkında daha güvenilir sonuca ulaşmak için birden fazla gözlem birlikte incelenmelidir.", "Rüzgâr yağışla hiçbir zaman ilişkili değildir.", "Üç günlük gözlem hava olaylarını tamamen açıklar."], 2, "C seçeneği, renk, rüzgâr ve yağış kayıtlarının birlikte değerlendirilmesi sonucunu verir. A ve E gereğinden kesin, B ve D ise metne aykırıdır."],
    ["medium", "Müzedeki görevli, ziyaretçilere salonları gösteren bir harita verdi. Haritada bazı okların tek yönlü olduğu, bazı kapıların ise yalnızca görevlilerce açıldığı belirtilmişti. Haritayı dikkatle inceleyen çocuklar, en kısa yolu aramak yerine sergilerin sırasını bozmadan ilerledi.", "Çocukların davranışı aşağıdaki düşüncelerden hangisini gösterir?", ["Müze haritaları yalnızca süs amacıyla hazırlanır.", "En kısa yol her zaman en doğru yoldur.", "Bir planı uygularken yalnızca hedefi değil, planın kurallarını da dikkate almak gerekir.", "Görevliler bütün kapıları ziyaretçilere açar.", "Sergilerin sırası ziyaretçiler için önemsizdir."], 2, "C seçeneği, çocukların ok yönlerini ve sergi sırasını birlikte gözettiğini açıklar. Diğer seçenekler haritanın işlevini yanlış verir."],
    ["medium", "Arda, piknikte eldivenlerinden birini çimenlerin arasında bulamayınca önce oturduğu yeri aradı. Sonra yürüdüğü yolu zihninde geriye doğru canlandırıp taşın yanında durduğu anı hatırladı. Eldiveni, o noktadaki çalının altında buldu ve aramayı rastgele yapmak yerine izlediği yolu hatırlamanın işe yaradığını düşündü.", "Bu parçadan hangi sonuç çıkarılabilir?", ["Arda eldivenini başkasının sakladığını düşünmüştür.", "Kayıp bir eşyayı ararken hareket sırasını hatırlamak aramayı kolaylaştırabilir.", "Çimenlik alanlarda eşya bulmak imkânsızdır.", "Arda yalnızca oturduğu yerde arama yapmıştır.", "Eldivenler çalıların altında bulunamaz."], 1, "B seçeneği, Arda'nın yolu geriye doğru hatırlayarak eldiveni bulmasını geneller. A, C, D ve E metindeki olayla çelişir veya desteklenmez."],
    ["medium", "Bahar, balkonundaki saksıda yuva yapan serçeleri izledi. Sabahları yuvaya daha çok dal taşındığını, öğleden sonra ise kuşların daha uzun süre dinlendiğini not etti. Notlarını karşılaştırınca kuşların yalnızca hava aydınlık olduğu için değil, günün farklı zamanlarındaki ihtiyaçlarına göre de davrandığını fark etti.", "Parçanın ana düşüncesi aşağıdakilerden hangisidir?", ["Serçeler yuva yapmak için yalnızca sabahları uçar.", "Kuşların davranışlarını anlamak için zamanı ve davranışın amacını birlikte gözlemlemek gerekir.", "Balkon saksıları kuşların bütün ihtiyaçlarını karşılar.", "Öğleden sonra kuşlar hiç hareket etmez.", "Bahar serçelerin davranışlarını değiştirmiştir."], 1, "B seçeneği, dal taşıma ve dinlenme davranışlarının zamanla birlikte farklı ihtiyaçlara bağlandığını ifade eder. Diğer seçenekler gözlemleri eksik veya yanlış aktarır."],
    ["medium", "Tablet kullanımını azaltmak isteyen Ozan, önce akşamları cihazı başka odaya bıraktı. Bu kez ödev sırasında bildirimleri kontrol ettiğini fark edince bildirimleri kapattı ve çalışma süresini kısa aralara böldü. Birkaç gün sonra daha uzun süre dikkatini koruyabildi; tek bir önlem yerine alışkanlığını oluşturan birkaç noktayı değiştirdiğini gördü.", "Ozan'ın uyguladığı yöntem hangi düşünceyi destekler?", ["Dikkati artırmak için cihazı tamamen yok etmek gerekir.", "Bildirimler yalnızca ödev bitince önemlidir.", "Bir alışkanlığı değiştirmek, onu besleyen farklı koşulları birlikte düzenlemeyi gerektirebilir.", "Uzun çalışma araları her zaman başarı getirir.", "Ozan cihaz kullanımını artırmıştır."], 2, "C seçeneği, yer değiştirme, bildirimleri kapatma ve çalışma düzenini değiştirme adımlarını birlikte açıklar. Diğerleri bu adımların anlamını çarpıtır."],
    ["hard", "Bisiklet kulübü, okula giden iki yolu karşılaştırdı. Kısa yolun yokuşu dikti ve sabahları servis araçlarıyla kesişiyordu; uzun yol ise daha düz, fakat yağmurdan sonra su birikintileri oluşan bir parktan geçiyordu. Öğrenciler, hava ve trafik durumuna göre hangi yolun daha güvenli olduğuna karar vermek için her iki koşulu da kaydetti.", "Bu parçanın ana düşüncesi aşağıdakilerden hangisidir?", ["Okula giderken her zaman kısa yol seçilmelidir.", "Uzun yollar bisikletliler için güvenli değildir.", "Güvenli bir seçim yapmak, tek bir özelliğe değil koşulların birlikte değerlendirilmesine bağlıdır.", "Servis araçları yalnızca uzun yolda bulunur.", "Yağmur bisiklet kullanımını tamamen engeller."], 2, "C seçeneği, kulübün yol uzunluğunu, yokuşu, trafiği ve yağmuru birlikte değerlendirdiğini özetler. A, B, D ve E koşullardan birini gereksiz biçimde geneller."],
  ]),
  ...makeCategory("4-5", "4-5", "supporting_idea", [
    ["easy", "Sınıf, kitaplığın üst rafına ulaşmak için küçük bir basamak kullandı. Basamağın kaymaması için altına lastik bir örtü yerleştirildi ve herkes sırayla bekledi. Böylece kitap alma işi hem kolaylaştı hem de daha güvenli oldu.", "Parçada kitap alma işinin güvenli olması için hangi ayrıntıdan söz edilmiştir?", ["Rafın boyanmasından", "Basamağın altına lastik örtü konmasından", "Kitapların kaldırılmasından", "Sınıfın pencerelerinin açılmasından", "Herkesin aynı anda hareket etmesinden"], 1, "B seçeneği, basamağın kaymasını önleyen doğrudan ayrıntıdır. Diğer seçeneklerin hiçbiri güvenlik önlemi olarak verilmemiştir."],
    ["easy", "Yaz kampında öğrenciler sabah yürüyüşünden önce mataralarını doldurdu. Rehber, suyu yürüyüşün başında bitirmemeleri için küçük yudumlarla içmelerini hatırlattı. Dönüşte herkesin hâlâ biraz suyu vardı.", "Rehberin hangi uyarısı öğrencilerin suyunu korumasına yardımcı olmuştur?", ["Yürüyüşü hızlandırmaları", "Suyu küçük yudumlarla içmeleri", "Mataralarını evde bırakmaları", "Yalnızca dönüşte su içmeleri", "Yürüyüşü iptal etmeleri"], 1, "B seçeneği, rehberin verdiği ve sonuçla ilişkilendirilen uyarıdır. Diğerleri metinde önerilmemiştir."],
    ["easy", "Apartman sakinleri, kullanılmayan kartonları çöpe atmak yerine bodrumdaki kutuda biriktirdi. Kutular dolunca kâğıt toplayıcısına haber verdiler. Toplanan kartonlardan elde edilen geliri bina bahçesine fidan almak için kullandılar.", "Bahçeye fidan alınmasını sağlayan ara adım hangisidir?", ["Kartonların bodrumda unutulması", "Kartonların kâğıt toplayıcısına verilmesi", "Kutuların küçültülmesi", "Bahçenin sulanmaması", "Sakinlerin çöpleri karıştırması"], 1, "B seçeneği, kartonların gelire dönüşmesini sağlayan adımı gösterir. Diğerleri süreçte yer almaz."],
    ["medium", "Deniz fenerinin ışığı sisli gecelerde kıyıdan zor görülüyordu. Görevli, lambayı güçlendirmek yerine önce merceklerin tozunu temizledi ve ışığın yönünü denize çevirdi. Sonraki ölçümlerde aynı enerjiyle daha geniş bir alanın aydınlandığı görüldü.", "Görevlinin ilk olarak yaptığı işlem aşağıdakilerden hangisidir?", ["Enerji kaynağını değiştirmek", "Mercekleri temizleyip ışığın yönünü ayarlamak", "Feneri kıyıdan uzaklaştırmak", "Sisli geceleri yasaklamak", "Daha büyük bir bina yapmak"], 1, "B seçeneği, görevlinin temizlik ve yön ayarından oluşan ilk müdahalesini eksiksiz verir. Diğerleri olayda yoktur."],
    ["medium", "Okuduğu romanda kahraman, yağmur başlayınca eve dönmek yerine pazardaki yaşlı satıcıya yardım etti. Bu küçük davranış, sonraki bölümde satıcının kahramana önemli bir bilgi vermesini açıklıyordu. Öğretmen, ayrıntıların ilerideki olayları hazırlayabileceğini söyledi.", "Kahramanın pazardaki davranışı ileride hangi işe yaramıştır?", ["Yağmurun durmasını sağlamıştır.", "Satıcının daha sonra önemli bir bilgi vermesini açıklamıştır.", "Kahramanın pazarı terk etmesini sağlamıştır.", "Romanın sonunu değiştirmemiştir.", "Satıcının evine taşınmasına yol açmıştır."], 1, "B seçeneği, davranış ile sonraki bilgi arasındaki açık bağlantıdır. Diğer sonuçlar metinde desteklenmez."],
    ["medium", "Mahalle pazarı kurulmadan önce esnaf, kamyonların geçeceği sokağı boş bıraktı. Tezgâhlar kaldırıma sıralanınca yayalar için daralan bölümlere sarı işaretler kondu. Belediye görevlisi, pazar bitene kadar bu işaretlere uyulmasını istedi.", "Sarı işaretlerin konma amacı nedir?", ["Tezgâhları süslemek", "Yayaların daralan bölümleri güvenle geçmesini sağlamak", "Kamyonların hızını artırmak", "Pazarın daha uzun sürmesini sağlamak", "Esnafın yerini değiştirmek"], 1, "B seçeneği, işaretlerin yayaların geçişini düzenlemek için kullanıldığını belirtir. Diğer seçenekler amaçla ilgisizdir."],
    ["medium", "Uzay sergisinde astronot kıyafetlerinin yanında eldivenlerin neden kalın olduğu anlatılıyordu. Rehber, eldivenlerin hem düşük sıcaklıktan korunmayı hem de aletleri kavramayı sağladığını gösterdi. Çocuklar, bir parçanın aynı anda birden fazla iş görebileceğini fark etti.", "Rehberin eldivenlerle ilgili verdiği iki işlev hangisidir?", ["Hızlı hareket etme ve ses çıkarma", "Sıcak tutma ve aletleri kavrama", "Renk değiştirme ve ışık yayma", "Su taşıma ve yemek pişirme", "Kıyafeti hafifletme ve büyütme"], 1, "B seçeneği, parçadaki iki işlevi birlikte verir. Diğer ikililer sergide anlatılanlarla örtüşmez."],
    ["hard", "Basketbol takımında herkes en çok sayı atan oyuncuya pas veriyordu. Rakip savunma bu düzeni fark edince hücumlar yavaşladı. Antrenör, oyuncuların farklı pozisyonlarda birbirine seçenek oluşturmasını ve pas kararını savunmanın durumuna göre vermesini istedi; sonraki antrenmanda sayı dağılımı dengelendi.", "Antrenörün önerisi takımın hangi sorununu çözmeye yöneliktir?", ["Oyuncuların yalnızca tek bir kişiye bağlı hücum kurmasını", "Savunmanın tamamen oyundan çekilmesini", "Sayı atma denemelerinin kaldırılmasını", "Pasların her zaman aynı oyuncuya gitmesini", "Pozisyonların antrenman dışında belirlenmesini"], 0, "A seçeneği, rakibin fark ettiği tek oyuncuya bağımlı düzeni ve önerinin bunu değiştirmesini açıklar. Diğer seçenekler parçadaki sorunu karşılamaz."],
  ]),
  ...makeCategory("4-5", "4-5", "inference", [
    ["easy", "Lina'nın kedisi, mama kabı pencerenin yanına taşındığında daha az ürktü ve yemek yerken dışarıyı izledi. Lina, kabın yerinin kedisinin davranışını değiştirdiğini not etti.", "Lina'nın notundan hangi çıkarım yapılabilir?", ["Kedi yalnızca geceleri yemek yer.", "Mama kabının konumu kedinin rahatlığını etkileyebilir.", "Pencere kedinin mamasını çoğaltır.", "Lina kedisini dışarı bırakmıştır.", "Kediler pencereden bakamaz."], 1, "B seçeneği, kabın yeri değişince kedinin daha rahat davranmasından çıkarılır. Diğerleri gözlemle desteklenmez."],
    ["medium", "Yağmurdan sonra okul yolundaki küçük çukurda su birikiyordu. Çocuklar çukurun çevresine taş dizdi; ancak ertesi gün su yine taşların arasına doldu. Öğretmen, suyun akacağı bir kanal açılmadıkça taşların tek başına çözüm olmayacağını söyledi.", "Öğretmenin sözünden hangi sonuç çıkarılabilir?", ["Taşlar suyu tamamen yok eder.", "Su birikintisini önlemek için suyun akışını sağlayacak ek bir düzenleme gerekir.", "Çukurlar yalnızca yazın oluşur.", "Kanal açmak suyun yönünü değiştirmez.", "Çocuklar taşları hemen kaldırmalıdır."], 1, "B seçeneği, taşların yetmemesinin nedenini ve gerekli ek düzenlemeyi açıklar. Diğer seçenekler gözleme aykırıdır."],
    ["medium", "Voleybol maçında Eylül, topa sert vurmak yerine rakibin boş bıraktığı köşeye yumuşak bir vuruş yaptı. Takımı bu sayede sayı kazandı. Eylül, gücün tek başına değil, doğru yere yöneltilince işe yaradığını düşündü.", "Eylül'ün deneyiminden hangi çıkarım yapılabilir?", ["Sert vuruşlar her zaman sayı getirir.", "Rakibin konumunu gözlemek, vuruş biçimi kadar önemlidir.", "Voleybolda köşelere top atılamaz.", "Eylül maç boyunca hiç pas vermemiştir.", "Takım yalnızca şansa güvenmiştir."], 1, "B seçeneği, boş köşeyi fark etmenin sonucu belirlediğini gösterir. Diğerleri olayın anlamını değiştirmektedir."],
    ["medium", "Hikâyedeki çocuk, kırılan saati hemen çöpe atmadı. Önce vidalarını ayırıp içindeki yayı inceledi, sonra bozuk parçayı değiştirerek saati yeniden çalıştırdı. Anlatıcı, çocuğun sabrının merakından daha belirleyici olduğunu vurguladı.", "Bu parçadan çocuk hakkında hangi çıkarım yapılabilir?", ["Eşyaları onarmaktan hoşlanmaz.", "Bir sorunu çözmek için sabırla deneme yapabilir.", "Saatleri yalnızca satın alır.", "Yayı nasıl kullanacağını bilmez.", "Merakı olmayan bir çocuktur."], 1, "B seçeneği, saati adım adım inceleyip onarmasından çıkarılır. Metin diğer seçenekleri desteklemez."],
    ["hard", "Göçmen kuşları izleyen ekip, ilkbaharda kuşların daha erken geldiğini kaydetti. Aynı haftalarda kıyıdaki rüzgârların zayıfladığı ve böcek sayısının arttığı da ölçüldü. Ekip, tek bir ölçümle neden belirlemek yerine bu değişkenleri birkaç yıl daha karşılaştırmaya karar verdi.", "Ekibin kararından hangi çıkarım yapılabilir?", ["Kuşların geliş nedeni kesin olarak bulunmuştur.", "Tek yıllık gözlem, değişkenler arasındaki ilişkiyi açıklamak için yeterli görülmemiştir.", "Böcek sayısı kuşları hiç etkilemez.", "Rüzgâr ölçümü artık yapılmayacaktır.", "İlkbaharda bütün kuşlar aynı gün gelir."], 1, "B seçeneği, ekibin tek yıl ve tek ölçümle kesin sonuca varmaktan kaçındığını belirtir. Diğerleri metne aykırı kesinlikler içerir."],
    ["hard", "Müze rehberi, eski köprünün yalnızca taşlarından söz etmedi; köprünün hangi mevsimde, hangi yüklerle kullanıldığını da anlattı. Ziyaretçiler, aynı yapının dayanıklılığını anlamak için malzeme kadar kullanım koşullarına bakılması gerektiğini fark etti.", "Ziyaretçilerin fark ettiği düşünce aşağıdakilerden hangisidir?", ["Bir yapının özellikleri kullanım koşullarından bağımsızdır.", "Dayanıklılığı değerlendirirken malzeme ile kullanım şartları birlikte incelenmelidir.", "Eski köprüler yalnızca kışın kullanılır.", "Rehber malzemeler hakkında bilgi vermemiştir.", "Yük miktarı köprünün ömrünü etkilemez."], 1, "B seçeneği, malzeme ve kullanım koşullarının birlikte ele alınmasından çıkarılır. Diğerleri anlatılan bağlantıyı reddeder."],
    ["hard", "Zeynep, telefonundaki pilin hızlı tükenmesini ekran parlaklığına bağladı. Parlaklığı azaltınca değişim az oldu; konum hizmetlerini ve arka plandaki uygulamaları kapatınca pil daha uzun dayandı. Zeynep, bir sorunun görünen tek nedene indirgenmemesi gerektiğini yazdı.", "Zeynep'in gözleminden hangi sonuç çıkarılabilir?", ["Pil tüketiminin tek nedeni ekran parlaklığıdır.", "Farklı ayarlar birlikte incelenmeden sorunun kaynağı kesinleşmeyebilir.", "Konum hizmetleri pil kullanmaz.", "Arka plan uygulamaları telefonu kapatır.", "Parlaklığı artırmak pil ömrünü uzatır."], 1, "B seçeneği, farklı ayarları denemeden kesin neden belirlenemeyeceği sonucunu verir. Diğer seçenekler denemelerin tersini söyler."],
    ["hard", "Aile, hafta sonu gezisi için iki plan yaptı. Birinci plan daha kısa görünse de otobüs değişimi ve kapalı müze saatleri nedeniyle bekleme gerektiriyordu. İkinci plan biraz uzundu fakat tek otobüsle ulaşılıyor ve müze açık oluyordu; aile ikinci planı seçti.", "Ailenin seçimi hangi çıkarımı destekler?", ["En kısa plan her zaman en uygun plandır.", "Bir seçeneği değerlendirirken yalnızca süreye değil, uygulanabilirlik koşullarına da bakmak gerekir.", "Müzeler hafta sonu kapalıdır.", "Otobüs değiştirmek geziyi kolaylaştırır.", "Aile iki planı da uygulamıştır."], 1, "B seçeneği, sürenin yanında aktarma ve açılış koşullarının hesaba katıldığını açıklar. Diğer seçenekler metne uymaz."],
  ]),
  ...makeCategory("4-5", "4-5", "completion", [
    ["easy", "Sınıf, bitkilerin hafta boyunca susuz kalmaması için görev çizelgesi hazırladı. Her gün başka bir öğrenci toprağı kontrol edip gerekirse az miktarda su verdi. Böylece _____.", "Paragrafı düşünce akışına uygun tamamlayan cümle hangisidir?", ["bitkilerin yerleri sürekli değişti.", "sulama işi düzenli ve dengeli biçimde sürdü.", "öğrenciler çizelgeyi yırtıp attı.", "toprak hiç kontrol edilmedi.", "bitkiler sınıftan çıkarıldı."], 1, "B seçeneği, görev çizelgesi ve günlük kontrolün doğal sonucunu verir. Diğerleri anlatılan uygulamayla çelişir."],
    ["medium", "Efe, kartondan bir köprü maketi yaptı. İlk denemede köprü ortasından çöktü; destekleri yalnızca uçlara koyduğunu fark etti. Ortaya da iki destek ekleyip ağırlığı yeniden dağıttı ve _____.", "Bu cümle aşağıdakilerden hangisiyle tamamlanmalıdır?", ["maketi daha da yükseltti.", "köprü aynı noktadan yeniden çöktü.", "maket daha ağır yükü taşıyabildi.", "desteklerin hepsini kaldırdı.", "kartonu kullanmayı bıraktı."], 2, "C seçeneği, ortadaki desteklerin ağırlığı dağıtmasıyla beklenen sonucu tamamlar. Diğerleri onarımın amacına ters düşer."],
    ["medium", "İzci grubu, haritadaki işaretleri takip ederek dereye ulaştı. Dönüşte hava kararmaya başlayınca rehber, kestirme patikaya girmek yerine sabah kullandıkları açık yolu seçti. Çünkü _____.", "Paragrafı en uygun biçimde tamamlayan seçenek hangisidir?", ["kestirme yolun daha aydınlık olduğunu düşündü.", "harita artık gerekli değildi.", "açık yolun yönünü ve güvenli noktalarını zaten biliyorlardı.", "dereye yeniden gitmek istediler.", "hava karardıkça hızları arttı."], 2, "C seçeneği, bilinen ve güvenli yolun tercih edilme nedenini açıklar. Diğerleri rehberin kararını gerekçelendirmez."],
    ["medium", "Parktaki yaşlı ağaçların dalları budanırken görevli önce kuru dalları işaretledi, sonra kuş yuvalarının bulunduğu bölümlere dokunmadı. Çalışma bitince _____.", "Bu parçanın sonuna hangi cümle getirilmelidir?", ["ağaçların tamamı kesildi.", "hem tehlikeli dallar alındı hem de yuvalar korundu.", "kuşlar parktan uzaklaştırıldı.", "budama planı iptal edildi.", "kuru dallar daha da çoğaldı."], 1, "B seçeneği, kuru dalların alınması ve yuvalara dokunulmaması kararlarını birlikte sonuçlandırır. Diğerleri olayla uyuşmaz."],
    ["medium", "Fen dersinde öğrenciler mıknatısın farklı maddelere etkisini denedi. Demir ataşlar mıknatısa yaklaşırken tahta çubuklar hareket etmedi. Öğretmen, sonuçları tabloya yazmalarını ve _____.", "Paragrafı tamamlayan en uygun cümle hangisidir?", ["bütün maddelerin aynı davrandığını söylemelerini.", "gözlemlerini maddelerin özellikleriyle ilişkilendirmelerini.", "mıknatısı suya atmalarını.", "ataşları görünmez hâle getirmelerini.", "deneyi sonuç almadan bitirmelerini."], 1, "B seçeneği, deney sonuçlarının maddelerin özellikleriyle yorumlanmasını sürdürür. Diğer seçenekler bilimsel akışı bozar."],
    ["hard", "Müzik grubunda davulun sesi diğer çalgıları bastırıyordu. Öğrenciler önce davulcudan daha hafif çalmasını istedi, fakat bu kez ritim duyulmaz oldu. Sonra mikrofonların yerini ve ses düzeylerini birlikte ayarladılar; _____.", "Bu paragraf aşağıdakilerden hangisiyle tamamlanırsa anlam bütünlüğü sağlanır?", ["grup prova yapmayı bıraktı.", "sorunu tek bir çalgıcının hatası olarak gördüler.", "ritim duyuldu, diğer çalgıların sesi de dengede kaldı.", "davulun sesini tamamen kapattılar.", "mikrofonları salondan çıkardılar."], 2, "C seçeneği, ses düzeyi ile mikrofon yerinin birlikte ayarlanmasının dengeli sonucudur. Diğer seçenekler çözüm sürecini bozar."],
    ["hard", "Mahallede yağmur suyu biriktirmek için variller yerleştirildi. İlk sağanakta variller hızla doldu; ancak kapakları açık kaldığı için içine yapraklar ve böcekler girdi. Sakinler kapaklara ince bir süzgeç ekleyip taşma borusu takınca _____.", "Paragrafın sonunu en iyi tamamlayan seçenek hangisidir?", ["variller daha az su topladı.", "biriken su daha temiz kaldı ve fazla su kontrollü biçimde aktı.", "sakinler yağmur suyunu kullanmaktan vazgeçti.", "yapraklar varillerde çoğaldı.", "taşma boruları kapakların işlevini yok etti."], 1, "B seçeneği, süzgeç ve taşma borusunun iki işlevini birlikte tamamlar. Diğerleri yapılan düzenlemelerin tersidir."],
    ["hard", "Roman kulübü, aynı bölümdeki iki anlatıcının olayları farklı aktardığını fark etti. Biri yalnızca gördüklerini söylerken diğeri geçmişteki bilgileri de ekliyordu. Tartışmanın sonunda öğrenciler, bölümü değerlendirirken _____.", "Bu cümle aşağıdakilerden hangisiyle tamamlanmalıdır?", ["anlatıcıların bilgi sınırlarını ve bakış açılarını karşılaştırmaları gerektiğine karar verdi.", "iki anlatıcının aynı kişi olduğunu varsaydılar.", "olayların sırasını incelemeyi gereksiz buldular.", "geçmiş bilgilerin tümünü metinden çıkardılar.", "romanın yalnızca son cümlesini okudular."], 0, "A seçeneği, iki anlatıcının bilgi kapsamı farkını değerlendirmeye dönüştürür. Diğerleri kulübün tartışmasından çıkmaz."],
  ]),
  ...makeCategory("4-5", "4-5", "flow", [
    ["easy", "(I) Okul bahçesindeki çiçeklerin renkleri kaydedildi. (II) Her renkteki çiçek sayısı sayıldı. (III) Sonuçlar sınıf panosuna tablo olarak asıldı. (IV) Bahçenin yanındaki kantinde yeni sandviç çeşitleri denendi. (V) Öğrenciler en çok hangi rengin bulunduğunu tabloya bakarak söyledi.", "Çiçek gözlemlerini anlatan düşünce akışını bozan cümle hangisidir?", ["I", "II", "III", "V", "IV"], 4, "IV. cümle kantindeki sandviçlere geçer; diğer cümleler çiçekleri sayma ve sonuçları değerlendirme zincirini sürdürür."],
    ["medium", "(I) Bahçedeki kompost kutusuna sebze kabukları eklendi. (II) Kutunun nemi her iki günde bir kontrol edildi. (III) Kuru kaldığında biraz su ve kuru yaprak ilave edildi. (IV) Kompostun kullanıldığı saksılardaki bitkilerin boyu ölçüldü. (V) Ölçümler, kompostun toprağın verimine katkısını değerlendirmek için karşılaştırıldı.", "Kompost çalışmasının akışını bozan cümle hangisidir?", ["I", "II", "III", "IV", "V"], 3, "IV. cümle saksı bitkilerine geçerek kutunun hazırlanma adımlarını böler; I, II, III ve V kompostun hazırlanıp etkisinin değerlendirilmesiyle ilişkilidir."],
    ["medium", "(I) Bisiklet yolundaki uyarı levhaları fotoğraflandı. (II) Levhaların sürücüler tarafından görülme uzaklığı ölçüldü. (III) Görülmeyen levhaların çevresindeki dallar budandı. (IV) Akşam gösterisi için sahne ışıkları kuruldu. (V) Budamadan sonra aynı uzaklık ölçümleri tekrarlandı.", "Bisiklet yolu incelemesinde akışı bozan cümle hangisidir?", ["I", "II", "III", "IV", "V"], 3, "IV. cümle sahne ışıklarına geçer; diğerleri levhaların görünürlüğünü ölçme ve iyileştirme sürecini anlatır."],
    ["medium", "(I) Arıcılar kovandaki peteklerin doluluk oranını inceledi. (II) Havanın serinlediği günlerde arıların uçuş süresi kısaldı. (III) Kovan girişine rüzgârı azaltan bir örtü yerleştirildi. (IV) Bal kavanozlarının etiket renkleri yeniden seçildi. (V) Sonraki gözlemlerde uçuş süresi ile kovan sıcaklığı karşılaştırıldı.", "Arıların çalışma koşullarını anlatan akışı bozan cümle hangisidir?", ["I", "II", "III", "IV", "V"], 3, "IV. cümle kavanoz etiketlerine geçer; I, II, III ve V kovan koşulları ile arıların uçuşunu izleyen zinciri oluşturur."],
    ["hard", "(I) Parkta çocukların kullandığı salıncakların zincirleri kontrol edildi. (II) Gevşek bağlantılar sıkıştırıldı ve oturma bölümleri temizlendi. (III) Kontrolden sonra salıncakların hareket mesafesi yeniden ölçüldü. (IV) Parkın girişindeki tarihi çeşmenin taşları numaralandırıldı. (V) Güvenlik ölçümleri uygun çıkan salıncaklar kullanıma açıldı.", "Salıncakların bakım sürecinde düşünce akışını bozan cümle hangisidir?", ["I", "II", "III", "V", "IV"], 4, "IV. cümle çeşmenin taşlarına geçer; I, II, III ve V salıncakların kontrolü, onarımı ve açılmasıyla ilerler."],
    ["hard", "(I) Hava istasyonunda sabah basınç değeri kaydedildi. (II) Öğle saatinde rüzgâr yönü ve hızı ölçüldü. (III) Akşam ölçümleri gün içindeki değişimle karşılaştırıldı. (IV) İstasyona gelen ziyaretçilere şehir tarihi hakkında broşür dağıtıldı. (V) Farklı değerler, ertesi günün hava tahmininde kullanıldı.", "Hava ölçümleriyle ilgili akışı bozan cümle hangisidir?", ["I", "II", "III", "V", "IV"], 4, "IV. cümle şehir tarihi broşürlerine geçer; I, II, III ve V gün içi hava verilerinin toplanıp kullanılmasını anlatır."],
    ["hard", "(I) Müze ekibi, seramik parçalarının yüzeylerini ışık altında inceledi. (II) Parçaların kenarları birleştirilerek olası kap biçimleri çizildi. (III) Çizimler, aynı döneme ait katalog örnekleriyle karşılaştırıldı. (IV) Müze kafesinde yeni bir içecek menüsü hazırlandı. (V) Karşılaştırma sonunda parçaların hangi kaba ait olabileceği için iki öneri oluşturuldu.", "Seramik incelemesinin düşünce akışını bozan cümle hangisidir?", ["I", "II", "III", "V", "IV"], 4, "IV. cümle kafedeki menüye geçer; I, II, III ve V parçaları inceleyip biçim önerisi oluşturur."],
  ]),
];

const eight = [
  ...makeCategory("8", "8", "main_idea", [
    ["easy", "İlçe belediyesi, eski otobüs duraklarının yanına yağmur suyu depoları yerleştirdi. Depolanan su, yazın çevredeki fidanları sulamak için kullanıldı. Proje, küçük bir düzenlemenin hem su tüketimini hem de bakım giderlerini azaltabileceğini gösterdi.", "Bu parçanın ana düşüncesi aşağıdakilerden hangisidir?", ["Otobüs durakları yalnızca yolcuları yağmurdan korur.", "Yağmur suyu depolamak fidan bakımında kaynak tasarrufu sağlayabilir.", "Fidanlar yazın sulanmamalıdır.", "Belediyeler durakları kaldırmalıdır.", "Depolardaki su yalnızca içme amacıyla kullanılır."], 1, "B seçeneği, depolanan yağmur suyunun fidan sulama ve tasarruf sonuçlarını birlikte özetler. Diğerleri metinde desteklenmez."],
    ["medium", "Bir okul, öğrencilerin teneffüste telefon kullanmasını tamamen yasaklamak yerine ortak bir dolap oluşturdu. Öğrenciler ders boyunca telefonlarını bu dolaba bıraktı; teneffüste kısa süreliğine alabildi. Bir ay sonunda derse geç kalma ve bildirim nedeniyle bölünme şikâyetleri azaldı.", "Parçada savunulan temel düşünce nedir?", ["Telefonlar öğrencilerin çantasında tutulmalıdır.", "Her teknoloji kullanımı sınırsız bırakılmalıdır.", "Aşırı kısıtlama yerine belirli kurallar koymak, teknoloji kullanımını daha düzenli hâle getirebilir.", "Teneffüslerde ders işlenmelidir.", "Dolaplar yalnızca öğretmenler içindir."], 2, "C seçeneği, tamamen yasaklamak yerine zaman ve yer sınırı getirilmesinin sonuçlarını açıklar. Diğerleri uygulamanın amacını karşılamaz."],
    ["medium", "Kıyı araştırma ekibi, deniz çayırlarının bulunduğu alanlarda tekne demirlerinin iz bıraktığını belirledi. Bunun üzerine bazı koylarda sabit bağlama şamandıraları kuruldu ve teknelere demir atmama uyarısı yapıldı. Bir sonraki sezonda izlerin azaldığı görüldü; ancak ekibin düzenli denetimi sürdürmesi gerektiği vurgulandı.", "Bu parçanın ana düşüncesi hangi seçenekte verilmiştir?", ["Deniz çayırları teknelerin hareketini tamamen engeller.", "Tekneler yalnızca açık denizde demir atabilir.", "Kıyı ekosistemini korumak için önlem almak kadar uygulamayı izlemek de önemlidir.", "Şamandıralar bütün deniz kirliliğini ortadan kaldırır.", "Denetim yapılmadan da izler kendiliğinden yok olur."], 2, "C seçeneği, şamandıra ve uyarının etkisinin denetim gereksinimiyle birlikte ele alınmasını özetler. Diğer seçenekler aşırı veya yanlış genellemelerdir."],
    ["medium", "Bir yayınevi, kitap kapağını seçerken yalnızca tasarım ekibinin oyuna başvurmadı. Farklı yaşlardan okurlara iki taslak gösterildi, hangi ayrıntıların dikkat çektiği soruldu ve geri bildirimler tasarımcıların görüşleriyle karşılaştırıldı. Son kapak, bu verilerden ortaklaşan noktalar çıkarılarak hazırlandı.", "Yayınevinin yaklaşımı hangi ilkeyi vurgulamaktadır?", ["Kapak tasarımında okur görüşü gereksizdir.", "Tek bir uzmanın kararı bütün verilerden üstündür.", "Farklı kaynaklardan gelen geri bildirimleri karşılaştırmak daha isabetli bir karar sağlayabilir.", "Taslaklar okurlara gösterilmemelidir.", "Tasarım yalnızca yaşça büyük okurlara sorulmalıdır."], 2, "C seçeneği, okur geri bildirimleri ile tasarımcı görüşlerinin karşılaştırılmasını doğru biçimde verir. Diğerleri yöntemin tersini savunur."],
    ["medium", "Kent arşivinde aynı olayla ilgili iki gazete haberi bulundu. Biri olayın hemen sonrasındaki gözlemleri, diğeri ise yıllar sonra yapılan bir röportajı içeriyordu. Araştırmacı, haberleri tek başına doğru kabul etmek yerine tarihlerini ve anlatıcıların konumlarını dikkate alarak birlikte okudu.", "Parçanın ana düşüncesi aşağıdakilerden hangisidir?", ["Eski haberler her zaman yanlıştır.", "Bir olayı anlamak için kaynakların zamanı ve bakış açısı da değerlendirilmelidir.", "Röportajlar gazete haberlerinden daha değersizdir.", "Araştırmacı yalnızca ilk haberi kullanmıştır.", "Kaynakların tarihini bilmek gereksizdir."], 1, "B seçeneği, iki kaynağın tarih ve anlatıcı konumlarıyla birlikte değerlendirilmesi gereğini özetler. Diğerleri metindeki yöntemi daraltır."],
    ["medium", "Mahalle kooperatifi, ortak sebze bahçesinde ürün veriminin düştüğünü fark etti. Toprağı değiştirmek yerine sulama saatlerini, gölge oranını ve kullanılan kompost miktarını ayrı ayrı kaydettiler. Üç ay sonra verimin en çok öğle sıcağında yapılan sulamadan etkilendiğini belirleyip programı değiştirdiler.", "Bu parçadan çıkarılabilecek ana düşünce nedir?", ["Verim düşüklüğünün tek nedeni topraktır.", "Bahçede kayıt tutmak zaman kaybıdır.", "Sorunu doğru tanımak için olası etkenleri ayrı ayrı gözlemlemek gerekir.", "Kompost bütün sorunları çözer.", "Sulama saati ürünleri etkilemez."], 2, "C seçeneği, kooperatifin etkenleri ayrı ayrı kaydedip sorunu belirlemesini açıklar. Diğer seçenekler gözlemin sonucuyla çelişir."],
    ["hard", "Bir üniversite kulübü, kampüsteki sessiz çalışma alanlarını artırmak istedi. Öğrencilerin yalnızca gürültü şikâyetlerini toplamakla yetinmeyip günün saatlerine göre doluluk, yankı ve geçiş yoğunluğu ölçtüler. Sonuçlar, bazı odaların küçük müdahalelerle sessizleşebileceğini, bazılarında ise kullanım planının değişmesi gerektiğini gösterdi.", "Parçanın ana düşüncesi aşağıdakilerden hangisidir?", ["Sessiz alanlar yalnızca büyük odalarda oluşturulabilir.", "Gürültü şikâyetleri tek başına bütün çözümü gösterir.", "Bir mekân sorununu çözmek için kullanıcı görüşünü ölçümlerle birlikte değerlendirmek gerekir.", "Kampüste çalışma alanı ihtiyacı yoktur.", "Kullanım planı mekânın sesini hiç etkilemez."], 2, "C seçeneği, şikâyetlerin doluluk ve akustik ölçümlerle birlikte ele alınmasını ve farklı çözümler üretilmesini kapsar. Diğerleri kanıtı daraltır veya reddeder."],
  ]),
  ...makeCategory("8", "8", "supporting_idea", [
    ["easy", "Sınıf gazetesi hazırlanırken haberler önce başlıklarına göre ayrıldı. Spor haberleri mavi, kültür haberleri yeşil bir dosyaya kondu. Editör, bu düzenin aranan haberi daha hızlı buldurduğunu söyledi.", "Haberlerin dosyalara ayrılmasının doğrudan yararı nedir?", ["Gazetenin sayfa sayısını artırmak", "Aranan habere daha hızlı ulaşmak", "Başlıkları kaldırmak", "Haberleri kısaltmak", "Dosyaları renksiz yapmak"], 1, "B seçeneği, renkli dosyalama düzeninin metinde belirtilen doğrudan yararıdır. Diğerleri bu düzenle ilişkilendirilmemiştir."],
    ["easy", "Tren yolculuğunda Elif, pencereden gördüğü istasyon adlarını küçük bir deftere yazdı. Eve dönünce adları haritadaki noktalarla eşleştirdi. Böylece yolculuk boyunca geçtiği yerlerin sırasını daha kolay hatırladı.", "Elif'in deftere not almasının amacı nedir?", ["İstasyonları değiştirmek", "Gördüğü yerleri sıralı biçimde hatırlamak", "Tren biletini saklamak", "Haritayı gizlemek", "Yolculuğu kısaltmak"], 1, "B seçeneği, notların istasyon sırasını hatırlamaya hizmet ettiğini belirtir. Diğer amaçlar metinde yoktur."],
    ["medium", "Fotoğraf kulübü, aynı meydanı sabah ve akşam çekti. Sabah fotoğrafında uzun gölgeler, akşam fotoğrafında ise vitrin ışıkları belirgindi. Öğrenciler, ışığın yalnızca görüntüyü aydınlatmadığını, fotoğrafın dikkat merkezini de değiştirdiğini tartıştı.", "İki fotoğraf arasındaki farkı açıklayan ayrıntı hangisidir?", ["Meydanın başka bir şehre taşınması", "Günün farklı saatlerinde ışığın ve gölgelerin değişmesi", "Kameraların tamamen bozulması", "Öğrencilerin fotoğraf çekmemesi", "Vitrinlerin sabah kapalı olması"], 1, "B seçeneği, sabah-akşam ışık ve gölge farkını doğrudan açıklar. Diğerleri verilen görsel ayrıntılarla uyuşmaz."],
    ["medium", "Tarih öğretmeni, öğrencilerden bir yapının geçmişini araştırırken yalnızca internet sayfalarına bağlı kalmamalarını istedi. Mahallede yaşayan yaşlılarla görüşmeleri, eski fotoğrafları incelemeleri ve buldukları bilgileri tarihleriyle kaydetmeleri gerektiğini söyledi.", "Öğretmenin önerdiği araştırma adımlarından biri hangisidir?", ["Bütün bilgileri tarihsiz yazmak", "Eski fotoğrafları ve sözlü anlatımları da incelemek", "Yalnızca tek bir internet sayfasını kopyalamak", "Görüşme yapmaktan kaçınmak", "Yapının geçmişini tahmin etmek"], 1, "B seçeneği, öğretmenin açıkça önerdiği iki kaynağı verir. Diğerleri yönergenin tersidir."],
    ["medium", "Tiyatro ekibi, sahne dekorunun oyuncuların hareketini daralttığını fark etti. Dekoru tamamen kaldırmak yerine ağır parçaları kenara taşıdı ve geçiş yollarını işaretledi. Prova sırasında oyuncuların duraksamaları azaldı.", "Dekorda yapılan değişikliğin desteklediği ayrıntı nedir?", ["Sahnenin ışıkları kapatılmıştır.", "Geçiş yolları açılarak oyuncuların daha rahat hareket etmesi sağlanmıştır.", "Oyuncuların sayısı azaltılmıştır.", "Dekorun bütün parçaları atılmıştır.", "Provalar iptal edilmiştir."], 1, "B seçeneği, parçaların kenara taşınması ve yolların işaretlenmesiyle oluşan sonucu anlatır. Diğer seçenekler gerçekleşmemiştir."],
    ["medium", "Bir araştırma ekibi, okul servislerinin gecikmesini incelerken yalnızca şoförlerin görüşünü almadı. Öğrencilerin bekleme sürelerini, duraklardaki araç yoğunluğunu ve hava koşullarını da kaydetti. Rapor, gecikmelerin tek bir nedene bağlanamayacağını gösterdi.", "Raporun tek bir nedene varılamayacağını göstermesinde hangi veri etkili olmuştur?", ["Sadece şoförlerin tahminleri", "Bekleme, yoğunluk ve hava koşullarına ilişkin kayıtlar", "Servis güzergâhlarının silinmesi", "Öğrencilerin görüşlerinin yok sayılması", "Hava koşullarının hiç ölçülmemesi"], 1, "B seçeneği, raporda sayılan üç veri grubunu birlikte verir. Diğerleri araştırmanın kapsamını yanlış aktarır."],
    ["hard", "Bir dergi, iklim haberlerini yayımlamadan önce haber metnindeki sıcaklık verilerini ham ölçüm tablolarıyla karşılaştırdı. Bir haberde ortalama yerine en yüksek değer kullanıldığı için başlık değiştirildi ve iki değer arasındaki fark açıklandı. Editör, okurun sonucu doğru yorumlayabilmesi için verinin nasıl seçildiğinin belirtilmesi gerektiğini savundu.", "Başlığın değiştirilmesine yol açan ayrıntı hangisidir?", ["Ham tabloların haberden sonra hazırlanması", "Ortalama yerine en yüksek sıcaklığın kullanılması", "İklim haberlerinin dergide yer almaması", "Editörün verileri okumaması", "Okurun başlığı hiç görmemesi"], 1, "B seçeneği, başlığın neden yanıltıcı bulunduğunu doğrudan belirtir. Diğerleri metindeki düzenlemeyle ilgili değildir."],
  ]),
  ...makeCategory("8", "8", "inference", [
    ["easy", "Sınıfta yapılan ankette öğrencilerin çoğu teneffüste kütüphaneye gitmek istediğini söyledi. Kütüphaneci, yoğunluğu azaltmak için sınıflara farklı günler önerdi ve ilk hafta girişte sıra oluşmadı.", "Bu uygulamanın amacı hakkında hangi çıkarım yapılabilir?", ["Kütüphaneyi tamamen kapatmak", "İlgiyi günlere dağıtarak yoğunluğu yönetmek", "Öğrencilerin kitap okumasını engellemek", "Anketi geçersiz saymak", "Giriş sırasını uzatmak"], 1, "B seçeneği, farklı gün önerisinin yoğunluğu dağıtma amacını çıkarır. Diğerleri sonuçla ters düşer."],
    ["medium", "Yaşlı çınarın çevresine konan banklar yağmurdan sonra uzun süre ıslak kalıyordu. Görevli, bankları kaldırmak yerine ağaç dallarının suyu hangi yöne akıttığını gözlemledi ve bankların yerini birkaç metre değiştirdi. Yeni konumlarda kuruma süresi kısaldı.", "Görevlinin kararından hangi sonuç çıkarılabilir?", ["Bankların malzemesi değiştirilmiştir.", "Sorunun nedeni su akışıyla ilişkili olabileceği için konum düzenlenmiştir.", "Çınar artık sulanmamaktadır.", "Yağmur bankları etkilemez.", "Banklar gövdeye tamamen yaslanmıştır."], 1, "B seçeneği, dallardan gelen su akışının konumla ilişkisini ve buna göre yapılan düzenlemeyi açıklar. Diğerleri metin tarafından desteklenmez."],
    ["medium", "Robotik takımının aracı düz zeminde iyi ilerliyor, fakat halının kenarında tekerlekleri takılıyordu. Öğrenciler motoru güçlendirmek yerine tekerleklerin açısını ve gövdenin yüksekliğini değiştirdi. Araç, aynı motorla farklı yüzeyleri geçebildi.", "Takımın çözümünden hangi çıkarım yapılabilir?", ["Motor gücü her yüzey sorununu çözer.", "Hareket sorunları bazen aracın tasarım ayrıntıları değiştirilerek giderilebilir.", "Halının kenarı düz zeminden daha kolaydır.", "Tekerlek açısı hareketi etkilemez.", "Takım aracı kullanmayı bırakmıştır."], 1, "B seçeneği, motoru değil tasarım ayrıntılarını değiştirmenin işe yaradığını çıkarır. Diğerleri gözleme aykırıdır."],
    ["hard", "Bir kasabanın su tüketimi yaz aylarında arttı. Yetkililer önce bütün sayaçları değiştirmeyi planladı; ancak saatlik veriler, artışın çoğunun bahçe sulama saatlerinde gerçekleştiğini gösterdi. Kampanya, sayaç yenilemek yerine akşam saatlerinde sulamayı ve kaçak kontrolünü teşvik edecek biçimde düzenlendi.", "Yetkililerin plan değiştirmesinden hangi çıkarım yapılabilir?", ["Sayaçlar hiçbir bilgi sağlamaz.", "Veriler, geniş bir müdahale yerine artışın görüldüğü davranışlara odaklanmayı sağlamıştır.", "Bahçe sulama su tüketimini etkilemez.", "Kampanya yalnızca sayaç satmayı amaçlar.", "Saatlik kayıtlar kullanılmamıştır."], 1, "B seçeneği, verilerin müdahaleyi belirli saat ve davranışlara yönelttiğini açıklar. Diğer seçenekler metindeki değişimin tersidir."],
    ["hard", "Arkeologlar, kazıda bulunan iki seramik parçanın aynı kaba ait olup olmadığını anlamak için yalnızca renklerine bakmadı. Kırık yüzeylerin eğimini, hamurun içindeki mineralleri ve parçaların bulunduğu katmanın tarihini karşılaştırdılar. Bulgular, renkleri benzer olsa da parçaların farklı kaplara ait olduğunu gösterdi.", "Bu çalışmadan hangi çıkarım yapılabilir?", ["Renk benzerliği tek başına kökeni kanıtlamaz.", "Seramik parçaların katmanları önemsizdir.", "Kırık yüzeyler her zaman aynı kabı gösterir.", "Mineral incelemesi yapılmamıştır.", "Arkeologlar yalnızca göz kararı kullanmıştır."], 0, "A seçeneği, renk dışında üç ölçütün karşılaştırılması ve farklı sonuca ulaşılmasından çıkarılır. Diğerleri yöntemi yanlış anlatır."],
    ["hard", "Bir haber videosunda kalabalık bir meydanın görüntüsü kullanıldı, fakat görüntünün hangi gün çekildiği belirtilmedi. Araştırmacı aynı meydanın farklı tarihlerdeki kayıtlarını bulunca videodaki kalabalığın özel bir etkinlik gününe ait olabileceğini fark etti. Tarih bilgisi eklenmeden görüntünün genel durumu temsil ettiği söylenemedi.", "Araştırmacının fark ettiği sorun nedir?", ["Görüntünün çözünürlüğü çok yüksektir.", "Tarih belirtilmediği için görüntü, olağan durumu temsil ediyor gibi yorumlanamaz.", "Meydan hiçbir gün kalabalık değildir.", "Etkinlik kayıtları bulunamamıştır.", "Video tamamen sessizdir."], 1, "B seçeneği, tarih eksikliğinin temsil sorununa yol açtığını açıklar. Diğerleri metindeki araştırmayla ilgisizdir."],
    ["hard", "Bir öğrenci, iki çalışma yöntemini denedi: İlk hafta her gün uzun bir oturum yaptı, ikinci hafta ise konuları kısa aralıklarla tekrarladı. Sınav öncesi yaptığı hatalar ikinci yöntemde daha azdı; öğrenci, yalnızca çalışma süresinin değil, tekrarların zamana yayılmasının da etkili olabileceğini düşündü.", "Öğrencinin düşüncesinden hangi çıkarım yapılabilir?", ["Uzun oturumlar her zaman daha etkilidir.", "Öğrenme verimini değerlendirirken tekrarların dağılımı da göz önünde bulundurulmalıdır.", "İkinci hafta hiç çalışılmamıştır.", "Hatalar çalışma yöntemiyle ilişkili değildir.", "Sınav sonucu ölçülmemiştir."], 1, "B seçeneği, iki yöntemin karşılaştırılmasından çıkan aralıklı tekrar çıkarımını verir. Diğerleri deneyi yanlış yorumlar."],
  ]),
  ...makeCategory("8", "8", "completion", [
    ["easy", "Okul koridorundaki duyuru panosu çok kalabalık görünüyordu. Öğrenciler süresi geçen ilanları kaldırıp kalanları konu başlıklarına göre ayırdı; _____.", "Paragrafı en uygun biçimde tamamlayan cümle hangisidir?", ["pano daha düzenli ve okunabilir oldu.", "bütün ilanlar gizlendi.", "öğrenciler duyuru hazırlamayı bıraktı.", "konu başlıkları silindi.", "koridor kullanıma kapatıldı."], 0, "A seçeneği, eski ilanların kaldırılması ve sınıflandırılmasının doğal sonucudur. Diğerleri yapılan düzenlemeyle çelişir."],
    ["medium", "Kamp ekibi, çadırların kurulacağı zemini seçerken yalnızca manzaraya bakmadı. Yağmurda su biriken çukurları, rüzgâr alan açıklığı ve acil çıkışa uzaklığı inceledi; _____.", "Bu parçanın sonuna hangi cümle getirilmelidir?", ["en yüksek ve en uzak noktayı seçti.", "güvenli ve ulaşılabilir alanı tercih etti.", "çukurları çadırların içine taşıdı.", "rüzgârı artıracak bir düzen kurdu.", "acil çıkışı kullanılamaz hâle getirdi."], 1, "B seçeneği, zeminin farklı riskleri incelendikten sonra beklenen kararı tamamlar. Diğerleri güvenlik ölçütlerine aykırıdır."],
    ["medium", "Grafik tasarım öğrencisi, afişteki yazının uzaktan okunmadığını fark etti. Harfleri büyütmek yerine arka planla yazı arasındaki renk farkını artırdı ve başlığı sadeleştirdi; _____.", "Paragraf aşağıdakilerden hangisiyle tamamlanırsa anlam bütünlüğü sağlanır?", ["afiş uzaktan daha kolay okunur oldu.", "başlık tamamen görünmez hâle geldi.", "renk farkı ortadan kalktı.", "yazılar daha karmaşık seçildi.", "öğrenci afişi sergilemedi."], 0, "A seçeneği, renk karşıtlığı ve sadeleştirmenin okunabilirlik sonucunu verir. Diğerleri yapılan değişikliklerin tersidir."],
    ["medium", "Köy kooperatifi, ürünleri aynı gün pazara götürmekte zorlanıyordu. Üyeler hasat saatlerini ve araçların dönüş zamanını çizelgeye yazdı; _____.", "Bu cümle aşağıdakilerden hangisiyle tamamlanmalıdır?", ["ürünlerin bir kısmını tarlada bıraktı.", "taşıma planını çakışmaları azaltacak biçimde yeniden düzenledi.", "çizelgeyi kullanmayı reddetti.", "araçların dönüşünü tamamen iptal etti.", "hasat günlerini rastgele seçti."], 1, "B seçeneği, kayıtların taşıma planını düzenlemek için kullanılmasını tamamlar. Diğerleri kooperatifin amacına ters düşer."],
    ["medium", "Laboratuvarda öğrenciler aynı miktar suyu farklı sıcaklıklarda bekletti. Buharlaşma miktarını ölçerken kapların ağızlarını eşit tuttu; _____.", "Paragrafın sonunu en iyi tamamlayan seçenek hangisidir?", ["ölçümü etkileyebilecek kap farkını denetim altında tuttular.", "bütün kapları farklı boyutlarda seçtiler.", "sıcaklığı hiç kaydetmediler.", "suyu ölçmeden döktüler.", "deneyi yalnızca bir kapla yaptılar."], 0, "A seçeneği, karşılaştırmayı adil kılmak için kap ağızlarının eşit tutulmasının anlamını açıklar. Diğerleri verilen yönteme uymaz."],
    ["hard", "Koro, prova kayıtlarında bazı seslerin diğerlerini örttüğünü fark etti. Şef, yalnızca yüksek söyleyenleri kısmak yerine salonun yankısını, oturma düzenini ve mikrofon mesafesini ölçtü; _____.", "Bu parçayı uygun biçimde tamamlayan cümle hangisidir?", ["dengeli sesi sağlayan düzenlemeyi bu verilerle yaptı.", "koro üyelerinin tamamını değiştirdi.", "yankıyı artırmak için duvarları açtı.", "provaları kaydetmeyi bıraktı.", "mikrofonları rastgele uzaklaştırdı."], 0, "A seçeneği, farklı ölçümlerin ses dengesini kurmak için kullanılmasını tamamlar. Diğerleri şefin sistemli yaklaşımıyla uyuşmaz."],
    ["hard", "Şehir planlamacıları, yeni bisiklet yolunun kavşaklarda kesintiye uğradığını gördü. Kaza kayıtlarını, sürücü görüş mesafesini ve yaya geçiş saatlerini karşılaştırdı; _____.", "Paragraf aşağıdakilerden hangisiyle tamamlanmalıdır?", ["kavşakları bütün araçlara kapattı.", "görüşü artıran ve yaya geçişini düzenleyen bir tasarım önerdi.", "kaza kayıtlarını incelemeyi bıraktı.", "bisiklet yolunu şehir dışına taşıdı.", "yaya geçiş saatlerini yok saydı."], 1, "B seçeneği, üç veri kaynağından hareketle üretilen hedefli tasarımı anlatır. Diğerleri bulgularla bağlantısızdır."],
  ]),
  ...makeCategory("8", "8", "flow", [
    ["easy", "(I) Okul servisi duraklarının isimleri listelendi. (II) Her durağın öğrenciler için uygunluğu konuşuldu. (III) Liste, velilere görüş bildirmeleri için gönderildi. (IV) Spor salonunda yeni topların basınçları ölçüldü. (V) Gelen görüşlere göre iki durağın yeri yeniden değerlendirildi.", "Servis duraklarıyla ilgili akışı bozan cümle hangisidir?", ["I", "II", "III", "V", "IV"], 4, "IV. cümle spor toplarına geçer; I, II, III ve V durak listesinin hazırlanıp değerlendirilmesini sürdürür."],
    ["easy", "(I) Sınıfın enerji tüketimi bir hafta boyunca kaydedildi. (II) En çok elektriğin hangi saatlerde kullanıldığı belirlendi. (III) Kullanılmayan ışıkların kapatılması için hatırlatıcılar hazırlandı. (IV) Okul korosunun şarkı listesi değiştirildi. (V) Sonraki hafta tüketim yeniden ölçüldü.", "Enerji çalışmasının düşünce akışını bozan cümle hangisidir?", ["I", "II", "III", "V", "IV"], 4, "IV. cümle koro listesine geçer; I, II, III ve V enerji ölçümü ve tasarruf önlemlerini anlatır."],
    ["medium", "(I) Nehir kıyısında suyun bulanıklığı ölçüldü. (II) Yağmurdan sonra kıyıya taşınan toprak miktarı kaydedildi. (III) Bitki örtüsünün seyrek olduğu bölümler haritada işaretlendi. (IV) Araştırma ekibinin öğle yemeği için kullandığı tarifler dosyalandı. (V) Ölçümler, bitkisi az alanlarda bulanıklığın arttığını gösterdi.", "Nehir incelemesinde akışı bozan cümle hangisidir?", ["I", "II", "III", "V", "IV"], 4, "IV. cümle yemek tariflerine geçer; I, II, III ve V bulanıklık ile bitki örtüsü arasındaki incelemeyi sürdürür."],
    ["medium", "(I) Fotoğrafçılar gökyüzünün gün doğumundaki renklerini kaydetti. (II) Aynı noktadan gün batımında yeni fotoğraflar çekildi. (III) Görsellerdeki renk tonları ölçülerek karşılaştırıldı. (IV) Yakındaki kafede kullanılan fincanların boyutları sayıldı. (V) Karşılaştırma, ışığın gün içindeki değişimini ortaya koydu.", "Fotoğraf çalışmasının akışını bozan cümle hangisidir?", ["I", "II", "III", "V", "IV"], 4, "IV. cümle fincanlara geçer; I, II, III ve V gökyüzü renklerinin karşılaştırılmasını oluşturur."],
    ["medium", "(I) Tarihî evin duvarlarındaki boya katmanları incelendi. (II) Her katmanın yaklaşık dönemi arşiv fotoğraflarıyla eşleştirildi. (III) Koruma ekibi, en eski katmanı görünür bırakacak alanları belirledi. (IV) Mahalledeki çocuk parkının oyun saatleri duyuruldu. (V) Restorasyon planı bu bulgulara göre hazırlandı.", "Restorasyon sürecinde düşünce akışını bozan cümle hangisidir?", ["I", "II", "III", "V", "IV"], 4, "IV. cümle çocuk parkına geçer; I, II, III ve V boya katmanlarından restorasyon planına ilerler."],
    ["hard", "(I) Göl kıyısında farklı derinliklerde sıcaklık ölçüldü. (II) Derinlik arttıkça çözünmüş oksijen miktarı da kaydedildi. (III) Ölçümler, balıkların görüldüğü bölgelerle eşleştirildi. (IV) Gölün yakınındaki köy fırınlarının çalışma saatleri karşılaştırıldı. (V) Bulgular, bazı balık türlerinin serin ve oksijeni yüksek bölümlerde toplandığını gösterdi.", "Göl ekolojisi incelemesinde akışı bozan cümle hangisidir?", ["I", "II", "III", "V", "IV"], 4, "IV. cümle fırınların çalışma saatlerine geçer; I, II, III ve V su koşulları ile balık dağılımını ilişkilendirir."],
  ]),
];

const highSchool = [
  ...makeCategory("hs", "high-school", "main_idea", [
    ["easy", "Bir üniversite kütüphanesi, öğrencilerin sessiz alan ararken katlar arasında dolaştığını gözledi. Çalışma masalarının doluluk durumunu gösteren küçük ekranlar yerleştirildi. Öğrenciler boş masayı daha hızlı buldu ve koridorlardaki gereksiz hareket azaldı.", "Bu parçanın ana düşüncesi aşağıdakilerden hangisidir?", ["Kütüphanelerde ekran kullanılmamalıdır.", "Doluluk bilgisini görünür kılmak, ortak bir mekânın kullanımını kolaylaştırabilir.", "Öğrenciler kütüphanede çalışmayı bırakmıştır.", "Koridorlar çalışma masalarından daha önemlidir.", "Sessiz alanlar yalnızca üst kattadır."], 1, "B seçeneği, doluluk ekranlarının boş masa bulmayı kolaylaştırıp hareketi azaltmasını özetler. Diğer seçenekler sonucu yanlış geneller."],
    ["medium", "Bir kentte toplu taşıma ücretleri değişirken tartışma yalnızca bilet fiyatına odaklandı. Ulaşım araştırmacıları, aktarma süresini, sefer sıklığını ve farklı gelir gruplarının yolculuk alışkanlıklarını da inceledi. Rapor, adil bir düzenlemenin tek bir rakama bakılarak tasarlanamayacağını ortaya koydu.", "Parçanın temel savı nedir?", ["Bilet fiyatı ulaşımın tek ölçütüdür.", "Aktarma süresi hiçbir yolcuyu etkilemez.", "Ulaşım politikası, fiyatın yanı sıra kullanım koşulları ve farklı grupların ihtiyaçlarıyla değerlendirilmelidir.", "Sefer sıklığı bilet ücretinden bağımsızdır.", "Gelir grupları aynı biçimde yolculuk eder."], 2, "C seçeneği, raporun fiyatı diğer koşullar ve kullanıcı farklılıklarıyla birlikte ele alan sonucunu verir. Diğerleri incelemeyi tek bir etkene indirger."],
    ["medium", "Bir arşivci, aynı yazarın mektuplarını kronolojik sıraya koyduğunda üslubundaki değişimi daha belirgin gördü. Ancak mektupların gönderildiği kişileri ve dönemin toplumsal olaylarını hesaba katmadan bu değişimi yalnızca kişisel bir dönüşüm olarak açıklamanın eksik kalacağını belirtti.", "Bu parçanın ana düşüncesi hangi seçenekte doğru verilmiştir?", ["Mektupların kronolojisi hiçbir bilgi sağlamaz.", "Üslup değişimini anlamak için metin sırası kadar iletişim bağlamı da önemlidir.", "Yazarın üslubu hayatı boyunca aynıdır.", "Toplumsal olaylar mektuplara yansımaz.", "Arşivciler mektupları alıcılarından bağımsız inceler."], 1, "B seçeneği, kronoloji ile alıcı ve dönem bağlamının birlikte gerekliliğini özetler. Diğerleri parçadaki uyarıyı reddeder."],
    ["medium", "İklim bilimcilerinin modeli, kıyı kentindeki taşkın riskini yalnızca yağış miktarıyla açıklayamıyordu. Deniz seviyesindeki yükselme, zeminin betonlaşma oranı ve drenaj kanallarının kapasitesi modele eklendiğinde geçmiş taşkınlar daha isabetli tahmin edildi. Araştırma ekibi, karmaşık olayların çoklu değişkenlerle okunması gerektiğini vurguladı.", "Parçanın ana düşüncesi nedir?", ["Taşkınlar yalnızca yağışla oluşur.", "Modellerde değişken sayısı azaltılmalıdır.", "Bir olayı daha iyi açıklamak, ilgili çevresel ve altyapısal etkenleri birlikte değerlendirmeyi gerektirebilir.", "Betonlaşma taşkın riskini azaltır.", "Geçmiş taşkınlar tahmin edilemez."], 2, "C seçeneği, yağış dışındaki üç değişken eklendiğinde tahminin iyileşmesini açıklar. Diğerleri araştırma sonucuyla çelişir."],
    ["medium", "Bir roman çevirmeni, deyimleri kelime kelime aktardığında metnin mizahının kaybolduğunu gördü. Hedef dilde benzer çağrışım yapan ifadeleri araştırdı, fakat kültürel bir ayrıntının açıklama gerektirdiği yerlerde kısa notlar kullandı. Böylece çeviri hem akıcı kaldı hem de özgün bağlamı korudu.", "Bu parçanın temel düşüncesi aşağıdakilerden hangisidir?", ["Deyimler her dilde aynı biçimde çevrilir.", "Akıcı çeviri için kültürel ayrıntılar silinmelidir.", "İyi çeviri, anlamı hedef dilde doğal kılarken gerektiğinde bağlamı da korur.", "Çevirmen yalnızca sözlük kullanmalıdır.", "Mizah çeviride aktarılamaz."], 2, "C seçeneği, doğal ifadeler ile açıklama notlarının birlikte kullanılmasını özetler. Diğer seçenekler çevirmenin yöntemine uymaz."],
    ["medium", "Üniversite kulübü, gönüllü katılımının düşük olmasını öğrencilerin ilgisizliğiyle açıklıyordu. Yeni bir anket, toplantıların ders saatleriyle çakıştığını ve duyuruların geç yapıldığını gösterdi. Kulüp zamanlamayı değiştirip duyuru takvimini erkene alınca katılım arttı.", "Parçada vurgulanan düşünce nedir?", ["Gönüllülük yalnızca ilgiyle belirlenir.", "Katılım sorunlarını anlamak için kişisel yargı yerine koşulları incelemek gerekir.", "Ders saatleri etkinlikleri etkilemez.", "Duyurular etkinlikten sonra yapılmalıdır.", "Katılım artışı rastlantıdır."], 1, "B seçeneği, ilk yargının koşullar incelenince değişmesini ve düzenlemelerin sonuç vermesini açıklar. Diğerleri kanıtla desteklenmez."],
    ["medium", "Bir sağlık iletişimi kampanyası, yalnızca risk oranlarını vermenin davranış değişikliği yaratmadığını fark etti. Mesajlar, insanların günlük hayatında uygulayabileceği küçük adımları ve bu adımların neden önemli olduğunu gösteren örneklerle yeniden hazırlandı. İzleyen aylarda danışma hattına gelen sorular daha somut hâle geldi.", "Bu parçanın ana düşüncesi hangi seçenekte verilmiştir?", ["Oranlar ne kadar yüksekse mesaj o kadar etkilidir.", "Sağlık iletişiminde uygulanabilir örnekler, soyut risk bilgilerinin etkisini artırabilir.", "Kampanyalar davranışları değiştiremez.", "Danışma hattı yalnızca uzmanlar içindir.", "Günlük adımlar risk oranlarını gizler."], 1, "B seçeneği, soyut oranlara uygulanabilir adımlar eklenmesinin iletişimi güçlendirdiğini özetler. Diğerleri kampanyanın sonucunu tersine çevirir."],
    ["medium", "Bir edebiyat dergisi, genç yazarların metinlerini değerlendirirken yalnızca dilbilgisi hatalarını işaretlememeye karar verdi. Editörler anlatıcı seçimini, olayların ritmini ve metnin okurda oluşturduğu etkiyi de tartıştı. Yazarlar, hangi düzeltmenin metnin amacına hizmet ettiğini açıklayan geri bildirimlerle yeniden yazdı.", "Parçanın ana düşüncesi aşağıdakilerden hangisidir?", ["Metin değerlendirmesi yalnızca yazım denetiminden ibarettir.", "Bir yazıyı geliştirmek için biçimsel doğruluk kadar anlatım tercihlerini ve amacı da ele almak gerekir.", "Editör geri bildirimi yazarı sınırlar.", "Ritim ve anlatıcı seçimi yazıyla ilgili değildir.", "Yeniden yazmak metni mutlaka kötüleştirir."], 1, "B seçeneği, derginin dilbilgisini anlatım amacı ve yapı ile birlikte değerlendirmesini verir. Diğerleri yaklaşımı daraltır."],
    ["hard", "Bir şirket, uzaktan çalışma verimliliğini yalnızca çevrim içi geçirilen saatlerle ölçtü ve ilk raporda artış ilan etti. Çalışanların tamamlanan iş sayısı, toplantı yoğunluğu ve evdeki çalışma koşulları incelendiğinde bazı ekiplerin daha uzun çevrim içi kaldığı hâlde daha az iş bitirdiği görüldü. Şirket ölçütlerini çıktı ve koşulları kapsayacak biçimde yeniledi.", "Bu parçanın ana düşüncesi nedir?", ["Çevrim içi süre verimliliği tek başına gösterir.", "Verimliliği değerlendirmek için görünür bir zaman ölçüsünü sonuçlar ve çalışma koşullarıyla birlikte ele almak gerekir.", "Toplantı sayısı arttıkça çıktı kesinlikle artar.", "Evde çalışma koşulları ölçülemez.", "Şirket ilk raporunu değiştirmemiştir."], 1, "B seçeneği, saat ölçütünün çıktı ve koşullar eklenince yetersiz kalmasını özetler. Diğerleri metindeki düzeltmeyle çelişir."],
  ]),
  ...makeCategory("hs", "high-school", "supporting_idea", [
    ["easy", "Fotoğraf sergisinde her eserin yanında çekildiği yıl ve kullanılan makine yazıyordu. Ziyaretçiler, aynı manzaranın farklı yıllarda nasıl göründüğünü bu bilgiler sayesinde karşılaştırdı.", "Eserlerin yanındaki bilgilerin sağladığı kolaylık nedir?", ["Fotoğrafları gizlemek", "Görüntüleri zaman ve araç bakımından karşılaştırmak", "Sergiyi kısaltmak", "Manzaraları değiştirmek", "Makine kullanımını yasaklamak"], 1, "B seçeneği, yıl ve makine bilgilerinin karşılaştırmaya imkân verdiğini belirtir. Diğerleri metinde amaç olarak verilmez."],
    ["easy", "Kampüs bisikletlerinin gidonuna küçük reflektörler takıldı. Akşam denemesinde araç sürücüleri bisikletlileri daha erken fark etti; güvenlik birimi reflektörlerin düzenli kontrolünü önerdi.", "Akşam denemesinde hangi sonuç gözlenmiştir?", ["Bisikletler daha hızlı gitmiştir.", "Sürücülerin bisikletlileri fark etme süresi kısalmıştır.", "Reflektörler çıkarılmıştır.", "Güvenlik birimi bisikletleri toplamıştır.", "Akşam denemesi yapılmamıştır."], 1, "B seçeneği, reflektörlerin görünürlüğü artırdığı gözlemini aktarır. Diğer seçenekler metne aykırıdır."],
    ["medium", "Bir tarih podcast'inde sunucu, arşiv belgesini okurken belgenin kimin tarafından ve hangi amaçla yazıldığını da açıkladı. Dinleyiciler böylece belgede yer alan bilgileri tarafsız bir liste olarak değil, belirli bir bağlamın ürünü olarak değerlendirdi.", "Sunucunun verdiği ek bilgi ne işe yaramıştır?", ["Belgeyi tarihsiz bırakmıştır.", "Belgenin oluştuğu amacı ve bakış açısını değerlendirmeye yardımcı olmuştur.", "Belgedeki bütün bilgileri geçersiz kılmıştır.", "Podcast'i yalnızca müziğe dönüştürmüştür.", "Dinleyicilerin soru sormasını engellemiştir."], 1, "B seçeneği, yazar ve amaç bilgisinin kaynağı bağlam içinde değerlendirmeyi sağladığını açıklar. Diğerleri bu işlevi karşılamaz."],
    ["medium", "Laboratuvar raporunda araştırmacılar ölçüm sonuçlarının yanında hata payını da verdi. Bir değerin diğerinden biraz yüksek olmasına rağmen hata aralıklarının kesiştiğini belirterek kesin üstünlük iddiasından kaçındılar.", "Hata payının rapora eklenmesinin nedeni nedir?", ["Bütün ölçümleri eşit göstermek", "Yakın sonuçların belirsizliğini dürüstçe belirtmek", "Deneyi tekrarlamamak", "Değerleri gizlemek", "Hata aralıklarını büyütmek"], 1, "B seçeneği, kesişen hata aralıklarının kesin üstünlük yorumunu sınırladığını söyler. Diğerleri bilimsel raporlama amacına aykırıdır."],
    ["medium", "Bir şehir tiyatrosu, bilet fiyatlarını belirlerken yalnızca salon kapasitesine bakmadı. Öğrenciler için indirimli kontenjan, hafta içi doluluk ve yapım maliyetlerini birlikte değerlendirdi. Yeni tarife, düşük talep gören günlerde seyirci sayısını artırdı.", "Yeni tarifenin oluşmasında hangi ayrıntılar birlikte ele alınmıştır?", ["Yalnızca koltuk sayısı", "İndirim, doluluk ve maliyet verileri", "Oyuncuların yaşları", "Sahne ışıklarının rengi", "Seyircilerin ulaşım araçları"], 1, "B seçeneği, tarifede sayılan üç ölçütü birlikte verir. Diğer ayrıntılar metinde yer almaz."],
    ["medium", "Bir derste öğrenciler, yapay zekâ tarafından özetlenen bir makaleyi özgün metinle karşılaştırdı. Özetin ana savı koruduğunu, ancak iki sınırlayıcı koşulu dışarıda bıraktığını saptadılar. Öğretmen, özetleri kullanırken eksilen koşulların ayrıca kontrol edilmesini istedi.", "Öğretmenin uyarısını destekleyen ayrıntı hangisidir?", ["Özet özgün metinden uzundur.", "Özet, ana savı korurken sınırlayıcı koşulları atlamıştır.", "Öğrenciler özgün metni okumamıştır.", "Yapay zekâ hiçbir cümle üretmemiştir.", "Koşullar makalenin dışında verilmiştir."], 1, "B seçeneği, uyarının nedenini oluşturan somut bulgudur. Diğerleri karşılaştırma sonucunu yanlış aktarır."],
    ["medium", "Bir danışmanlık raporunda aynı öneri üç farklı maliyet senaryosuyla sunuldu. Her senaryoda hangi varsayımın değiştiği tabloya yazıldı; okuyucu, önerinin hangi koşulda uygulanabilir olduğunu görebildi.", "Tabloda varsayımların belirtilmesi ne sağlamıştır?", ["Senaryoları birbirinden gizlemeyi", "Önerilerin hangi koşullarda geçerli olduğunu görmeyi", "Maliyetleri tamamen kaldırmayı", "Tek bir sonucu zorunlu kılmayı", "Raporu sayısal verilerden arındırmayı"], 1, "B seçeneği, varsayım değişikliklerinin uygulanabilirlik koşullarını görünür kılmasını açıklar. Diğerleri tablo işlevinin tersidir."],
    ["hard", "Bir haber sitesi, anket sonucunu 'toplumun çoğu böyle düşünüyor' başlığıyla yayımladı. Veri ekibi örneklemin yalnızca bir şehirde yaşayan ve çevrim içi ankete katılan kişilerden oluştuğunu, yaş dağılımının da dengeli olmadığını belirledi. Başlık, bu sınırlılıklar eklenerek yeniden yazıldı.", "Başlığın yeniden yazılmasını gerektiren temel ayrıntı hangisidir?", ["Anket sorularının kısa olması", "Örneklemin dar ve dengesiz olması nedeniyle sonucun tüm topluma genellenememesi", "Veri ekibinin başlığı beğenmemesi", "Çevrim içi anketlerin her zaman geçersiz olması", "Şehir sayısının toplumdan fazla olması"], 1, "B seçeneği, örneklem sınırlılıklarının geniş genellemeyi geçersiz kıldığını belirtir. Diğerleri rapordaki gerekçeyi karşılamaz."],
  ]),
  ...makeCategory("hs", "high-school", "inference", [
    ["easy", "Kulüp toplantısında konuşma sırası için bir zamanlayıcı kullanıldı. Daha önce sözünü tamamlayamayan öğrenciler, bu uygulamayla düşüncelerini daha kısa ve düzenli ifade etti.", "Bu uygulamadan hangi sonuç çıkarılabilir?", ["Toplantıda hiç konuşulmamıştır.", "Süre sınırı, katılımı daha dengeli hâle getirebilir.", "Zamanlayıcı yalnızca başkanı ilgilendirir.", "Öğrenciler düşüncelerini yazılı vermiştir.", "Konuşma sırası kaldırılmıştır."], 1, "B seçeneği, zamanlayıcının konuşma fırsatlarını dengelediği gözleminden çıkarılır. Diğerleri metinde yoktur."],
    ["medium", "Bir araştırmacı, şiirlerdeki 'gece' sözcüğünün geçtiği dizeleri işaretledi. Sözcüğün bazı şiirlerde yalnızlığı, bazılarında ise dinlenmeyi anlattığını gördü; anlamı tek bir karşılığa indirmeden her şiirin bağlamını inceledi.", "Araştırmacının yönteminden hangi çıkarım yapılabilir?", ["Bir sözcük her metinde aynı anlamı taşır.", "Sözcük anlamını belirlemek için kullanıldığı bağlam dikkate alınmalıdır.", "Şiirlerde bağlam önemsizdir.", "'Gece' yalnızca zaman bildirir.", "Araştırmacı dizeleri işaretlememiştir."], 1, "B seçeneği, aynı sözcüğün farklı bağlamlarda farklı anlamlar taşımasından çıkarılır. Diğerleri bulguyla çelişir."],
    ["medium", "Bir şehir, yeni tramvay hattının gürültüsünü değerlendirmek için hattın yanındaki ve uzaktaki binalarda ölçüm yaptı. Gündüz değerleri birbirine yakındı, fakat gece hattın yanındaki binalarda fark büyüdü. Belediye gece seferlerinin hızını ve bakım saatlerini yeniden planladı.", "Belediyenin plan değişikliğinden hangi çıkarım yapılabilir?", ["Gürültü yalnızca uzaktaki binalarda duyulur.", "Gürültünün zaman ve mesafeye göre değiştiği dikkate alınmıştır.", "Gece seferleri tamamen kaldırılmıştır.", "Ölçümler gündüz yapılmamıştır.", "Bakım saatleri gürültüyü etkilemez."], 1, "B seçeneği, ölçümlerde görülen zaman ve mesafe farkının planlamaya yansıdığını çıkarır. Diğerleri metindeki değişimi yanlış yorumlar."],
    ["hard", "Bir ekonomi yazısı, işsizlik oranı düşerken yeni işlerin çoğunun kısa süreli olduğunu belirtti. Yazar, yalnızca orandaki düşüşe bakmanın istihdamın niteliğini göstermeyeceğini; ücret, süre ve sosyal güvence verilerinin de incelenmesi gerektiğini savundu.", "Yazarın savından hangi sonuç çıkarılabilir?", ["İşsizlik oranı hiçbir bilgi vermez.", "İstihdamdaki nicel iyileşme, işlerin niteliği değerlendirilmeden yeterli bir gösterge değildir.", "Kısa süreli işler her zaman güvencelidir.", "Ücret verileri işsizlikten bağımsızdır.", "Oran düştüğünde bütün çalışanlar kazanır."], 1, "B seçeneği, orandaki düşüşün iş niteliği verileri olmadan eksik kalacağını ifade eder. Diğerleri yazarın uyarısını aşırılaştırır."],
    ["hard", "Bir romanda anlatıcı, çocukluk anılarını aktarırken bazı tarihleri karıştırdığını kabul eder. Buna rağmen aynı evin kokusunu ve sesini ayrıntılı biçimde hatırlar. Okur, anlatıcının güvenilirliğini ya tamamen reddetmek ya da bütünüyle kabul etmek yerine, anıların farklı türde doğruluklar taşıyabileceğini düşünmeye yönelir.", "Bu parçadan hangi çıkarım yapılabilir?", ["Tarihleri karışan anlatıcının bütün anıları değersizdir.", "Bellek, olgusal ayrıntılarda yanılabilirken duyusal izleri koruyabilir.", "Anlatıcı hiçbir ayrıntıyı hatırlamaz.", "Okur anlatıcıya kesinlikle inanmamalıdır.", "Duyularla ilgili anılar tarihlerden daha yanlıştır."], 1, "B seçeneği, tarih karışıklığı ile duyusal ayrıntıların birlikte verilmesinden çıkarılır. Diğerleri güvenilirliği bütünüyle reddeder veya tersine çevirir."],
    ["hard", "Bir üniversite, çevrim içi derslerde kamerayı açma zorunluluğunu kaldırdı. Katılım sayısı artmış görünse de sözlü tartışmalara katkı azaldı; erişim kayıtları, bazı öğrencilerin dersi yalnızca arka planda açık tuttuğunu gösterdi. Değerlendirme sistemi, görünürlük yerine kısa tartışma notları ve görev teslimlerini de içerecek biçimde değiştirildi.", "Değerlendirme sistemindeki değişiklik hangi çıkarıma dayanır?", ["Kamera görüntüsü öğrenmenin tek kanıtıdır.", "Katılımı ölçmek için görünürlük dışındaki etkinlik göstergeleri de gereklidir.", "Görev teslimleri katılımla ilgisizdir.", "Çevrim içi derslerde tartışma yapılamaz.", "Erişim kayıtları bütün öğrenmeyi kanıtlar."], 1, "B seçeneği, kamera görünürlüğünün katılımı tek başına göstermediği bulgusundan çıkarılır. Diğerleri ölçme sorununu çözmez."],
    ["hard", "Bir biyolog, aynı tür iki kelebeğin kanat desenlerini farklı sıcaklıklarda yetişen larvalarda karşılaştırdı. Desenler değişse de değişimin yönü her popülasyonda aynı değildi; biyolog, çevre etkisinin genetik farklılıklarla birlikte değerlendirilmesi gerektiğini yazdı.", "Biyoloğun sonucundan hangi çıkarım yapılabilir?", ["Sıcaklık kanat desenini hiç etkilemez.", "Çevresel etkinin sonucu, popülasyonların genetik özelliklerine göre değişebilir.", "İki popülasyon tamamen aynıdır.", "Desen değişimi yalnızca rastlantıdır.", "Genetik farklılıklar araştırmada dışlanmıştır."], 1, "B seçeneği, aynı çevresel değişimin popülasyonlarda farklı yönler göstermesinden çıkarılır. Diğerleri bulgunun anlamını reddeder."],
    ["hard", "Bir mahkeme kararını inceleyen hukuk öğrencisi, sonuç bölümünü okumadan önce tarafların iddialarını ve mahkemenin dayandığı kanıtları ayrı ayrı çıkardı. Sonuçla gerekçenin aynı yöne işaret etmediği bir noktayı fark edince kararın yalnızca hüküm cümlesiyle anlaşılamayacağını savundu.", "Öğrencinin yönteminden hangi çıkarım yapılabilir?", ["Bir kararı anlamak için yalnızca sonuç bölümü yeterlidir.", "Hüküm ile gerekçe arasındaki ilişkiyi görmek için iddia ve kanıtların izlenmesi gerekir.", "Kanıtlar karar metninde yer almaz.", "Tarafların iddiaları hukuken önemsizdir.", "Öğrenci gerekçeyi incelememiştir."], 1, "B seçeneği, hükmün gerekçe ve kanıt zincirinden bağımsız okunamayacağını çıkarır. Diğerleri yöntemin tersini söyler."],
  ]),
  ...makeCategory("hs", "high-school", "completion", [
    ["easy", "Üniversite laboratuvarında öğrenciler deney notlarını aynı başlıklar altında topladı. Böylece _____.", "Paragrafı uygun biçimde tamamlayan cümle hangisidir?", ["sonuçları farklı deneyler arasında karşılaştırmak kolaylaştı.", "not tutmaya gerek kalmadı.", "başlıklar deneyden çıkarıldı.", "ölçümler kayboldu.", "laboratuvar kapatıldı."], 0, "A seçeneği, ortak başlıkların karşılaştırma kolaylığı sağlamasını tamamlar. Diğerleri düzenlemenin amacına aykırıdır."],
    ["medium", "Bir belgesel ekibi, röportaj sorularını çekimden önce denedi. Bazı soruların iki farklı konuyu aynı anda sorduğunu fark edip onları ayırdı; _____.", "Bu parçanın sonuna hangi cümle getirilmelidir?", ["röportajda cevapların daha açık olması için soruları yeniden düzenledi.", "soruların tamamını cevapsız bıraktı.", "konukların konu dışına çıkmasını istedi.", "çekimi sorular olmadan yaptı.", "aynı iki konuyu tek soruda birleştirdi."], 0, "A seçeneği, deneme sonrası soruları ayırmanın açık cevap alma amacını tamamlar. Diğerleri yapılan düzeltmeyle çelişir."],
    ["medium", "Bir şehir plancısı, meydandaki oturma alanlarını tasarlarken yalnızca estetik çizimlere bakmadı. Güneşin gün içindeki yönünü, yaya akışını ve engelli erişimini harita üzerinde işaretledi; _____.", "Paragraf aşağıdakilerden hangisiyle tamamlanmalıdır?", ["oturma alanlarını bu üç koşulu dengeleyecek biçimde yerleştirdi.", "haritaları kullanmayı bıraktı.", "yaya akışını meydandan kaldırdı.", "erişim yollarını daralttı.", "güneş yönünü hesaba katmadı."], 0, "A seçeneği, plancının üç veriyi tasarıma dönüştürmesini tamamlar. Diğerleri çalışma yönteminin tersidir."],
    ["medium", "Bir araştırma makalesinde yazar, ilk hipotezinin deney sonuçlarıyla tam örtüşmediğini belirtti. Beklenmeyen bulguları dışlamak yerine yeni bir açıklama önerdi ve _____.", "Bu cümlenin en uygun devamı hangisidir?", ["verileri hipoteze uydurmak için değiştirdi.", "açıklamanın başka deneylerle sınanması gerektiğini vurguladı.", "beklenmeyen sonuçları rapordan çıkardı.", "deneyi tekrarlamayı gereksiz buldu.", "hipotezini kanıtlanmış ilan etti."], 1, "B seçeneği, yeni açıklamanın sınanabilir tutulmasını tamamlar. Diğerleri bilimsel tutuma aykırıdır."],
    ["hard", "Bir tarihçi, salgın dönemine ait günlükleri incelerken yazarların hastalıkla ilgili korkularını ve o günkü bilgi sınırlarını ayrı ayrı not etti. Günlüklerdeki yanlış tahminleri bugünkü bilgilerle düzeltmek yerine, dönemin koşulları içinde açıklamaya çalıştı; _____.", "Paragrafın sonuna hangi cümle getirilmelidir?", ["böylece geçmiş metinleri kendi zamanlarının bilgi çerçevesi içinde değerlendirdi.", "günlükleri günümüz kaynaklarıyla değiştirdi.", "yanlış tahminleri tarih dışı saydı.", "yazarların bütün korkularını gerçek kabul etti.", "dönemin koşullarını incelemeyi bıraktı."], 0, "A seçeneği, tarihçinin anakronik yargıdan kaçınan yöntemini tamamlar. Diğerleri bu yöntemi bozar."],
    ["hard", "Bir veri gazetecisi, grafik başlığının eksen ölçeği nedeniyle küçük farkları büyük gösterdiğini fark etti. Ölçeği sıfırdan başlatıp farkın gerçek büyüklüğünü ayrıca açıklamayı seçti; _____.", "Bu paragraf aşağıdakilerden hangisiyle tamamlanır?", ["grafiği daha çarpıcı göstermek için ekseni daralttı.", "okurun görsel izlenim ile sayısal farkı karıştırmasını önlemeye çalıştı.", "verileri grafikten çıkardı.", "ölçeği açıklamadan bıraktı.", "küçük farkları önemli saymadı."], 1, "B seçeneği, eksen düzeltmesinin ve açıklamanın yanıltıcı görsel etkiyi azaltma amacını verir. Diğerleri gazetecinin seçimine ters düşer."],
    ["hard", "Bir romanın farklı baskılarında aynı bölümün noktalama işaretleri değişmişti. Editör, değişikliği doğrudan hata saymadan dönemin yazım alışkanlıklarını ve yayınevinin müdahale notlarını karşılaştırdı; _____.", "Paragrafı en uygun biçimde tamamlayan seçenek hangisidir?", ["baskılar arasındaki farkın metnin anlamını nasıl etkilediğini gerekçeli biçimde açıkladı.", "bütün baskılardan birini rastgele seçti.", "noktalama işaretlerini tamamen kaldırdı.", "müdahale notlarını incelemedi.", "dönem alışkanlıklarını önemsiz buldu."], 0, "A seçeneği, editörün karşılaştırmalı incelemesini anlam etkisiyle sonuçlandırır. Diğerleri verilen yöntemi yok sayar."],
    ["hard", "Bir psikoloji çalışmasında katılımcılar, anket sorularının sırasının cevaplarını etkileyebileceğini belirtti. Araştırmacılar soruların sırasını farklı gruplarda değiştirip sonuçları karşılaştırdı; _____.", "Bu cümle aşağıdakilerden hangisiyle tamamlanırsa anlam bütünlüğü sağlanır?", ["sıra etkisini ölçmeden tek bir sonuç açıkladılar.", "soru sırasının etkisini denetleyerek bulguların güvenilirliğini artırdılar.", "anketi bütün gruplardan kaldırdılar.", "katılımcıların cevaplarını değiştirdiler.", "sıra değişikliğini rapora yazmadılar."], 1, "B seçeneği, farklı sıraları karşılaştırmanın karıştırıcı etkeni denetleme amacını tamamlar. Diğerleri araştırma tasarımını bozar."],
  ]),
  ...makeCategory("hs", "high-school", "flow", [
    ["easy", "(I) Üniversite bahçesindeki ağaçların gölge alanları haritalandı. (II) Öğrencilerin bu alanlarda geçirdiği süreler kaydedildi. (III) Harita ve süre kayıtları birlikte değerlendirildi. (IV) Kampüs kafesinin yeni tatlı seçenekleri oylandı. (V) Sonuçlar, hangi gölge alanların daha çok kullanıldığını gösterdi.", "Kampüs gölge alanlarıyla ilgili akışı bozan cümle hangisidir?", ["I", "II", "III", "V", "IV"], 4, "IV. cümle kafedeki tatlılara geçer; I, II, III ve V gölge alanlarını ölçüp kullanımını değerlendirme zincirini sürdürür."],
    ["easy", "(I) Kütüphane veri tabanında konu başlıkları güncellendi. (II) Eski başlıklarla yapılan aramaların sonuçları test edildi. (III) Eksik kayıtlar yeni anahtar sözcüklerle eşleştirildi. (IV) Kampüs servislerinin lastik basınçları kontrol edildi. (V) Güncelleme sonrasında arama sonuçlarının isabeti yeniden ölçüldü.", "Veri tabanı çalışmasında akışı bozan cümle hangisidir?", ["I", "II", "III", "V", "IV"], 4, "IV. cümle servis lastiklerine geçer; I, II, III ve V veri tabanını güncelleme ve test etme sürecini anlatır."],
    ["medium", "(I) Şehir arşivindeki haritalar taranarak dijitalleştirildi. (II) Haritalardaki sokak adları güncel kayıtlarla karşılaştırıldı. (III) Adı değişen sokaklar için tarih aralıkları belirlendi. (IV) Arşiv binasının ziyaretçi kafesi için menü taslağı hazırlandı. (V) Dijital haritalar, kentin büyüme yönünü inceleyen araştırmacılara açıldı.", "Harita arşivinin düşünce akışını bozan cümle hangisidir?", ["I", "II", "III", "V", "IV"], 4, "IV. cümle kafe menüsüne geçer; I, II, III ve V haritaların dijitalleştirilip araştırmaya açılmasını oluşturur."],
    ["medium", "(I) Deniz araştırmacıları kıyıdaki plastik parçalarını türlerine göre ayırdı. (II) Parçaların hangi akıntı yönünden geldiği modellendi. (III) Temizleme ekiplerinin çalışacağı koylar bu modele göre seçildi. (IV) Araştırma gemisinde kullanılan kahve makinelerinin enerji tüketimi karşılaştırıldı. (V) Seçilen koylarda temizlikten sonra yeni örnekler toplandı.", "Kıyı araştırmasında akışı bozan cümle hangisidir?", ["I", "II", "III", "V", "IV"], 4, "IV. cümle kahve makinelerine geçer; I, II, III ve V plastik kaynaklarını belirleyip temizlik sonucunu izler."],
    ["hard", "(I) Bir dilbilimci, bölgesel ağızlarda kullanılan aynı sözcükleri kaydetti. (II) Sözcüklerin hangi yaş gruplarında ve hangi bağlamlarda söylendiğini sınıflandırdı. (III) Ses kayıtlarının yazıya aktarımında konuşma özelliklerini koruyan işaretler kullandı. (IV) Araştırma merkezinin koridorlarına yeni yön levhaları asıldı. (V) Bulgular, sözcük seçiminin yaş ve kullanım bağlamıyla birlikte değiştiğini gösterdi.", "Dil araştırmasının akışını bozan cümle hangisidir?", ["I", "II", "III", "V", "IV"], 4, "IV. cümle yön levhalarına geçer; I, II, III ve V ağız verilerinin sınıflandırılıp yorumlanmasını sürdürür."],
    ["hard", "(I) Gökbilim ekibi, teleskop görüntülerindeki parlaklık değerlerini kalibre etti. (II) Farklı gecelerde alınan görüntüler aynı ölçekte birleştirildi. (III) Parlaklığı değişen yıldız adayları için zaman çizelgesi çıkarıldı. (IV) Gözlemevinin konukevinde oda numaraları yeniden düzenlendi. (V) Adayların gerçekten değişken olup olmadığı yeni gözlemlerle sınandı.", "Gökbilim çalışmasında akışı bozan cümle hangisidir?", ["I", "II", "III", "V", "IV"], 4, "IV. cümle konukevi odalarına geçer; I, II, III ve V görüntüleri işleyip yıldız adaylarını sınama sürecini anlatır."],
    ["hard", "(I) Bir hukuk tarihçisi, eski mahkeme kararlarındaki kavramları dönem sözlükleriyle karşılaştırdı. (II) Aynı kavramın farklı yıllardaki kullanımını karar gerekçeleriyle birlikte inceledi. (III) Değişimin, mevzuat ve toplumsal tartışmalarla hangi noktalarda kesiştiğini haritaladı. (IV) Tarih fakültesinin mezuniyet töreni için oturma düzeni çizildi. (V) Çalışma, kavramların anlamının hukuk metinlerinde zamanla yeniden kurulduğunu savundu.", "Hukuk tarihi incelemesinde düşünce akışını bozan cümle hangisidir?", ["I", "II", "III", "V", "IV"], 4, "IV. cümle mezuniyet törenine geçer; I, II, III ve V kavramların tarihsel kullanımını inceleyip sonuca bağlar."],
    ["hard", "(I) İklim araştırmacıları, şehir içindeki ısı adası ölçümlerini mahalle bazında ayırdı. (II) Beton yüzey oranı ve ağaç örtüsü haritaları bu ölçümlere eklendi. (III) Gece sıcaklıklarının gündüze göre daha yavaş düştüğü bölgeler belirlendi. (IV) Araştırma enstitüsünün kütüphane üyelik kartları yenilendi. (V) Bulgular, serinletme yatırımlarının yalnızca gündüz sıcaklıklarına göre planlanamayacağını gösterdi.", "İklim çalışmasının akışını bozan cümle hangisidir?", ["I", "II", "III", "V", "IV"], 4, "IV. cümle üyelik kartlarına geçer; I, II, III ve V ısı adası verilerinden planlama sonucuna ilerler."],
  ]),
];

// Keep answer-position bias low in the new material. The pilot remains untouched;
// only distractor order is changed, so each row's semantic answer is preserved.
const rebalanceNewRows = (rows) => {
  const remaining = [23, 23, 21, 23, 5];
  const letters = ["A", "B", "C", "D", "E"];
  let cursor = 0;
  for (const item of rows) {
    if (item.category === "flow") continue;
    while (cursor < remaining.length && remaining[cursor] === 0) cursor += 1;
    if (cursor >= remaining.length) break;
    const target = cursor;
    remaining[target] -= 1;
    const old = item.correct_index;
    if (old !== target) {
      [item.options[old], item.options[target]] = [item.options[target], item.options[old]];
      item.correct_index = target;
      item.explanation = item.explanation.replace(/^([A-E])(?=\s+seçeneği)/iu, letters[target]);
    }
    const explanationSentences = item.explanation.split(/(?<=\.)\s+/u);
    for (let sentenceIndex = 1; sentenceIndex < explanationSentences.length; sentenceIndex += 1) {
      if (/^\s*[A-E](?:\s*,|\s+ve\s+|\s+ise\s+|\s+gereğinden)/u.test(explanationSentences[sentenceIndex])) {
        explanationSentences[sentenceIndex] = "Diğer seçenekler metinle uyuşmaz.";
      }
    }
    item.explanation = explanationSentences.join(" ");
  }
  return rows;
};

const newRows = rebalanceNewRows([...fourFive, ...eight, ...highSchool]);

// Flow items use a plausible but non-central detail rather than an absurd
// outlier; the reader must follow the investigation's purpose to spot it.
const flowDisruptorVariants = {
  "v2-4-5-flow-02": "Kompost kutusunun yanındaki saksıların renkleri seçildi",
  "v2-4-5-flow-03": "Bisiklet yolundaki dinlenme banklarının boyası yenilendi",
  "v2-4-5-flow-04": "Arı kovanlarının yanındaki bal kavanozları etiketlendi",
  "v2-4-5-flow-05": "Parktaki salıncakların yanında çimlerin biçim yüksekliği ölçüldü",
  "v2-4-5-flow-06": "Hava istasyonundaki veri ekranlarının yazı boyutu değiştirildi",
  "v2-4-5-flow-07": "Müze deposundaki rafların taşıma kapasitesi kontrol edildi",
  "v2-4-5-flow-08": "Göl kıyısındaki balıkçı kulübelerinin boya tarihleri karşılaştırıldı",
  "v2-8-flow-02": "Servis bekleme alanındaki oturma banklarının sayısı belirlendi",
  "v2-8-flow-03": "Koridordaki prizlerin kapak renkleri yenilendi",
  "v2-8-flow-04": "Nehir kıyısındaki yürüyüş yolunun taşları numaralandırıldı",
  "v2-8-flow-05": "Fotoğrafçıların kullandığı tripodların ağırlıkları kaydedildi",
  "v2-8-flow-06": "Restorasyon alanının ziyaretçi yönlendirme afişleri yenilendi",
  "v2-8-flow-07": "Göl kıyısındaki balıkçı kulübelerinin boya tarihleri karşılaştırıldı",
  "v2-hs-flow-02": "Kampüs bahçesindeki bisiklet park yerleri numaralandırıldı",
  "v2-hs-flow-03": "Kütüphane kullanıcı kartlarının son kullanım tarihleri listelendi",
  "v2-hs-flow-04": "Arşiv binasının ziyaretçi kafesindeki masa düzeni çizildi",
  "v2-hs-flow-05": "Araştırma gemisinin motor bakım saatleri kaydedildi",
  "v2-hs-flow-06": "Dil laboratuvarındaki bilgisayarların bakım tarihleri yazıldı",
  "v2-hs-flow-07": "Teleskop kubbesinin açılma saatleri karşılaştırıldı",
  "v2-hs-flow-08": "Araştırma enstitüsünün otopark gölgelikleri sayıldı",
};
const flowExplanationVariants = {
  "v2-4-5-flow-02": "saksı renklerine geçer",
  "v2-4-5-flow-03": "dinlenme banklarının boyasına geçer",
  "v2-4-5-flow-04": "bal kavanozlarının etiketlerine geçer",
  "v2-4-5-flow-05": "çimlerin biçim yüksekliğine geçer",
  "v2-4-5-flow-06": "veri ekranlarının yazı boyutuna geçer",
  "v2-4-5-flow-07": "müze raflarının taşıma kapasitesine geçer",
  "v2-4-5-flow-08": "balıkçı kulübelerinin boya tarihine geçer",
  "v2-8-flow-02": "bekleme alanı banklarına geçer",
  "v2-8-flow-03": "priz kapaklarının renklerine geçer",
  "v2-8-flow-04": "yürüyüş yolu taşlarına geçer",
  "v2-8-flow-05": "tripodların ağırlığına geçer",
  "v2-8-flow-06": "ziyaretçi afişlerine geçer",
  "v2-8-flow-07": "balıkçı kulübelerinin boya tarihine geçer",
  "v2-hs-flow-02": "bisiklet park yerlerine geçer",
  "v2-hs-flow-03": "kullanıcı kartlarına geçer",
  "v2-hs-flow-04": "kafe masa düzenine geçer",
  "v2-hs-flow-05": "gemi motorlarının bakımına geçer",
  "v2-hs-flow-06": "laboratuvar bilgisayarlarının bakımına geçer",
  "v2-hs-flow-07": "teleskop kubbesinin açılışına geçer",
  "v2-hs-flow-08": "otopark gölgeliklerine geçer",
};
for (const item of newRows) {
  const replacement = flowDisruptorVariants[item.id];
  if (replacement) {
    item.passage = item.passage.replace(/\(IV\) [^.]+\./u, `(IV) ${replacement}.`);
    item.explanation = item.explanation.replace(/^IV\. cümle [^;]+;/u, `IV. cümle ${flowExplanationVariants[item.id]};`);
  }
}

// Targeted post-audit repairs. Only these twelve new IDs are changed; pilot
// records and every other generated record retain their existing values.
const targetedDifficultyRepairs = {
  "v2-4-5-main_idea-11": {
    difficulty: "hard",
    options: [
      "Kısa yolun dik olması, uzun yolun her koşulda daha güvenli olduğunu gösterir.",
      "Güvenlik açısından trafik durumu, yolun uzunluğu ve yüzey koşullarından daha önemlidir.",
      "Bisiklet rotası seçerken yolun uzunluğu, trafik, eğim ve hava koşulları birlikte karşılaştırılmalıdır.",
      "Yağmurdan sonra oluşan su birikintileri, uzun yolu otomatik olarak elverişsiz yapar.",
      "Servis araçlarıyla kesişmeyen yol, başka koşullara bakılmadan seçilmelidir.",
    ],
    correct_index: 2,
    explanation: "C seçeneği, iki güzergâhın uzunluk, trafik, eğim ve yağmur koşulları birlikte değerlendirilerek karşılaştırılmasını kapsar. A ve D gerçek bir ayrıntıyı tek başına kesin ölçüte dönüştürür; B ise trafik koşulunu diğer verilerin önüne geçirir. E, bir koşulu yeterli saydığı için parçanın çoklu değerlendirme yaklaşımını daraltır.",
  },
  "v2-4-5-inference-06": {
    difficulty: "hard",
    options: [
      "Kuşların erken gelişinde böcek artışı tek başına belirleyici olabilir.",
      "Rüzgâr zayıfladığında kuşların daha erken gelmesi beklenir.",
      "Ekip, erken geliş ile çevresel değişkenler arasındaki ilişkiyi doğrulamak için uzun dönemli karşılaştırmayı gerekli görmüştür.",
      "İlkbahar gözlemleri, göç zamanının her yıl aynı biçimde değiştiğini göstermiştir.",
      "Kuşların geliş zamanını açıklamak için yalnızca kıyı koşullarını incelemek yeterlidir.",
    ],
    correct_index: 2,
    explanation: "C seçeneği, kuşların erken gelişiyle birlikte rüzgâr ve böcek verilerinin kaydedilmesini ve ekibin birkaç yıl karşılaştırma kararı almasını birleştirir. A ve B tek bir değişkenden nedensellik çıkarır; D ve E ise gözlemin kapsamını gereksiz biçimde geneller.",
  },
  "v2-4-5-completion-07": {
    difficulty: "medium",
    options: [
      "davulun ritmi korunurken diğer çalgıların duyulurluğu da sağlandı.",
      "ses dengesi için yalnızca davulun kısılmasının yeterli olacağını düşündüler.",
      "mikrofonların yeri değişmeden de aynı dengeye ulaşabileceklerini varsaydılar.",
      "ritim ile melodinin birbirini örtmemesi için prova düzenini yeniden kurdular.",
      "sorunun kaynağını sadece davulcunun çalma biçiminde aramadılar.",
    ],
    correct_index: 0,
    explanation: "A seçeneği, mikrofon konumu ve ses düzeylerinin birlikte ayarlanmasından beklenen dengeli sonucu verir. B önceki başarısız denemeyi tekrarlar; C yapılan ayarın etkisini yok sayar. D ve E sürecin olası yorumları olsa da paragrafın doğrudan sonucunu değil, farklı bir açıklamayı öne çıkarır.",
  },
  "v2-4-5-flow-06": {
    difficulty: "medium",
    passage: "(I) Park görevlisi salıncak zincirlerinin bağlantılarını ve oturma yüzeylerini kontrol etti. (II) Gevşek bağlantılar sıkıştırıldı, yüzeylerdeki kirler temizlendi. (III) Bakım öncesi ve sonrası salıncakların hareket mesafeleri ölçülerek karşılaştırıldı. (IV) Salıncak alanındaki zemin kaplaması için farklı renk örnekleri yerleştirildi. (V) Güvenlik ölçümleri uygun çıkınca salıncaklar kullanıma açıldı.",
    question: "Salıncak bakımının aşamalarını anlatan numaralı cümlelerden hangisi düşünce akışını bozmaktadır?",
    options: ["I", "II", "III", "V", "IV"],
    correct_index: 4,
    explanation: "IV. cümle zemin kaplamasının renk seçimine geçer; I, II, III ve V ise zincir ve yüzey kontrolü, onarım, ölçüm ve güvenlik sonucundan oluşan bakım zincirini sürdürür.",
  },
  "v2-8-main_idea-08": {
    difficulty: "hard",
    options: [
      "Gürültü şikâyetleri, çalışma alanlarını yeniden düzenlemek için yeterli göstergedir.",
      "Sessiz çalışma alanlarını iyileştirmek, kullanıcı deneyimini farklı ölçümlerle birlikte değerlendirmeyi gerektirir.",
      "Yankı sorunu bulunan odalarda kullanım planını değiştirmek, fiziksel müdahaleden daha etkilidir.",
      "Doluluk verileri, sessiz alan ihtiyacını gürültü ölçümlerinden daha iyi gösterir.",
      "Her oda küçük bir akustik müdahaleyle sessizleştirilebilir.",
    ],
    correct_index: 1,
    explanation: "B seçeneği, şikâyetlerin doluluk, yankı ve geçiş ölçümleriyle birlikte değerlendirilmesini ve odalara göre farklı çözümler geliştirilmesini kapsar. A tek veri kaynağını yeterli sayar; C ve D çözümü tek bir etkene indirger. E ise bütün odalar için aynı sonucu varsayar.",
  },
  "v2-8-inference-06": {
    difficulty: "hard",
    options: [
      "Renk benzerliği, parçaların aynı kaba ait olma ihtimalini artırdığı için ilk inceleme için yeterlidir.",
      "Kırık yüzey eğimi ve mineral yapısı, parçaların aynı kaba ait olabileceğine dair güçlü kanıt sunar.",
      "Bir parçanın kökenini belirlemek için görünüşe ek olarak yapısal ve tarihsel kanıtlar birlikte değerlendirilmelidir.",
      "Aynı katmandan çıkan seramikler genellikle aynı kaba ait sayılabilir.",
      "Parçaların farklı kaplara ait olduğu yalnızca renk farkından anlaşılmıştır.",
    ],
    correct_index: 2,
    explanation: "C seçeneği, renk karşılaştırmasına ek olarak kırık yüzey, mineral ve katman tarihinin incelenmesinden çıkarılır. A görünüşü başlangıç ipucu olarak makul kılsa da tek başına yeterli değildir; B ise incelemelerin aynı kaba işaret ettiğini varsayar, oysa sonuç farklı kapları gösterir.",
  },
  "v2-8-completion-07": {
    difficulty: "medium",
    options: [
      "sadece yüksek söyleyenlerin sesini kısmayı yeterli buldu.",
      "salonun düzenini değiştirmeden prova süresini uzattı.",
      "sesleri dengelemek için bütün bölümlerin yerini aynı biçimde değiştirdi.",
      "ölçümlere dayanarak mikrofon konumu ve oturma düzeninde küçük ayarlar yaptı.",
      "kayıtların birbirine benzemesi için yankıyı artırdı.",
    ],
    correct_index: 3,
    explanation: "D seçeneği, şefin yankı, oturma düzeni ve mikrofon mesafesi ölçümlerini somut ayarlara dönüştürmesini tamamlar. A önceki tek yönlü yaklaşımı tekrarlar; B ölçülen koşulları yok sayar. C gereğinden kapsamlı, E ise sorunu artıran bir sonuç önerir.",
  },
  "v2-8-flow-07": {
    difficulty: "medium",
    passage: "(I) Göl kıyısında farklı derinliklerde su sıcaklığı ölçüldü. (II) Aynı noktalarda çözünmüş oksijen miktarı kaydedildi. (III) Ölçümler, balıkların görüldüğü bölgelerle eşleştirildi. (IV) Kıyıdaki sazlıkların mevsimsel renk değişimi fotoğraflandı. (V) Bulgular, bazı balık türlerinin serin ve oksijeni yüksek bölümlerde toplandığını gösterdi.",
    question: "Göl ekolojisi incelemesinin mantıksal akışını bozan cümle hangisidir?",
    options: ["I", "II", "III", "V", "IV"],
    correct_index: 4,
    explanation: "IV. cümle sazlıkların renk değişimine geçer; I, II, III ve V ise sıcaklık ve oksijen ölçümlerini balıkların dağılımıyla ilişkilendirerek sonuca bağlar.",
  },
  "v2-hs-main_idea-10": {
    difficulty: "medium",
    options: [
      "Çevrim içi kalma süresi, ekiplerin iş yükünü karşılaştırmada yararlı bir başlangıç göstergesidir.",
      "Toplantı yoğunluğu, tamamlanan iş sayısından daha güvenilir bir verimlilik ölçüsüdür.",
      "Verimlilik ölçümü, geçirilen süreyi çıktılar ve çalışma koşullarıyla birlikte değerlendirmelidir.",
      "Ev koşulları hesaba katıldığında çevrim içi süre göstergesi tamamen geçersiz olur.",
      "Tamamlanan iş sayısı, çalışma süresinden bağımsız olarak tek başına yeterli ölçüttür.",
    ],
    correct_index: 2,
    explanation: "C seçeneği, çevrim içi süre ölçütünün tamamlanan işler, toplantı yoğunluğu ve ev koşullarıyla birlikte yeniden değerlendirilmesi gerektiğini özetler. A gerçek bir başlangıç verisini yeterli sonuca dönüştürür; B tek bir alternatifi üstün sayar. D ve E ise ölçümü başka bir tek ölçüte indirger.",
  },
  "v2-hs-inference-06": {
    difficulty: "hard",
    options: [
      "Anlatıcının duyusal ayrıntıları doğru hatırlaması, tarih hatalarının önemsiz olduğunu kanıtlar.",
      "Tarihler karışsa da anlatıcının evle ilgili bütün ayrıntıları nesnel olarak doğrudur.",
      "Anlatıcının belleği, olayların kronolojisinde yanılabilirken bazı duyusal izleri koruyabilir.",
      "Anlatıcının güvenilirliği ya bütünüyle kabul edilmeli ya da bütünüyle reddedilmelidir.",
      "Duyusal anılar, tarih bilgisine göre daha az güvenilirdir.",
    ],
    correct_index: 2,
    explanation: "C seçeneği, tarihlerin karışması ile evin kokusu ve sesinin ayrıntılı hatırlanmasını birlikte yorumlar. A ve B duyusal hatırlamadan gereğinden geniş bir doğruluk sonucu çıkarır; D yanlış bir ikilik kurar. E ise paragrafın duyusal izlerin korunabildiği yönündeki çıkarımını tersine çevirir.",
  },
  "v2-hs-completion-06": {
    difficulty: "medium",
    options: [
      "böylece günlüklerdeki tahminleri dönemin bilgi sınırları içinde yorumladı.",
      "böylece geçmişteki yanlış tahminleri bugünkü ölçütlerle geçersiz ilan etti.",
      "böylece yazarların korkularını gerçek olaylardan bağımsız saydı.",
      "böylece bugünkü bilgilerle eski yazarları düzeltmeyi sürdürdü.",
      "böylece günlükleri yalnızca kişisel duyguların kaydı olarak değerlendirdi.",
    ],
    correct_index: 0,
    explanation: "A seçeneği, tarihçinin yanlış tahminleri dönemin bilgi sınırları içinde açıklama çabasını doğrudan tamamlar. B ve D, kaçınılan anakronik değerlendirmeyi geri getirir; C ve E ise günlüklerin bağlamını gereğinden fazla daraltır.",
  },
  "v2-hs-flow-06": {
    difficulty: "hard",
    passage: "(I) Bir dilbilimci, bölgesel ağızlarda kullanılan aynı sözcükleri kaydetti. (II) Sözcüklerin hangi yaş gruplarında ve hangi bağlamlarda söylendiğini sınıflandırdı. (III) Ses kayıtlarını yazıya aktarırken konuşma özelliklerini koruyan işaretler kullandı. (IV) Katılımcıların yazılı dilde tercih ettiği eş anlamlı sözcükler de ayrı bir listede toplandı. (V) Bulgular, sözcük seçiminin yaş ve kullanım bağlamıyla birlikte değiştiğini gösterdi.",
    question: "Bölgesel ağız araştırmasının düşünce akışını bozan cümle hangisidir?",
    options: ["I", "II", "III", "V", "IV"],
    correct_index: 4,
    explanation: "IV. cümle katılımcıların yazılı dil tercihlerine geçer; I, II, III ve V ise sözlü ağız verilerinin kaydı, sınıflandırılması, aktarımı ve yorumlanması zincirini sürdürür.",
  },
};
for (const item of newRows) {
  const repair = targetedDifficultyRepairs[item.id];
  if (!repair) continue;
  Object.assign(item, repair);
}

// Remaining pedagogical revisions from the V2.1 review.  This map is
// intentionally scoped to the 24 content-revision IDs and the 13
// difficulty-only relabel IDs below; locked pilot rows are not included.
const remainingContentRevisions = {
  "v2-4-5-supporting_idea-09": {
    difficulty: "medium",
    options: [
      "Oyuncuların yalnızca tek bir kişiye bağlı hücum kurmasını",
      "Pas kararlarının savunmanın durumuna göre değişmesini",
      "Sayı dağılımının sonraki antrenmanda dengelenmesini",
      "Farklı pozisyonlarda oyuncuların birbirine seçenek oluşturmasını",
      "Rakip savunmanın hücum düzenini fark etmesini",
    ],
    correct_index: 0,
    explanation: "A seçeneği, rakibin fark ettiği tek oyuncuya bağımlı hücum düzeninin çözülmesi gereken sorun olduğunu belirtir. B ve D antrenörün önerdiği çözüm adımlarını, C ortaya çıkan sonucu, E ise sorunun nedenini anlatır.",
  },
  "v2-4-5-inference-07": {
    difficulty: "medium",
    options: [
      "Köprünün taşları, dayanıklılığı belirleyen tek ölçüttür.",
      "Köprünün kullanım yükü arttıkça dayanıklılığı her durumda azalır.",
      "Bir yapının dayanıklılığını anlamak için malzeme ile kullanım koşulları birlikte değerlendirilmelidir.",
      "Ziyaretçiler eski köprüyü farklı mevsimlerde kullanmıştır.",
      "Rehber, köprünün kullanım koşullarını malzemesinden daha önemli görmüştür.",
    ],
    correct_index: 2,
    explanation: "C seçeneği, rehberin taşların yanında mevsim ve yük koşullarını da anlatmasından çıkarılır. A malzemeyi tek ölçüt sayar; B desteklenmeyen bir kesinlik kurar. D olayın ziyaretçilerle ilgili olduğunu varsayar, E ise rehberin öncelik sırası verdiğini söyler.",
  },
  "v2-4-5-inference-08": {
    difficulty: "hard",
    options: [
      "Ekran parlaklığı, pilin hızlı tükenmesinin başlangıçta düşünülen nedeni olabilir.",
      "Farklı ayarlar birlikte incelenmeden pil sorununa ilişkin kesin bir sonuca varılamayabilir.",
      "Konum hizmetleri ile arka plan uygulamaları, ekran parlaklığından bağımsız olarak pili etkiler.",
      "Pil tüketimini azaltmanın güvenilir yolu pili yenisiyle değiştirmektir.",
      "Bir ayarda değişiklik yapılması, diğer ayarları incelemeyi gereksiz kılar.",
    ],
    correct_index: 1,
    explanation: "B seçeneği, parlaklık denemesinin sınırlı kalması ve başka ayarlar kapatılınca sürenin uzamasını birlikte yorumlar. A yalnızca ilk varsayımı, C ise iki ayarın etkisini belirtir; ikisi de Zeynep'in tek nedene indirgememe sonucunu tam karşılamaz. D ve E metinde desteklenmez.",
  },
  "v2-4-5-inference-09": {
    difficulty: "hard",
    options: [
      "Süre bakımından kısa olan plan, diğer koşullar uygun olduğunda tercih edilebilir.",
      "Bir gezi planı değerlendirilirken sürenin yanında aktarma ve açık olma gibi uygulanabilirlik koşulları da hesaba katılmalıdır.",
      "Ailenin ikinci planı seçmesinin tek nedeni müzenin açık olmasıdır.",
      "Otobüs değiştirmek, gezi planlarının uygulanmasını genellikle kolaylaştırır.",
      "Aile, iki planı karşılaştırırken ulaşım koşullarını dikkate almamıştır.",
    ],
    correct_index: 1,
    explanation: "B seçeneği, kısa planın aktarma ve müze saatleri yüzünden bekleme gerektirmesiyle ikinci planın tek araç ve açık müze avantajını birlikte değerlendirir. A yalnızca süreyi öne çıkarır; C tek bir koşulu neden sayar. D ve E olayda verilen ulaşım bilgileriyle uyuşmaz.",
  },
  "v2-4-5-completion-08": {
    difficulty: "medium",
    options: [
      "süzgeç yaprakları tutarken taşma borusu fazla suyu kontrollü biçimde yönlendirdi.",
      "yağmur durduğunda sakinler varilleri boşaltıp yeniden yerleştirdi.",
      "kapaklar çıkarıldığı için böceklerin varillere girmesi kolaylaştı.",
      "variller yağmur suyu toplamak yerine bahçede süs olarak kullanılmaya başlandı.",
      "taşma borusu kapatılarak bütün suyun varillerde tutulması sağlandı.",
    ],
    correct_index: 0,
    explanation: "A seçeneği, ince süzgecin yaprak ve böcek girişini azaltmasını, taşma borusunun da fazla suyu yönetmesini birlikte tamamlar. B metinde bulunmayan sonraki bir eylemdir; C ve E yapılan düzenlemelerin tersidir. D ise varillerin kullanım amacını değiştirir.",
  },
  "v2-4-5-completion-09": {
    difficulty: "medium",
    options: [
      "olayları yalnızca gördüklerini aktaran anlatıcının gözünden değerlendirmeyi yeterli buldular.",
      "anlatıcıların bilgi sınırlarını ve bakış açılarını karşılaştırmaları gerektiğine karar verdiler.",
      "geçmişten gelen bilgileri, kim tarafından aktarıldığına bakmadan doğru kabul ettiler.",
      "bakış açısı farkının olayların sırasını incelemeyi gereksiz kıldığını düşündüler.",
      "bilgi ekleyen anlatıcıyı güvenilir, yalnızca gördüklerini söyleyeni önemsiz saydılar.",
    ],
    correct_index: 1,
    explanation: "B seçeneği, iki anlatıcının farklı bilgi kapsamlarını ve olaylara bakışlarını karşılaştırma gereğini tamamlar. A ve E anlatıcılardan birini tek başına yeterli sayar; C ve D ise anlatım farkının değerlendirilmesini daraltır.",
  },
  "v2-8-supporting_idea-08": {
    difficulty: "medium",
    options: [
      "Haber metnindeki verilerin ham ölçüm tablolarıyla karşılaştırılması",
      "Ortalama sıcaklık yerine en yüksek sıcaklık değerinin başlıkta kullanılması",
      "İki değer arasındaki farkın başlıkta açıklanması",
      "Verinin nasıl seçildiğinin belirtilmesi gerektiği yönündeki editör görüşü",
      "Sıcaklık verilerinin yayımlanmadan önce yeniden okunması",
    ],
    correct_index: 1,
    explanation: "B seçeneği, bir haberde ortalama yerine en yüksek değerin kullanılmasının başlığın değiştirilmesine yol açtığını belirtir. A ve E denetim sürecinin parçalarıdır; C ve D ise değişikliğin ardından açıklanan ya da savunulan noktaları verir.",
  },
  "v2-8-inference-05": {
    difficulty: "hard",
    options: [
      "Sayaçları yenilemek, tüketim artışının nedenini bilmeden uygulanabilecek genel bir önlemdir.",
      "Bahçe sulama saatleri, yaz aylarındaki artışın görüldüğü önemli zaman aralığıdır.",
      "Veriler, geniş bir müdahale yerine tüketim artışının görüldüğü davranışlara odaklanmayı sağlamıştır.",
      "Kampanyanın etkili olması için bütün sayaçların aynı anda değiştirilmesi gerekir.",
      "Saatlik kayıtlar, tüketim davranışları hakkında karar vermeye elverişli değildir.",
    ],
    correct_index: 2,
    explanation: "C seçeneği, saatlik verilerin artışı bahçe sulama saatleriyle ilişkilendirmesi ve kampanyanın buna göre düzenlenmesinden çıkarılır. A ve B tek başına verinin yönlendirdiği plan değişikliğini açıklamaz; D ve E metindeki kararı tersine çevirir.",
  },
  "v2-8-inference-07": {
    difficulty: "medium",
    options: [
      "Görüntü, özel bir etkinlik gününü yansıtıyor olabilir; bu ihtimal belirtilmelidir.",
      "Etkinlik günündeki kalabalık, meydanın olağan kullanımına ilişkin bir ipucu sağlayabilir.",
      "Tarih belirtilmediği için görüntünün olağan durumu temsil ettiği sonucuna tek başına varılamaz.",
      "Aynı meydanın farklı tarihlerdeki kayıtları, tarih bilgisi olmasa da aynı anlamı taşır.",
      "Görüntünün çözünürlüğü, temsil sorununu tek başına ortadan kaldırır.",
    ],
    correct_index: 2,
    explanation: "C seçeneği, tarihin bilinmemesinin özel etkinlik kalabalığını olağan durum gibi yorumlama riskini doğurduğunu açıklar. A ve B araştırmacının fark ettiği olası bağlamları belirtir, ancak tarih eksikliğinin temsil sorununu çözmez. D ve E bu sorunu göz ardı eder.",
  },
  "v2-8-inference-08": {
    difficulty: "hard",
    options: [
      "Uzun çalışma oturumları, bu öğrencinin denemesinde daha başarılı yöntemi göstermiştir.",
      "İkinci yöntemdeki daha az hata, tekrarların zamana yayılmasının olası etkisini düşündürmüştür.",
      "Öğrenme verimini değerlendirirken çalışma süresinin yanında tekrarların dağılımı da göz önünde bulundurulmalıdır.",
      "İki haftadaki hata farkı, çalışma biçiminden bağımsız olarak ortaya çıkmıştır.",
      "Öğrenci, sınavdan önce hangi konuları çalıştığını karşılaştırmamıştır.",
    ],
    correct_index: 2,
    explanation: "C seçeneği, iki çalışma düzeninin ve ikinci yöntemdeki hata azalmasının birlikte değerlendirilmesinden çıkarılır. A yalnızca ilk yöntemi üstün sayar; B tekrarların olası etkisini kabul etse de genel yöntemi ifade etmez. D ve E deneyin karşılaştırmalı niteliğini bozar.",
  },
  "v2-8-completion-08": {
    difficulty: "medium",
    options: [
      "kavşaklardaki bisiklet geçişlerini bütün araçlardan bağımsız hâle getiren bir çözüm önerdi.",
      "yalnızca kaza kayıtlarına dayanarak yolun yönünü değiştirdi.",
      "görüşü artıran ve yaya geçişini düzenleyen bir kavşak tasarımı önerdi.",
      "bisiklet yolunu kaza kayıtlarının bulunmadığı başka bir bölgeye taşıdı.",
      "yaya geçiş saatlerini tasarım kararının dışında bıraktı.",
    ],
    correct_index: 2,
    explanation: "C seçeneği, kaza kayıtları, görüş mesafesi ve yaya geçiş saatlerinin kavşak tasarımına dönüştürülmesini tamamlar. A ve D sorunu tümüyle başka yere taşır; B ve E paragrafta incelenen verilerden birini dışarıda bırakır.",
  },
  "v2-hs-supporting_idea-09": {
    difficulty: "medium",
    options: [
      "Örneklemin tek şehirle sınırlı olması başlıkta şehir bilgisinin ayrıca verilmesini gerektirir.",
      "Yaş dağılımının dengeli olmaması, gruplar arasındaki karşılaştırmayı zayıflatır.",
      "Çevrim içi katılımın bulunması, anketin bütünüyle geçersiz olduğunu gösterir.",
      "Örneklemin dar ve dengesiz olması nedeniyle sonucun tüm topluma genellenememesi",
      "Başlığın yeniden yazılması, anketteki soruların uzunluğundan kaynaklanır.",
    ],
    correct_index: 3,
    explanation: "D seçeneği, tek şehirden ve dengeli olmayan yaş dağılımından oluşan örneklemin toplumun tamamını temsil etmediğini kapsar. A ve B gerçek sınırlılıkları belirtir, ancak genelleme sorununu tek başına bütünüyle açıklamaz. C ve E metinde desteklenmez.",
  },
  "v2-hs-inference-05": {
    difficulty: "hard",
    options: [
      "İşsizlik oranındaki düşüş, istihdam miktarında bir iyileşme bulunduğuna işaret edebilir.",
      "Kısa süreli işlerin artması, ücret ve sosyal güvence bilgilerinin incelenmesini gerekli kılar.",
      "İşsizlik oranı ile işlerin niteliği birbirinden tamamen bağımsızdır.",
      "İstihdamdaki nicel iyileşme, işlerin niteliği değerlendirilmeden yeterli bir gösterge değildir.",
      "Orandaki düşüş, yeni işlerin çalışanlar için her bakımdan olumlu olduğunu gösterir.",
    ],
    correct_index: 3,
    explanation: "D seçeneği, oran düşse bile ücret, süre ve sosyal güvence incelenmeden istihdamın niteliği hakkında yeterli sonuca varılamayacağını ifade eder. A ve B metindeki gerçek ayrıntıları kullanır, ancak yazarın temel uyarısını tam kapsamaz. C ve E gereğinden geniş sonuçlar çıkarır.",
  },
  "v2-hs-inference-07": {
    difficulty: "hard",
    options: [
      "Kamera görüntüsü, çevrim içi derste bulunmaya ilişkin bir belirti sağlayabilir.",
      "Erişim kayıtları öğrencinin derse bağlandığını gösterir, ancak dikkatini kanıtlamaz.",
      "Kısa tartışma notları, katılımı ölçmek için tek başına yeterlidir.",
      "Katılımı ölçmek için görünürlük dışındaki etkinlik göstergeleri de gereklidir.",
      "Kameranın kaldırılması, sözlü tartışmalara katkının neden azaldığını tek başına açıklar.",
    ],
    correct_index: 3,
    explanation: "D seçeneği, kamera görünürlüğü ile gerçek katılım arasındaki farkın görülmesi ve görev teslimleriyle tartışma notlarının eklenmesinden çıkarılır. A ve B kamera ile erişim verilerinin sınırlı ama ilgili ipuçları olduğunu söyler; C tek bir göstergiyi yeterli sayar. E ise neden konusunda kanıtlanmamış bir kesinlik kurar.",
  },
  "v2-hs-inference-08": {
    difficulty: "medium",
    options: [
      "Aynı sıcaklık değişimi her popülasyonda aynı desen sonucunu doğurur.",
      "Desen değişiminin farklı yönlerde olması, sıcaklık etkisinin yalnızca bir popülasyonda görüldüğünü gösterir.",
      "Çevre etkisi ile genetik özellikleri birbirinden ayırmak araştırmada gereksizdir.",
      "Çevresel etkinin sonucu, popülasyonların genetik özelliklerine göre değişebilir.",
      "Larvaların yetiştiği sıcaklık, kanat desenleriyle ilişkilendirilemez.",
    ],
    correct_index: 3,
    explanation: "D seçeneği, desen değişiminin popülasyonlarda aynı yönde olmamasını ve biyoloğun çevre-genetik birlikteliği vurgusunu birlikte yorumlar. B, farklı yönlerdeki değişimi yalnızca sıcaklık etkisinin tek bir popülasyonda görülmesine bağlar; oysa biyolog genetik farklılıkların da hesaba katılması gerektiğini söyler. A, C ve E araştırma bulgusuyla uyuşmaz.",
  },
  "v2-hs-inference-09": {
    difficulty: "hard",
    options: [
      "Bir kararın sonuç bölümü, gerekçeyi anlamak için önemli bir başlangıç noktasıdır.",
      "Tarafların iddiaları ve mahkemenin kanıtları, hükmün nasıl oluştuğunu açıklayabilir.",
      "Kararı anlamada yalnızca gerekçenin ayrıntılarını izlemek yeterlidir.",
      "Hüküm ile gerekçe arasındaki ilişkiyi görmek için iddia ve kanıtların izlenmesi gerekir.",
      "Sonuç ile gerekçe farklılaştığında tarafların iddiaları kararın dışında kalır.",
    ],
    correct_index: 3,
    explanation: "D seçeneği, öğrencinin sonuçtan önce iddiaları ve kanıtları ayrı ayrı izlemesinin gerekçesini açıklar. A ve B ilgili unsurları belirtir, ancak yöntemin hüküm-gerekçe ilişkisini kuran bütününü vermez. C ve E öğrencinin savını daraltır ya da tersine çevirir.",
  },
  "v2-hs-completion-07": {
    difficulty: "medium",
    options: [
      "grafiğin görsel etkisini artırmak için eksen aralığını daha da daralttı.",
      "ölçeği sıfırdan başlatmanın küçük farkların görünüşünü azaltabileceğini dikkate aldı.",
      "verileri açıklama eklemeden aynı grafik üzerinde bıraktı.",
      "okurun yalnızca görsel yüksekliğe bakarak karar vermesini bekledi.",
      "okurun görsel izlenim ile sayısal farkı karıştırmasını önlemeye çalıştı.",
    ],
    correct_index: 4,
    explanation: "E seçeneği, ekseni sıfırdan başlatma ve gerçek farkı açıklama kararının okuru yanıltmama amacını tamamlar. B kullanılan yöntemin bir etkisini anlatır ancak gazetecinin iletişim amacını tam vermez; A, C ve D bu amaca ters düşer.",
  },
  "v2-hs-completion-08": {
    difficulty: "medium",
    options: [
      "noktalama farklarının dönemin yazım alışkanlıklarıyla ilişkili olabileceğini belirtti.",
      "yayınevinin müdahale notlarının her baskı için aynı sonucu verdiğini varsaydı.",
      "anlam değişmediği sürece baskılar arasındaki farkları kayda değer bulmadı.",
      "noktalama işaretlerinin metin anlamını etkileyemeyeceğini savundu.",
      "baskılar arasındaki farkın metnin anlamını nasıl etkilediğini gerekçeli biçimde açıkladı.",
    ],
    correct_index: 4,
    explanation: "E seçeneği, dönem alışkanlıkları ve müdahale notlarının karşılaştırılmasını metnin anlamına ilişkin gerekçeli bir sonuca bağlar. A incelemenin olası ara bulgusudur; B, C ve D editörün karşılaştırmalı yöntemini daraltır veya reddeder.",
  },
  "v2-hs-completion-09": {
    difficulty: "medium",
    options: [
      "soru sırasının etkisini araştırmadan cevapları tek bir grupta topladılar.",
      "farklı sıralardan gelen sonuçları karşılaştırmanın tek başına yeterli olduğunu düşündüler.",
      "sıra değiştiğinde sonuçların da mutlaka değişmesi gerektiğini kabul ettiler.",
      "anket sırasındaki değişikliği, bulguları yorumlarken göz ardı ettiler.",
      "soru sırasının etkisini denetleyerek bulguların güvenilirliğini artırdılar.",
    ],
    correct_index: 4,
    explanation: "E seçeneği, soruların sırasını farklı gruplarda değiştirip sonuçları karşılaştırmanın karıştırıcı sıra etkisini denetleme amacını tamamlar. B karşılaştırmayı tek başına yeterli sayar; A ve D denetimi yok sayar. C ise değişimin zorunlu olduğunu varsayar.",
  },
  "v2-4-5-flow-07": {
    difficulty: "medium",
    passage: "(I) Hava istasyonundaki basınç sensörü sabah ölçümünden önce kalibre edildi. (II) Öğle saatinde rüzgâr yönü, hızı ve basınç değeri aynı kayıt formuna işlendi. (III) Akşam ölçümleri, gün içindeki değişimi görmek için sabah ve öğle verileriyle karşılaştırıldı. (IV) İstasyonda gözlenen bulutların fotoğrafları mevsim arşivine eklendi. (V) Birbirini destekleyen ölçümler, ertesi günün kısa vadeli tahmininde kullanıldı.",
    question: "Hava istasyonundaki kısa vadeli tahmin çalışmasının akışını bozan cümle hangisidir?",
    options: ["I", "II", "III", "V", "IV"],
    correct_index: 4,
    explanation: "IV. cümle aynı istasyonda yapılan bir gözlemi anlatsa da fotoğrafları mevsim arşivine ekleme işi, sensör verilerini karşılaştırıp kısa vadeli tahmine bağlayan zincire katılmaz. I, II, III ve V kalibrasyon, ölçüm, karşılaştırma ve kullanım sırasını sürdürür.",
  },
  "v2-4-5-flow-08": {
    difficulty: "medium",
    passage: "(I) Müze ekibi, seramik parçalarının yüzeylerini farklı açılardan aydınlatarak inceledi. (II) Parçaların kenarları birleştirilip olası kap biçimleri çizildi. (III) Çizimler, aynı döneme ait katalog örnekleriyle biçim ve süsleme bakımından karşılaştırıldı. (IV) Parçaların sergilendiği vitrinin ışık düzeyi gün boyunca ölçüldü. (V) Karşılaştırma sonunda parçaların hangi kaba ait olabileceği konusunda iki öneri oluşturuldu.",
    question: "Seramik parçalarının yeniden birleştirilmesine yönelik incelemede düşünce akışını bozan cümle hangisidir?",
    options: ["I", "II", "III", "V", "IV"],
    correct_index: 4,
    explanation: "IV. cümle vitrinin sergileme koşuluna geçer; I, II, III ve V ise yüzey incelemesinden biçim çizimine, katalog karşılaştırmasına ve kap önerilerine ilerleyen çözümleme zincirini sürdürür.",
  },
  "v2-hs-flow-07": {
    difficulty: "medium",
    passage: "(I) Gökbilim ekibi, teleskop görüntülerindeki parlaklık değerlerini kalibre etti. (II) Farklı gecelerde alınan görüntüler aynı ölçekte birleştirildi. (III) Parlaklığı değişen yıldız adayları için zaman çizelgesi çıkarıldı. (IV) Görüntülerin arşivlendiği klasör adları gözlem tarihlerini gösterecek biçimde standartlaştırıldı. (V) Adayların gerçekten değişken olup olmadığı yeni gözlemlerle sınandı.",
    question: "Değişken yıldız adaylarını belirleme çalışmasında akışı bozan cümle hangisidir?",
    options: ["I", "II", "III", "V", "IV"],
    correct_index: 4,
    explanation: "IV. cümle arşiv düzenlemesini anlatır; I, II, III ve V ise görüntüleri kalibre edip birleştirme, adayları belirleme ve yeni gözlemle sınama sürecini kurar.",
  },
  "v2-hs-flow-08": {
    difficulty: "medium",
    passage: "(I) Bir hukuk tarihçisi, eski mahkeme kararlarındaki kavramları dönem sözlükleriyle karşılaştırdı. (II) Aynı kavramın farklı yıllardaki kullanımını karar gerekçeleriyle birlikte inceledi. (III) Değişimin, mevzuat ve toplumsal tartışmalarla hangi noktalarda kesiştiğini haritaladı. (IV) Karar metinlerinin tarandığı arşivde sayfa kenarlarının ölçüleri de kaydedildi. (V) Çalışma, kavramların anlamının hukuk metinlerinde zamanla yeniden kurulduğunu savundu.",
    question: "Hukuk kavramlarının tarihsel değişimini inceleyen çalışmada düşünce akışını bozan cümle hangisidir?",
    options: ["I", "II", "III", "V", "IV"],
    correct_index: 4,
    explanation: "IV. cümle arşivdeki fiziksel sayfa özelliklerine geçer; I, II, III ve V ise kavramların sözlük, karar, mevzuat ve toplumsal bağlam içindeki değişimini izleyip sonuca bağlar.",
  },
  "v2-hs-flow-09": {
    difficulty: "medium",
    passage: "(I) İklim araştırmacıları, şehir içindeki ısı adası ölçümlerini mahalle bazında ayırdı. (II) Beton yüzey oranı ve ağaç örtüsü haritaları bu ölçümlere eklendi. (III) Gece sıcaklıklarının gündüze göre daha yavaş düştüğü bölgeler belirlendi. (IV) Mahallelerdeki yağmur suyu giderlerinin çapları da ayrı bir çizelgede listelendi. (V) Bulgular, serinletme yatırımlarının yalnızca gündüz sıcaklıklarına göre planlanamayacağını gösterdi.",
    question: "Şehir ısı adası verilerinin yorumlandığı çalışmada düşünce akışını bozan cümle hangisidir?",
    options: ["I", "II", "III", "V", "IV"],
    correct_index: 4,
    explanation: "IV. cümle yağmur suyu giderlerinin fiziksel özelliklerine geçer; I, II, III ve V ise ısı ölçümlerini arazi örtüsü ve gece-gündüz farkıyla ilişkilendirerek yatırım sonucuna ilerler.",
  },
};

for (const item of newRows) {
  const repair = remainingContentRevisions[item.id];
  if (repair) Object.assign(item, repair);
}

const easyRelabels = new Set([
  "v2-4-5-supporting_idea-05", "v2-4-5-supporting_idea-06", "v2-4-5-supporting_idea-07", "v2-4-5-supporting_idea-08",
  "v2-8-supporting_idea-04", "v2-8-supporting_idea-05", "v2-8-supporting_idea-06", "v2-8-supporting_idea-07",
  "v2-hs-supporting_idea-04", "v2-hs-supporting_idea-05", "v2-hs-supporting_idea-06", "v2-hs-supporting_idea-07", "v2-hs-supporting_idea-08",
]);
for (const item of newRows) {
  if (easyRelabels.has(item.id)) item.difficulty = "easy";
}

export const paragraphQuestionExpansionV2 = [
  ...clonePilot,
  ...newRows,
];

export const paragraphQuestionExpansionV2PilotIds = clonePilot.map((r) => r.id);
export const paragraphQuestionExpansionV2NewIds = newRows.map((r) => r.id);
