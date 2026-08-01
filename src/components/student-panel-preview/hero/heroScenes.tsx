"use client";

import type { ReactElement } from "react";
import styles from "../student-panel-preview.module.css";

/**
 * Her banner kendi sahnesini çizer. Sahneler tek bir paylaşılan illüstrasyonun
 * yeniden renklendirilmiş hâli değildir; her biri bağımsız bir kompozisyondur.
 * Vurgu rengi `--hero-accent` üzerinden gelir, böylece sahne tema paletine uyar.
 */
export type HeroSceneId =
  | "speedReading" | "readingQuest" | "studentDesk" | "magicLibrary"
  | "spaceRocket" | "focusEye" | "wordGarden" | "champion"
  | "oceanDive" | "scienceLab" | "castle" | "nightSky";

const A = "var(--hero-accent,#9f8cff)";

/** ⚡ Hızlı Okuma — kronometre, hız çizgileri ve akan satırlar. */
function SpeedReadingScene(): ReactElement {
  return (
    <svg viewBox="0 0 300 210" fill="none">
      <g className={styles.sceneDrift}>
        <path d="M18 60h70M8 82h58M26 104h74M14 126h50" stroke={A} strokeWidth="3" strokeLinecap="round" opacity=".45" />
      </g>
      <g className={styles.sceneFloat}>
        <circle cx="196" cy="96" r="46" stroke={A} strokeWidth="5" opacity=".9" />
        <circle cx="196" cy="96" r="36" fill={A} opacity=".13" />
        <path d="M196 62v34l22 14" stroke="#fff" strokeWidth="5" strokeLinecap="round" strokeLinejoin="round" />
        <path d="M182 42h28" stroke={A} strokeWidth="7" strokeLinecap="round" />
        <path d="M228 56l14-13" stroke={A} strokeWidth="6" strokeLinecap="round" />
      </g>
      <g className={styles.sceneRise}>
        <rect x="120" y="150" width="52" height="38" rx="5" fill="#fff" opacity=".92" />
        <rect x="176" y="150" width="52" height="38" rx="5" fill="#fff" opacity=".72" />
        <path d="M130 162h32M130 172h24M186 162h32M186 172h20" stroke={A} strokeWidth="3" strokeLinecap="round" opacity=".8" />
      </g>
      <g className={styles.sceneSpin} style={{ transformOrigin: "258px 152px" }}>
        <path d="M258 140l4 9 9 3-9 3-4 9-4-9-9-3 9-3z" fill={A} />
      </g>
    </svg>
  );
}

/** 🗺️ Okuma Serüveni — tepeler üzerinde ilerleyen bir rota ve zirvedeki bayrak. */
function ReadingQuestScene(): ReactElement {
  return (
    <svg viewBox="0 0 300 210" fill="none">
      <path d="M0 178c40-6 58-40 92-40s48 30 84 18 62-46 124-38v70H0z" fill={A} opacity=".18" />
      <path d="M0 192c46 0 62-26 100-26s54 22 92 12 54-32 108-26v58H0z" fill={A} opacity=".28" />
      <path className={styles.sceneDash} d="M22 178c34 4 40-30 74-32s44 26 78 16 46-40 96-40" stroke="#fff" strokeWidth="3.5" strokeLinecap="round" strokeDasharray="9 11" opacity=".85" />
      <g className={styles.sceneFloat}>
        <path d="M264 122V60" stroke="#fff" strokeWidth="4" strokeLinecap="round" />
        <path d="M264 62l32 10-32 12z" fill={A} />
      </g>
      <g className={styles.sceneRise}>
        <path d="M30 160h44v26H30z" fill="#fff" opacity=".9" />
        <path d="M30 160l22-10 22 10" fill={A} opacity=".9" />
        <path d="M46 172h12v14H46z" fill={A} opacity=".5" />
      </g>
      <circle className={styles.scenePulse} cx="150" cy="140" r="6" fill="#fff" />
      <circle className={styles.scenePulse} cx="206" cy="120" r="5" fill={A} />
    </svg>
  );
}

/** 🎒 Öğrenci Masası — lamba, defter, kupa ve saksı. */
function StudentDeskScene(): ReactElement {
  return (
    <svg viewBox="0 0 300 210" fill="none">
      <g className={styles.sceneFloat}>
        <path d="M74 40h42l16 26H58z" fill={A} opacity=".92" />
        <path d="M95 66v52" stroke="#fff" strokeWidth="4" strokeLinecap="round" opacity=".8" />
        <path d="M58 68l74 0" stroke={A} strokeWidth="3" strokeLinecap="round" opacity=".5" />
        <path d="M62 74l66 62H66z" fill={A} opacity=".14" />
      </g>
      <rect x="24" y="160" width="256" height="10" rx="4" fill="#fff" opacity=".85" />
      <path d="M46 170v26M258 170v26" stroke="#fff" strokeWidth="6" strokeLinecap="round" opacity=".55" />
      <g className={styles.sceneRise}>
        <path d="M112 132h74v28h-74z" fill="#fff" opacity=".95" />
        <path d="M149 132v28" stroke={A} strokeWidth="3" opacity=".7" />
        <path d="M120 142h20M120 150h16M158 142h20M158 150h14" stroke={A} strokeWidth="2.5" strokeLinecap="round" opacity=".75" />
      </g>
      <g className={styles.sceneSway}>
        <path d="M214 160v-22" stroke={A} strokeWidth="3.5" strokeLinecap="round" />
        <path d="M214 142c-14-2-18-14-8-20 8-4 14 8 8 20zM214 146c14-4 20-16 9-22-9-4-16 10-9 22z" fill={A} opacity=".85" />
        <path d="M204 160h20l-3 16h-14z" fill="#fff" opacity=".8" />
      </g>
      <g className={styles.sceneFloatSlow}>
        <rect x="248" y="140" width="22" height="20" rx="4" fill="#fff" opacity=".9" />
        <path d="M270 145h6a5 5 0 0 1 0 10h-6" stroke="#fff" strokeWidth="3" opacity=".9" />
        <path d="M254 132c0-5 6-5 6-10M263 132c0-5 5-5 5-10" stroke="#fff" strokeWidth="2.5" strokeLinecap="round" opacity=".55" />
      </g>
    </svg>
  );
}

/** 📚 Sihirli Kütüphane — raflar ve havada süzülen kitaplar. */
function MagicLibraryScene(): ReactElement {
  return (
    <svg viewBox="0 0 300 210" fill="none">
      <g opacity=".9">
        <rect x="30" y="118" width="120" height="8" rx="3" fill="#fff" opacity=".7" />
        <rect x="30" y="176" width="120" height="8" rx="3" fill="#fff" opacity=".7" />
        {[0, 1, 2, 3, 4].map((i) => (
          <rect key={`b1-${i}`} x={38 + i * 22} y={82 + (i % 2) * 6} width="16" height={36 - (i % 2) * 6} rx="3" fill={A} opacity={0.55 + (i % 3) * 0.15} />
        ))}
        {[0, 1, 2, 3, 4].map((i) => (
          <rect key={`b2-${i}`} x={38 + i * 22} y={142 + ((i + 1) % 2) * 6} width="16" height={34 - ((i + 1) % 2) * 6} rx="3" fill="#fff" opacity={0.5 + (i % 3) * 0.16} />
        ))}
      </g>
      <g className={styles.sceneFloat}>
        <path d="M182 96h44a8 8 0 0 1 8 8v40h-52z" fill="#fff" opacity=".95" />
        <path d="M286 96h-44a8 8 0 0 0-8 8v40h52z" fill="#fff" opacity=".78" />
        <path d="M234 104v40" stroke={A} strokeWidth="3" opacity=".8" />
      </g>
      <g className={styles.sceneFloatSlow}>
        <path d="M196 56h30a6 6 0 0 1 6 6v22h-36z" fill={A} opacity=".85" />
        <path d="M268 56h-30a6 6 0 0 0-6 6v22h36z" fill={A} opacity=".6" />
      </g>
      <path className={styles.scenePulse} d="M258 168l4 10 10 4-10 4-4 10-4-10-10-4 10-4z" fill={A} />
    </svg>
  );
}

/** 🚀 Uzay Macerası — roket, halkalı gezegen ve yıldızlar. */
function SpaceRocketScene(): ReactElement {
  return (
    <svg viewBox="0 0 300 210" fill="none">
      <g className={styles.sceneFloatSlow}>
        <circle cx="72" cy="66" r="30" fill={A} opacity=".55" />
        <ellipse cx="72" cy="66" rx="48" ry="13" stroke="#fff" strokeWidth="4" opacity=".7" transform="rotate(-18 72 66)" />
      </g>
      <g className={styles.sceneFloat}>
        <path d="M196 52c26 16 36 46 30 78l-24 14-24-14c-6-32 4-62 30-78z" transform="translate(-14 0)" fill="#fff" opacity=".95" />
        <circle cx="188" cy="104" r="12" fill={A} />
        <path d="M158 132l-16 22 26-8zM218 132l16 22-26-8z" fill={A} opacity=".85" />
        <path className={styles.scenePulse} d="M188 158c8 10 8 22 0 34-8-12-8-24 0-34z" fill="#fff" opacity=".8" />
      </g>
      <g className={styles.sceneDrift}>
        <path d="M42 150l3 8 8 3-8 3-3 8-3-8-8-3 8-3z" fill="#fff" opacity=".9" />
        <path d="M258 44l3 7 7 3-7 3-3 7-3-7-7-3 7-3z" fill="#fff" opacity=".8" />
        <circle cx="112" cy="176" r="4" fill={A} />
        <circle cx="268" cy="150" r="5" fill={A} opacity=".8" />
      </g>
    </svg>
  );
}

/** 👁️ Odak Antrenmanı — göz, odak halkaları ve takip noktaları. */
function FocusEyeScene(): ReactElement {
  return (
    <svg viewBox="0 0 300 210" fill="none">
      <g className={styles.scenePulse}>
        <circle cx="156" cy="104" r="76" stroke={A} strokeWidth="2" opacity=".35" />
        <circle cx="156" cy="104" r="58" stroke={A} strokeWidth="2" opacity=".5" />
      </g>
      <path d="M76 104c30-40 130-40 160 0-30 40-130 40-160 0z" fill="#fff" opacity=".92" />
      <circle cx="156" cy="104" r="28" fill={A} />
      <circle cx="156" cy="104" r="12" fill="#10142c" opacity=".85" />
      <circle cx="166" cy="94" r="5" fill="#fff" opacity=".9" />
      <g className={styles.sceneDrift}>
        <circle cx="46" cy="46" r="6" fill={A} />
        <circle cx="264" cy="46" r="6" fill={A} opacity=".7" />
        <circle cx="46" cy="164" r="6" fill={A} opacity=".7" />
        <circle cx="264" cy="164" r="6" fill={A} />
      </g>
      <path className={styles.sceneDash} d="M46 46h218v118H46z" stroke="#fff" strokeWidth="2" strokeDasharray="7 10" opacity=".4" />
    </svg>
  );
}

/** 🌱 Kelime Bahçesi — kelimelerin yaprak olarak açtığı filizler. */
function WordGardenScene(): ReactElement {
  return (
    <svg viewBox="0 0 300 210" fill="none">
      <path d="M0 184h300v26H0z" fill={A} opacity=".25" />
      <g className={styles.sceneSway}>
        <path d="M84 184V96" stroke="#fff" strokeWidth="4" strokeLinecap="round" opacity=".85" />
        <path d="M84 138c-24 2-32-16-16-26 14-8 22 12 16 26zM84 116c22-4 28-22 12-30-14-6-20 16-12 30z" fill={A} opacity=".8" />
        <circle cx="84" cy="88" r="12" fill="#fff" opacity=".9" />
      </g>
      <g className={styles.sceneSwaySlow}>
        <path d="M164 184v-64" stroke="#fff" strokeWidth="4" strokeLinecap="round" opacity=".7" />
        <path d="M164 156c-20 0-26-14-13-21 12-6 19 10 13 21z" fill={A} opacity=".7" />
        <path d="M150 108h28l-14-18z" fill={A} opacity=".9" />
      </g>
      <g className={styles.sceneRise}>
        <rect x="214" y="128" width="56" height="14" rx="4" fill="#fff" opacity=".9" />
        <rect x="222" y="150" width="40" height="12" rx="4" fill="#fff" opacity=".7" />
        <rect x="216" y="168" width="52" height="12" rx="4" fill={A} opacity=".8" />
      </g>
      <g className={styles.sceneFloat}>
        <circle cx="240" cy="70" r="16" fill={A} opacity=".85" />
        <path d="M240 54v-12M240 98v-12M224 70h-12M268 70h-12" stroke="#fff" strokeWidth="3" strokeLinecap="round" opacity=".7" />
      </g>
    </svg>
  );
}

/** 🏆 Şampiyonluk — kürsü, kupa ve konfeti. */
function ChampionScene(): ReactElement {
  return (
    <svg viewBox="0 0 300 210" fill="none">
      <g className={styles.sceneRise}>
        <rect x="48" y="150" width="60" height="46" rx="4" fill="#fff" opacity=".62" />
        <rect x="116" y="118" width="64" height="78" rx="4" fill="#fff" opacity=".92" />
        <rect x="188" y="164" width="60" height="32" rx="4" fill="#fff" opacity=".5" />
        <path d="M72 168h12M144 136h8M212 178h12" stroke={A} strokeWidth="4" strokeLinecap="round" opacity=".8" />
      </g>
      <g className={styles.sceneFloat}>
        <path d="M130 40h36v26a18 18 0 0 1-36 0z" fill={A} />
        <path d="M130 46h-12a12 12 0 0 0 12 12M166 46h12a12 12 0 0 1-12 12" stroke={A} strokeWidth="4" fill="none" />
        <path d="M144 84h8v14h-8z" fill={A} />
        <path d="M134 98h28v8h-28z" fill={A} opacity=".85" />
      </g>
      <g className={styles.sceneDrift}>
        <rect x="52" y="52" width="9" height="9" rx="2" fill={A} transform="rotate(24 56 56)" />
        <rect x="236" y="70" width="9" height="9" rx="2" fill="#fff" transform="rotate(-18 240 74)" opacity=".9" />
        <rect x="212" y="36" width="8" height="8" rx="2" fill={A} transform="rotate(38 216 40)" />
        <rect x="86" y="96" width="8" height="8" rx="2" fill="#fff" opacity=".8" transform="rotate(-30 90 100)" />
      </g>
    </svg>
  );
}

/** 🌊 Okyanus — kitaptan denizaltı, baloncuklar ve dalgalar. */
function OceanDiveScene(): ReactElement {
  return (
    <svg viewBox="0 0 300 210" fill="none">
      <path className={styles.sceneDrift} d="M0 46c26-14 52 14 78 0s52-14 78 0 52 14 78 0 52-14 66 0" stroke="#fff" strokeWidth="3" opacity=".45" fill="none" />
      <g className={styles.sceneFloat}>
        <rect x="96" y="94" width="112" height="52" rx="26" fill="#fff" opacity=".95" />
        <circle cx="132" cy="120" r="12" fill={A} />
        <circle cx="168" cy="120" r="9" fill={A} opacity=".7" />
        <path d="M208 106l26-12v52l-26-12z" fill={A} opacity=".85" />
        <path d="M140 94V74h26v20" stroke="#fff" strokeWidth="6" fill="none" opacity=".9" />
      </g>
      <g className={styles.sceneRiseSlow}>
        <circle cx="70" cy="150" r="8" stroke="#fff" strokeWidth="2.5" opacity=".8" />
        <circle cx="52" cy="118" r="5" stroke="#fff" strokeWidth="2" opacity=".65" />
        <circle cx="84" cy="86" r="4" stroke="#fff" strokeWidth="2" opacity=".5" />
      </g>
      <path d="M0 186c40 0 40-14 78-14s42 14 80 14 44-16 82-16 44 16 60 16v24H0z" fill={A} opacity=".3" />
    </svg>
  );
}

/** 🧪 Bilim Laboratuvarı — balon, kabarcıklar ve moleküller. */
function ScienceLabScene(): ReactElement {
  return (
    <svg viewBox="0 0 300 210" fill="none">
      <g className={styles.sceneFloat}>
        <path d="M132 46h34v40l32 66a12 12 0 0 1-10 18h-78a12 12 0 0 1-10-18l32-66z" stroke="#fff" strokeWidth="4" fill="none" opacity=".92" />
        <path d="M118 130h62l20 34a8 8 0 0 1-7 12h-88a8 8 0 0 1-7-12z" fill={A} opacity=".8" />
        <path d="M126 40h46" stroke="#fff" strokeWidth="6" strokeLinecap="round" opacity=".9" />
        <circle className={styles.scenePulse} cx="140" cy="150" r="6" fill="#fff" opacity=".85" />
        <circle cx="164" cy="158" r="4" fill="#fff" opacity=".7" />
      </g>
      <g className={styles.sceneSpin} style={{ transformOrigin: "236px 92px" }}>
        <ellipse cx="236" cy="92" rx="38" ry="14" stroke={A} strokeWidth="3" opacity=".8" />
        <ellipse cx="236" cy="92" rx="38" ry="14" stroke={A} strokeWidth="3" opacity=".55" transform="rotate(60 236 92)" />
        <ellipse cx="236" cy="92" rx="38" ry="14" stroke={A} strokeWidth="3" opacity=".55" transform="rotate(-60 236 92)" />
        <circle cx="236" cy="92" r="8" fill="#fff" />
      </g>
      <g className={styles.sceneRiseSlow}>
        <circle cx="60" cy="140" r="6" fill={A} opacity=".8" />
        <circle cx="46" cy="106" r="4" fill={A} opacity=".6" />
      </g>
    </svg>
  );
}

/** 🏰 Şato Macerası — kuleler, sancaklar ve anahtar. */
function CastleScene(): ReactElement {
  return (
    <svg viewBox="0 0 300 210" fill="none">
      <g className={styles.sceneRise}>
        <path d="M62 196v-84h30v84zM120 196v-104h60v104zM208 196v-84h30v84z" fill="#fff" opacity=".9" />
        <path d="M62 112h30v-14h-8v8h-6v-8h-8v8h-8zM120 92h60V78h-10v8h-10v-8h-10v8h-10v-8h-10zM208 112h30v-14h-8v8h-6v-8h-8v8h-8z" fill="#fff" opacity=".9" />
        <path d="M138 196v-40a12 12 0 0 1 24 0v40z" fill={A} />
        <rect x="70" y="132" width="14" height="18" rx="4" fill={A} opacity=".75" />
        <rect x="216" y="132" width="14" height="18" rx="4" fill={A} opacity=".75" />
      </g>
      <g className={styles.sceneSway}>
        <path d="M150 78V44" stroke="#fff" strokeWidth="3.5" strokeLinecap="round" />
        <path d="M150 46l30 9-30 10z" fill={A} />
      </g>
      <g className={styles.sceneFloat}>
        <circle cx="256" cy="56" r="12" stroke={A} strokeWidth="5" fill="none" />
        <path d="M256 68v28M256 84h10M256 92h8" stroke={A} strokeWidth="5" strokeLinecap="round" />
      </g>
    </svg>
  );
}

/** 🌌 Gece Gökyüzü — teleskop ve takımyıldız. */
function NightSkyScene(): ReactElement {
  return (
    <svg viewBox="0 0 300 210" fill="none">
      <g className={styles.sceneDrift}>
        <circle cx="196" cy="42" r="4" fill="#fff" />
        <circle cx="234" cy="66" r="3" fill="#fff" opacity=".8" />
        <circle cx="266" cy="38" r="3.5" fill={A} />
        <circle cx="222" cy="104" r="3" fill={A} opacity=".8" />
        <circle cx="176" cy="86" r="2.5" fill="#fff" opacity=".7" />
        <path d="M196 42l38 24 32-28M234 66l-12 38" stroke="#fff" strokeWidth="1.6" opacity=".5" />
      </g>
      <g className={styles.sceneFloat}>
        <path d="M52 152l84-52 16 26-84 52z" fill="#fff" opacity=".95" />
        <path d="M136 100l30-18 16 26-30 18z" fill={A} />
        <circle cx="174" cy="94" r="10" fill="#fff" opacity=".85" />
        <path d="M88 158l-14 38M104 150l16 46" stroke="#fff" strokeWidth="5" strokeLinecap="round" opacity=".8" />
        <path d="M64 190h64" stroke="#fff" strokeWidth="4" strokeLinecap="round" opacity=".5" />
      </g>
      <path className={styles.scenePulse} d="M40 62l4 10 10 4-10 4-4 10-4-10-10-4 10-4z" fill={A} />
    </svg>
  );
}

const SCENES: Record<HeroSceneId, () => ReactElement> = {
  speedReading: SpeedReadingScene,
  readingQuest: ReadingQuestScene,
  studentDesk: StudentDeskScene,
  magicLibrary: MagicLibraryScene,
  spaceRocket: SpaceRocketScene,
  focusEye: FocusEyeScene,
  wordGarden: WordGardenScene,
  champion: ChampionScene,
  oceanDive: OceanDiveScene,
  scienceLab: ScienceLabScene,
  castle: CastleScene,
  nightSky: NightSkyScene,
};

export function HeroScene({ scene }: { scene: HeroSceneId }): ReactElement {
  const Scene = SCENES[scene] ?? SpeedReadingScene;
  return <Scene />;
}
