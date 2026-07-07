"use client";

import { useEffect, useMemo, useState } from "react";

type Box = {
  id: number;
  isCorrect: boolean;
};

type MessageType = "success" | "error" | "info";

const MAX_LEVEL = 10;
const ROUND_SECONDS = 60;

const LEVEL_CONFIG: Record<
  number,
  {
    base: string;
    diff: string;
    title: string;
    boxCount: number;
    columns: number;
    bg: string;
  }
> = {
  1: {
    base: "🍎",
    diff: "🍅",
    title: "Benzer Kırmızılar",
    boxCount: 4,
    columns: 2,
    bg: "from-rose-100 via-red-50 to-orange-100",
  },
  2: {
    base: "🐱",
    diff: "🦁",
    title: "Benzer Hayvanlar",
    boxCount: 6,
    columns: 3,
    bg: "from-amber-100 via-orange-50 to-yellow-100",
  },
  3: {
    base: "🌳",
    diff: "🌲",
    title: "Ağaçlar",
    boxCount: 9,
    columns: 3,
    bg: "from-lime-100 via-emerald-50 to-green-100",
  },
  4: {
    base: "🐟",
    diff: "🐠",
    title: "Balıklar",
    boxCount: 12,
    columns: 4,
    bg: "from-cyan-100 via-sky-50 to-blue-100",
  },
  5: {
    base: "🌼",
    diff: "🌻",
    title: "Çiçekler",
    boxCount: 16,
    columns: 4,
    bg: "from-yellow-100 via-amber-50 to-orange-100",
  },
  6: {
    base: "🦋",
    diff: "🐝",
    title: "Küçük Canlılar",
    boxCount: 20,
    columns: 5,
    bg: "from-violet-100 via-fuchsia-50 to-pink-100",
  },
  7: {
    base: "☁️",
    diff: "🌧️",
    title: "Gökyüzü",
    boxCount: 24,
    columns: 6,
    bg: "from-slate-100 via-sky-50 to-cyan-100",
  },
  8: {
    base: "🌕",
    diff: "🌖",
    title: "Ay Evreleri",
    boxCount: 30,
    columns: 6,
    bg: "from-indigo-100 via-blue-50 to-violet-100",
  },
  9: {
    base: "😃",
    diff: "😄",
    title: "Yüz İfadeleri",
    boxCount: 36,
    columns: 6,
    bg: "from-orange-100 via-yellow-50 to-amber-100",
  },
  10: {
    base: "🔵",
    diff: "🟦",
    title: "Şekil Algısı",
    boxCount: 42,
    columns: 7,
    bg: "from-blue-100 via-cyan-50 to-sky-100",
  },
};

function createBoxes(level: number): Box[] {
  const config = LEVEL_CONFIG[level] ?? LEVEL_CONFIG[1];
  const correctIndex = Math.floor(Math.random() * config.boxCount);

  return Array.from({ length: config.boxCount }, (_, index) => ({
    id: Date.now() + index,
    isCorrect: index === correctIndex,
  }));
}

function getMessageClass(type: MessageType) {
  if (type === "success") {
    return "border-emerald-200 bg-emerald-50 text-emerald-700";
  }

  if (type === "error") {
    return "border-rose-200 bg-rose-50 text-rose-700";
  }

  return "border-sky-200 bg-sky-50 text-sky-700";
}

function formatTime(seconds: number) {
  const minute = Math.floor(seconds / 60);
  const second = seconds % 60;

  return `${String(minute).padStart(2, "0")}:${String(second).padStart(2, "0")}`;
}

export default function Page() {
  const [level, setLevel] = useState(1);
  const [boxes, setBoxes] = useState<Box[]>(() => createBoxes(1));
  const [message, setMessage] = useState("Farklı olan simgeyi bul.");
  const [messageType, setMessageType] = useState<MessageType>("info");
  const [score, setScore] = useState(0);
  const [wrongCount, setWrongCount] = useState(0);
  const [correctCount, setCorrectCount] = useState(0);
  const [timeLeft, setTimeLeft] = useState(ROUND_SECONDS);
  const [isFinished, setIsFinished] = useState(false);
  const [selectedBoxId, setSelectedBoxId] = useState<number | null>(null);

  const config = LEVEL_CONFIG[level] ?? LEVEL_CONFIG[1];

  const progressPercent = useMemo(() => {
    return Math.round((level / MAX_LEVEL) * 100);
  }, [level]);

  useEffect(() => {
    if (isFinished) {
      return;
    }

    const timerId = window.setInterval(() => {
      setTimeLeft((previous) => {
        if (previous <= 1) {
          window.clearInterval(timerId);
          setIsFinished(true);
          setMessage("Süre bitti. İstersen yeniden başlayabilirsin.");
          setMessageType("error");
          return 0;
        }

        return previous - 1;
      });
    }, 1000);

    return () => {
      window.clearInterval(timerId);
    };
  }, [isFinished]);

  const goNextLevel = () => {
    if (level >= MAX_LEVEL) {
      setIsFinished(true);
      setMessage("Tebrikler! Bütün seviyeleri tamamladın.");
      setMessageType("success");
      return;
    }

    const nextLevel = level + 1;

    setLevel(nextLevel);
    setBoxes(createBoxes(nextLevel));
    setSelectedBoxId(null);
    setMessage(`${nextLevel}. seviyeye geçtin. Farklı olanı bul.`);
    setMessageType("success");
  };

  const handleBoxClick = (box: Box) => {
    if (isFinished) {
      return;
    }

    setSelectedBoxId(box.id);

    if (!box.isCorrect) {
      setWrongCount((previous) => previous + 1);
      setScore((previous) => Math.max(0, previous - 5));
      setMessage("Yanlış seçim. Tekrar dikkatlice bak.");
      setMessageType("error");
      return;
    }

    setCorrectCount((previous) => previous + 1);
    setScore((previous) => previous + 20 + level * 5);
    setMessage("Doğru! Farklı olanı buldun.");
    setMessageType("success");

    window.setTimeout(() => {
      goNextLevel();
    }, 650);
  };

  const handleRestart = () => {
    setLevel(1);
    setBoxes(createBoxes(1));
    setMessage("Farklı olan simgeyi bul.");
    setMessageType("info");
    setScore(0);
    setWrongCount(0);
    setCorrectCount(0);
    setTimeLeft(ROUND_SECONDS);
    setIsFinished(false);
    setSelectedBoxId(null);
  };

  const handleNewRoundSameLevel = () => {
    if (isFinished) {
      return;
    }

    setBoxes(createBoxes(level));
    setSelectedBoxId(null);
    setMessage("Yeni dizilim hazır. Farklı olanı bul.");
    setMessageType("info");
  };

  return (
    <main
      className={`min-h-screen bg-gradient-to-br ${config.bg} px-4 py-6 text-slate-900 transition-colors duration-500`}
    >
      <section className="mx-auto flex min-h-[calc(100vh-48px)] w-full max-w-6xl flex-col overflow-hidden rounded-[2rem] border border-white/80 bg-white/45 shadow-2xl shadow-slate-300/50 backdrop-blur">
        <header className="flex flex-col gap-4 border-b border-white/70 bg-white/70 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.24em] text-rose-600">
              Odaklanma Çalışması
            </p>

            <h1 className="mt-1 text-2xl font-black tracking-tight text-slate-950 sm:text-3xl">
              Farklı Olanı Bul
            </h1>

            <p className="mt-1 text-sm text-slate-600">
              Benzer simgeler arasındaki farklı olanı hızlıca bul.
            </p>
          </div>

          <div className="grid grid-cols-4 gap-2 text-center sm:min-w-[420px]">
            <div className="rounded-2xl border border-white bg-white/80 px-3 py-2 shadow-sm">
              <p className="text-[10px] font-bold uppercase text-slate-500">
                Süre
              </p>
              <p className="mt-1 text-lg font-black text-rose-600">
                {formatTime(timeLeft)}
              </p>
            </div>

            <div className="rounded-2xl border border-white bg-white/80 px-3 py-2 shadow-sm">
              <p className="text-[10px] font-bold uppercase text-slate-500">
                Seviye
              </p>
              <p className="mt-1 text-lg font-black text-slate-900">
                {level}/{MAX_LEVEL}
              </p>
            </div>

            <div className="rounded-2xl border border-white bg-white/80 px-3 py-2 shadow-sm">
              <p className="text-[10px] font-bold uppercase text-slate-500">
                Puan
              </p>
              <p className="mt-1 text-lg font-black text-amber-600">
                {score}
              </p>
            </div>

            <div className="rounded-2xl border border-white bg-white/80 px-3 py-2 shadow-sm">
              <p className="text-[10px] font-bold uppercase text-slate-500">
                Yanlış
              </p>
              <p className="mt-1 text-lg font-black text-red-600">
                {wrongCount}
              </p>
            </div>
          </div>
        </header>

        <div className="px-5 pt-5">
          <div className="flex items-center gap-2">
            <div className="h-4 flex-1 overflow-hidden rounded-full border border-white bg-white/70 shadow-inner">
              <div
                className="h-full rounded-full bg-gradient-to-r from-emerald-400 via-lime-400 to-amber-400 transition-all duration-500"
                style={{ width: `${progressPercent}%` }}
              />
            </div>

            <span className="rounded-full bg-white/75 px-3 py-1 text-xs font-black text-slate-700 shadow-sm">
              {config.title}
            </span>
          </div>
        </div>

        <div className="flex flex-1 flex-col items-center justify-center px-5 py-8">
          <div className="mb-5 text-center">
            <p className="text-lg font-black text-orange-600 sm:text-xl">
              Farklı olan simgeyi bul
            </p>

            <p className="mt-1 text-sm text-slate-600">
              Bu seviyede {config.boxCount} kutu var. Sadece biri farklı.
            </p>
          </div>

          <div
            className={`mb-5 rounded-2xl border px-4 py-3 text-center text-sm font-bold shadow-sm ${getMessageClass(
              messageType,
            )}`}
          >
            {message}
          </div>

          <div
            className="grid w-full max-w-4xl gap-2 sm:gap-3"
            style={{
              gridTemplateColumns: `repeat(${config.columns}, minmax(0, 1fr))`,
            }}
          >
            {boxes.map((box) => {
              const isSelected = selectedBoxId === box.id;
              const emoji = box.isCorrect ? config.diff : config.base;

              return (
                <button
                  key={box.id}
                  type="button"
                  onClick={() => handleBoxClick(box)}
                  disabled={isFinished}
                  className={`group relative flex aspect-square min-h-[58px] items-center justify-center overflow-hidden rounded-3xl border-2 bg-white/85 text-3xl shadow-lg shadow-slate-300/30 transition-all duration-200 hover:-translate-y-1 hover:scale-[1.03] hover:border-cyan-400 hover:shadow-2xl active:scale-95 sm:min-h-[72px] sm:text-5xl ${
                    isSelected && box.isCorrect
                      ? "border-emerald-400 bg-emerald-50"
                      : isSelected
                        ? "border-rose-400 bg-rose-50"
                        : "border-white/90"
                  } disabled:cursor-not-allowed`}
                >
                  <span className="pointer-events-none absolute -left-8 -top-8 h-24 w-24 rounded-full bg-white/70 blur-2xl transition group-hover:scale-125" />
                  <span className="pointer-events-none absolute -bottom-10 -right-10 h-28 w-28 rounded-full bg-cyan-100/70 blur-2xl transition group-hover:scale-125" />
                  <span className="relative drop-shadow-sm">{emoji}</span>
                </button>
              );
            })}
          </div>

          <div className="mt-6 grid w-full max-w-4xl gap-3 sm:grid-cols-3">
            <button
              type="button"
              onClick={handleNewRoundSameLevel}
              disabled={isFinished}
              className="rounded-2xl border border-sky-200 bg-white/80 px-4 py-3 text-sm font-black text-sky-700 shadow-sm transition hover:-translate-y-0.5 hover:bg-sky-50 disabled:cursor-not-allowed disabled:opacity-50"
            >
              Aynı Seviyede Yenile
            </button>

            <button
              type="button"
              onClick={handleRestart}
              className="rounded-2xl border border-rose-200 bg-white/80 px-4 py-3 text-sm font-black text-rose-700 shadow-sm transition hover:-translate-y-0.5 hover:bg-rose-50"
            >
              Yeniden Başla
            </button>

            <div className="rounded-2xl border border-white bg-white/70 px-4 py-3 text-center text-sm font-bold text-slate-600 shadow-sm">
              Doğru:{" "}
              <span className="font-black text-emerald-600">
                {correctCount}
              </span>{" "}
              / Yanlış:{" "}
              <span className="font-black text-rose-600">{wrongCount}</span>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}