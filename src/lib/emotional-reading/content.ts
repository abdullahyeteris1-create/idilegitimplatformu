export const EMOTIONAL_READING_GRADES = [1, 2, 3, 4] as const;
export type EmotionalReadingGrade = (typeof EMOTIONAL_READING_GRADES)[number];

export const EMOTIONS = [
  { id: "happy", label: "Neşeli", emoji: "😄", instruction: "Gülümseyerek ve canlı bir sesle oku.", color: "#f59e0b" },
  { id: "sad", label: "Üzgün", emoji: "😢", instruction: "Sanki biraz özlemişsin gibi yumuşak oku.", color: "#60a5fa" },
  { id: "angry", label: "Kızgın", emoji: "😡", instruction: "Güçlü ama bağırmadan, kararlı bir sesle oku.", color: "#f87171" },
  { id: "scared", label: "Korkmuş", emoji: "😨", instruction: "Sanki biraz endişelenmişsin gibi oku.", color: "#a78bfa" },
  { id: "surprised", label: "Şaşkın", emoji: "😲", instruction: "Yeni bir şey keşfetmiş gibi sesini değiştir.", color: "#fb923c" },
  { id: "mysterious", label: "Gizemli", emoji: "🤫", instruction: "Sanki önemli bir sır anlatıyormuşsun gibi oku.", color: "#818cf8" },
  { id: "sleepy", label: "Uykulu", emoji: "😴", instruction: "Yavaş, sakin ve esneyen bir ses hayal et.", color: "#94a3b8" },
  { id: "excited", label: "Heyecanlı", emoji: "🤩", instruction: "Enerjini yükselt ve merakını sesine kat.", color: "#34d399" },
] as const;

export type EmotionalReadingEmotionId = (typeof EMOTIONS)[number]["id"];
export type EmotionalReadingEmotion = (typeof EMOTIONS)[number];

export const CHARACTERS = [
  { id: "royal", label: "Kral / Kraliçe", emoji: "👑", instruction: "Kendinden emin ve asil bir karakter gibi oku." },
  { id: "robot", label: "Robot", emoji: "🤖", instruction: "Bir robot gibi düzenli ve farklı bir ses tonuyla oku." },
  { id: "storyteller", label: "Masal Anlatıcısı", emoji: "🧙", instruction: "Sanki masal anlatıyormuşsun gibi renkli oku." },
  { id: "detective", label: "Dedektif", emoji: "🕵️", instruction: "Sanki bir ipucunu çözmeye çalışıyormuşsun gibi oku." },
  { id: "announcer", label: "Spiker", emoji: "📺", instruction: "Sanki önemli bir haberi sunuyormuşsun gibi oku." },
  { id: "mouse", label: "Minik Fare", emoji: "🐭", instruction: "Daha ince ve küçük bir karakter sesiyle dene." },
  { id: "giant", label: "Dev", emoji: "🧌", instruction: "Güçlü ve büyük bir karakteri canlandır; bağırma." },
] as const;

export type EmotionalReadingCharacterId = (typeof CHARACTERS)[number]["id"];
export type EmotionalReadingCharacter = (typeof CHARACTERS)[number];
export type EmotionalReadingMode = "emotion-task" | "acting";

export type EmotionalReadingPrompt = {
  id: string;
  grade: EmotionalReadingGrade;
  sentence: string;
};

const GRADE_1_PROMPTS: EmotionalReadingPrompt[] = [
  { id: "g1-01", grade: 1, sentence: "Bugün bahçede sarı bir kelebek gördüm!" },
  { id: "g1-02", grade: 1, sentence: "Minik kedim yumuşak mindere kıvrıldı." },
  { id: "g1-03", grade: 1, sentence: "Ali, topunu ağacın altında buldu." },
  { id: "g1-04", grade: 1, sentence: "Bu çilek ne kadar tatlı!" },
  { id: "g1-05", grade: 1, sentence: "Kapının önünde küçük bir paket var." },
  { id: "g1-06", grade: 1, sentence: "Dedem bana mavi bir uçurtma verdi." },
  { id: "g1-07", grade: 1, sentence: "Yağmur başladı, şemsiyemi açtım." },
  { id: "g1-08", grade: 1, sentence: "Kuş, dalın üstünde şarkı söylüyor." },
  { id: "g1-09", grade: 1, sentence: "Benim çantam nerede kaldı?" },
  { id: "g1-10", grade: 1, sentence: "Pencereden parlak bir ışık geldi." },
  { id: "g1-11", grade: 1, sentence: "Lütfen oyuncağımı bana uzatır mısın?" },
  { id: "g1-12", grade: 1, sentence: "Sürpriz kutusundan renkli balonlar çıktı!" },
  { id: "g1-13", grade: 1, sentence: "Tavşan havucun yanına saklandı." },
  { id: "g1-14", grade: 1, sentence: "Bu ses de nereden geliyor?" },
  { id: "g1-15", grade: 1, sentence: "Kardeşim uykusunda gülümsedi." },
  { id: "g1-16", grade: 1, sentence: "Ben bugün arkadaşımı özledim." },
  { id: "g1-17", grade: 1, sentence: "Kırmızı top su birikintisine düştü." },
  { id: "g1-18", grade: 1, sentence: "Sessiz ol, bebek uyuyor." },
  { id: "g1-19", grade: 1, sentence: "Yaşasın, pikniğe gidiyoruz!" },
  { id: "g1-20", grade: 1, sentence: "Arının yanına yaklaşma, dikkat et." },
  { id: "g1-21", grade: 1, sentence: "Sınıfta yeni bir kitap buldum." },
  { id: "g1-22", grade: 1, sentence: "Oyuncak trenim yine çalıştı." },
  { id: "g1-23", grade: 1, sentence: "Ninemin çorbası çok sıcak." },
  { id: "g1-24", grade: 1, sentence: "Geceleri ay pencereme bakıyor." },
  { id: "g1-25", grade: 1, sentence: "Hadi, birlikte resim yapalım!" },
];

const GRADE_2_PROMPTS: EmotionalReadingPrompt[] = [
  { id: "g2-01", grade: 2, sentence: "Elif, yağmurdan sonra gökyüzünde kocaman bir gökkuşağı gördü." },
  { id: "g2-02", grade: 2, sentence: "Mert, kaybolan kalemini kitaplığın arkasında buldu." },
  { id: "g2-03", grade: 2, sentence: "Bu eski sandığın içinde acaba ne var?" },
  { id: "g2-04", grade: 2, sentence: "Annemin hazırladığı kurabiyeler bütün evi mis gibi kokuttu." },
  { id: "g2-05", grade: 2, sentence: "Küçük kaplumbağa, yaprağın altına sessizce saklandı." },
  { id: "g2-06", grade: 2, sentence: "Bora, arkadaşına yardım etmek için ağır kutuyu taşıdı." },
  { id: "g2-07", grade: 2, sentence: "Bahçedeki fidanın ilk çiçeği açınca herkes sevindi." },
  { id: "g2-08", grade: 2, sentence: "Sokaktan gelen tıkırtı, gece boyunca odada yankılandı." },
  { id: "g2-09", grade: 2, sentence: "Zeynep, yarışta birinci olduğunu duyunca yerinde zıpladı!" },
  { id: "g2-10", grade: 2, sentence: "Lütfen sıranı bekle ve arkadaşının sözünü kesme." },
  { id: "g2-11", grade: 2, sentence: "Köpeğimiz, kapının önünde sahibini sabırla bekledi." },
  { id: "g2-12", grade: 2, sentence: "Bu haritadaki yıldız işareti gizli yeri gösteriyor olabilir." },
  { id: "g2-13", grade: 2, sentence: "Dedem, çocukken oynadığı oyunu bize neşeyle anlattı." },
  { id: "g2-14", grade: 2, sentence: "Deniz, kırılan oyuncağını görünce biraz üzüldü." },
  { id: "g2-15", grade: 2, sentence: "Çantamı açtım; içinden beklemediğim bir not çıktı!" },
  { id: "g2-16", grade: 2, sentence: "Kütüphanede konuşmadan yürümek herkesin görevidir." },
  { id: "g2-17", grade: 2, sentence: "Sincap, fındığı alıp ağacın dalları arasında kayboldu." },
  { id: "g2-18", grade: 2, sentence: "Bugün sınıfımızda yeni bir arkadaşımızla tanıştık." },
  { id: "g2-19", grade: 2, sentence: "O ses bir canavarın değil, rüzgârda sallanan tabelanınmış." },
  { id: "g2-20", grade: 2, sentence: "Kardeşim, yaptığı resmi öğretmenine gururla gösterdi." },
  { id: "g2-21", grade: 2, sentence: "Güneş batarken denizin üzerinde turuncu bir yol oluştu." },
  { id: "g2-22", grade: 2, sentence: "Sence bu minik izler hangi hayvana ait?" },
  { id: "g2-23", grade: 2, sentence: "Oyunun sonunda herkes birbirini alkışladı." },
  { id: "g2-24", grade: 2, sentence: "Kedinin patisi kapının altından yavaşça göründü." },
  { id: "g2-25", grade: 2, sentence: "Birlikte düşünürsek bu düğümü kolayca çözebiliriz." },
];

const GRADE_3_PROMPTS: EmotionalReadingPrompt[] = [
  { id: "g3-01", grade: 3, sentence: "“Bu anahtarı daha önce hiç görmemiştim,” dedi Ece, kutuyu dikkatle incelerken." },
  { id: "g3-02", grade: 3, sentence: "Yağmur bulutları yaklaşınca çocuklar oyunlarını yarıda bırakıp eve koştu." },
  { id: "g3-03", grade: 3, sentence: "Kaptan, dalgaların arasından görünen ışığı işaret ederek sessizce bekledi." },
  { id: "g3-04", grade: 3, sentence: "Öğretmenimiz, küçük bir iyiliğin günümüzü nasıl değiştirebileceğini anlattı." },
  { id: "g3-05", grade: 3, sentence: "“Gerçekten bunu sen mi yaptın?” diye sordu Arda, şaşkınlıkla." },
  { id: "g3-06", grade: 3, sentence: "Koridorun sonundaki kapı, rüzgâr yokken bile yavaşça aralandı." },
  { id: "g3-07", grade: 3, sentence: "Takımımız son dakikada gol atınca tribünlerde büyük bir sevinç başladı." },
  { id: "g3-08", grade: 3, sentence: "Lina, kırılan saksıyı saklamak yerine gerçeği söylemeye karar verdi." },
  { id: "g3-09", grade: 3, sentence: "Köy meydanındaki yaşlı saat, her akşam aynı anda çalıyordu." },
  { id: "g3-10", grade: 3, sentence: "“Bence izler dereye doğru gidiyor; hemen peşlerinden bakalım!”" },
  { id: "g3-11", grade: 3, sentence: "Küçük fidanı korumak için çocuklar çevresine tahta bir çit yaptı." },
  { id: "g3-12", grade: 3, sentence: "Sınıfın penceresinden gelen koku, herkese yaklaşan baharı hatırlattı." },
  { id: "g3-13", grade: 3, sentence: "Mina, arkadaşının üzgün olduğunu anlayınca yanına oturup onu dinledi." },
  { id: "g3-14", grade: 3, sentence: "Uzakta bir gök gürledi; fakat ekip araştırmasına sakinlikle devam etti." },
  { id: "g3-15", grade: 3, sentence: "“Bunu kimseye söyleme,” diye fısıldadı çocuk, cebindeki taşı göstererek." },
  { id: "g3-16", grade: 3, sentence: "Kütüphanedeki eski kitabın sayfaları çevrildikçe odada tatlı bir merak büyüdü." },
  { id: "g3-17", grade: 3, sentence: "Deniz, sunum sırası yaklaşırken derin bir nefes aldı ve gülümsedi." },
  { id: "g3-18", grade: 3, sentence: "Pazardan dönen aile, yol boyunca günün komik anılarını anlattı." },
  { id: "g3-19", grade: 3, sentence: "Haritadaki kırmızı nokta, onları eski değirmenin arkasındaki patikaya götürdü." },
  { id: "g3-20", grade: 3, sentence: "“Bu kadar sessizlik normal değil,” dedi Can, arkadaşlarına yaklaşarak." },
  { id: "g3-21", grade: 3, sentence: "Kayıp kuşun sesi duyulunca herkes bahçenin farklı köşelerine dağıldı." },
  { id: "g3-22", grade: 3, sentence: "Elindeki mektubu okuyan Suna, yıllardır beklediği haberi sonunda öğrenmişti." },
  { id: "g3-23", grade: 3, sentence: "Küçük tren tünele girince vagondaki çocuklar heyecanla birbirine baktı." },
  { id: "g3-24", grade: 3, sentence: "Ödevini bitiren Eren, arkadaşına yardım etmek için masaya geri döndü." },
  { id: "g3-25", grade: 3, sentence: "“Sahne senin; hikâyeyi kendi sesinle anlat,” dedi öğretmeni." },
];

const GRADE_4_PROMPTS: EmotionalReadingPrompt[] = [
  { id: "g4-01", grade: 4, sentence: "“Bu kapının ardında ne olduğunu öğrenmeden geri dönmeyeceğim,” dedi Duru, el fenerini kaldırarak." },
  { id: "g4-02", grade: 4, sentence: "Kasabanın meydanındaki duyuru, herkesin beklediği bahar şenliğinin yarın başlayacağını bildiriyordu." },
  { id: "g4-03", grade: 4, sentence: "Rüzgâr hızlandıkça çadır sallandı; ekip, eşyaları güvenli bir yere taşımak için hemen harekete geçti." },
  { id: "g4-04", grade: 4, sentence: "“Bana kızabilirsin, ama bunu saklamak yerine sana gerçeği anlatmalıyım,” diye fısıldadı Kerem." },
  { id: "g4-05", grade: 4, sentence: "Kütüphanenin en sessiz köşesinde bulunan not, eski bir gözlemcinin dikkatli çağrısını taşıyordu." },
  { id: "g4-06", grade: 4, sentence: "Takım arkadaşları ona güvenince Nisa, zor soruyu tahtada adım adım açıklamaya başladı." },
  { id: "g4-07", grade: 4, sentence: "Gece gökyüzünde beliren parlak çizgi, kısa süre sonra bütün mahallenin merak konusu oldu." },
  { id: "g4-08", grade: 4, sentence: "“Sakin olun; önce ne bildiğimizi sıralayalım, sonra birlikte bir çözüm buluruz,” dedi öğretmen." },
  { id: "g4-09", grade: 4, sentence: "Yolun ikiye ayrıldığı yerdeki küçük tabela, gezginleri orman yerine göl kıyısına yönlendiriyordu." },
  { id: "g4-10", grade: 4, sentence: "Mert, arkadaşının emeğini görünce içtenlikle sevindi; yine de kendi projesini geliştirmeye devam etti." },
  { id: "g4-11", grade: 4, sentence: "Kapının arkasından gelen üç kısa tıkırtı, koridordaki sessizliği bir anda değiştirdi." },
  { id: "g4-12", grade: 4, sentence: "“Bu mektup gerçekten büyükannemden mi geldi?” diye sordu Aslı, zarfı iki eliyle tutarak." },
  { id: "g4-13", grade: 4, sentence: "Köprüden geçerken aşağıdaki nehir kabardı; çocuklar rehberin uyarılarını dikkatle dinledi." },
  { id: "g4-14", grade: 4, sentence: "Sahneye çıkmadan önce herkes rolünü hatırladı, derin bir nefes aldı ve birbirine cesaret verdi." },
  { id: "g4-15", grade: 4, sentence: "Eski haritadaki silik çizgi, araştırmacıları yıllardır kimsenin uğramadığı küçük bir bahçeye götürdü." },
  { id: "g4-16", grade: 4, sentence: "“Bunu başarmamız imkânsız değil; yalnızca daha dikkatli ve sabırlı çalışmalıyız,” dedi Eylül." },
  { id: "g4-17", grade: 4, sentence: "Yağmur dindikten sonra okulun çatısında biriken suyu ölçmek için öğrenciler görev paylaşımı yaptı." },
  { id: "g4-18", grade: 4, sentence: "Beklenmedik alkışlar duyulunca konuşmasını bitiren Cem, önce şaşırdı, sonra utangaçça gülümsedi." },
  { id: "g4-19", grade: 4, sentence: "Gizemli kutunun içinden altın değil, mahallenin geçmişini anlatan renkli fotoğraflar çıktı." },
  { id: "g4-20", grade: 4, sentence: "“Beni dinlerseniz bu planın neden işe yarayacağını birkaç adımda gösterebilirim,” dedi Zeynep." },
  { id: "g4-21", grade: 4, sentence: "Kayıp köpeğin tasmasındaki küçük zil, sonunda onu arayan çocuklara doğru yolu gösterdi." },
  { id: "g4-22", grade: 4, sentence: "Oyunun son sahnesinde karakterler rollerini değiştirdi; böylece hikâyenin başka bir yönünü keşfettiler." },
  { id: "g4-23", grade: 4, sentence: "Deney beklenenden farklı sonuçlanınca ekip hayal kırıklığına uğramadı, yeni bir soru sordu." },
  { id: "g4-24", grade: 4, sentence: "“Şimdi herkes sessizce dinlesin; uzaktan gelen bu ses bize bir ipucu verebilir,” diye uyardı Deniz." },
  { id: "g4-25", grade: 4, sentence: "Küçük bir cesaret sözü, yarışmaya katılmaktan çekinen arkadaşının sonunda sahneye çıkmasını sağladı." },
];

export const EMOTIONAL_READING_PROMPTS_BY_GRADE: Readonly<Record<EmotionalReadingGrade, readonly EmotionalReadingPrompt[]>> = {
  1: GRADE_1_PROMPTS,
  2: GRADE_2_PROMPTS,
  3: GRADE_3_PROMPTS,
  4: GRADE_4_PROMPTS,
};

export type EmotionalReadingSessionRound = {
  round: number;
  prompt: EmotionalReadingPrompt;
  emotion: EmotionalReadingEmotion;
  character: EmotionalReadingCharacter | null;
};

function shuffle<T>(items: readonly T[], random: () => number): T[] {
  const copy = [...items];
  for (let index = copy.length - 1; index > 0; index -= 1) {
    const target = Math.floor(random() * (index + 1));
    [copy[index], copy[target]] = [copy[target], copy[index]];
  }
  return copy;
}

export function createEmotionalReadingSession(
  grade: EmotionalReadingGrade,
  mode: EmotionalReadingMode,
  random: () => number = Math.random,
): EmotionalReadingSessionRound[] {
  const emotions = shuffle(EMOTIONS, random).slice(0, 5);
  const prompts = shuffle(EMOTIONAL_READING_PROMPTS_BY_GRADE[grade], random).slice(0, 5);
  const characters = mode === "acting" ? shuffle(CHARACTERS, random).slice(0, 5) : [];
  return Array.from({ length: 5 }, (_, index) => ({
    round: index + 1,
    prompt: prompts[index],
    emotion: emotions[index],
    character: mode === "acting" ? characters[index] : null,
  }));
}

export function getEmotionWheelRotation(emotionId: EmotionalReadingEmotionId, fullSpins = 4): number {
  const emotionIndex = EMOTIONS.findIndex((emotion) => emotion.id === emotionId);
  if (emotionIndex < 0) throw new Error("Unknown emotional reading emotion");
  return fullSpins * 360 - emotionIndex * (360 / EMOTIONS.length);
}
