import type { Difficulty } from "@/lib/data/wordPools";

export type SimilarWordTemplate = {
  base: string;
  variants: string[];
};

export type SimilarWordPools = Record<Difficulty, SimilarWordTemplate[]>;

export const SIMILAR_WORD_POOLS: SimilarWordPools = {
  easy: [
    { base: "masa", variants: ["nasa", "masa"] },
    { base: "dere", variants: ["deve", "dore"] },
    { base: "kitap", variants: ["kitab", "kidap"] },
    { base: "kalem", variants: ["kalem", "kalen"] },
    { base: "yol", variants: ["sol", "yol"] },
    { base: "agac", variants: ["agac", "agaz"] },
    { base: "oyun", variants: ["oyun", "oyum"] },
    { base: "renk", variants: ["denk", "renk"] },
    { base: "zihin", variants: ["zihim", "zihin"] },
    { base: "canta", variants: ["santa", "canta"] },
  ],
  medium: [
    { base: "odak", variants: ["odag", "odak"] },
    { base: "sure", variants: ["sure", "surec"] },
    { base: "panel", variants: ["panel", "panel"] },
    { base: "denge", variants: ["denge", "denle"] },
    { base: "islem", variants: ["islen", "islem"] },
    { base: "izlem", variants: ["izlen", "izlem"] },
    { base: "gorus", variants: ["gorus", "gorul"] },
    { base: "secim", variants: ["secin", "secim"] },
    { base: "anlam", variants: ["anlam", "anlan"] },
    { base: "algim", variants: ["algin", "algim"] },
    { base: "kural", variants: ["kural", "kural"] },
    { base: "hedef", variants: ["hedef", "hedaf"] },
  ],
  hard: [
    { base: "kavrama", variants: ["kavrama", "kavrma"] },
    { base: "farkindalik", variants: ["farkindalik", "farkindaljk"] },
    { base: "algilama", variants: ["algilama", "algilana"] },
    { base: "gorsellik", variants: ["gorsellik", "gorselllk"] },
    { base: "degerlendirme", variants: ["degerlendirme", "degerlendlrme"] },
    { base: "odaklanma", variants: ["odaklanma", "odaklanva"] },
    { base: "tekrarlama", variants: ["tekrarlama", "tekrarIama"] },
    { base: "karsilastirma", variants: ["karsilastirma", "karsilastlrma"] },
    { base: "secicilik", variants: ["secicilik", "secicllik"] },
    { base: "uyumluluk", variants: ["uyumluluk", "uyumluluh"] },
    { base: "strateji", variants: ["strateji", "strateli"] },
    { base: "performans", variants: ["performans", "performanr"] },
  ],
};
