import type { StudentXpSnapshot } from "./xpLevels";

export type StudentXpBadgeId =
  | "first-point"
  | "book-friend"
  | "explorer-reader"
  | "speed-hunter"
  | "focus-master"
  | "reading-champion"
  | "legendary-reader"
  | "first-exercise"
  | "streak-starter"
  | "streak-fire"
  | "speed-curious"
  | "comprehension-master"
  | "program-student"
  | "hardworking-reader";

export type StudentXpBadgeDefinition = {
  id: StudentXpBadgeId;
  title: string;
  description: string;
  icon: "badge" | "medal" | "sparkles" | "book" | "flame" | "gauge" | "target" | "lock";
  earned: (snapshot: StudentXpSnapshot) => boolean;
  comingSoon?: boolean;
};

export type StudentXpBadgeState = StudentXpBadgeDefinition & {
  isEarned: boolean;
};

const REAL_BADGES: StudentXpBadgeDefinition[] = [
  {
    id: "first-point",
    title: "İlk Puan",
    description: "Toplam 10 XP'ye ulaştın.",
    icon: "badge",
    earned: (snapshot) => snapshot.totalXp >= 10,
  },
  {
    id: "book-friend",
    title: "Kitap Dostu",
    description: "2. seviyeye ulaştın.",
    icon: "book",
    earned: (snapshot) => snapshot.level >= 2,
  },
  {
    id: "explorer-reader",
    title: "Kaşif Okuyucu",
    description: "3. seviyeye ulaştın.",
    icon: "sparkles",
    earned: (snapshot) => snapshot.level >= 3,
  },
  {
    id: "speed-hunter",
    title: "Hız Avcısı",
    description: "4. seviyeye ulaştın.",
    icon: "gauge",
    earned: (snapshot) => snapshot.level >= 4,
  },
  {
    id: "focus-master",
    title: "Odak Ustası",
    description: "5. seviyeye ulaştın.",
    icon: "target",
    earned: (snapshot) => snapshot.level >= 5,
  },
  {
    id: "reading-champion",
    title: "Okuma Şampiyonu",
    description: "1000 XP topladın.",
    icon: "medal",
    earned: (snapshot) => snapshot.totalXp >= 1000,
  },
  {
    id: "legendary-reader",
    title: "Efsane Okuyucu",
    description: "1900 XP'ye ulaştın.",
    icon: "flame",
    earned: (snapshot) => snapshot.totalXp >= 1900,
  },
];

const COMING_SOON_BADGES: StudentXpBadgeDefinition[] = [
  {
    id: "first-exercise",
    title: "İlk Adım",
    description: "İlk egzersiz tamamlandığında açılacak.",
    icon: "badge",
    earned: () => false,
    comingSoon: true,
  },
  {
    id: "streak-starter",
    title: "Seri Başlangıcı",
    description: "3 günlük seri ile açılacak.",
    icon: "flame",
    earned: () => false,
    comingSoon: true,
  },
  {
    id: "streak-fire",
    title: "Ateş Gibi",
    description: "7 günlük seri ile açılacak.",
    icon: "flame",
    earned: () => false,
    comingSoon: true,
  },
  {
    id: "speed-curious",
    title: "Hız Meraklısı",
    description: "İlk Okuma Hızı Testi ile açılacak.",
    icon: "gauge",
    earned: () => false,
    comingSoon: true,
  },
  {
    id: "comprehension-master",
    title: "Anlama Ustası",
    description: "İlk Anlama Testi ile açılacak.",
    icon: "sparkles",
    earned: () => false,
    comingSoon: true,
  },
  {
    id: "program-student",
    title: "Programlı Öğrenci",
    description: "İlk Eğitim Programı görevi ile açılacak.",
    icon: "book",
    earned: () => false,
    comingSoon: true,
  },
  {
    id: "hardworking-reader",
    title: "Çalışkan Okuyucu",
    description: "25 egzersiz ile açılacak.",
    icon: "medal",
    earned: () => false,
    comingSoon: true,
  },
];

export const XP_BADGE_DEFINITIONS: StudentXpBadgeDefinition[] = [...REAL_BADGES, ...COMING_SOON_BADGES];

export function getStudentXpBadges(snapshot: StudentXpSnapshot): StudentXpBadgeState[] {
  return XP_BADGE_DEFINITIONS.map((badge) => ({
    ...badge,
    isEarned: badge.earned(snapshot),
  }));
}

export function countEarnedBadges(snapshot: StudentXpSnapshot): number {
  return getStudentXpBadges(snapshot).filter((badge) => badge.isEarned).length;
}

