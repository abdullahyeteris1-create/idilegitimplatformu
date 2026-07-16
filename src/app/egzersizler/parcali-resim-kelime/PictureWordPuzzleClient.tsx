"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { FixedExerciseStage, FixedExerciseStat } from "@/components/exercises/FixedExerciseStage";

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
  { id: "sun", word: "GÜNEŞ", emoji: "☀️", hint: "Gündüz gökyüzünü aydınlatır.", color: "#fef3c7" },
  { id: "bear", word: "AYI", emoji: "🐻", hint: "Balı seven güçlü bir orman hayvanıdır.", color: "#fed7aa" },
  { id: "ball", word: "TOP", emoji: "⚽", hint: "Birçok oyunda ayakla veya elle kullanılır.", color: "#dcfce7" },
  { id: "banana", word: "MUZ", emoji: "🍌", hint: "Sarı kabuklu uzun bir meyvedir.", color: "#fef9c3" },
  { id: "pear", word: "ARMUT", emoji: "🍐", hint: "Alt kısmı geniş, yeşil olabilen bir meyvedir.", color: "#ecfccb" },
  { id: "dog", word: "KÖPEK", emoji: "🐕", hint: "Havlayan sadık bir evcil hayvandır.", color: "#ffedd5" },
  { id: "bird", word: "KUŞ", emoji: "🐦", hint: "Kanatlarıyla uçabilen bir hayvandır.", color: "#e0f2fe" },
  { id: "tree", word: "AĞAÇ", emoji: "🌳", hint: "Gövdesi, dalları ve yaprakları vardır.", color: "#dcfce7" },
  { id: "ship", word: "GEMİ", emoji: "🚢", hint: "Denizlerde yolcu veya yük taşır.", color: "#cffafe" },
  { id: "bus", word: "OTOBÜS", emoji: "🚌", hint: "Çok sayıda yolcuyu karayolunda taşır.", color: "#fef3c7" },
  { id: "bicycle", word: "BİSİKLET", emoji: "🚲", hint: "İki tekerlekli, pedalla kullanılan taşıttır.", color: "#dbeafe" },
  { id: "umbrella", word: "ŞEMSİYE", emoji: "☂️", hint: "Yağmurdan korunmak için açılır.", color: "#ede9fe" },
  { id: "key", word: "ANAHTAR", emoji: "🔑", hint: "Kilitleri açmak için kullanılır.", color: "#fef9c3" },
  { id: "bag", word: "ÇANTA", emoji: "🎒", hint: "Eşyaları taşımaya yarar.", color: "#fee2e2" },
  { id: "pencil", word: "KALEM", emoji: "✏️", hint: "Yazı yazmak ve çizim yapmak için kullanılır.", color: "#fef3c7" },
  { id: "scissors", word: "MAKAS", emoji: "✂️", hint: "Kâğıt gibi şeyleri kesmeye yarar.", color: "#e0f2fe" },
  { id: "cake", word: "PASTA", emoji: "🎂", hint: "Doğum günlerinde mumlarla süslenebilir.", color: "#fce7f3" },
  { id: "rocket", word: "ROKET", emoji: "🚀", hint: "Uzaya gitmek için kullanılan araçtır.", color: "#e0e7ff" },
];

const LEVELS: LevelConfig[] = [
  { level: 1, rows: 2, cols: 2, extraLetters: 2, revealCount: 1 },
  { level: 2, rows: 2, cols: 3, extraLetters: 3, revealCount: 1 },
  { level: 3, rows: 3, cols: 3, extraLetters: 4, revealCount: 2 },
  { level: 4, rows: 3, cols: 4, extraLetters: 5, revealCount: 2 },
  { level: 5, rows: 4, cols: 4, extraLetters: 6, revealCount: 3 },
  { level: 6, rows: 4, cols: 5, extraLetters: 7, revealCount: 3 },
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
  return { row: Math.floor(index / cols), col: index % cols };
}

function manhattanDistance(firstIndex: number, secondIndex: number, cols: number) {
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
    const closestDistance = Math.abs(closest.row - centerRow) + Math.abs(closest.col - centerCol);
    const candidateDistance = Math.abs(candidate.row - centerRow) + Math.abs(candidate.col - centerCol);
    return candidateDistance < closestDistance ? candidateIndex : closestIndex;
  });
  const order = [firstIndex];
  remaining.splice(remaining.indexOf(firstIndex), 1);

  while (remaining.length > 0) {
    const nextIndex = remaining.reduce((bestIndex, candidateIndex) => {
      const bestDistance = Math.min(
        ...order.map((openIndex) => manhattanDistance(bestIndex, openIndex, cols)),
      );
      const candidateDistance = Math.min(
        ...order.map((openIndex) => manhattanDistance(candidateIndex, openIndex, cols)),
      );
      return candidateDistance > bestDistance ? candidateIndex : bestIndex;
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
  const [isTransitioning, setIsTransitioning] = useState(false);
  const answerRef = useRef<string[]>([]);
  const answerLetterIndicesRef = useRef<number[]>([]);
  const roundLockedRef = useRef(false);
  const transitionTimeoutRef = useRef<number | null>(null);

  const config = LEVELS[level - 1];
  const totalTiles = config.rows * config.cols;

  useEffect(() => {
    return () => {
      if (transitionTimeoutRef.current !== null) {
        window.clearTimeout(transitionTimeoutRef.current);
      }
    };
  }, []);

  const startRound = (nextRound = round + 1, requestedLevel = level) => {
    if (transitionTimeoutRef.current !== null) {
      window.clearTimeout(transitionTimeoutRef.current);
      transitionTimeoutRef.current = null;
    }

    const cfg = LEVELS[requestedLevel - 1];
    const candidates = ITEMS.filter((candidate) => candidate.id !== item.id);
    const nextItem = shuffle(candidates)[0] ?? ITEMS[0];
    const wordLetters = nextItem.word.split("");
    const extras = shuffle(
      TURKISH_LETTERS.filter((letter) => !wordLetters.includes(letter)),
    ).slice(0, cfg.extraLetters);
    const initiallyRevealed = new Set(
      getSpreadRevealOrder(cfg.rows, cfg.cols).slice(0, cfg.revealCount),
    );

    answerRef.current = [];
    answerLetterIndicesRef.current = [];
    roundLockedRef.current = false;
    setItem(nextItem);
    setLetters(shuffle([...wordLetters, ...extras]));
    setAnswer([]);
    setAnswerLetterIndices([]);
    setRevealedTiles(initiallyRevealed);
    setHintVisible(false);
    setMessage("Parçalı görsele bak ve kelimeyi bul.");
    setRound(nextRound);
    setIsTransitioning(false);
  };

  const answerText = answer.join("");
  const remainingLetters = useMemo(
    () =>
      letters.map((letter, index) => ({
        letter,
        index,
        used: answerLetterIndices.includes(index),
      })),
    [answerLetterIndices, letters],
  );

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
      roundLockedRef.current ||
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
    if (roundLockedRef.current) return;
    const nextAnswer = answerRef.current.slice(0, -1);
    const nextIndices = answerLetterIndicesRef.current.slice(0, -1);
    answerRef.current = nextAnswer;
    answerLetterIndicesRef.current = nextIndices;
    setAnswer(nextAnswer);
    setAnswerLetterIndices(nextIndices);
    setMessage("");
  };

  const clearAnswer = () => {
    if (roundLockedRef.current) return;
    answerRef.current = [];
    answerLetterIndicesRef.current = [];
    setAnswer([]);
    setAnswerLetterIndices([]);
    setMessage("");
  };

  const revealOneTile = () => {
    if (roundLockedRef.current) return;
    if (revealedTiles.size >= totalTiles) {
      setHintVisible(true);
      setMessage(item.hint);
      return;
    }
    revealNextTile();
    setMessage("Bir resim parçası daha açıldı.");
  };

  const checkAnswer = () => {
    if (roundLockedRef.current) return;
    if (answerText.length !== item.word.length) {
      setMessage("Önce bütün harf kutularını doldur.");
      return;
    }

    if (answerText === item.word) {
      roundLockedRef.current = true;
      setIsTransitioning(true);
      const nextCorrect = correct + 1;
      setCorrect(nextCorrect);
      setRevealedTiles(new Set(Array.from({ length: totalTiles }, (_, index) => index)));
      setMessage(`Doğru! ${item.word} bulundu. Sıradaki görsele geçiliyor…`);

      let nextLevel = level;
      if (nextCorrect % 5 === 0 && level < LEVELS.length) {
        nextLevel = level + 1;
        setLevel(nextLevel);
      }

      transitionTimeoutRef.current = window.setTimeout(() => {
        transitionTimeoutRef.current = null;
        startRound(round + 1, nextLevel);
      }, 1100);
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
      <FixedExerciseStage
        title="Parçalı Resim Kelime"
        subtitle="Hazırlık modu"
        onExit={() => router.push("/egzersizler")}
        bottomSettings={(
          <label className="grid gap-1 text-sm font-bold text-slate-700">
            <span>Başlangıç Seviyesi</span>
            <select value={level} onChange={(event) => setLevel(Number(event.target.value))} className="min-h-11 rounded-xl border border-slate-300 bg-white px-3" aria-label="Başlangıç seviyesini seç">
              {LEVELS.map((entry) => <option key={entry.level} value={entry.level}>{entry.level}. Seviye · {entry.rows}×{entry.cols} parça</option>)}
            </select>
          </label>
        )}
        controls={(
          <button type="button" onClick={() => { setStarted(true); startRound(1, level); }} className="mx-auto block min-h-12 w-full max-w-md rounded-2xl bg-red-600 px-5 font-black text-white transition hover:bg-red-700 active:scale-[0.99]">
            Çalışmayı Başlat
          </button>
        )}
      >
        <section className="max-h-full w-full max-w-5xl overflow-auto rounded-3xl border border-red-100 bg-white p-5 shadow-xl shadow-red-100/40 md:p-8">
          <p className="text-xs font-black uppercase tracking-[0.22em] text-red-600">
            Görsel Kelime Bulmaca
          </p>
          <h1 className="mt-2 text-3xl font-black text-slate-950">
            Parçalı Resimden Kelimeyi Bul
          </h1>
          <p className="mt-3 max-w-3xl text-sm leading-6 text-slate-600">
            Birbirinden uzak açılan resim parçalarını incele, harfleri doğru sıraya
            koy ve kelimeyi bul. Havuzda {ITEMS.length} farklı görsel bulunuyor.
          </p>

          <div className="mt-6 grid gap-4 md:grid-cols-2">
            <article className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
              <p className="text-xs font-bold uppercase tracking-wider text-slate-600">Seviye Sistemi</p>
              <p className="mt-2 text-sm leading-6 text-slate-700">
                Her 5 doğru cevapta otomatik olarak bir üst seviyeye geçilir.
              </p>
            </article>

            <article className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
              <p className="text-xs font-bold uppercase tracking-wider text-slate-600">Görsel Havuzu</p>
              <p className="mt-2 text-sm leading-6 text-slate-700">
                Hayvan, eşya, meyve, doğa ve taşıtlardan {ITEMS.length} farklı kelime.
              </p>
            </article>
          </div>

        </section>
      </FixedExerciseStage>
    );
  }

  return (
    <FixedExerciseStage
      title="Parçalı Resim Kelime"
      subtitle={`Tur ${round} · ${totalTiles} parça`}
      onExit={() => router.push("/egzersizler")}
      topStats={<><FixedExerciseStat label="Seviye" value={level} tone="brand" /><FixedExerciseStat label="Doğru" value={correct} tone="ok" /><FixedExerciseStat label="Yanlış" value={wrong} tone="bad" /><FixedExerciseStat label="Tur" value={round} /></>}
      bottomSettings={(
        <label className="grid gap-2 text-sm font-bold text-slate-700">
          <span>Seviye</span>
          <select value={level} disabled={isTransitioning} onChange={(event) => setLevelAndRestart(Number(event.target.value))} className="min-h-11 rounded-xl border border-slate-300 bg-white px-3" aria-label="Oyun seviyesini seç">
            {LEVELS.map((entry) => <option key={entry.level} value={entry.level}>{entry.level}. Seviye · {entry.rows}×{entry.cols}</option>)}
          </select>
        </label>
      )}
      controls={<button type="button" onClick={() => startRound(round + 1, level)} className="mx-auto block min-h-11 rounded-xl bg-slate-900 px-5 text-sm font-bold text-white">Yeni Kelime</button>}
    >
    <main className="flex h-full min-h-0 min-w-0 max-w-full flex-col overflow-hidden bg-slate-950 text-white">
      <section className="flex min-h-0 flex-1 flex-col items-center justify-center gap-3 overflow-auto px-3 py-3 md:px-6">
        <div className="w-full max-w-3xl text-center">
          <p className="min-h-5 text-sm font-semibold text-slate-200" aria-live="polite">{message}</p>
        </div>

        <div
          className="grid max-h-[62dvh] max-w-full overflow-hidden rounded-2xl border-4 border-amber-500 bg-white shadow-2xl shadow-black/40"
          style={{
            width: `min(90vw, calc(62dvh * ${config.cols} / ${config.rows}), 560px)`,
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
              <div
                key={`${item.id}-tile-${index}`}
                className="relative min-h-0 min-w-0 overflow-hidden border border-amber-400/80 bg-slate-100"
                aria-label={`Resim parçası ${index + 1} ${revealed ? "açık" : "kapalı"}`}
              >
                <span
                  className={`absolute inset-0 block transition duration-300 ${
                    revealed ? "filter-none" : "brightness-50 saturate-50"
                  }`}
                  style={tileStyle(item.emoji, item.color, row, col, config.rows, config.cols)}
                />
                {!revealed ? (
                  <span className="absolute inset-0 flex items-center justify-center bg-slate-900/80 text-2xl font-extrabold text-white/80 backdrop-blur-[1px] drop-shadow-sm md:text-3xl">
                    ?
                  </span>
                ) : null}
              </div>
            );
          })}
        </div>

        <div className="flex min-h-11 flex-wrap items-center justify-center gap-2">
          {Array.from({ length: item.word.length }, (_, index) => (
            <div
              key={`answer-${index}`}
              className={`flex h-11 min-w-10 items-center justify-center rounded-xl border px-2 text-lg font-black ${
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
              disabled={used || isTransitioning}
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
          <button type="button" disabled={isTransitioning} onClick={revealOneTile} className="min-h-10 rounded-xl border border-amber-400/40 bg-amber-400/10 px-4 text-sm font-bold text-amber-200 hover:bg-amber-400/20 disabled:opacity-50">Resim İpucu</button>
          <button type="button" disabled={isTransitioning} onClick={() => { setHintVisible(true); setMessage(item.hint); }} className="min-h-10 rounded-xl border border-blue-400/40 bg-blue-400/10 px-4 text-sm font-bold text-blue-200 hover:bg-blue-400/20 disabled:opacity-50">Kelime İpucu</button>
          <button type="button" disabled={isTransitioning} onClick={removeLast} className="min-h-10 rounded-xl border border-white/15 bg-white/5 px-4 text-sm font-bold hover:bg-white/10 disabled:opacity-50">Son Harfi Sil</button>
          <button type="button" disabled={isTransitioning} onClick={clearAnswer} className="min-h-10 rounded-xl border border-white/15 bg-white/5 px-4 text-sm font-bold hover:bg-white/10 disabled:opacity-50">Temizle</button>
          <button type="button" disabled={isTransitioning} onClick={checkAnswer} className="min-h-10 rounded-xl bg-red-600 px-5 text-sm font-black text-white hover:bg-red-700 disabled:opacity-60">Kontrol Et</button>
        </div>
      </section>

    </main>
    </FixedExerciseStage>
  );
}

export default PictureWordPuzzleClient;
