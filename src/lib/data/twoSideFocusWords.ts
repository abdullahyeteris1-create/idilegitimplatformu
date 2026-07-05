export type TwoSideFocusCategory =
  | "Genel"
  | "Hayvanlar"
  | "Nesneler"
  | "Doga"
  | "Ilkokul"
  | "Ortaokul";

export type TwoSideFocusWordData = {
  sameWords: string[];
  similarPairs: Array<[string, string]>;
};

export const TWO_SIDE_FOCUS_CATEGORIES: TwoSideFocusCategory[] = [
  "Genel",
  "Hayvanlar",
  "Nesneler",
  "Doga",
  "Ilkokul",
  "Ortaokul",
];

export const TWO_SIDE_FOCUS_WORDS: Record<TwoSideFocusCategory, TwoSideFocusWordData> = {
  Genel: {
    sameWords: ["masa", "kalem", "kitap", "hazar", "bamya", "cicek"],
    similarPairs: [
      ["hazan", "hazar"],
      ["bamya", "banya"],
      ["masa", "kasa"],
      ["kalem", "kelam"],
      ["kitap", "kapit"],
      ["cicek", "cilek"],
    ],
  },
  Hayvanlar: {
    sameWords: ["kedi", "kopek", "kus", "aslan", "kaplan", "tilki"],
    similarPairs: [
      ["kedi", "kedr"],
      ["kopek", "kopey"],
      ["aslan", "arslan"],
      ["karga", "karna"],
      ["tilki", "tilkiy"],
      ["kartal", "kortal"],
    ],
  },
  Nesneler: {
    sameWords: ["masa", "saat", "defter", "kalem", "lamba", "ceket"],
    similarPairs: [
      ["masa", "kasa"],
      ["saat", "saatc"],
      ["defter", "deftere"],
      ["kalem", "kelam"],
      ["lamba", "lambae"],
      ["ceket", "celet"],
    ],
  },
  Doga: {
    sameWords: ["orman", "nehir", "dag", "gol", "yagmur", "ruzgar"],
    similarPairs: [
      ["orman", "ormar"],
      ["nehir", "nehirr"],
      ["dag", "tag"],
      ["gol", "gul"],
      ["yagmur", "yagmup"],
      ["ruzgar", "ruzgari"],
    ],
  },
  Ilkokul: {
    sameWords: ["okul", "sira", "silgi", "tahta", "kitap", "oyun"],
    similarPairs: [
      ["okul", "okur"],
      ["sira", "sura"],
      ["silgi", "silki"],
      ["tahta", "tahtae"],
      ["kitap", "kapit"],
      ["oyun", "oyum"],
    ],
  },
  Ortaokul: {
    sameWords: ["bilim", "deney", "proje", "matem", "okuma", "sinav"],
    similarPairs: [
      ["bilim", "bilimr"],
      ["deney", "deneyr"],
      ["proje", "projey"],
      ["matem", "matemr"],
      ["okuma", "okuna"],
      ["sinav", "sinaw"],
    ],
  },
};
