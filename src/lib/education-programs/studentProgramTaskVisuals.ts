import type { IconName } from "@/components/student-panel-preview/icons";

// Ogrenci Egitim Programi gorev kartlarinda kullanilan, SALT SUNUM amacli
// slug -> ikon/ton eslemesi. Hicbir is mantigina, RPC'ye veya repository'ye
// bagli degildir - yalniz EDUCATION_PROGRAM_EXERCISE_CATALOG'daki (bkz.
// exerciseCatalog.ts) mevcut exercise_slug degerlerini goruntuler. Bilinmeyen
// bir slug icin guvenli bir varsayilan doner, hicbir zaman hata firlatmaz.
export type StudentProgramTaskVisualTone =
  | "blue"
  | "purple"
  | "green"
  | "orange"
  | "cyan";

export type StudentProgramTaskVisual = {
  icon: IconName;
  tone: StudentProgramTaskVisualTone;
};

const DEFAULT_TASK_VISUAL: StudentProgramTaskVisual = {
  icon: "circle",
  tone: "blue",
};

const TASK_VISUAL_BY_SLUG: Record<string, StudentProgramTaskVisual> = {
  "kare-gorme-alani": { icon: "eye", tone: "purple" },
  "goz-egzersizleri-kolonlar": { icon: "eye", tone: "blue" },
  takistoskop: { icon: "gauge", tone: "blue" },
  "hafiza-gelistirme": { icon: "brain", tone: "green" },
  "kart-eslestirme": { icon: "puzzle", tone: "green" },
  "kelime-bulma": { icon: "type", tone: "orange" },
  "benzer-kelimeler": { icon: "type", tone: "orange" },
  "ayni-olani-yakala": { icon: "target", tone: "cyan" },
  "harf-rakam-sayma": { icon: "target", tone: "cyan" },
  "cift-tarafli-odak": { icon: "activity", tone: "purple" },
  "goz-kaslari": { icon: "eye", tone: "purple" },
  "13-nokta-emoji-takip": { icon: "target", tone: "cyan" },
};

export function getStudentProgramTaskVisual(
  exerciseSlug: string,
): StudentProgramTaskVisual {
  return TASK_VISUAL_BY_SLUG[exerciseSlug] ?? DEFAULT_TASK_VISUAL;
}
