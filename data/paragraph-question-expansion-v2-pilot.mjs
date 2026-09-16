/*
 * V2 pilot bank. This is a local, review-only artifact.
 * It is intentionally not connected to any production write path.
 */

const row = (id, category, difficulty, grade_band, passage, question, options, correct_index, explanation) => ({
  id,
  category,
  difficulty,
  grade_band,
  passage,
  question,
  options,
  correct_index,
  explanation,
});

export const paragraphQuestionExpansionV2Pilot = [
  row(
    "v2-4-5-main_idea-01",
    "main_idea",
    "medium",
    "4-5",
    "Mahalle çocukları ilkbaharda küçük göletin çevresinde çöp biriktiğini fark etti. Önce yalnızca görünen çöpleri topladılar; sonra hangi günlerde daha çok atık biriktiğini gözlemleyip yakındaki dükkânlara geri dönüşüm kutusu koymayı önerdiler. Birkaç hafta sonra göletin çevresi daha temiz kaldı ve ördekler için ayrılan alanı korumak kolaylaştı. Çocuklar, tek bir temizlik gününden çok düzenli gözlem ve ortak kararın işe yaradığını anladı.",
    "Bu parçanın ana düşüncesi aşağıdakilerden hangisidir?",
    [
      "Gölet çevresindeki ördeklerin sayısı her mevsim aynı kalır.",
      "Çöpleri toplamak için yalnızca dükkân sahipleri sorumludur.",
      "Bir çevre sorununu çözmek, gözlem ve ortak çabayla daha kalıcı hâle gelebilir.",
      "Çocuklar gölet çevresinde yalnızca ilkbaharda çalışabilir.",
      "Geri dönüşüm kutuları bütün çevre sorunlarını tek başına ortadan kaldırır.",
    ],
    2,
    "C seçeneği, ilk temizlikten sonra gözlem yapılmasını ve ortak çözüm kurulmasını birlikte kapsar. A seçeneği ayrıntıyı, E seçeneği ise sonucu gereğinden fazla genişletir.",
  ),
  row(
    "v2-4-5-supporting_idea-01",
    "supporting_idea",
    "medium",
    "4-5",
    "Elif, evdeki çocuk kitaplarını yaşına göre ayırıp apartmanın girişindeki değiş tokuş rafına yerleştirdi. Rafın yanına, alınan kitabın yerine başka bir kitap bırakılabileceği yazıldı. İlk hafta birkaç komşu yalnızca kitap almakla kaldı; sonraki hafta çocuklar okudukları kitapları geri getirip rafın yanına kısa öneriler ekledi. Böylece raf, kitapların el değiştirdiği ve okuma önerilerinin paylaşıldığı bir köşeye dönüştü.",
    "Parçada değiş tokuş rafıyla ilgili aşağıdakilerden hangisine değinilmiştir?",
    [
      "Rafı yalnızca yetişkinler kullanmıştır.",
      "Çocuklar okudukları kitaplar için kısa öneriler yazmıştır.",
      "Kitapların yaş gruplarına göre ayrılması yasaklanmıştır.",
      "Komşular rafı yalnızca hafta sonları ziyaret etmiştir.",
      "Raf, kitap alınmadan önce kaldırılmıştır.",
    ],
    1,
    "B seçeneği, çocukların okudukları kitapları geri getirip öneri eklediği açık bilgisine dayanır. Diğer seçenekler metindeki uygulamayla çelişir veya desteklenmez.",
  ),
  row(
    "v2-4-5-inference-01",
    "inference",
    "hard",
    "4-5",
    "Aile, piknik için göl kıyısına gitmek üzereyken rüzgârın güçlendiğini fark etti. Babası, masayı ağaçların altına kurmak yerine açık alandaki taş zemini seçti; çocuklar da uçabilecek kâğıtları çantaya koydu. Öğleden sonra rüzgâr azalınca örtüyü çimenlere serdiler. Günün planı değişmiş olsa da aile, hava durumunu izleyerek eşyaların ve çevrenin zarar görmesini önledi.",
    "Bu parçadan aşağıdaki yargılardan hangisine ulaşılabilir?",
    [
      "Aile, planını koşullara göre değiştirmeyi göze almıştır.",
      "Çocuklar açık havada piknik yapmaktan vazgeçmiştir.",
      "Taş zemin her zaman çimenlerden daha güvenlidir.",
      "Rüzgâr öğleden sonra daha da şiddetlenmiştir.",
      "Piknikte kullanılan eşyalar önceden hazırlanmadığı için unutulmuştur.",
    ],
    0,
    "A seçeneği, rüzgâr varken yerin ve eşyaların değiştirilmesi ile daha sonra planın sürdürülmesini birlikte yorumlar. C seçeneği ise tek bir günü anlatan kararı her duruma geneller.",
  ),
  row(
    "v2-4-5-completion-01",
    "completion",
    "hard",
    "4-5",
    "Mina, yaptığı kâğıt köprünün taşıyacağı ağırlığı önce tahmin etti. İlk denemede köprünün ortası çöktü; Mina destekleri yalnızca uçlara değil, orta bölüme de yerleştirdi. İkinci denemede köprü daha fazla ağırlık taşıdı fakat bir kenarı yine eğildi. Bunun üzerine kâğıdı katlama biçimini değiştirip aynı ağırlıkla yeniden denedi. _____",
    "Parçanın sonuna düşüncenin akışına göre aşağıdakilerden hangisi getirilmelidir?",
    [
      "Mina, ilk tahmininin her koşulda doğru olduğunu kabul etti.",
      "Mina, köprüyü denemeden önce bütün destekleri kaldırdı.",
      "Mina, yalnızca köprünün görünüşünü değiştirip ağırlığı yeniden ölçmedi.",
      "Mina, başarının tek bir denemede değil, sonuçlara göre yapılan değişikliklerde geliştiğini gördü.",
      "Mina, kâğıt köprülerin ağırlık taşıyamayacağına karar verdi.",
    ],
    3,
    "D seçeneği, iki denemenin ardından yapılan değişikliklerle kurulan sonuç ilişkisini tamamlar. A ve E seçenekleri, metindeki deneme ve düzeltme sürecini tersine çevirir.",
  ),
  row(
    "v2-4-5-flow-01",
    "flow",
    "hard",
    "4-5",
    "(I) Bahçenin kuru kalan bölümlerinde toprak nemi ölçüldü. (II) Sulama sabahın erken saatlerine alındı. (III) Su, köklerin çevresine yavaşça ulaşacak biçimde verildi. (IV) Çiçeklerin yaprak renkleri, buket hazırlamak için karşılaştırıldı. (V) Bir hafta sonra aynı miktar suyla daha geniş alanın nemli kaldığı görüldü.",
    "Numaralanmış cümlelerden hangisi düşünce akışını bozmaktadır?",
    [
      "I",
      "II",
      "IV",
      "III",
      "V",
    ],
    2,
    "IV. cümle bahçedeki çiçeklerin görünüşüne geçer; diğer cümleler suyun daha verimli kullanılması ve ölçülmesi çevresinde ilerler.",
  ),

  row(
    "v2-8-main_idea-01",
    "main_idea",
    "medium",
    "8",
    "Eski pazar yerinin yenilenmesi planlanırken belediye yalnızca binaların dış görünüşünü değiştirmedi. Esnafın hangi saatlerde yoğunluk yaşadığını, yayaların nerelerde durduğunu ve çevredeki tarihî yapıların hangi açılardan görüldüğünü inceledi. Yeni düzenlemede oturma alanları bu gözlemlere göre yerleştirildi; bazı cephelerde eski ayrıntılar korundu. Böylece pazar, geçmişle bağını koparmadan bugünkü kullanım biçimlerine cevap veren bir alan oldu.",
    "Bu parçanın ana düşüncesi aşağıdakilerden hangisidir?",
    [
      "Eski yapıların tamamı yeni binalarla değiştirilmelidir.",
      "Bir alanı yenilemek, görünüşü değiştirmekten çok kullanım ve geçmiş bağlamını birlikte düşünmeyi gerektirir.",
      "Pazar yerlerinde yalnızca esnafın görüşü önem taşır.",
      "Tarihî ayrıntılar günlük kullanımı her zaman zorlaştırır.",
      "Yayaların durduğu yerler, şehir planlamasında dikkate alınmamalıdır.",
    ],
    1,
    "B seçeneği, kullanım gözlemleriyle tarihî ayrıntıların aynı tasarım kararında birleştirilmesini özetler. C ve D seçenekleri parçadaki kapsamı daraltır veya tersine çevirir.",
  ),
  row(
    "v2-8-supporting_idea-01",
    "supporting_idea",
    "medium",
    "8",
    "Bir öğrenci podcast hazırlarken konuşmanın tamamını tek seferde kaydetti. Dinlediğinde bazı cümlelerdeki uzun duraklamaların anlamı belirsizleştirdiğini fark etti. Kayıtları yeniden düzenleyip gerekli yerlerde kısa açıklamalar ekledi; ancak konuşmanın doğal ritmini korumak için her sessizliği silmedi. Son sürümde dinleyici, hem konuyu takip edebiliyor hem de konuşmacının düşünmek için durduğu yerleri anlayabiliyordu.",
    "Parçada podcast hazırlama süreciyle ilgili aşağıdakilerden hangisine değinilmiştir?",
    [
      "Kayıttaki bütün sessizlikler aynı biçimde silinmiştir.",
      "Konuşmacı, kaydı yeniden dinlemeden doğrudan yayımlamıştır.",
      "Düzenleme yapılırken hem açıklık hem de doğal konuşma ritmi gözetilmiştir.",
      "Uzun duraklamalar dinleyicinin konuyu daha kolay anlamasını sağlamıştır.",
      "Podcastte yalnızca yazılı açıklamalar kullanılmıştır.",
    ],
    2,
    "C seçeneği, gereksiz duraklamaların düzenlenmesiyle doğal ritmin korunmasını birlikte verir. A seçeneği metindeki ‘her sessizliği silmedi’ ayrıntısıyla çelişir.",
  ),
  row(
    "v2-8-inference-01",
    "inference",
    "hard",
    "8",
    "Okulun okuma uygulamasında bazı kitaplar hızlı tamamlanıyor, bazıları ise sık sık yarım bırakılıyordu. İlk rapor bu farkı yalnızca kitapların uzunluğuna bağladı. Öğretmenler öğrencilerle konuşunca bildirimlerin yoğun olduğu günlerde okuma sürelerinin kısaldığını ve bazı öğrencilerin ekrandaki küçük yazılarda zorlandığını gördü. Yazı boyutu ile bildirim ayarları değiştirildikten sonra yarım bırakılan kitapların sayısı azaldı; yine de bütün sınıflarda aynı oranda değişim olmadı.",
    "Bu parçadan aşağıdaki yargılardan hangisine ulaşılabilir?",
    [
      "Bir davranıştaki farkı açıklamak için tek bir ölçüte güvenmek yeterlidir.",
      "Bildirimler kapatıldığında bütün öğrenciler aynı hızda okur.",
      "Kitap uzunluğu, okuma davranışını hiçbir koşulda etkileyemez.",
      "Okuma sürecini açıklarken teknik koşullar ve öğrenciler arasındaki farklılıklar birlikte değerlendirilmelidir.",
      "Uygulamadaki raporlar öğrencilerin deneyimlerinden daha güvenilirdir.",
    ],
    3,
    "D seçeneği, ilk açıklamanın yetersiz kalması, teknik değişiklikten sonra azalmanın görülmesi ve sınıflar arasındaki farkın sürmesi olmak üzere üç ipucunu birleştirir. B seçeneği ise sonucu gereğinden fazla geneller.",
  ),
  row(
    "v2-8-completion-01",
    "completion",
    "hard",
    "8",
    "Tarihçi, bir mahallenin geçmişini araştırırken belediye kayıtlarını mahalle sakinlerinin tuttuğu günlüklerle karşılaştırdı. Resmî kayıtlarda yeni yolun herkes için kolaylık sağladığı yazıyordu; günlüklerde ise bazı evlerin girişlerinin aylarca kapandığı anlatılıyordu. Tarihçi bu iki kaynağı birbirinin yerine koymadı, her birinin olayı farklı bir konumdan gösterdiğini belirtti. _____",
    "Parçanın sonuna düşüncenin akışına göre aşağıdakilerden hangisi getirilmelidir?",
    [
      "Bu yüzden yalnızca resmî kayıtların doğru olduğunu kabul etti.",
      "Böylece tarihî bir olayı anlamak için farklı tanıklıkların hangi soruya cevap verdiğini ayırmak gerektiğini gösterdi.",
      "Günlüklerdeki kişisel ifadeleri araştırmadan çıkardı.",
      "Yolun yapımının bütün mahallelerde aynı sonucu doğurduğunu yazdı.",
      "İki kaynak arasındaki farkın araştırmayı gereksiz kıldığını düşündü.",
    ],
    1,
    "B seçeneği, resmî kayıt ile günlüklerin farklı bakışlar sunduğu önceki cümlelerden doğal olarak çıkar. A ve D seçenekleri, karşılaştırmanın kapsamını tek bir sonuca indirger.",
  ),
  row(
    "v2-8-flow-01",
    "flow",
    "hard",
    "8",
    "(I) Şehir meydanındaki taş yüzeylerin sıcaklığı öğle saatlerinde ölçüldü. (II) Gölge sağlayan ağaçların bulunduğu yollar ayrıca karşılaştırıldı. (III) Binaların cephe renkleri, mağazaların yaz kampanyalarına göre seçildi. (IV) Yayaların hangi güzergâhlarda daha uzun süre kaldığı kaydedildi. (V) Bulgular, gölge ve yüzey türünün ısı deneyimini nasıl değiştirdiğiyle ilişkilendirildi.",
    "Numaralanmış cümlelerden hangisi düşünce akışını bozmaktadır?",
    [
      "I",
      "II",
      "III",
      "IV",
      "V",
    ],
    2,
    "III. cümle cephe renklerini mağaza kampanyalarıyla ilişkilendirir; diğer cümleler meydandaki ısı, gölge ve yaya deneyimini inceleyen aynı çizgidedir.",
  ),

  row(
    "v2-hs-main_idea-01",
    "main_idea",
    "medium",
    "high-school",
    "Bir çevirmen, romandaki belirsiz bir sözcüğü her yerde aynı karşılıkla vermedi. Sözcüğün bir bölümde karakterin korkusunu, başka bir bölümde ise ironik konuşmasını desteklediğini düşündü ve çevresindeki cümleleri birlikte inceledi. Bazı okurlar tek bir karşılık beklese de çevirmen, metnin anlamını açıklığa kavuşturmak adına bu belirsizliği yok etmenin eserin sesini zayıflatacağını savundu. Böylece çeviri, yalnızca kelimeleri değil, metindeki anlam katmanlarını da taşımaya çalıştı.",
    "Bu parçanın ana düşüncesi aşağıdakilerden hangisidir?",
    [
      "İyi bir çeviri, her sözcüğü metnin her yerinde aynı biçimde karşılamalıdır.",
      "Okurların farklı beklentileri çevirmenin kararlarını bütünüyle belirler.",
      "Bir metni çevirmek, sözcük karşılığı seçmenin yanında bağlamdaki anlam katmanlarını koruma çabasıdır.",
      "Belirsiz anlatımlar, çeviride mutlaka açık ve tek anlamlı hâle getirilmelidir.",
      "Çevirmenin görevi, karakterlerin konuşma biçimini değiştirmeden yalnızca kelimeleri aktarmaktır.",
    ],
    2,
    "C seçeneği, aynı sözcüğün farklı bağlamlarda farklı işlevler taşımasını ve çevirmenin bu katmanları koruma kararını birlikte kapsar. A ve D seçenekleri parçadaki belirsizlik tercihinin tersini savunur.",
  ),
  row(
    "v2-hs-supporting_idea-01",
    "supporting_idea",
    "medium",
    "high-school",
    "Fotoğraf sergisinde aynı meydan, günün farklı saatlerinde çekilmiş görüntülerle yan yana gösterildi. Sabah fotoğraflarında dükkân kepenkleri ve boş kaldırımlar öne çıkarken, akşam görüntülerinde ışıkların ve bekleyen insanların meydanın kullanımını değiştirdiği görülüyordu. Küratör, fotoğrafların sırasını kronolojik kurarak ziyaretçinin yalnızca binaları değil, meydandaki hareketin gün içinde nasıl değiştiğini de izlemesini amaçladı.",
    "Parçada serginin düzenlenişiyle ilgili aşağıdakilerden hangisine değinilmiştir?",
    [
      "Fotoğraflar yalnızca akşam saatlerinde çekilmiştir.",
      "Meydanın binaları farklı yıllarda yeniden inşa edilmiştir.",
      "Ziyaretçilerin fotoğraflara kendi sıralarını vermesi istenmiştir.",
      "Görüntüler kronolojik sırayla düzenlenerek meydanın gün içindeki değişimi gösterilmiştir.",
      "Küratör, insanların meydandaki hareketini sergiden çıkarmıştır.",
    ],
    3,
    "D seçeneği, fotoğrafların kronolojik düzenlenmesi ile gün içindeki kullanım değişiminin gösterilmesi ayrıntılarını birlikte aktarır. A ve E seçenekleri metindeki açık bilgilere aykırıdır.",
  ),
  row(
    "v2-hs-inference-01",
    "inference",
    "hard",
    "high-school",
    "Bir şirket, uzaktan çalışma günlerinde üretkenliğin arttığını çalışan anketlerine dayanarak duyurdu. Ancak ankete yanıt verenlerin çoğu gönüllüydü ve yöneticiler, teslim tarihleri yaklaşan ekiplerin toplantı sayısını azalttığını ayrıca belirtti. İnsan kaynakları daha sonra yanıt vermeyen çalışanlarla görüşüp farklı ekiplerin görev türlerini karşılaştırdı. Sonuçların bazı işlerde olumlu, bazı işlerde ise değişken olması üzerine şirket tek bir çalışma modelini bütün çalışanlara uygulamak yerine ekip bazlı denemeler başlattı.",
    "Bu parçadan aşağıdaki yargılardan hangisine ulaşılabilir?",
    [
      "Gönüllü anketler her zaman bütün çalışanların görüşünü temsil eder.",
      "Uzaktan çalışma bütün görevlerde aynı sonucu doğurur.",
      "Toplantı sayısını azaltmak üretkenliğin kesin nedenidir.",
      "Bir uygulamanın etkisini değerlendirirken katılım biçimi, iş türü ve alternatif açıklamalar birlikte incelenmelidir.",
      "Yöneticilerin gözlemleri, çalışanların deneyimlerini incelemeyi gereksiz kılar.",
    ],
    3,
    "D seçeneği, gönüllü katılımın sınırını, ekip görevlerindeki farkı ve toplantı sayısı gibi alternatif açıklamayı birlikte değerlendirir. B ve C seçenekleri değişken sonuçları tek nedene indirger.",
  ),
  row(
    "v2-hs-completion-01",
    "completion",
    "hard",
    "high-school",
    "Bir roman incelemesinde yazarın kullandığı kısa cümleler, anlatıcının olayları aceleyle aktardığı izlenimini veriyordu. Fakat aynı bölümlerde tekrarlanan bir görüntü, anlatıcının bazı anlarda geçmişe dönüp ayrıntıları yeniden düşündüğünü gösteriyordu. Eleştirmen bu iki özelliği birbirine karşıt saymak yerine, anlatıcının hız ile tereddüt arasında gidip gelmesini metnin gerilimini kuran bir yöntem olarak yorumladı. _____",
    "Parçanın sonuna düşüncenin akışına göre aşağıdakilerden hangisi getirilmelidir?",
    [
      "Böylece kısa cümlelerin romandaki bütün anlamları ortadan kaldırdığı sonucuna vardı.",
      "Bu nedenle eleştirmen, anlatıcının geçmişe dönüşlerini incelemeden yalnızca olay sırasını aktardı.",
      "Sonuç olarak anlatım biçimi, tek bir ruh hâlini değil, değişen bir bakışın hareketini görünür kılıyordu.",
      "Bu görüşe göre romandaki görüntü tekrarlarının hiçbir işlevi bulunmuyordu.",
      "Bunun üzerine romanı yalnızca olay örgüsüne göre değerlendirmek gerektiğini savundu.",
    ],
    2,
    "C seçeneği, kısa cümlelerdeki hız ile geriye dönüşlerdeki tereddüdün birlikte bir anlatım etkisi oluşturmasını tamamlar. Diğer seçenekler, eleştirmenin iki özelliği birlikte yorumlama yaklaşımını reddeder.",
  ),
  row(
    "v2-hs-flow-01",
    "flow",
    "hard",
    "high-school",
    "(I) Romanın anlatıcısı çocukluk anılarını şimdiki zamanla aktarır. (II) Geçmişteki olayları bugünkü bilgisiyle yeniden yorumlar. (III) Yazarın sonraki romanının satış rakamları, yayınevinin tanıtım planıyla birlikte incelenir. (IV) Bazı ayrıntıları hatırlamadığını söylemesi, anlatıcının belleğine bütünüyle güvenilemeyeceğini düşündürür. (V) Böylece metin, geçmiş ile bugünkü bakış arasındaki mesafeyi görünür kılar.",
    "Numaralanmış cümlelerden hangisi düşünce akışını bozmaktadır?",
    [
      "I",
      "II",
      "III",
      "IV",
      "V",
    ],
    2,
    "III. cümle başka bir romanın satış ve tanıtım sürecine geçer; diğer cümleler aynı romandaki anlatıcı, bellek ve zaman ilişkisini inceler.",
  ),
];

const passageTailVariants = {
  "v2-4-5-main_idea-01": "Sonraki haftalarda çocuklar kutuların doluluk durumunu kontrol edip gerekli değişiklikleri yaptılar.",
  "v2-8-main_idea-01": "Yeni düzenlemede sabah alışverişine gelenlerle akşam dinlenmek isteyenler alanı farklı biçimlerde kullanabildi.",
  "v2-hs-main_idea-01": "Okur, aynı kelimenin farklı bağlamlarda farklı tınlamalar taşıdığını izleyebildi.",
};
const passageTailReplacements = {
  "v2-4-5-main_idea-01": "Çocuklar, tek bir temizlik gününden çok düzenli gözlem ve ortak kararın işe yaradığını anladı.",
  "v2-8-main_idea-01": "Böylece pazar, geçmişle bağını koparmadan bugünkü kullanım biçimlerine cevap veren bir alan oldu.",
  "v2-hs-main_idea-01": "Böylece çeviri, yalnızca kelimeleri değil, metindeki anlam katmanlarını da taşımaya çalıştı.",
};
for (const item of paragraphQuestionExpansionV2Pilot) {
  if (passageTailVariants[item.id]) item.passage = item.passage.replace(passageTailReplacements[item.id], passageTailVariants[item.id]);
  if (item.category === "supporting_idea") item.difficulty = "easy";
}

const questionVariants = {
  "v2-4-5-main_idea-01": "Gölet çevresindeki değişimler birlikte düşünüldüğünde parçanın ana düşüncesi aşağıdakilerden hangisidir?",
  "v2-4-5-supporting_idea-01": "Değiş tokuş rafının kullanımıyla ilgili parçada hangi bilgiye yer verilmiştir?",
  "v2-4-5-inference-01": "Ailenin piknik sırasındaki kararlarından hareketle aşağıdaki yargılardan hangisine ulaşılabilir?",
  "v2-4-5-completion-01": "Mina'nın denemelerinden sonra düşüncenin akışına uygun cümle aşağıdakilerden hangisidir?",
  "v2-4-5-flow-01": "Bahçedeki su kullanımını anlatan numaralı cümlelerden hangisi akışı bozmaktadır?",
  "v2-8-main_idea-01": "Pazar yerinin yenilenmesini anlatan bu parçanın bütünü için aşağıdaki yargılardan hangisi söylenebilir?",
  "v2-8-supporting_idea-01": "Podcast kaydının düzenlenmesiyle ilgili parçada hangi ayrıntıdan söz edilmiştir?",
  "v2-8-inference-01": "Okuma uygulamasındaki değişimlerden hareketle aşağıdaki sonuçlardan hangisine ulaşılabilir?",
  "v2-8-completion-01": "Tarihçinin karşılaştırmasından sonra paragrafın düşünce akışına uygun cümle hangisidir?",
  "v2-8-flow-01": "Şehir meydanındaki ısı incelemesini anlatan numaralı cümlelerden hangisi konu bütünlüğünü bozmaktadır?",
  "v2-hs-main_idea-01": "Çeviri kararlarını açıklayan bu parçanın temel savı aşağıdakilerden hangisidir?",
  "v2-hs-supporting_idea-01": "Fotoğraf sergisinin kuruluş biçimiyle ilgili parçada hangi bilgiye yer verilmiştir?",
  "v2-hs-inference-01": "Şirketin uzaktan çalışma deneyiminden hareketle hangi yargıya ulaşılabilir?",
  "v2-hs-completion-01": "Roman incelemesinin düşünce akışına göre sonuna hangisi getirilmelidir?",
  "v2-hs-flow-01": "Roman anlatıcısının ele alındığı numaralı cümlelerden hangisi akışı bozmaktadır?",
};

const optionVariants = {
  "v2-4-5-main_idea-01": [
    "Gölet çevresindeki ördeklerin sayısı her mevsim aynı kalır.",
    "Çöpleri toplamak, gözlem yapılmadan da sorunu çözmeye yeter.",
    "Bir çevre sorununu çözmek, gözlem ve ortak çabayla daha kalıcı hâle gelebilir.",
    "Çocukların çevre çalışması yalnızca ilkbaharda yapılabilir.",
    "Geri dönüşüm kutuları, düzenli bakım olmadan da çevreyi temiz tutar.",
  ],
  "v2-4-5-supporting_idea-01": [
    "Rafı ilk hafta yalnızca yetişkinler düzenlemiştir.",
    "Çocuklar okudukları kitaplar için kısa öneriler yazmıştır.",
    "Kitaplar yaşlarına göre ayrılmış, ancak değiş tokuş yapılmamıştır.",
    "Komşular önerilerini kitaplardan bağımsız olarak paylaşmıştır.",
    "Raf, kitap alınmadan önce başka bir yere taşınmıştır.",
  ],
  "v2-4-5-inference-01": [
    "Aile, planını hava koşullarına göre değiştirmeyi göze almıştır.",
    "Çocuklar açık havada piknik yapmaktan vazgeçmiştir.",
    "Taş zemin, çimenlerden daha güvenli olduğu için seçilmiştir.",
    "Rüzgâr öğleden sonra daha da şiddetlenmiştir.",
    "Piknik eşyaları hazırlıksız çıkıldığı için eksik kalmıştır.",
  ],
  "v2-4-5-completion-01": [
    "Mina, ilk tahminini sınamadan köprünün yeterli olduğuna karar verdi.",
    "Mina, destekleri yalnızca uçlarda tutup yeni bir ölçüm yapmadı.",
    "Mina, görünüşü beğendiği için taşıma miktarını yeniden hesaplamadı.",
    "Mina, başarının denemelerden sonra yapılan değişikliklerle geliştiğini gördü.",
    "Mina, katlama biçiminin taşıma gücünü değiştirmediğini düşündü.",
  ],
  "v2-8-main_idea-01": [
    "Bir alanı yenilemek, geçmişini korurken bugünkü kullanıma da uyarlamayı gerektirir.",
    "Eski yapıların tamamı yeni binalarla değiştirilmelidir.",
    "Pazar yerlerinin düzenlenmesinde esnafın görüşü tek başına belirleyicidir.",
    "Tarihî ayrıntılar günlük kullanımı çoğu durumda zorlaştırır.",
    "Yayaların durduğu yerler, şehir planlamasında ikincil bir ayrıntıdır.",
  ],
  "v2-8-supporting_idea-01": [
    "Kayıttaki bütün sessizlikler aynı biçimde silinmiştir.",
    "Düzenleme yapılırken hem açıklık hem de doğal konuşma ritmi gözetilmiştir.",
    "Konuşmacı, kaydı yeniden dinlemeden doğrudan yayımlamıştır.",
    "Uzun duraklamalar, dinleyicinin konuyu izlemesini kolaylaştırmıştır.",
    "Podcastte açıklamalar yalnızca yazılı biçimde kullanılmıştır.",
  ],
  "v2-8-inference-01": [
    "Bir davranıştaki farkı açıklamak için ilk ölçüt yeterli sayılabilir.",
    "Bildirimler kapatıldığında öğrencilerin okuma hızları birbirine yaklaşır.",
    "Okuma verisi, teknik koşullar ve öğrenci farkları birlikte değerlendirilerek yorumlanmalıdır.",
    "Kitap uzunluğu, okuma davranışını açıklayan tek değişken olmalıdır.",
    "Uygulamadaki raporlar, öğrencilerin deneyimlerinden daha güvenilir bir sonuç verir.",
  ],
  "v2-8-completion-01": [
    "Bu yüzden yolun yararlı olduğunu belirten resmî kaydı daha güvenilir kabul etti.",
    "Günlüklerdeki kişisel ifadeleri araştırmanın dışında bıraktı.",
    "Böylece farklı tanıklıkların hangi soruya cevap verdiğini ayırmak gerektiğini gösterdi.",
    "Yolun yapımının mahallede yaşayan herkes için aynı sonucu doğurduğu sonucuna vardı.",
    "İki kaynak arasındaki çelişkinin tarihî olayı anlamayı imkânsız kıldığını düşündü.",
  ],
  "v2-hs-main_idea-01": [
    "Çeviri, sözcük karşılığından çok bağlamdaki anlam katmanlarını koruma çabasıdır.",
    "İyi bir çeviri, her sözcüğü metnin her yerinde aynı biçimde karşılamalıdır.",
    "Okurların farklı beklentileri çevirmenin kararlarını bütünüyle belirler.",
    "Belirsiz anlatımlar, çeviride mutlaka açık ve tek anlamlı hâle getirilmelidir.",
    "Çevirmenin görevi, karakterlerin konuşma biçimini değiştirmeden kelimeleri aktarmaktır.",
  ],
  "v2-hs-supporting_idea-01": [
    "Fotoğraflar yalnızca akşam saatlerinde çekilmiştir.",
    "Görüntüler kronolojik sırayla düzenlenerek meydanın gün içindeki değişimi gösterilmiştir.",
    "Meydanın binaları farklı yıllarda yeniden inşa edilmiştir.",
    "Ziyaretçilerin fotoğraflara kendi sıralarını vermesi istenmiştir.",
    "Küratör, meydandaki insan hareketini sıralama yoluyla izletmeyi amaçlamıştır.",
  ],
  "v2-hs-inference-01": [
    "Gönüllü ankette çoğunluk cevap verdiğinde bütün çalışanların görüşü temsil edilmiş sayılır.",
    "Uzaktan çalışma, görevlerin niteliği değişse bile benzer sonuçlar doğurur.",
    "Uygulamanın etkisi, katılım biçimi ve iş türü gibi koşullarla birlikte değerlendirilmelidir.",
    "Toplantı sayısının azalması, üretkenlikteki artışın yeterli açıklamasıdır.",
    "Yöneticilerin gözlemleri, çalışanlarla ayrıca görüşme yapılmasını gereksiz kılacak kadar yeterlidir.",
  ],
  "v2-hs-completion-01": [
    "Böylece kısa cümlelerin romandaki anlamı tek başına belirlemediğini savundu.",
    "Bu nedenle eleştirmen, geçmişe dönüşleri incelemeden yalnızca olay sırasını aktardı.",
    "Bu görüşe göre görüntü tekrarları anlatımın gerilimine hiçbir katkı sağlamıyordu.",
    "Sonuç olarak anlatım biçimi, değişen bir bakışın hareketini görünür kılıyordu.",
    "Bunun üzerine romanı yalnızca olay örgüsüne göre değerlendirmek gerektiğini savundu.",
  ],
};

for (const item of paragraphQuestionExpansionV2Pilot) {
  if (questionVariants[item.id]) item.question = questionVariants[item.id];
  if (optionVariants[item.id]) item.options = optionVariants[item.id];
}

const lengthBalancePatches = {
  "v2-4-5-main_idea-01": {
    0: "Gölet çevresindeki ördeklerin sayısı her mevsim aynı kalır ve değişmez.",
    4: "Geri dönüşüm kutuları, düzenli bakım yapılmasa bile çevreyi temiz tutabilir.",
  },
  "v2-4-5-inference-01": {
    2: "Taş zemin, rüzgâr sırasında çimenlerden daha güvenli olduğu için seçilmiştir.",
    3: "Rüzgâr öğleden sonra da güçlenmiş ve ailenin piknikten dönmesine yol açmıştır.",
    4: "Piknik eşyaları hazırlıksız çıkıldığı için eksik kalmış, plan bu yüzden değişmiştir.",
  },
  "v2-4-5-completion-01": {
    3: "Mina, başarının sonuçlara göre yapılan değişikliklerle geliştiğini gördü.",
  },
  "v2-8-main_idea-01": {
    0: "Bir alanı yenilemek, geçmişini koruyarak bugünkü kullanıma uyarlamaktır.",
  },
  "v2-8-supporting_idea-01": {
    1: "Düzenleme, açıklığı sağlarken konuşmanın doğal ritmini de korudu.",
  },
  "v2-8-inference-01": {
    2: "Okuma verisi, teknik koşullar ve öğrenci farkları birlikte düşünülmelidir.",
  },
  "v2-8-completion-01": {
    2: "Böylece farklı tanıklıkların sorularını ayırmak, olayı tek kaynağa indirgemeyi önledi.",
  },
  "v2-hs-supporting_idea-01": {
    1: "Görüntüler kronolojik sırayla düzenlenerek meydanın gün içindeki değişimi gösterildi.",
    4: "Küratör, meydandaki insan hareketinin fotoğraf sırası içinde ziyaretçilerce izlenmesini amaçladı.",
  },
};

for (const item of paragraphQuestionExpansionV2Pilot) {
  const patches = lengthBalancePatches[item.id];
  if (!patches) continue;
  for (const [index, value] of Object.entries(patches)) item.options[Number(index)] = value;
}

const semanticOptionPatches = {
  "v2-hs-supporting_idea-01": {
    0: "Fotoğraflar akşam saatlerinde çekilmiştir.",
    4: "Küratör, meydandaki insan hareketinin fotoğraf sırası dışında değerlendirilmesini amaçladı.",
  },
  "v2-4-5-main_idea-01": {
    3: "Çocukların çevre çalışması, ilkbaharla sınırlı kalmıştır.",
  },
  "v2-4-5-supporting_idea-01": {
    0: "Rafı ilk hafta yetişkinler düzenlemiştir.",
  },
  "v2-4-5-completion-01": {
    1: "Mina, destekleri uçlarda tutup yeni bir ölçüm yapmadı.",
  },
  "v2-8-supporting_idea-01": {
    4: "Podcastte açıklamalar yazılı biçimde kullanılmıştır.",
  },
  "v2-hs-completion-01": {
    0: "Böylece kısa cümlelerin metne durağan bir ritim kattığını savundu.",
    1: "Bu nedenle eleştirmen, geçmişe dönüşleri incelemeden olay sırasını aktardı.",
    2: "Sonuç olarak anlatım biçimi, değişen bir bakışın hareketini görünür kılıyordu.",
    3: "Bu görüşe göre görüntü tekrarlarının anlatımın gerilimine katkısı olmadığını savundu.",
    4: "Bunun üzerine romanı olay örgüsüne göre değerlendirmek gerektiğini savundu.",
  },
};
for (const item of paragraphQuestionExpansionV2Pilot) {
  const patches = semanticOptionPatches[item.id];
  if (!patches) continue;
  for (const [index, value] of Object.entries(patches)) item.options[Number(index)] = value;
}

const explanationVariants = {
  "v2-8-main_idea-01": "A seçeneği, kullanım gözlemleriyle tarihî ayrıntıların aynı tasarım kararında birleştirilmesini özetler. C ve D seçenekleri parçadaki kapsamı daraltır veya tersine çevirir.",
  "v2-8-supporting_idea-01": "B seçeneği, gereksiz duraklamaların düzenlenmesiyle doğal ritmin korunmasını birlikte verir. A seçeneği metindeki ‘her sessizliği silmedi’ ayrıntısıyla çelişir.",
  "v2-8-inference-01": "C seçeneği, ilk açıklamanın yetersiz kalması, teknik değişiklikten sonra azalmanın görülmesi ve sınıflar arasındaki farkın sürmesi olmak üzere üç ipucunu birleştirir. B seçeneği ise sonucu gereğinden fazla geneller.",
  "v2-8-completion-01": "D seçeneği, resmî kayıt ile günlüklerin farklı bakışlar sunduğu önceki cümlelerden doğal olarak çıkar. A ve C seçenekleri, karşılaştırmanın kapsamını tek bir sonuca indirger.",
  "v2-hs-main_idea-01": "A seçeneği, aynı sözcüğün farklı bağlamlarda farklı işlevler taşımasını ve çevirmenin bu katmanları koruma kararını birlikte kapsar. B ve D seçenekleri parçadaki belirsizlik tercihinin tersini savunur.",
  "v2-hs-supporting_idea-01": "B seçeneği, fotoğrafların kronolojik düzenlenmesi ile gün içindeki kullanım değişiminin gösterilmesi ayrıntılarını birlikte aktarır. A ve E seçenekleri metindeki açık bilgilere aykırıdır.",
  "v2-hs-inference-01": "C seçeneği, gönüllü katılımın sınırını, ekip görevlerindeki farkı ve toplantı sayısı gibi alternatif açıklamayı birlikte değerlendirir. B ve D seçenekleri değişken sonuçları tek nedene indirger.",
  "v2-hs-completion-01": "D seçeneği, kısa cümlelerdeki hız ile geriye dönüşlerdeki tereddüdün birlikte bir anlatım etkisi oluşturmasını tamamlar. Diğer seçenekler, eleştirmenin iki özelliği birlikte yorumlama yaklaşımını reddeder.",
};
for (const item of paragraphQuestionExpansionV2Pilot) {
  if (explanationVariants[item.id]) item.explanation = explanationVariants[item.id];
}

const baseCorrectIndexPlan = {
  "v2-8-main_idea-01": 0,
  "v2-8-supporting_idea-01": 1,
  "v2-8-inference-01": 2,
  "v2-8-completion-01": 2,
  "v2-hs-main_idea-01": 0,
  "v2-hs-supporting_idea-01": 1,
  "v2-hs-inference-01": 2,
};

for (const item of paragraphQuestionExpansionV2Pilot) {
  if (baseCorrectIndexPlan[item.id] !== undefined) item.correct_index = baseCorrectIndexPlan[item.id];
}

const answerPositionPlan = {
  "v2-4-5-main_idea-01": 2,
  "v2-4-5-supporting_idea-01": 1,
  "v2-4-5-inference-01": 0,
  "v2-4-5-completion-01": 3,
  "v2-4-5-flow-01": 4,
  "v2-8-main_idea-01": 0,
  "v2-8-supporting_idea-01": 1,
  "v2-8-inference-01": 2,
  "v2-8-completion-01": 3,
  "v2-8-flow-01": 4,
  "v2-hs-main_idea-01": 0,
  "v2-hs-supporting_idea-01": 1,
  "v2-hs-inference-01": 2,
  "v2-hs-completion-01": 3,
  "v2-hs-flow-01": 4,
};

for (const item of paragraphQuestionExpansionV2Pilot) {
  const targetIndex = answerPositionPlan[item.id];
  if (targetIndex === undefined || targetIndex === item.correct_index) continue;
  const correct = item.options[item.correct_index];
  const distractors = item.options.filter((_, index) => index !== item.correct_index);
  distractors.splice(targetIndex, 0, correct);
  item.options = distractors;
  item.correct_index = targetIndex;
}

const rejectedQuestionReplacements = {
  "v2-4-5-completion-01": {
    category: "completion",
    difficulty: "hard",
    grade_band: "4-5",
    passage: "Deniz, mahalle fırınının önündeki su kabının her akşam boşaldığını fark etti. Önce kabın küçük olduğunu düşündü; daha büyük bir kap koyunca su yine kısa sürede bitti. Sonra sıcak günlerde çevredeki kedilerin daha sık uğradığını gözlemledi ve kabı gölgeye taşıdı. Su artık daha uzun süre kaldı, fakat sabahları kabın çevresinde izler görmeye devam etti. _____",
    question: "Deniz'in gözlemlerinden sonra paragrafın düşünce akışına uygun cümle aşağıdakilerden hangisidir?",
    options: [
      "Su kabının hacmini artırmanın, konumu değiştirmekten daha belirleyici olduğunu düşündü.",
      "Kedilerin suya ne zaman ulaştığını bilmenin, kabın yerini değiştirmeye gerek bırakacağını savundu.",
      "Su kabında doğru çözüm için hacim, konum ve zamanı birlikte düşünmek gerektiğini anladı.",
      "Sıcak günlerde görülen izlerin, kapta kalan su miktarını açıklamadığını düşündü.",
      "Kabın yerini değiştirdiğinde suyun azalmasının nedenini kesin olarak bulduğuna karar verdi.",
    ],
    correct_index: 3,
    explanation: "D seçeneği, kabın büyüklüğü, bulunduğu yer ve kedilerin kullanım zamanı arasındaki ilişkiyi birlikte kurar. A ve B seçenekleri bu etkenlerden birini öne çıkarıp diğer gözlemleri daraltır; E ise gözlemlerin izin verdiğinden daha kesin bir sonuç bildirir.",
  },
  "v2-4-5-flow-01": {
    category: "flow",
    difficulty: "hard",
    grade_band: "4-5",
    passage: "(I) Gölet suyunun berraklığı farklı günlerde ölçüldü. (II) Suyun içindeki yaprak ve plastik parçaları türlerine göre ayrıldı. (III) Yağmurdan sonraki ölçümler, kuru günlerdeki sonuçlarla karşılaştırıldı. (IV) Ziyaretçilerin gölet çevresinde dinlenmek için seçtiği noktalar işaretlendi. (V) Elde edilen notlara göre temizlik günlerinde hangi bölümlere öncelik verileceği belirlendi.",
    question: "Gölet suyunun incelenme sürecini anlatan numaralı cümlelerden hangisi düşünce akışını bozmaktadır?",
    options: ["I", "II", "III", "V", "IV"],
    correct_index: 4,
    explanation: "IV. cümle ziyaretçilerin dinlenme tercihine geçer; I, II, III ve V ise suyun durumunu ölçüp temizlik kararına bağlayan bir inceleme zinciri oluşturur.",
  },
  "v2-8-flow-01": {
    category: "flow",
    difficulty: "hard",
    grade_band: "8",
    passage: "(I) Meydanın taş yüzeylerinde öğle sıcaklığı ölçüldü. (II) Ağaç gölgeleriyle güneş alan bölümlerin sıcaklıkları karşılaştırıldı. (III) Taşların açık veya koyu renkte seçilmesi, meydanın tarihî görünümüyle ilişkilendirildi. (IV) Yaya güzergâhlarında bekleme süreleri bu ölçümlerle karşılaştırıldı. (V) Sonuçlar, gölge ve yüzey özelliklerinin hissedilen sıcaklıkla ilişkisini gösterdi.",
    question: "Meydanın ısı koşullarını inceleyen numaralı cümlelerden hangisi düşünce akışını bozmaktadır?",
    options: ["I", "II", "IV", "V", "III"],
    correct_index: 4,
    explanation: "III. cümle taş rengini tarihî görünüşle ilişkilendirir; I, II, IV ve V ise sıcaklık ölçümü ile yaya deneyimi arasındaki inceleme zincirini sürdürür.",
  },
  "v2-hs-flow-01": {
    category: "flow",
    difficulty: "hard",
    grade_band: "high-school",
    passage: "(I) Roman, çocukluk anılarını yıllar sonra anlatan bir sesle başlar. (II) Anlatıcı, hatırlamadığı yerleri açıkça işaretler; böylece kesinlik iddiasını sınırlar. (III) Aynı olayın farklı bölümlerde değişen ayrıntılarla dönmesi, belleğin yeniden kurucu niteliğini düşündürür. (IV) Çocukluk anlatılarının okurda nostalji uyandırması, romanın günümüzdeki beğenisini de artırmıştır. (V) Dolayısıyla okur, anıları değişmez bir kayıt değil, bugünkü bakışın biçimlendirdiği bir yorum olarak okumalıdır.",
    question: "Romanın anlatıcı ve bellek ilişkisini ele alan numaralı cümlelerden hangisi düşünce akışını bozmaktadır?",
    options: ["I", "II", "IV", "V", "III"],
    correct_index: 4,
    explanation: "IV. cümle anlatımın güvenilirliği ve belleğin kuruluşundan okurun beğenisine geçer; I, II, III ve V ise anıların bugünkü bakışla yeniden kurulması düşüncesini geliştirir.",
  },
};

for (const [id, replacement] of Object.entries(rejectedQuestionReplacements)) {
  const item = paragraphQuestionExpansionV2Pilot.find((candidate) => candidate.id === id);
  Object.assign(item, replacement);
}

// Final answer-key consistency repairs. These do not alter passage, question, or options.
const answerKeyConsistencyRepairs = {
  "v2-4-5-completion-01": {
    correct_index: 2,
    explanation: "C seçeneği, kabın büyüklüğü, bulunduğu yer ve kedilerin kullanım zamanı arasındaki ilişkiyi birlikte kurar. A ve B seçenekleri bu etkenlerden birini öne çıkarıp diğer gözlemleri daraltır; E ise gözlemlerin izin verdiğinden daha kesin bir sonuç bildirir.",
  },
  "v2-hs-flow-01": {
    correct_index: 2,
  },
};

for (const [id, repair] of Object.entries(answerKeyConsistencyRepairs)) {
  const item = paragraphQuestionExpansionV2Pilot.find((candidate) => candidate.id === id);
  Object.assign(item, repair);
}

export const v2PilotTarget = { "4-5": 5, "8": 5, "high-school": 5 };
