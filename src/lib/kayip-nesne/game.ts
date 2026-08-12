export type KayipNesneDifficulty = "easy" | "medium" | "hard";

export type KayipNesneItem = {
  id: string;
  name: string;
  emoji: string;
  type: "object" | "cat";
  slot: number;
  x: number;
  y: number;
};

export type KayipNesneRound = {
  sceneName: string;
  sceneClass: string;
  items: KayipNesneItem[];
  targetId: string;
  memoryTimeSeconds: number;
};

const OBJECTS = [
  ["sofa", "Koltuk", "🛋️"], ["window", "Pencere", "🪟"], ["bookshelf", "Kitaplık", "📚"],
  ["table", "Masa", "🪑"], ["plant", "Saksı", "🪴"], ["clock", "Saat", "🕒"],
  ["lamp", "Lamba", "💡"], ["cabinet", "Dolap", "🗄️"], ["bench", "Bank", "🪑"],
  ["tree", "Ağaç", "🌳"], ["flower", "Çiçek", "🌻"], ["swing", "Salıncak", "🎠"],
  ["bird", "Kuş", "🐦"], ["dog", "Köpek", "🐶"], ["desk", "Sıra", "🪑"], ["desk2", "İkinci Sıra", "🪑"],
  ["blackboard", "Tahta", "🟩"], ["globe", "Dünya Küresi", "🌍"],
] as const;

const CATS = [
  ["orange", "sarı kedi", "🐱"], ["black", "siyah kedi", "🐈‍⬛"], ["white", "beyaz kedi", "🐱"],
  ["gray", "gri kedi", "🐈"], ["brown", "kahverengi kedi", "🐱"], ["tortie", "piebald kedi", "🐈"],
] as const;

const SCENES = [
  { name: "Çocuk Odası", sceneClass: "kidsRoom", objectIds: ["sofa", "window", "bookshelf", "table", "plant", "clock", "lamp", "cabinet"] },
  { name: "Bahçe", sceneClass: "garden", objectIds: ["table", "plant", "lamp"] },
  { name: "Park", sceneClass: "park", objectIds: ["bench", "tree", "flower", "swing", "bird", "dog"] },
  { name: "Sınıf", sceneClass: "classroom", objectIds: ["desk", "desk2", "blackboard", "clock", "bookshelf", "globe"] },
  { name: "Oturma Odası", sceneClass: "livingRoom", objectIds: ["sofa", "table", "window", "bookshelf", "plant", "clock", "lamp", "cabinet"] },
] as const;

const OBJECT_BY_ID = new Map(OBJECTS.map(([id, name, emoji]) => [id, { id, name, emoji, type: "object" as const }]));
const CAT_BY_ID = new Map(CATS.map(([id, name, emoji]) => [`cat-${id}`, { id: `cat-${id}`, name, emoji, type: "cat" as const }]));

export const KAYIP_NESNE_DIFFICULTIES: ReadonlyArray<{ id: KayipNesneDifficulty; label: string }> = [
  { id: "easy", label: "Kolay" }, { id: "medium", label: "Orta" }, { id: "hard", label: "Zor" },
];

export function getKayipNesneRoundSettings(level: number, difficulty: KayipNesneDifficulty) {
  const safeLevel = Math.max(1, level);
  if (difficulty === "easy") return { itemCount: Math.min(4 + Math.floor((safeLevel - 1) / 2), 7), memoryTimeSeconds: Math.max(4, 8 - Math.floor((safeLevel - 1) / 3)) };
  if (difficulty === "medium") return { itemCount: Math.min(6 + Math.floor((safeLevel - 1) / 2), 9), memoryTimeSeconds: Math.max(3, 6 - Math.floor((safeLevel - 1) / 3)) };
  return { itemCount: Math.min(8 + Math.floor((safeLevel - 1) / 2), 12), memoryTimeSeconds: Math.max(2, 5 - Math.floor((safeLevel - 1) / 3)) };
}

function shuffle<T>(values: readonly T[], random: () => number): T[] {
  const result = [...values];
  for (let index = result.length - 1; index > 0; index -= 1) {
    const swap = Math.floor(random() * (index + 1));
    [result[index], result[swap]] = [result[swap], result[index]];
  }
  return result;
}

export function generateKayipNesnePositions(count: number, random: () => number = Math.random) {
  const cells = Array.from({ length: 15 }, (_, index) => ({ row: Math.floor(index / 5), column: index % 5 }));
  return shuffle(cells, random).slice(0, Math.min(count, cells.length)).map(({ row, column }) => ({
    x: Math.max(3, Math.min(87, 5 + column * (86 / 5) + random() * 4 - 2)),
    y: Math.max(5, Math.min(78, 8 + row * (72 / 3) + random() * 4 - 2)),
  }));
}

export function createKayipNesneRound(level: number, difficulty: KayipNesneDifficulty, random: () => number = Math.random): KayipNesneRound {
  const settings = getKayipNesneRoundSettings(level, difficulty);
  const scene = SCENES[Math.floor(random() * SCENES.length)];
  const candidates = shuffle([
    ...scene.objectIds.map((id) => OBJECT_BY_ID.get(id)).filter((item): item is NonNullable<typeof item> => Boolean(item)),
    ...shuffle([...CAT_BY_ID.values()], random).slice(0, 5),
  ], random);
  const selected = candidates.slice(0, Math.min(settings.itemCount, candidates.length));
  const positions = generateKayipNesnePositions(selected.length, random);
  const items = selected.map((item, index) => ({ ...item, slot: index + 1, ...positions[index] }));
  const target = items[Math.floor(random() * items.length)];
  return { sceneName: scene.name, sceneClass: scene.sceneClass, items, targetId: target.id, memoryTimeSeconds: settings.memoryTimeSeconds };
}

export function calculateKayipNesnePoints(elapsedMs: number, streak: number): number {
  return 100 + Math.max(0, 500 - Math.floor(Math.max(0, elapsedMs) / 12)) + Math.max(0, streak) * 20;
}
