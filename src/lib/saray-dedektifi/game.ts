export type SarayDedektifiModeId = "baslangic" | "gelisen" | "ileri" | "usta" | "uzman";
export type SarayDedektifiSpeedId = "rahat" | "normal" | "hizli" | "cokhizli";

export type SarayDedektifiFacts = {
  kim: string;
  nesne?: string;
  renk?: string;
  yer?: string;
  zaman?: string;
  sayi?: string;
  detay?: string;
};

export type SarayDedektifiCase = {
  id: string;
  tier: number;
  icon: string;
  story: string;
  facts: SarayDedektifiFacts;
};

export type SarayDedektifiQuestionType = "kim" | "nesne" | "renk" | "yer" | "zaman" | "sayi" | "detay";

export type SarayDedektifiQuestion = {
  type: SarayDedektifiQuestionType;
  question: string;
  correct: string;
  options: string[];
};

export type SarayDedektifiMode = {
  id: SarayDedektifiModeId;
  name: string;
  icon: string;
  tiers: number[];
  storyDurationMs: number;
  questions: number;
  options: number;
  lives: number;
  rounds: number;
  description: string;
};

export type SarayDedektifiSpeed = {
  id: SarayDedektifiSpeedId;
  name: string;
  icon: string;
  multiplier: number;
  description: string;
};

export const SARAY_DEDEKTIFI_MODES: readonly SarayDedektifiMode[] = [
  { id: "baslangic", name: "Başlangıç", icon: "🌱", tiers: [1], storyDurationMs: 8500, questions: 2, options: 3, lives: 4, rounds: 6, description: "Kısa metin • temel ayrıntılar" },
  { id: "gelisen", name: "Gelişen", icon: "🧭", tiers: [1, 2], storyDurationMs: 8000, questions: 3, options: 4, lives: 4, rounds: 7, description: "1–2 cümle • temel ayrıntılar" },
  { id: "ileri", name: "İleri", icon: "🔎", tiers: [2, 3], storyDurationMs: 8000, questions: 4, options: 4, lives: 3, rounds: 8, description: "2–3 cümle • daha çok ipucu" },
  { id: "usta", name: "Usta", icon: "🕵️", tiers: [3, 4], storyDurationMs: 8500, questions: 5, options: 4, lives: 3, rounds: 8, description: "3–4 cümle • benzer seçenekler" },
  { id: "uzman", name: "Uzman", icon: "👑", tiers: [4, 5], storyDurationMs: 9000, questions: 5, options: 5, lives: 2, rounds: 9, description: "4–5 cümle • yoğun ayrıntı" },
];

export const SARAY_DEDEKTIFI_SPEEDS: readonly SarayDedektifiSpeed[] = [
  { id: "rahat", name: "Rahat", icon: "🐢", multiplier: 1.9, description: "Daha uzun okuma süresi" },
  { id: "normal", name: "Normal", icon: "📖", multiplier: 1, description: "Dengeli okuma süresi" },
  { id: "hizli", name: "Hızlı", icon: "⚡", multiplier: 0.78, description: "Kısa okuma süresi" },
  { id: "cokhizli", name: "Çok Hızlı", icon: "🚀", multiplier: 0.6, description: "Hızlı oku ve hatırla" },
];

export const SARAY_DEDEKTIFI_CASES: readonly SarayDedektifiCase[] = [
  { id: "t1-1", tier: 1, icon: "👸 🔑 📚", story: "Prenses Ela, mavi anahtarı kütüphaneye bıraktı.", facts: { kim: "Prenses Ela", nesne: "anahtar", renk: "Mavi", yer: "Kütüphane" } },
  { id: "t1-2", tier: 1, icon: "🤴 📜 🌹", story: "Prens Arda, altın haritayı gül bahçesinde buldu.", facts: { kim: "Prens Arda", nesne: "harita", renk: "Altın", yer: "Gül bahçesi" } },
  { id: "t1-3", tier: 1, icon: "👑 🧤 🍽️", story: "Kraliçe Sera, beyaz eldivenini yemek salonunda unuttu.", facts: { kim: "Kraliçe Sera", nesne: "eldiven", renk: "Beyaz", yer: "Yemek salonu" } },
  { id: "t1-4", tier: 1, icon: "🧙‍♀️ 💎 🏰", story: "Büyücü Lila, mor taşı kuzey kulesine götürdü.", facts: { kim: "Büyücü Lila", nesne: "taş", renk: "Mor", yer: "Kuzey kulesi" } },
  { id: "t1-5", tier: 1, icon: "🛡️ 🪶 🚪", story: "Muhafız Can, yeşil tüyü saray kapısının yanında buldu.", facts: { kim: "Muhafız Can", nesne: "tüy", renk: "Yeşil", yer: "Saray kapısı" } },
  { id: "t1-6", tier: 1, icon: "👩‍🍳 🥄 🍰", story: "Aşçı Mina, gümüş kaşığı pasta odasına götürdü.", facts: { kim: "Aşçı Mina", nesne: "kaşık", renk: "Gümüş", yer: "Pasta odası" } },
  { id: "t1-7", tier: 1, icon: "🐈 🎀 🎭", story: "Kedi Pamuk, kırmızı kurdeleyi balo salonuna taşıdı.", facts: { kim: "Kedi Pamuk", nesne: "kurdele", renk: "Kırmızı", yer: "Balo salonu" } },
  { id: "t1-8", tier: 1, icon: "🌳 🔔 🏡", story: "Bahçıvan Efe, sarı zili sera kapısına astı.", facts: { kim: "Bahçıvan Efe", nesne: "zil", renk: "Sarı", yer: "Sera kapısı" } },
  { id: "t1-9", tier: 1, icon: "👸 🪞 👗", story: "Prenses Mira, pembe aynayı giyinme odasına bıraktı.", facts: { kim: "Prenses Mira", nesne: "ayna", renk: "Pembe", yer: "Giyinme odası" } },
  { id: "t1-10", tier: 1, icon: "🤴 🧣 🐎", story: "Prens Demir, lacivert atkısını ahırda unuttu.", facts: { kim: "Prens Demir", nesne: "atkı", renk: "Lacivert", yer: "Ahır" } },

  { id: "t2-1", tier: 2, icon: "🧙‍♀️ 💎 📦", story: "Büyücü Lila, mor taşı kuzey kulesine götürdü. Taşı küçük ahşap bir sandığın içine sakladı.", facts: { kim: "Büyücü Lila", nesne: "taş", renk: "Mor", yer: "Kuzey kulesi", detay: "Ahşap sandık" } },
  { id: "t2-2", tier: 2, icon: "🐈 🎀 🪞", story: "Kedi Pamuk, kırmızı kurdeleyi balo salonuna taşıdı. Kurdele, büyük aynanın yanında bulundu.", facts: { kim: "Kedi Pamuk", nesne: "kurdele", renk: "Kırmızı", yer: "Balo salonu", detay: "Büyük aynanın yanı" } },
  { id: "t2-3", tier: 2, icon: "👸 📘 🌙", story: "Prenses Ela, mavi günlüğünü akşam kule odasında okudu. Sonra kitabı pencerenin önüne bıraktı.", facts: { kim: "Prenses Ela", nesne: "günlük", renk: "Mavi", yer: "Kule odası", detay: "Pencerenin önü", zaman: "Akşam" } },
  { id: "t2-4", tier: 2, icon: "🛡️ 🕯️ 🚪", story: "Muhafız Can, gece doğu kapısında nöbet tuttu. Yanında iki sarı mum vardı.", facts: { kim: "Muhafız Can", nesne: "mum", renk: "Sarı", yer: "Doğu kapısı", zaman: "Gece", sayi: "İki" } },
  { id: "t2-5", tier: 2, icon: "👩‍🍳 🥧 🍎", story: "Aşçı Mina, öğleden sonra üç elmalı turta yaptı. Turtaları küçük mutfak masasına koydu.", facts: { kim: "Aşçı Mina", nesne: "elmalı turta", yer: "Küçük mutfak masası", zaman: "Öğleden sonra", sayi: "Üç" } },
  { id: "t2-6", tier: 2, icon: "🤴 🗺️ 💧", story: "Prens Arda, sabah gümüş haritayı çeşmenin yanında buldu. Haritanın köşesinde kırmızı bir yıldız vardı.", facts: { kim: "Prens Arda", nesne: "harita", renk: "Gümüş", yer: "Çeşmenin yanı", detay: "Kırmızı yıldız", zaman: "Sabah" } },
  { id: "t2-7", tier: 2, icon: "👑 📿 🌹", story: "Kraliçe Sera, inci kolyesini gül bahçesinde taktı. Daha sonra kolyeyi beyaz bankın üzerine bıraktı.", facts: { kim: "Kraliçe Sera", nesne: "inci kolye", renk: "İnci", yer: "Gül bahçesi", detay: "Beyaz bank" } },
  { id: "t2-8", tier: 2, icon: "🌳 🪴 🦋", story: "Bahçıvan Efe, iki mor saksıyı kelebek bahçesine taşıdı. Saksıları çeşmenin sağ tarafına yerleştirdi.", facts: { kim: "Bahçıvan Efe", nesne: "saksı", renk: "Mor", yer: "Kelebek bahçesi", detay: "Çeşmenin sağı", sayi: "İki" } },
  { id: "t2-9", tier: 2, icon: "👸 🧁 🎁", story: "Prenses Mira, pembe kutuya dört küçük kek koydu. Kutuyu müzik odasındaki masaya bıraktı.", facts: { kim: "Prenses Mira", nesne: "kek", renk: "Pembe kutu", yer: "Müzik odası", detay: "Masa", sayi: "Dört" } },
  { id: "t2-10", tier: 2, icon: "🐎 🍎 🌳", story: "Prens Demir, siyah atı Gece'yi elma bahçesine götürdü. Atın eyerinde mavi bir çanta vardı.", facts: { kim: "Prens Demir", nesne: "mavi çanta", renk: "Mavi", yer: "Elma bahçesi", detay: "Atın eyeri" } },

  { id: "t3-1", tier: 3, icon: "👑 🗝️ 🕯️", story: "Kral, akşam yemeğinden önce gümüş anahtarı çalışma odasına bıraktı. Hizmetçi Duru, anahtarı masanın üstünde gördü. Odadaki iki mumdan yalnızca biri yanıyordu.", facts: { kim: "Kral", nesne: "anahtar", renk: "Gümüş", yer: "Çalışma odası", detay: "Masanın üstü", zaman: "Akşam yemeğinden önce", sayi: "Bir mum" } },
  { id: "t3-2", tier: 3, icon: "🐎 🍎 🌳", story: "Prens Arda sabah erkenden siyah atı Fırtına'yı elma bahçesine götürdü. Bahçıvan Efe, ağacın altına üç kırmızı elma bırakmıştı. Arda dönüşte bir elmayı saray aşçısına verdi.", facts: { kim: "Prens Arda", nesne: "kırmızı elma", renk: "Kırmızı", yer: "Elma bahçesi", detay: "Ağacın altı", zaman: "Sabah erken", sayi: "Üç" } },
  { id: "t3-3", tier: 3, icon: "👸 🦜 🔔", story: "Prenses Ela öğleden sonra yeşil papağanı Zümrüt'ü müzik odasına götürdü. Papağanın kafesinde iki küçük gümüş zil vardı. Ela kafesi piyanonun yanına bıraktı.", facts: { kim: "Prenses Ela", nesne: "papağan Zümrüt", renk: "Yeşil", yer: "Müzik odası", detay: "Piyanonun yanı", zaman: "Öğleden sonra", sayi: "İki zil" } },
  { id: "t3-4", tier: 3, icon: "🧙‍♀️ 📘 ⭐", story: "Büyücü Lila gece yarısından hemen önce mavi büyü kitabını gözlemevine taşıdı. Kitabın kapağında beş altın yıldız bulunuyordu. Lila kitabı teleskobun altındaki çekmeceye koydu.", facts: { kim: "Büyücü Lila", nesne: "büyü kitabı", renk: "Mavi", yer: "Gözlemevi", detay: "Teleskobun altındaki çekmece", zaman: "Gece yarısından önce", sayi: "Beş yıldız" } },
  { id: "t3-5", tier: 3, icon: "👩‍🍳 🍓 🧺", story: "Aşçı Mina sabah pazardan dört sepet çilek getirdi. İki sepeti soğuk depoya, diğerlerini mutfağa bıraktı. En büyük sepetin üzerinde sarı bir kurdele vardı.", facts: { kim: "Aşçı Mina", nesne: "çilek sepeti", renk: "Sarı kurdele", yer: "Soğuk depo ve mutfak", detay: "En büyük sepet", zaman: "Sabah", sayi: "Dört sepet" } },
  { id: "t3-6", tier: 3, icon: "🛡️ 🏹 🌉", story: "Muhafız Can gün batımında taş köprünün yanında nöbete başladı. Yanında üç ok ve kahverengi bir yay vardı. İkinci oku köprünün kuzey ucundaki işaret taşının yanına bıraktı.", facts: { kim: "Muhafız Can", nesne: "ok", renk: "Kahverengi yay", yer: "Taş köprü", detay: "Kuzey uçtaki işaret taşı", zaman: "Gün batımı", sayi: "Üç ok" } },
  { id: "t3-7", tier: 3, icon: "👑 💌 🌷", story: "Kraliçe Sera öğle yemeğinden sonra kırmızı mühürlü bir mektup aldı. Mektubu lale bahçesinde okudu. Ardından mektubu küçük beyaz çantasının içine koydu.", facts: { kim: "Kraliçe Sera", nesne: "mektup", renk: "Kırmızı mühür", yer: "Lale bahçesi", detay: "Beyaz çanta", zaman: "Öğle yemeğinden sonra" } },
  { id: "t3-8", tier: 3, icon: "🌳 🐦 🪹", story: "Bahçıvan Efe sabah doğu bahçesinde üç mavi kuş gördü. Kuşlardan biri büyük çınar ağacındaki yuvaya kondu. Efe ağacın dibine sarı bir sulama kabı bıraktı.", facts: { kim: "Bahçıvan Efe", nesne: "mavi kuş", renk: "Mavi", yer: "Doğu bahçesi", detay: "Çınar ağacındaki yuva", zaman: "Sabah", sayi: "Üç kuş" } },
  { id: "t3-9", tier: 3, icon: "👸 🎻 🎼", story: "Prenses Mira akşam keman çalışmak için müzik odasına gitti. Masada dört nota kâğıdı ve mor bir kalem vardı. Mira ikinci nota kâğıdını keman kutusuna koydu.", facts: { kim: "Prenses Mira", nesne: "nota kâğıdı", renk: "Mor kalem", yer: "Müzik odası", detay: "Keman kutusu", zaman: "Akşam", sayi: "Dört nota kâğıdı" } },
  { id: "t3-10", tier: 3, icon: "🤴 🏆 🪟", story: "Prens Demir öğleden önce gümüş kupayı büyük salona getirdi. Kupayı üçüncü pencerenin önündeki masaya koydu. Masanın yanında iki kırmızı sandalye vardı.", facts: { kim: "Prens Demir", nesne: "kupa", renk: "Gümüş", yer: "Büyük salon", detay: "Üçüncü pencerenin önü", zaman: "Öğleden önce", sayi: "İki sandalye" } },

  { id: "t4-1", tier: 4, icon: "👸 🗝️ 🐦", story: "Prenses Ela sabah mavi anahtarı kütüphanedeki üçüncü rafın üzerine bıraktı. Öğleye doğru sarı kuş Limon açık pencereden içeri girdi. Hizmetçi Duru anahtarı raftan alıp yeşil kutuya koydu. Kutuyu pencerenin solundaki masaya bıraktı.", facts: { kim: "Prenses Ela", nesne: "anahtar", renk: "Mavi", yer: "Kütüphane", detay: "Pencerenin solundaki masadaki yeşil kutu", zaman: "Sabah", sayi: "Üçüncü raf" } },
  { id: "t4-2", tier: 4, icon: "🤴 🧭 🌧️", story: "Prens Arda yağmur başlamadan önce altın pusulayı batı kulesine götürdü. Kulenin ikinci katında kırmızı pelerinli muhafız Bora ile karşılaştı. Pusulayı yuvarlak masanın üzerindeki siyah keseye koydu. Yağmur başladığında ikisi birlikte aşağı indi.", facts: { kim: "Prens Arda", nesne: "pusula", renk: "Altın", yer: "Batı kulesi", detay: "Yuvarlak masadaki siyah kese", zaman: "Yağmur başlamadan önce", sayi: "İkinci kat" } },
  { id: "t4-3", tier: 4, icon: "👑 🍰 🎁", story: "Kraliçe Sera akşam kutlaması için mutfağa üç küçük hediye gönderdi. Mavi kutuda bir taç broşu, kırmızı kutuda gümüş bir kaşık, yeşil kutuda ise inci toka vardı. Aşçı Mina kırmızı kutuyu pasta masasının altına koydu. Diğer iki kutu rafta kaldı.", facts: { kim: "Aşçı Mina", nesne: "gümüş kaşık", renk: "Kırmızı kutu", yer: "Mutfak", detay: "Pasta masasının altı", zaman: "Akşam", sayi: "Üç hediye" } },
  { id: "t4-4", tier: 4, icon: "🧙‍♀️ 🔮 🕯️", story: "Büyücü Lila gece gözlemevinde mor küreyi incelemeye başladı. Masada soldan sağa mavi, beyaz ve sarı üç mum vardı. Sarı mum söndüğünde Lila küreyi ahşap dolabın üst çekmecesine sakladı. Sabah olduğunda yalnızca mavi mum hâlâ yanıyordu.", facts: { kim: "Büyücü Lila", nesne: "mor küre", renk: "Mor", yer: "Gözlemevi", detay: "Ahşap dolabın üst çekmecesi", zaman: "Gece", sayi: "Üç mum" } },
  { id: "t4-5", tier: 4, icon: "🛡️ 🐎 🌉", story: "Muhafız Can gün doğarken kuzey kapısından siyah atıyla çıktı. Taş köprüde Bahçıvan Efe'den iki sarı zarf aldı. Zarflardan birini sağ cebine, diğerini eyer çantasına koydu. Saraya döndüğünde sağ cebindeki zarfı krala verdi.", facts: { kim: "Muhafız Can", nesne: "sarı zarf", renk: "Sarı", yer: "Taş köprü", detay: "Sağ cep ve eyer çantası", zaman: "Gün doğarken", sayi: "İki zarf" } },

  { id: "t5-1", tier: 5, icon: "👑 🧩 🗝️", story: "Kral sabah toplantısından sonra çalışma odasında kırmızı mühürlü iki belge imzaladı. İlk belgeyi gümüş çekmeceye, ikinci belgeyi mavi dosyaya koydu. Öğleden sonra Prenses Ela mavi dosyayı kütüphaneye götürdü ve kuzey duvarındaki dördüncü rafa bıraktı. Akşam hizmetçi Duru dosyayı raftan alıp masanın sağ çekmecesine taşıdı. Gümüş çekmecedeki ilk belge ise bütün gün yerinde kaldı.", facts: { kim: "Prenses Ela ve Hizmetçi Duru", nesne: "ikinci belge / mavi dosya", renk: "Mavi dosya", yer: "Kütüphane", detay: "Masanın sağ çekmecesi", zaman: "Öğleden sonra ve akşam", sayi: "İki belge" } },
  { id: "t5-2", tier: 5, icon: "👸 🦚 💎", story: "Prenses Mira gün batımından önce tavus kuşu bahçesine üç kutu götürdü. Altın kutuda mor taş, gümüş kutuda yeşil broş, ahşap kutuda mavi kurdele vardı. Bahçıvan Efe gümüş kutuyu çeşmenin soluna, ahşap kutuyu beyaz bankın altına yerleştirdi. Mira altın kutuyu yanında tutarak doğu kulesine çıktı. Gece başladığında mor taş hâlâ onun yanındaydı.", facts: { kim: "Prenses Mira", nesne: "mor taş", renk: "Altın kutu", yer: "Doğu kulesi", detay: "Mira'nın yanında", zaman: "Gün batımından önce", sayi: "Üç kutu" } },
  { id: "t5-3", tier: 5, icon: "🧙‍♀️ 📚 🔔", story: "Büyücü Lila öğleden sonra arşiv odasına dört kitap getirdi: kırmızı, mavi, yeşil ve siyah. Mavi kitabın arasında gümüş bir anahtar, yeşil kitabın içinde sarı bir not vardı. Lila siyah kitabı en üst rafa, kırmızı kitabı en alt rafa yerleştirdi. Mavi kitabı üçüncü rafta bıraktı ve anahtarı çıkarmadı. Akşam Muhafız Can yalnızca yeşil kitabı odadan aldı.", facts: { kim: "Büyücü Lila", nesne: "gümüş anahtar", renk: "Mavi kitap", yer: "Arşiv odası", detay: "Üçüncü raftaki mavi kitabın içi", zaman: "Öğleden sonra", sayi: "Dört kitap" } },
  { id: "t5-4", tier: 5, icon: "🤴 🧪 🌙", story: "Prens Arda gece yarısına yakın laboratuvara üç şişe getirdi. Kırmızı sıvılı şişeyi pencere önüne, mavi sıvılı şişeyi orta rafa, yeşil sıvılı şişeyi ise kapının yanındaki dolaba koydu. Büyücü Lila mavi şişeden bir damla alıp küçük cam kaba aktardı. Cam kabı çalışma masasının sol köşesine bıraktı. Sabah olduğunda yalnızca yeşil şişenin yeri hiç değişmemişti.", facts: { kim: "Prens Arda ve Büyücü Lila", nesne: "mavi şişe", renk: "Mavi", yer: "Laboratuvar", detay: "Orta raf / cam kap çalışma masasının sol köşesi", zaman: "Gece yarısına yakın", sayi: "Üç şişe" } },
];

const PEOPLE = ["Prenses Ela", "Prens Arda", "Kraliçe Sera", "Büyücü Lila", "Muhafız Can", "Aşçı Mina", "Bahçıvan Efe", "Prenses Mira", "Prens Demir", "Hizmetçi Duru", "Kral", "Prenses Ela ve Hizmetçi Duru", "Prens Arda ve Büyücü Lila"];
const PLACES = ["Kütüphane", "Gül bahçesi", "Yemek salonu", "Kuzey kulesi", "Saray kapısı", "Pasta odası", "Balo salonu", "Sera kapısı", "Giyinme odası", "Ahır", "Müzik odası", "Çalışma odası", "Doğu kapısı", "Gözlemevi", "Taş köprü", "Lale bahçesi", "Arşiv odası", "Laboratuvar"];
const COLORS = ["Mavi", "Kırmızı", "Yeşil", "Sarı", "Mor", "Gümüş", "Altın", "Beyaz", "Pembe", "Lacivert", "Kahverengi"];
const TIMES = ["Sabah", "Öğleden sonra", "Akşam", "Gece", "Gün batımı", "Gün doğarken", "Öğle yemeğinden sonra", "Akşam yemeğinden önce"];
const NUMBERS = ["Bir", "İki", "Üç", "Dört", "Beş", "Bir mum", "İki zil", "Beş yıldız", "Üç ok", "Dört sepet", "Üç kuş", "Dört nota kâğıdı", "İki sandalye", "Üçüncü raf", "İkinci kat", "Üç hediye", "Üç mum", "İki zarf", "İki belge", "Üç kutu", "Dört kitap", "Üç şişe"];
const OBJECTS = ["anahtar", "harita", "eldiven", "taş", "tüy", "kaşık", "kurdele", "zil", "ayna", "atkı", "günlük", "mum", "mektup", "kupa", "pusula", "kitap", "zarf", "kutu", "broş", "çanta"];
const DETAILS = ["Pencerenin yanı", "Masanın altı", "Kapının solu", "Üst raf", "Küçük çekmece", "Çeşmenin sağı"];

const factValues = (key: keyof SarayDedektifiFacts) => SARAY_DEDEKTIFI_CASES.map((item) => item.facts[key]).filter((value): value is string => Boolean(value));

export function getSarayDedektifiMode(id: SarayDedektifiModeId): SarayDedektifiMode {
  return SARAY_DEDEKTIFI_MODES.find((mode) => mode.id === id) ?? SARAY_DEDEKTIFI_MODES[0];
}

export function getSarayDedektifiSpeed(id: SarayDedektifiSpeedId): SarayDedektifiSpeed {
  return SARAY_DEDEKTIFI_SPEEDS.find((speed) => speed.id === id) ?? SARAY_DEDEKTIFI_SPEEDS[1];
}

export function getSarayDedektifiStoryDurationMs(modeId: SarayDedektifiModeId, speedId: SarayDedektifiSpeedId): number {
  return Math.round(getSarayDedektifiMode(modeId).storyDurationMs * getSarayDedektifiSpeed(speedId).multiplier);
}

function shuffle<T>(values: readonly T[], random: () => number): T[] {
  const result = [...values];
  for (let index = result.length - 1; index > 0; index -= 1) {
    const swap = Math.floor(random() * (index + 1));
    [result[index], result[swap]] = [result[swap], result[index]];
  }
  return result;
}

function tierDistance(tier: number, tiers: number[]): number {
  return Math.min(...tiers.map((value) => Math.abs(tier - value)));
}

/** Seçilen moda uygun, tekrarsız dosya destesi. Mod için yeterli dosya yoksa en yakın tier'lardan tamamlanır. */
export function buildSarayDedektifiDeck(modeId: SarayDedektifiModeId, random: () => number = Math.random): SarayDedektifiCase[] {
  const mode = getSarayDedektifiMode(modeId);
  const eligible = shuffle(SARAY_DEDEKTIFI_CASES.filter((item) => mode.tiers.includes(item.tier)), random);
  if (eligible.length >= mode.rounds) {
    return eligible.slice(0, mode.rounds);
  }

  const rest = shuffle(SARAY_DEDEKTIFI_CASES.filter((item) => !mode.tiers.includes(item.tier)), random)
    .sort((a, b) => tierDistance(a.tier, mode.tiers) - tierDistance(b.tier, mode.tiers));
  return [...eligible, ...rest].slice(0, mode.rounds);
}

function buildOptions(correct: string, pool: readonly string[], optionCount: number, random: () => number): string[] {
  const distractors = shuffle([...new Set(pool)].filter((value) => value && value !== correct), random);
  return shuffle([correct, ...distractors.slice(0, optionCount - 1)], random);
}

export function createSarayDedektifiQuestions(caseFile: SarayDedektifiCase, modeId: SarayDedektifiModeId, random: () => number = Math.random): SarayDedektifiQuestion[] {
  const mode = getSarayDedektifiMode(modeId);
  const facts = caseFile.facts;
  const candidates: SarayDedektifiQuestion[] = [];
  const add = (type: SarayDedektifiQuestionType, question: string, correct: string | undefined, pool: readonly string[]) => {
    if (!correct) return;
    candidates.push({ type, question, correct, options: buildOptions(correct, pool, mode.options, random) });
  };

  add("kim", "Bu olayda öne çıkan kişi kimdi?", facts.kim, PEOPLE.concat(factValues("kim")));
  add("nesne", "Hikâyedeki önemli nesne neydi?", facts.nesne, OBJECTS.concat(factValues("nesne")));
  add("renk", "Hatırlaman gereken renk hangisiydi?", facts.renk, COLORS.concat(factValues("renk")));
  add("yer", "Olayın geçtiği / nesnenin bulunduğu yer neresiydi?", facts.yer, PLACES.concat(factValues("yer")));
  add("zaman", "Olay ne zaman gerçekleşti?", facts.zaman, TIMES.concat(factValues("zaman")));
  add("sayi", "Hikâyedeki sayı bilgisi hangisiydi?", facts.sayi, NUMBERS.concat(factValues("sayi")));
  add("detay", "En ayrıntılı ipucuna göre doğru seçenek hangisi?", facts.detay, DETAILS.concat(factValues("detay")));

  return shuffle(candidates, random).slice(0, Math.min(mode.questions, candidates.length));
}

export function calculateSarayDedektifiPoints(modeId: SarayDedektifiModeId): number {
  return 100 + getSarayDedektifiMode(modeId).tiers[0] * 20;
}

export function resolveSarayDedektifiRank(successPercent: number): string {
  if (successPercent >= 92) return "Saray Başdedektifi 👑";
  if (successPercent >= 80) return "Usta Dedektif 🕵️";
  if (successPercent >= 65) return "Keskin Göz 🔎";
  if (successPercent >= 45) return "Genç Dedektif 📜";
  return "Dedektif Adayı 🧩";
}
