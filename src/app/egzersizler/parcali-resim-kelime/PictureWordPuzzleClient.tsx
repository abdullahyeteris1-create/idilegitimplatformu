"use client";

import { useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";

type PuzzleItem = {
  id: string;
  word: string;
  emoji: string;
  hint: string;
  color: string;
};

type LevelConfig = {
  level: number;
  rows: number;
  cols: number;
  extraLetters: number;
  revealCount: number;
};

const ITEMS: PuzzleItem[] = [
  { id: "train", word: "TREN", emoji: "🚆", hint: "Rayların üzerinde yolcu taşır.", color: "#dbeafe" },
  { id: "vase", word: "VAZO", emoji: "🏺", hint: "İçine çiçek konulan eşyadır.", color: "#f3e8ff" },
  { id: "plane", word: "UÇAK", emoji: "✈️", hint: "Gökyüzünde uçar.", color: "#e0f2fe" },
  { id: "cat", word: "KEDİ", emoji: "🐈", hint: "Miyavlayan evcil hayvandır.", color: "#fef3c7" },
  { id: "iron", word: "ÜTÜ", emoji: "👔", hint: "Kırışık kıyafetleri düzeltir.", color: "#ede9fe" },
  { id: "apple", word: "ELMA", emoji: "🍎", hint: "Kırmızı ya da yeşil olabilen bir meyvedir.", color: "#fee2e2" },
  { id: "fish", word: "BALIK", emoji: "🐟", hint: "Suda yaşar.", color: "#cffafe" },
  { id: "car", word: "ARABA", emoji: "🚗", hint: "Karayolunda kullanılan taşıttır.", color: "#ffedd5" },
  { id: "clock", word: "SAAT", emoji: "⏰", hint: "Zamanı gösterir.", color: "#fef9c3" },
  { id: "book", word: "KİTAP", emoji: "📘", hint: "Okumak için sayfaları vardır.", color: "#dbeafe" },
  { id: "flower", word: "ÇİÇEK", emoji: "🌺", hint: "Bahçede yetişir ve güzel kokabilir.", color: "#fce7f3" },
  { id: "house", word: "EV", emoji: "🏠", hint: "İçinde yaşadığımız yapıdır.", color: "#dcfce7" },
];

const LEVELS: LevelConfig[] = [
  { level: 1, rows: 2, cols: 2, extraLetters: 2, revealCount: 2 },
  { level: 2, rows: 2, cols: 3, extraLetters: 3, revealCount: 2 },
  { level: 3, rows: 3, cols: 3, extraLetters: 4, revealCount: 3 },
  { level: 4, rows: 3, cols: 4, extraLetters: 5, revealCount: 3 },
  { level: 5, rows: 4, cols: 4, extraLetters: 6, revealCount: 4 },
  { level: 6, rows: 4, cols: 5, extraLetters: 7, revealCount: 4 },
];

const TURKISH_LETTERS = "ABCÇDEFGĞHIİJKLMNOÖPRSŞTUÜVYZ".split("");

function shuffle<T>(items: T[]): T[] {
  const copy = [...items];
  for (let i = copy.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

function indexToCell(index: number, cols: number) {
  return {
    row: Math.floor(index / cols),
    col: index % cols,
  };
}

function manhattanDistance(
  firstIndex: number,
  secondIndex: number,
  cols: number,
): number {
  const first = indexToCell(firstIndex, cols);
  const second = indexToCell(secondIndex, cols);

  return Math.abs(first.row - second.row) + Math.abs(first.col - second.col);
}

export function getSpreadRevealOrder(rows: number, cols: number): number[] {
  if (rows <= 0 || cols <= 0) return [];

  const centerRow = (rows - 1) / 2;
  const centerCol = (cols - 1) / 2;
  const remaining = Array.from({ length: rows * cols }, (_, index) => index);
  const firstIndex = remaining.reduce((closestIndex, candidateIndex) => {
    const closest = indexToCell(closestIndex, cols);
    const candidate = indexToCell(candidateIndex, cols);
    const closestDistance =
      Math.abs(closest.row - centerRow) + Math.abs(closest.col - centerCol);
    const candidateDistance =
      Math.abs(candidate.row - centerRow) + Math.abs(candidate.col - centerCol);

    return candidateDistance < closestDistance ? candidateIndex : closestIndex;
  });
  const order = [firstIndex];
  remaining.splice(remaining.indexOf(firstIndex), 1);

  while (remaining.length > 0) {
    const nextIndex = remaining.reduce((bestIndex, candidateIndex) => {
      const bestMinimumDistance = Math.min(
        ...order.map((openIndex) =>
          manhattanDistance(bestIndex, openIndex, cols),
        ),
      );
      const candidateMinimumDistance = Math.min(
        ...order.map((openIndex) =>
          manhattanDistance(candidateIndex, openIndex, cols),
        ),
      );

      return candidateMinimumDistance > bestMinimumDistance
        ? candidateIndex
        : bestIndex;
    });

    order.push(nextIndex);
    remaining.splice(remaining.indexOf(nextIndex), 1);
  }

  return order;
}

function tileStyle(
  emoji: string,
  color: string,
  row: number,
  col: number,
  rows: number,
  cols: number,
): React.CSSProperties {
  return {
    backgroundColor: color,
    backgroundImage: `url("data:image/svg+xml,${encodeURIComponent(
      `<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'>
        <rect width='100' height='100' rx='8' fill='${color}'/>
        <text x='50' y='61' text-anchor='middle' font-size='52'>${emoji}</text>
      </svg>`,
    )}")`,
    backgroundSize: `${cols * 100}% ${rows * 100}%`,
    backgroundPosition: `${cols === 1 ? 0 : (col / (cols - 1)) * 100}% ${
      rows === 1 ? 0 : (row / (rows - 1)) * 100
    }%`,
    backgroundRepeat: "no-repeat",
  };
}

export function PictureWordPuzzleClient() {
  const router = useRouter();
  const [level, setLevel] = useState(1);
  const [round, setRound] = useState(0);
  const [item, setItem] = useState<PuzzleItem>(ITEMS[0]);
  const [letters, setLetters] = useState<string[]>([]);
  const [answer, setAnswer] = useState<string[]>([]);
  const [answerLetterIndices, setAnswerLetterIndices] = useState<number[]>([]);
  const [revealedTiles, setRevealedTiles] = useState<Set<number>>(new Set());
  const [hintVisible, setHintVisible] = useState(false);
  const [message, setMessage] = useState("Parçalı görsele bak ve kelimeyi bul.");
  const [correct, setCorrect] = useState(0);
  const [wrong, setWrong] = useState(0);
  const [started, setStarted] = useState(false);
  const answerRef = useRef<string[]>([]);
  const answerLetterIndicesRef = useRef<number[]>([]);

  const config = LEVELS[level - 1];
  const totalTiles = config.rows * config.cols;

  const startRound = (nextRound = round + 1, requestedLevel = level) => {
    const cfg = LEVELS[requestedLevel - 1];
    const nextItem = shuffle(ITEMS)[0];
    const wordLetters = nextItem.word.split("");
    const extras = shuffle(
      TURKISH_LETTERS.filter((letter) => !wordLetters.includes(letter)),
    ).slice(0, cfg.extraLetters);

    const initiallyRevealed = new Set(
      getSpreadRevealOrder(cfg.rows, cfg.cols).slice(
        0,
        Math.max(1, cfg.revealCount),
      ),
    );

    setItem(nextItem);
    setLetters(shuffle([...wordLetters, ...extras]));
    answerRef.current = [];
    answerLetterIndicesRef.current = [];
    setAnswer([]);
    setAnswerLetterIndices([]);
    setRevealedTiles(initiallyRevealed);
    setHintVisible(false);
    setMessage("Parçalı görsele bak ve kelimeyi bul.");
    setRound(nextRound);
  };
  const answerText = answer.join("");

  const remainingLetters = useMemo(() => {
    return letters.map((letter, index) => {
      return { letter, index, used: answerLetterIndices.includes(index) };
    });
  }, [answerLetterIndices, letters]);

  const revealNextTile = () => {
    const revealOrder = getSpreadRevealOrder(config.rows, config.cols);

    setRevealedTiles((current) => {
      const nextHiddenIndex = revealOrder.find((index) => !current.has(index));
      if (nextHiddenIndex === undefined) return current;

      const next = new Set(current);
      next.add(nextHiddenIndex);
      return next;
    });
  };

  const chooseLetter = (letter: string, letterIndex: number) => {
    if (
      answerRef.current.length >= item.word.length ||
      answerLetterIndicesRef.current.includes(letterIndex)
    ) {
      return;
    }

    const nextAnswer = [...answerRef.current, letter];
    const nextIndices = [...answerLetterIndicesRef.current, letterIndex];
    answerRef.current = nextAnswer;
    answerLetterIndicesRef.current = nextIndices;
    setAnswer(nextAnswer);
    setAnswerLetterIndices(nextIndices);
    revealNextTile();
    setMessage("");
  };

  const removeLast = () => {
    const nextAnswer = answerRef.current.slice(0, -1);
    const nextIndices = answerLetterIndicesRef.current.slice(0, -1);
    answerRef.current = nextAnswer;
    answerLetterIndicesRef.current = nextIndices;
    setAnswer(nextAnswer);
    setAnswerLetterIndices(nextIndices);
    setMessage("");
  };

  const clearAnswer = () => {
    answerRef.current = [];
    answerLetterIndicesRef.current = [];
    setAnswer([]);
    setAnswerLetterIndices([]);
    setMessage("");
  };

  const revealOneTile = () => {
    if (revealedTiles.size >= totalTiles) {
      setHintVisible(true);
      setMessage(item.hint);
      return;
    }
    revealNextTile();
    setMessage("Bir resim parçası daha açıldı.");
  };

  const showTextHint = () => {
    setHintVisible(true);
    setMessage(item.hint);
  };

  const checkAnswer = () => {
    if (answerText.length !== item.word.length) {
      setMessage("Önce bütün harf kutularını doldur.");
      return;
    }

    if (answerText === item.word) {
      const nextCorrect = correct + 1;
      setCorrect(nextCorrect);
      setMessage(`Doğru! Kelime: ${item.word}`);

      let nextLevel = level;
      if (nextCorrect > 0 && nextCorrect % 5 === 0 && level < LEVELS.length) {
        nextLevel = level + 1;
        setLevel(nextLevel);
      }

      window.setTimeout(() => startRound(round + 1, nextLevel), 900);
      return;
    }

    setWrong((current) => current + 1);
    setMessage("Bu kelime olmadı. Harfleri tekrar düzenle.");
  };

  const setLevelAndRestart = (nextLevel: number) => {
    setLevel(nextLevel);
    if (started) startRound(round + 1, nextLevel);
  };

  if (!started) {
    return (
      <main className="min-h-dvh bg-[var(--background)] px-3 py-4 md:px-6">
        <section className="mx-auto max-w-5xl rounded-3xl border border-red-100 bg-white p-5 shadow-xl shadow-red-100/40 md:p-8">
          <p className="text-xs font-black uppercase tracking-[0.22em] text-red-600">
            Görsel Kelime Bulmaca
          </p>
          <h1 className="mt-2 text-3xl font-black text-slate-950">
            Parçalı Resimden Kelimeyi Bul
          </h1>
          <p className="mt-3 max-w-3xl text-sm leading-6 text-slate-600">
            Resmin açılan parçalarını incele, aşağıdaki harfleri doğru sıraya koy ve
            kelimeyi bul. Seviye yükseldikçe resim daha fazla parçaya ayrılır ve
            yanıltıcı harfler artar.
          </p>

          <div className="mt-6 grid gap-4 md:grid-cols-3">
            <label className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
                Başlangıç Seviyesi
              </span>
              <select
                value={level}
                onChange={(event) => setLevel(Number(event.target.value))}
                style={{ colorScheme: "light" }}
                className="mt-2 min-h-11 w-full rounded-xl border border-slate-300 bg-white px-3 text-slate-900 opacity-100 outline-none focus:border-red-400 focus:ring-2 focus:ring-red-400/20"
              >
                {LEVELS.map((entry) => (
                  <option
                    key={entry.level}
                    value={entry.level}
                    className="bg-white text-slate-900"
                  >
                    {entry.level}. Seviye · {entry.rows}×{entry.cols} parça
                  </option>
                ))}
              </select>
            </label>

            <article className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
              <p className="text-xs font-bold uppercase tracking-wider text-slate-500">
                Seviye Sistemi
              </p>
              <p className="mt-2 text-sm leading-6 text-slate-700">
                Her 5 doğru cevapta otomatik olarak bir üst seviyeye geçilir.
              </p>
            </article>

            <article className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
              <p className="text-xs font-bold uppercase tracking-wider text-slate-500">
                İpucu Sistemi
              </p>
              <p className="mt-2 text-sm leading-6 text-slate-700">
                Önce bir resim parçası açabilir, sonra metin ipucunu görebilirsin.
              </p>
            </article>
          </div>

          <button
            type="button"
            onClick={() => {
              setStarted(true);
              startRound(1, level);
            }}
            className="mt-6 min-h-12 w-full rounded-2xl bg-red-600 px-5 font-black text-white transition hover:bg-red-700 active:scale-[0.99]"
          >
            Çalışmayı Başlat
          </button>
        </section>
      </main>
    );
  }

  return (
    <main className="flex min-h-dvh flex-col overflow-hidden bg-slate-950 text-white">
      <header className="flex shrink-0 flex-wrap items-center justify-between gap-2 border-b border-white/10 bg-slate-900 px-3 py-2 md:px-5">
        <div>
          <p className="text-[10px] font-black uppercase tracking-[0.2em] text-red-400">
            Parçalı Resim
          </p>
          <h1 className="text-base font-black md:text-lg">Kelimeyi Bul</h1>
        </div>

        <div className="flex flex-wrap items-center gap-1.5 text-xs font-bold">
          <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1.5">
            Seviye {level}
          </span>
          <span className="rounded-full border border-emerald-500/30 bg-emerald-500/10 px-3 py-1.5 text-emerald-300">
            Doğru {correct}
          </span>
          <span className="rounded-full border border-red-500/30 bg-red-500/10 px-3 py-1.5 text-red-300">
            Yanlış {wrong}
          </span>
          <button
            type="button"
            onClick={() => router.push("/egzersizler")}
            className="min-h-10 rounded-xl border border-white/15 bg-white/5 px-3 hover:bg-white/10"
          >
            Egzersizlere Dön
          </button>
        </div>
      </header>

      <section className="flex min-h-0 flex-1 flex-col items-center justify-center gap-3 overflow-auto px-3 py-3 md:px-6">
        <div className="w-full max-w-3xl text-center">
          <p className="text-sm font-semibold text-slate-300">{message}</p>
        </div>

        <div
          className="grid w-full max-w-[min(78vw,560px)] overflow-hidden rounded-2xl border-4 border-amber-500 bg-white shadow-2xl shadow-black/40"
          style={{
            aspectRatio: `${config.cols} / ${config.rows}`,
            gridTemplateColumns: `repeat(${config.cols}, minmax(0, 1fr))`,
            gridTemplateRows: `repeat(${config.rows}, minmax(0, 1fr))`,
          }}
        >
          {Array.from({ length: totalTiles }, (_, index) => {
            const row = Math.floor(index / config.cols);
            const col = index % config.cols;
            const revealed = revealedTiles.has(index);

            return (
              <button
                type="button"
                key={`${item.id}-tile-${index}`}
                onClick={() =>
                  setRevealedTiles((current) => new Set([...current, index]))
                }
                className={`relative min-h-0 min-w-0 overflow-hidden border border-amber-400/80 bg-slate-100 ${
                  revealed ? "cursor-default" : "cursor-pointer"
                }`}
                aria-label={`Resim parçası ${index + 1} ${
                  revealed ? "açık" : "kapalı"
                }`}
              >
                <span
                  className={`absolute inset-0 block transition duration-300 ${
                    revealed ? "filter-none" : "brightness-75 saturate-75"
                  }`}
                  style={tileStyle(
                    item.emoji,
                    item.color,
                    row,
                    col,
                    config.rows,
                    config.cols,
                  )}
                />
                {!revealed ? (
                  <span className="absolute inset-0 flex items-center justify-center bg-slate-200/70 text-2xl font-extrabold text-slate-600 backdrop-blur-[1px] drop-shadow-sm md:text-3xl">
                    ?
                  </span>
                ) : null}
              </button>
            );
          })}
        </div>

        <div className="flex min-h-11 flex-wrap items-center justify-center gap-2">
          {Array.from({ length: item.word.length }, (_, index) => (
            <div
              key={`answer-${index}`}
              className={`flex h-11 min-w-11 items-center justify-center rounded-xl border text-lg font-black ${
                answer[index]
                  ? "border-amber-400 bg-white text-slate-950"
                  : "border-white/20 bg-white/5 text-white/30"
              }`}
            >
              {answer[index] ?? ""}
            </div>
          ))}
        </div>

        <div className="flex max-w-3xl flex-wrap items-center justify-center gap-2">
          {remainingLetters.map(({ letter, index, used }) => (
            <button
              key={`${letter}-${index}`}
              type="button"
              disabled={used}
              onClick={() => chooseLetter(letter, index)}
              className="flex h-11 min-w-11 items-center justify-center rounded-xl border border-white/15 bg-slate-700 px-3 text-lg font-black shadow transition hover:-translate-y-0.5 hover:bg-slate-600 disabled:cursor-default disabled:opacity-20"
            >
              {letter}
            </button>
          ))}
        </div>

        {hintVisible ? (
          <div className="max-w-2xl rounded-xl border border-amber-400/30 bg-amber-400/10 px-4 py-2 text-center text-sm text-amber-100">
            İpucu: {item.hint}
          </div>
        ) : null}

        <div className="flex flex-wrap items-center justify-center gap-2">
          <button
            type="button"
            onClick={revealOneTile}
            className="min-h-10 rounded-xl border border-amber-400/40 bg-amber-400/10 px-4 text-sm font-bold text-amber-200 hover:bg-amber-400/20"
          >
            Resim İpucu
          </button>
          <button
            type="button"
            onClick={showTextHint}
            className="min-h-10 rounded-xl border border-blue-400/40 bg-blue-400/10 px-4 text-sm font-bold text-blue-200 hover:bg-blue-400/20"
          >
            Kelime İpucu
          </button>
          <button
            type="button"
            onClick={removeLast}
            className="min-h-10 rounded-xl border border-white/15 bg-white/5 px-4 text-sm font-bold hover:bg-white/10"
          >
            Son Harfi Sil
          </button>
          <button
            type="button"
            onClick={clearAnswer}
            className="min-h-10 rounded-xl border border-white/15 bg-white/5 px-4 text-sm font-bold hover:bg-white/10"
          >
            Temizle
          </button>
          <button
            type="button"
            onClick={checkAnswer}
            className="min-h-10 rounded-xl bg-red-600 px-5 text-sm font-black text-white hover:bg-red-700"
          >
            Kontrol Et
          </button>
        </div>
      </section>

      <footer className="shrink-0 border-t border-white/10 bg-slate-900 px-3 py-2">
        <div className="mx-auto flex max-w-5xl flex-wrap items-center justify-between gap-3">
          <label className="flex min-w-fit items-center gap-2 text-xs font-bold text-slate-300">
            Seviye
            <select
              value={level}
              onChange={(event) => setLevelAndRestart(Number(event.target.value))}
              style={{ colorScheme: "dark" }}
              className="min-h-10 min-w-[140px] rounded-xl border border-white/20 bg-slate-800 px-3 text-sm font-bold text-white opacity-100 outline-none focus:border-red-400 focus:ring-2 focus:ring-red-400/20 disabled:opacity-60"
            >
              {LEVELS.map((entry) => (
                <option
                  key={entry.level}
                  value={entry.level}
                  className="bg-slate-900 text-white"
                >
                  {entry.level} · {entry.rows}×{entry.cols}
                </option>
              ))}
            </select>
          </label>

          <div className="text-xs text-slate-400">
            Tur {round} · {config.rows * config.cols} parça · {config.extraLetters} yanıltıcı harf
          </div>

          <button
            type="button"
            onClick={() => startRound(round + 1, level)}
            className="min-h-10 rounded-xl border border-white/15 bg-white/5 px-4 text-sm font-bold hover:bg-white/10"
          >
            Yeni Kelime
          </button>
        </div>
      </footer>
    </main>
  );
}

export default PictureWordPuzzleClient;

