import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";
import test from "node:test";

/**
 * Hafiza Yarisi SERBEST OYUNDUR.
 *
 * Kelime Yarisi'ndan kritik farki: platformun sonuc/XP/istatistik akisina
 * HIC baglanmaz. Bu testlerin yarisi "su var mi" degil, "su KESINLIKLE yok"
 * dogrulamasidir - entegrasyon ileride yanlislikla sonuc kaydeden bir hale
 * kayarsa burasi kirilir.
 *
 * Ayrica oyunun kendi mantigi (2/3 oyunculu sira rotasyonu, kazanan ve
 * beraberlik hesabi, ses geciti) HTML icinden cikarilip gercekten calistirilarak
 * test edilir.
 */

const ROOT = process.cwd();
const ASSET_RELATIVE = "src/exercise-assets/hafiza-yarisi.html";

const read = (relativePath) => readFile(path.join(ROOT, relativePath), "utf8");

const html = await read(ASSET_RELATIVE);
const gameRoute = await read("src/app/egzersizler/hafiza-yarisi/oyun/route.ts");
const page = await read("src/app/egzersizler/hafiza-yarisi/page.tsx");

/* ---------------- kaynak cikarma yardimcilari ---------------- */

/** `function ad(` ile baslayan blogu suslu parantez dengesine gore keser. */
function extractFunction(source, name) {
  const header = `function ${name}(`;
  const start = source.indexOf(header);
  assert.ok(start >= 0, `fonksiyon bulunamadi: ${name}`);

  let depth = 0;
  for (let i = source.indexOf("{", start); i < source.length; i++) {
    if (source[i] === "{") depth++;
    else if (source[i] === "}") {
      depth--;
      if (depth === 0) return source.slice(start, i + 1);
    }
  }

  throw new Error(`fonksiyon kapanmadi: ${name}`);
}

function extractArrayDeclaration(source, header) {
  const start = source.indexOf(header);
  assert.ok(start >= 0, `bildirim bulunamadi: ${header}`);
  const end = source.indexOf("];", start);
  assert.ok(end > start, `bildirim kapanmadi: ${header}`);
  return source.slice(start, end + 2);
}

/** Oyun mantigini DOM'suz calistirmak icin izole sandbox. */
function createLogicSandbox() {
  const players = extractArrayDeclaration(html, "const PLAYERS = [");
  const functions = [
    "playerAt",
    "playerNameAt",
    "sanitizePlayerName",
    "advanceToNextPlayer",
    "resolveWinners",
    "formatPlayerList",
    "buildWinnerText",
  ]
    .map((name) => extractFunction(html, name))
    .join("\n");

  return new Function(`
    const MAX_NAME_LENGTH = 20;
    ${players}
    let gameState = { playerCount: 2, currentPlayer: 1, scores: [0, 0], playerNames: [] };
    ${functions}
    return {
      setState(next) { gameState = { playerNames: [], ...next }; },
      getCurrentPlayer() { return gameState.currentPlayer; },
      playerNameAt,
      sanitizePlayerName,
      advanceToNextPlayer,
      resolveWinners,
      formatPlayerList,
      buildWinnerText,
    };
  `)();
}

/** Minimal sahte DOM elemani: yalniz kodun kullandigi API'yi tasir. */
function makeFakeElement(state, dataset) {
  return {
    state,
    dataset: dataset ?? {},
    classList: {
      toggle(className, force) {
        state[className] = force;
      },
    },
    setAttribute(key, value) {
      state[key] = value;
    },
  };
}

/** `readPlayerNames` fonksiyonunu sahte input degerleriyle calistirir. */
function readNamesWith(inputValues) {
  const source = [
    extractFunction(html, "sanitizePlayerName"),
    extractFunction(html, "readPlayerNames"),
  ].join("\n");

  const fakeDocument = {
    getElementById(id) {
      const match = /^name-input-(\d)$/.exec(id);
      if (!match) return null;
      const value = inputValues[Number(match[1]) - 1];
      return value === undefined ? null : { value };
    },
  };

  return new Function(
    "document",
    "MAX_NAME_LENGTH",
    `${source}; return readPlayerNames;`,
  )(fakeDocument, 20);
}

/** `setPlayerCount` fonksiyonunu sahte DOM ile calistirir. */
function createPlayerCountSandbox() {
  const fieldStates = { 1: { hidden: false }, 2: { hidden: false }, 3: { hidden: true }, 4: { hidden: true } };
  const buttonStates = { 2: {}, 3: {}, 4: {} };

  const buttons = [2, 3, 4].map((count) =>
    makeFakeElement(buttonStates[count], { players: String(count) }),
  );

  const fakeDocument = {
    querySelectorAll(selector) {
      assert.equal(selector, "#pc-options .pc-btn");
      return buttons;
    },
    getElementById(id) {
      const match = /^name-field-(\d)$/.exec(id);
      return match ? makeFakeElement(fieldStates[Number(match[1])]) : null;
    },
  };

  const setPlayerCount = new Function(
    "document",
    `
    const MIN_PLAYERS = 2;
    const MAX_PLAYERS = 4;
    let selectedPlayerCount = 2;
    ${extractFunction(html, "setPlayerCount")}
    return Object.assign(setPlayerCount, { getSelected: () => selectedPlayerCount });
  `,
  )(fakeDocument);

  return { setPlayerCount, fieldStates, buttonStates };
}

/** Ses gecidini sahte bir AudioContext ile calistiran sandbox. */
function createAudioSandbox() {
  const source = [extractFunction(html, "ensureAudioContext"), extractFunction(html, "playTone")].join("\n");

  const stats = { created: 0, oscillators: 0 };

  function FakeAudioContext() {
    stats.created++;
    this.state = "running";
    this.currentTime = 0;
    this.destination = {};
  }
  FakeAudioContext.prototype.createOscillator = function createOscillator() {
    stats.oscillators++;
    return {
      type: "",
      frequency: { setValueAtTime() {} },
      connect() {},
      start() {},
      stop() {},
    };
  };
  FakeAudioContext.prototype.createGain = function createGain() {
    return {
      gain: { setValueAtTime() {}, exponentialRampToValueAtTime() {} },
      connect() {},
    };
  };
  FakeAudioContext.prototype.resume = function resume() {
    return Promise.resolve();
  };
  FakeAudioContext.prototype.close = function close() {
    return Promise.resolve();
  };

  const api = new Function(
    "window",
    `
    let soundEnabled = true;
    let audioContext = null;
    ${source}
    return {
      setSoundEnabled(value) { soundEnabled = value; audioContext = null; },
      playTone,
      ensureAudioContext,
    };
  `,
  )({ AudioContext: FakeAudioContext });

  return { ...api, stats };
}

/* ---------------- 1-3. asset ve servis route'u ---------------- */

test("asset dosyasi mevcut ve oyun route'u onu servis ediyor", async () => {
  assert.ok(html.includes("<!DOCTYPE html>"), "asset gecerli bir HTML olmali");
  assert.ok(html.length > 10_000, "asset bos/kirpilmis olmamali");

  const { MEMORY_RACE_ASSET_PATH, readMemoryRaceHtml } = await import(
    "../src/lib/memory-race/memoryRaceAsset.ts"
  );

  assert.equal(MEMORY_RACE_ASSET_PATH, path.join(ROOT, ...ASSET_RELATIVE.split("/")));
  assert.equal(await readMemoryRaceHtml(), html);

  assert.match(gameRoute, /readMemoryRaceHtml/);
  assert.match(gameRoute, /export async function GET/);
});

test("oyun route'u guvenli header'larla HTML dondurur", () => {
  assert.match(gameRoute, /"Content-Type": "text\/html; charset=utf-8"/);
  assert.match(gameRoute, /"Cache-Control": "private, no-store"/);
  assert.match(gameRoute, /"X-Content-Type-Options": "nosniff"/);
  assert.match(gameRoute, /"X-Robots-Tag": "noindex, nofollow"/);
});

/* ---------------- 4-5. iframe sandbox ---------------- */

test("iframe allow-scripts kullanir ve allow-same-origin ICERMEZ", () => {
  assert.match(page, /sandbox="allow-scripts"/);
  // Kritik guvenlik siniri: allow-same-origin verilirse iframe ana origin'e
  // erisir; sandbox'in butun anlami kaybolur.
  assert.doesNotMatch(page, /allow-same-origin/);
  assert.match(page, /src=\{GAME_SRC\}/);
  assert.match(page, /\/egzersizler\/hafiza-yarisi\/oyun/);
});

test("sayfa yatay tasma yapmayacak sekilde tam alani doldurur", () => {
  assert.match(page, /overflow-x-hidden/);
  assert.match(page, /w-full flex-1 border-0/);
  assert.match(page, /100dvh/);
});

/* ---------------- 6-8. sonuc kaydi YOK ---------------- */

test("hicbir dosyada sonuc kayit koprusu yok", () => {
  for (const [label, source] of [
    ["asset", html],
    ["oyun route", gameRoute],
    ["sayfa", page],
  ]) {
    assert.doesNotMatch(source, /saveExerciseResultSecure/, `${label}: sonuc kaydi olmamali`);
    assert.doesNotMatch(source, /api\/student\/results/, `${label}: results API cagrisi olmamali`);
    assert.doesNotMatch(source, /submissionKey/, `${label}: submissionKey olmamali`);
    assert.doesNotMatch(source, /successRate/, `${label}: successRate olmamali`);
    assert.doesNotMatch(source, /correctCount|wrongCount/, `${label}: dogru/yanlis sayaci olmamali`);
    assert.doesNotMatch(source, /durationSeconds/, `${label}: sure olcumu olmamali`);
    assert.doesNotMatch(source, /assignmentItemId|educationLaunch|programTaskId/, `${label}: gorev baglantisi olmamali`);
  }
});

test("oyun iframe'i disariya postMessage ATMAZ", () => {
  assert.doesNotMatch(html, /postMessage/);
  assert.doesNotMatch(html, /window\.parent/);
  // Oyun disariya hicbir istek de atmaz.
  assert.doesNotMatch(html, /fetch\(|XMLHttpRequest|navigator\.sendBeacon/);
  assert.doesNotMatch(page, /postMessage|addEventListener\("message"/);
});

test("sayfa client bileseni degil - sonuc kodu bundle'a hic girmez", () => {
  assert.doesNotMatch(page, /"use client"/);
  assert.doesNotMatch(page, /useEducationProgramTaskCompletion/);
});

test("skorlar kalici hicbir yere yazilmaz", () => {
  assert.doesNotMatch(html, /localStorage|sessionStorage|indexedDB|document\.cookie/);
});

/* ---------------- 9-13. katalog ve istatistik sinirlari ---------------- */

test("normal Egzersizler katalogunda 'Akil ve Zeka Oyunlari' grubunda listelenir", async () => {
  const center = await read("src/app/egzersizler/ExercisesCenterClient.tsx");

  assert.match(center, /\/egzersizler\/hafiza-yarisi/);
  assert.match(center, /title: "Hafıza Yarışı"/);
  assert.match(center, /tags: \["Serbest Oyun", "Akıl ve Zeka"\]/);
  assert.match(center, /İki veya üç kişilik eğlenceli hafıza ve eşleştirme oyunu\./);

  const brainGroupStart = center.indexOf('title: "Akıl ve Zeka Oyunları"');
  const nextGroupStart = center.indexOf('title: "Metin Çalışmaları"');
  assert.ok(brainGroupStart >= 0 && nextGroupStart > brainGroupStart);
  assert.ok(
    center.slice(brainGroupStart, nextGroupStart).includes("/egzersizler/hafiza-yarisi"),
    "kart 'Akil ve Zeka Oyunlari' grubunda olmali",
  );
});

test("eski 'Hafiza Teknikleri' kartI kaldirildi ve duplicate kayit yok", async () => {
  const center = await read("src/app/egzersizler/ExercisesCenterClient.tsx");

  const memoryGroupStart = center.indexOf('title: "Hafıza Teknikleri"');
  const assessmentGroupStart = center.indexOf('title: "Ölçme"');
  assert.ok(memoryGroupStart >= 0 && assessmentGroupStart > memoryGroupStart);
  assert.ok(
    !center.slice(memoryGroupStart, assessmentGroupStart).includes("/egzersizler/hafiza-yarisi"),
    "kart artik 'Hafiza Teknikleri' grubunda OLMAMALI",
  );

  // Ayni route repo genelinde tek bir katalog kaydinda gecmeli.
  assert.equal(
    center.split("/egzersizler/hafiza-yarisi").length - 1,
    1,
    "egzersiz merkezinde tek kayit olmali",
  );

});

test("aktif ogrenci katalogu Hafiza Yarisi'ni filtrelerden sonra tam bir kez render eder", async () => {
  const route = "/egzersizler/hafiza-yarisi";
  const slug = "hafiza-yarisi";
  const { PREVIEW_EXERCISE_GROUPS } = await import(
    "../src/components/exercises-preview/exercisePreviewGroups.ts"
  );
  const {
    ASSIGNMENT_EXERCISE_BY_SLUG,
    isExerciseRouteVisibleInStudentCatalog,
    isExerciseVisibleInStudentCatalog,
  } = await import("../src/lib/assignments/exerciseCatalog.ts");

  assert.equal(isExerciseRouteVisibleInStudentCatalog(route), true);
  assert.equal(isExerciseVisibleInStudentCatalog(slug), true);
  assert.equal(ASSIGNMENT_EXERCISE_BY_SLUG.has(slug), false, "serbest oyun odev kataloguna girmemeli");

  const wordGames = PREVIEW_EXERCISE_GROUPS.find((group) => group.id === "word-games");
  const memory = PREVIEW_EXERCISE_GROUPS.find((group) => group.id === "memory");
  assert.ok(wordGames, "word-games grubu render listesinde olmali");
  assert.equal(wordGames.title, "Akıl ve Zeka Oyunları");
  assert.ok(memory, "hafiza grubu render listesinde olmali");
  assert.ok(wordGames.exercises.some((exercise) => exercise.slug === slug && exercise.href === route));
  assert.ok(!memory.exercises.some((exercise) => exercise.slug === slug || exercise.href === route));

  const renderedCards = PREVIEW_EXERCISE_GROUPS.flatMap((group) =>
    group.exercises.filter((exercise) => exercise.slug === slug || exercise.href === route),
  );
  assert.equal(renderedCards.length, 1, "aktif render listesinde tek Hafiza Yarisi karti olmali");
});

test("mevcut Kart Eslestirme egzersizinden AYRI durur", async () => {
  const center = await read("src/app/egzersizler/ExercisesCenterClient.tsx");

  // Iki ayri kart, iki ayri route, iki ayri kategori: "Kart Eslestirme
  // Calismasi" performans calismasi olarak "Hafiza Teknikleri"nde kalir,
  // Hafiza Yarisi "Akil ve Zeka Oyunlari"nda serbest oyundur.
  assert.match(center, /\/egzersizler\/kart-eslestirme/);
  assert.match(center, /"Serbest Oyun"/);

  const memoryGroupStart = center.indexOf('title: "Hafıza Teknikleri"');
  const assessmentGroupStart = center.indexOf('title: "Ölçme"');
  assert.ok(
    center.slice(memoryGroupStart, assessmentGroupStart).includes("/egzersizler/kart-eslestirme"),
    "Kart Eslestirme 'Hafiza Teknikleri' grubunda kalmali",
  );

  // Serbest oyun oldugu wrapper sayfasinda da ogrenciye yaziyor.
  assert.match(page, /Serbest oyun — sonuç kaydedilmez\./);
});

test("Egitim Programi ve odev sistemlerine EKLENMEDI", async () => {
  const { EDUCATION_PROGRAM_EXERCISE_CATALOG } = await import(
    "../src/lib/education-programs/exerciseCatalog.ts"
  );
  const { resolveEducationProgramExerciseRoute } = await import(
    "../src/lib/education-programs/exerciseRouteCatalog.ts"
  );
  const { ASSIGNMENT_EXERCISE_CATALOG } = await import("../src/lib/assignments/exerciseCatalog.ts");
  const { getAssignmentExerciseDefinition } = await import(
    "../src/lib/assignments/assignmentExerciseCatalog.ts"
  );

  assert.equal(
    EDUCATION_PROGRAM_EXERCISE_CATALOG.find((item) => item.slug === "hafiza-yarisi"),
    undefined,
  );
  assert.equal(resolveEducationProgramExerciseRoute("hafiza-yarisi"), null);
  assert.equal(
    ASSIGNMENT_EXERCISE_CATALOG.find((item) => item.slug === "hafiza-yarisi"),
    undefined,
  );
  assert.equal(getAssignmentExerciseDefinition("hafiza-yarisi"), undefined);
});

test("istatistik / sonuc / XP sistemlerine EKLENMEDI", async () => {
  for (const file of [
    "src/lib/results/types.ts",
    "src/lib/results/generalStatistics.ts",
    "src/components/results/ResultSummaryClient.tsx",
    "src/components/dashboard/StudentDashboardClient.tsx",
    "src/components/student-panel-preview/StudentPanelPreview.tsx",
    "src/app/api/ai/student-analysis/route.ts",
    "src/app/api/student/results/route.ts",
    "src/lib/xp/xpPolicy.ts",
  ]) {
    const source = await read(file);
    assert.doesNotMatch(source, /memory-race/, `${file}: memory-race gecmemeli`);
    assert.doesNotMatch(source, /hafiza-yarisi/, `${file}: hafiza-yarisi gecmemeli`);
  }
});

test("results API 'memory-race' turunu tanimiyor - detay semasi yok", async () => {
  const route = await read("src/app/api/student/results/route.ts");
  assert.doesNotMatch(route, /"memory-race"/);

  // Sema olmayan bir tur icin validateDetails null doner ve istek 400 olur;
  // yani ileride yanlislikla gonderilse bile kayit olusmaz.
  assert.match(route, /const schema = DETAIL_SCHEMAS\[exerciseType\];\s*\n\s*if \(!schema\) return null;/);
});

/* ---------------- 14-15. font ve build ---------------- */

test("Google Fonts / harici kaynak istegi YOK", () => {
  assert.doesNotMatch(html, /fonts\.googleapis\.com|fonts\.gstatic\.com/);
  assert.doesNotMatch(html, /@import/);
  assert.doesNotMatch(html, /https?:\/\//, "asset hicbir harici URL icermemeli");

  // Sistem font zinciri devrede.
  assert.match(html, /--font-stack: 'Poppins', system-ui, -apple-system, 'Segoe UI', sans-serif;/);
  assert.match(html, /font-family: var\(--font-stack\)/);
});

test("next.config asset'i serverless bundle'a dahil ediyor", async () => {
  const config = await read("next.config.ts");

  assert.match(
    config,
    /"\/egzersizler\/hafiza-yarisi\/oyun": \["src\/exercise-assets\/hafiza-yarisi\.html"\]/,
  );
  // Kelime Yarisi kayitlari bozulmadi.
  assert.match(config, /"\/egzersizler\/kelime-yarisi\/oyun"/);
  assert.match(config, /"\/preview\/kelime-yarisi\/content"/);
});

/* ---------------- oyun mantigi: oyuncu sayisi ---------------- */

test("menude oyuncu sayisi secimi var, varsayilan 2 ve tek kisilik mod YOK", () => {
  assert.match(html, /Oyuncu Sayısı/);
  assert.match(html, /data-players="2"/);
  assert.match(html, /data-players="3"/);
  assert.match(html, /data-players="4"/);
  assert.doesNotMatch(html, /data-players="1"/);
  assert.match(html, /const MIN_PLAYERS = 2;/);
  assert.match(html, /const MAX_PLAYERS = 4;/);
  assert.match(html, /let selectedPlayerCount = 2;/);
  assert.match(html, /class="pc-btn selected" data-players="2"/);
});

test("state hardcoded iki oyuncudan cikarildi", () => {
  // Skorlar oyuncu sayisina gore dizi olarak kurulur.
  assert.match(html, /scores: new Array\(selectedPlayerCount\)\.fill\(0\)/);
  assert.match(html, /playerCount: selectedPlayerCount/);

  // Eski sabit yapi ve sabit dallanmalar kalmadi.
  assert.doesNotMatch(html, /scores: \{ 1: 0, 2: 0 \}/);
  assert.doesNotMatch(html, /gameState\.currentPlayer === 1 \? 2 : 1/);
  assert.doesNotMatch(html, /getElementById\('p1-points'\)|getElementById\('p2-points'\)/);
});

test("dort oyuncu tanimli ve dorduncu oyuncu sari temayi kullanir", () => {
  assert.match(html, /id: 1, emoji: '🔴', defaultName: 'Oyuncu 1'/);
  assert.match(html, /id: 2, emoji: '🔵', defaultName: 'Oyuncu 2'/);
  assert.match(html, /id: 3, emoji: '🟢', defaultName: 'Oyuncu 3'/);
  assert.match(html, /--accent5: #4ade80;/);
  assert.match(html, /\.player-score\.p3 \{/);
  assert.match(html, /id: 4, emoji: '🟡', defaultName: 'Oyuncu 4'/);
  assert.match(html, /\.player-score\.p4 \{/);
  assert.match(html, /\.name-field\.p4 input:focus/);
});

/* ---------------- oyun mantigi: sira rotasyonu ---------------- */

test("2 oyuncu sira rotasyonu: 1 -> 2 -> 1", () => {
  const game = createLogicSandbox();
  game.setState({ playerCount: 2, currentPlayer: 1, scores: [0, 0] });

  game.advanceToNextPlayer();
  assert.equal(game.getCurrentPlayer(), 2);
  game.advanceToNextPlayer();
  assert.equal(game.getCurrentPlayer(), 1);
});

test("3 oyuncu sira rotasyonu: 1 -> 2 -> 3 -> 1", () => {
  const game = createLogicSandbox();
  game.setState({ playerCount: 3, currentPlayer: 1, scores: [0, 0, 0] });

  for (const expected of [2, 3, 1, 2, 3, 1]) {
    game.advanceToNextPlayer();
    assert.equal(game.getCurrentPlayer(), expected);
  }
});

test("4 oyuncu sira rotasyonu: 1 -> 2 -> 3 -> 4 -> 1", () => {
  const game = createLogicSandbox();
  game.setState({ playerCount: 4, currentPlayer: 1, scores: [0, 0, 0, 0] });

  for (const expected of [2, 3, 4, 1, 2, 3, 4, 1]) {
    game.advanceToNextPlayer();
    assert.equal(game.getCurrentPlayer(), expected);
  }
});

test("dogru eslesmede sira DEGISMEZ, yanlista degisir", () => {
  // Sira degistirme YALNIZ "NO MATCH" dalinda cagrilir.
  const checkMatch = extractFunction(html, "checkMatch");
  const [matchBranch, wrongBranch] = checkMatch.split("// NO MATCH");

  assert.ok(matchBranch.includes("gameState.scores[gameState.currentPlayer - 1]++"));
  assert.ok(!matchBranch.includes("advanceToNextPlayer()"), "dogru eslesmede sira degismemeli");
  assert.ok(wrongBranch.includes("advanceToNextPlayer()"), "yanlista sira degismeli");

  assert.match(html, /gameState\.currentPlayer = \(gameState\.currentPlayer % gameState\.playerCount\) \+ 1;/);
});

/* ---------------- oyun mantigi: kazanan ve beraberlik ---------------- */

test("2 oyuncu kazanan ve beraberlik hesabi", () => {
  const game = createLogicSandbox();

  game.setState({ playerCount: 2, currentPlayer: 1, scores: [5, 3] });
  assert.deepEqual(game.resolveWinners(), { topScore: 5, winners: [1], isDraw: false });
  assert.equal(game.buildWinnerText(game.resolveWinners()), "🏆 🔴 Oyuncu 1 Kazandı!");

  game.setState({ playerCount: 2, currentPlayer: 1, scores: [3, 5] });
  assert.equal(game.buildWinnerText(game.resolveWinners()), "🏆 🔵 Oyuncu 2 Kazandı!");

  game.setState({ playerCount: 2, currentPlayer: 1, scores: [4, 4] });
  const draw = game.resolveWinners();
  assert.equal(draw.isDraw, true);
  assert.deepEqual(draw.winners, [1, 2]);
  assert.equal(game.buildWinnerText(draw), "🤝 Oyuncu 1 ve Oyuncu 2 Berabere!");
});

test("3 oyuncu tek kazanan", () => {
  const game = createLogicSandbox();
  game.setState({ playerCount: 3, currentPlayer: 1, scores: [2, 3, 7] });

  const outcome = game.resolveWinners();
  assert.deepEqual(outcome, { topScore: 7, winners: [3], isDraw: false });
  assert.equal(game.buildWinnerText(outcome), "🏆 🟢 Oyuncu 3 Kazandı!");
});

test("3 oyuncuda iki kisilik beraberlik", () => {
  const game = createLogicSandbox();
  game.setState({ playerCount: 3, currentPlayer: 1, scores: [6, 2, 6] });

  const outcome = game.resolveWinners();
  assert.equal(outcome.isDraw, true);
  assert.deepEqual(outcome.winners, [1, 3]);
  assert.equal(game.buildWinnerText(outcome), "🤝 Oyuncu 1 ve Oyuncu 3 Berabere!");
});

test("3 oyuncuda uclu beraberlik", () => {
  const game = createLogicSandbox();
  game.setState({ playerCount: 3, currentPlayer: 1, scores: [4, 4, 4] });

  const outcome = game.resolveWinners();
  assert.equal(outcome.isDraw, true);
  assert.deepEqual(outcome.winners, [1, 2, 3]);
  assert.equal(
    game.buildWinnerText(outcome),
    "🤝 Oyuncu 1, Oyuncu 2 ve Oyuncu 3 Berabere!",
  );
});

test("kazanan hesabi sabit Oyuncu 1/2 karsilastirmasi ICERMEZ", () => {
  const endGame = extractFunction(html, "endGame");
  assert.ok(!endGame.includes("s1 > s2"), "eski iki oyunculu karsilastirma kalmamali");

  const resolveWinners = extractFunction(html, "resolveWinners");
  assert.ok(resolveWinners.includes("gameState.playerCount"));
});

/* ---------------- oyuncu isimleri ---------------- */

test("menude dort isim input'u var, 3. ve 4. alan varsayilan olarak gizli", () => {
  for (const playerId of [1, 2, 3, 4]) {
    assert.ok(
      html.includes(`id="name-input-${playerId}" maxlength="20" placeholder="Oyuncu ${playerId}"`),
      `Oyuncu ${playerId} input'u placeholder ve 20 karakter siniriyla olmali`,
    );
  }

  // 2 oyuncu varsayilan oldugu icin 3. alan baslangicta gizli.
  assert.match(html, /<div class="name-field p3 hidden" id="name-field-3">/);
  assert.match(html, /<div class="name-field p4 hidden" id="name-field-4">/);
  assert.match(html, /<div class="name-field p1" id="name-field-1">/);
  assert.match(html, /<div class="name-field p2" id="name-field-2">/);
});

test("2, 3 ve 4 oyuncuda isim alanlari dogru gorunur", () => {
  const { setPlayerCount, fieldStates, buttonStates } = createPlayerCountSandbox();

  setPlayerCount(3);
  assert.equal(fieldStates[1].hidden, false);
  assert.equal(fieldStates[2].hidden, false);
  assert.equal(fieldStates[3].hidden, false, "3 oyuncuda ucuncu alan gorunmeli");
  assert.equal(setPlayerCount.getSelected(), 3);
  assert.equal(buttonStates[3].selected, true);

  setPlayerCount(4);
  assert.equal(fieldStates[4].hidden, false, "4 oyuncuda dorduncu alan gorunmeli");
  assert.equal(setPlayerCount.getSelected(), 4);
  assert.equal(buttonStates[4].selected, true);

  // 4 -> 2 donusu: ek alanlar tekrar gizlenir.
  setPlayerCount(2);
  assert.equal(fieldStates[3].hidden, true, "2 oyuncuda ucuncu alan gizlenmeli");
  assert.equal(fieldStates[4].hidden, true, "2 oyuncuda dorduncu alan gizlenmeli");
  assert.equal(setPlayerCount.getSelected(), 2);
  assert.equal(buttonStates[2].selected, true);

  // Gecersiz deger sinirlar icine cekilir; tek kisilik mod olusmaz.
  setPlayerCount(1);
  assert.equal(setPlayerCount.getSelected(), 2);
  setPlayerCount(9);
  assert.equal(setPlayerCount.getSelected(), 4);
});

test("3 -> 2 degisiminde ucuncu oyuncu oyuna DAHIL EDILMEZ", () => {
  // Input'ta ad yazili kalsa bile 2 oyunculu turda yalniz iki ad okunur.
  const readTwo = readNamesWith(["Ayşe", "Mehmet", "Ece"]);
  assert.deepEqual(readTwo(2), ["Ayşe", "Mehmet"]);

  const readThree = readNamesWith(["Ayşe", "Mehmet", "Ece"]);
  assert.deepEqual(readThree(3), ["Ayşe", "Mehmet", "Ece"]);

  const readFour = readNamesWith(["Ayşe", "Mehmet", "Ece", "Duru"]);
  assert.deepEqual(readFour(4), ["Ayşe", "Mehmet", "Ece", "Duru"]);
});

test("4 oyuncu kazanan hesabi tum oyunculari kapsar", () => {
  const game = createLogicSandbox();
  game.setState({ playerCount: 4, currentPlayer: 1, scores: [4, 7, 7, 2] });

  const outcome = game.resolveWinners();
  assert.deepEqual(outcome, { topScore: 7, winners: [2, 3], isDraw: true });
  assert.equal(game.buildWinnerText(outcome), "🤝 Oyuncu 2 ve Oyuncu 3 Berabere!");
});

test("bos isim varsayilana duser, isim zorunlu degil", () => {
  const read = readNamesWith(["", "   ", "Ece"]);
  assert.deepEqual(read(3), [null, null, "Ece"]);

  const game = createLogicSandbox();
  game.setState({ playerCount: 3, currentPlayer: 1, scores: [0, 0, 0], playerNames: [null, null, "Ece"] });

  assert.equal(game.playerNameAt(1), "Oyuncu 1");
  assert.equal(game.playerNameAt(2), "Oyuncu 2");
  assert.equal(game.playerNameAt(3), "Ece");
});

test("isim girdisi temizlenir: trim, bosluk sadelestirme, 20 karakter siniri", () => {
  const game = createLogicSandbox();

  assert.equal(game.sanitizePlayerName("  Ayşe  "), "Ayşe");
  assert.equal(game.sanitizePlayerName("çok    fazla   boşluk"), "çok fazla boşluk");
  assert.equal(game.sanitizePlayerName(""), null);
  assert.equal(game.sanitizePlayerName("     "), null);
  assert.equal(game.sanitizePlayerName(null), null);

  const long = game.sanitizePlayerName("A".repeat(30));
  assert.equal(long.length, 20, "20 karakteri asamaz");

  // Kontrol karakterleri kabul edilmez.
  assert.equal(game.sanitizePlayerName(String.fromCharCode(31, 127, 159)), null);
  assert.equal(
    game.sanitizePlayerName(`sat${String.fromCharCode(10)}ir${String.fromCharCode(0)}kirik`),
    "sat ir kirik",
  );

  // HTML gibi gorunen girdi metin olarak kalir - asla ayristirilmaz.
  assert.equal(game.sanitizePlayerName("<b>x</b>"), "<b>x</b>");
});

test("kullanici girdisi DOM'a innerHTML ile BASILMAZ", () => {
  for (const fnName of ["buildScoreboard", "updateTurnIndicator", "endGame"]) {
    const source = extractFunction(html, fnName);
    assert.ok(!source.includes("innerHTML"), `${fnName} innerHTML kullanmamali`);
    assert.ok(source.includes("textContent"), `${fnName} textContent kullanmali`);
  }

  // Ad uretimi yapan her cagri noktasi textContent'e gider.
  assert.match(html, /name\.textContent = player\.emoji \+ ' ' \+ playerNameAt\(player\.id\)/);
  assert.match(html, /ti\.textContent = 'Sıra: ' \+ player\.emoji \+ ' ' \+ playerNameAt\(player\.id\)/);
  assert.match(html, /row\.textContent = player\.emoji \+ ' ' \+ playerNameAt\(player\.id\) \+ ': '/);
});

test("skor paneli, sira gostergesi ve kazanan ekrani girilen ismi kullanir", () => {
  const game = createLogicSandbox();
  game.setState({
    playerCount: 3,
    currentPlayer: 2,
    scores: [3, 2, 4],
    playerNames: ["Ayşe", "Mehmet", "Ece"],
  });

  assert.equal(game.playerNameAt(1), "Ayşe");
  assert.equal(game.playerNameAt(2), "Mehmet");
  assert.equal(game.playerNameAt(3), "Ece");

  const outcome = game.resolveWinners();
  assert.deepEqual(outcome.winners, [3]);
  assert.equal(game.buildWinnerText(outcome), "🏆 🟢 Ece Kazandı!");
});

test("ikili ve uclu beraberlikte girilen isimler kullanilir", () => {
  const game = createLogicSandbox();

  game.setState({
    playerCount: 3,
    currentPlayer: 1,
    scores: [5, 5, 2],
    playerNames: ["Ayşe", "Mehmet", "Ece"],
  });
  assert.equal(game.buildWinnerText(game.resolveWinners()), "🤝 Ayşe ve Mehmet Berabere!");

  game.setState({
    playerCount: 3,
    currentPlayer: 1,
    scores: [4, 4, 4],
    playerNames: ["Ayşe", "Mehmet", "Ece"],
  });
  assert.equal(
    game.buildWinnerText(game.resolveWinners()),
    "🤝 Ayşe, Mehmet ve Ece Berabere!",
  );

  // Kismi ad girisi: girilmeyenler varsayilana duser.
  game.setState({
    playerCount: 2,
    currentPlayer: 1,
    scores: [3, 3],
    playerNames: ["Ayşe", null],
  });
  assert.equal(game.buildWinnerText(game.resolveWinners()), "🤝 Ayşe ve Oyuncu 2 Berabere!");
});

test("isimler yalniz bellekte tutulur, kalici depolamaya yazilmaz", () => {
  const startGame = extractFunction(html, "startGame");
  assert.ok(startGame.includes("playerNames: readPlayerNames(selectedPlayerCount)"));

  // Zaten dosya genelinde depolama yok; isim ozelligi bunu degistirmedi.
  assert.doesNotMatch(html, /localStorage|sessionStorage|indexedDB|document\.cookie/);
});

test("uzun isimler layout'u bozmaz - ellipsis kurallari var", () => {
  assert.match(html, /white-space: nowrap; overflow: hidden; text-overflow: ellipsis;/);
  assert.match(html, /\.player-score \{ max-width: 220px; \}/);
  assert.match(html, /\.name-fields \{ grid-template-columns: 1fr; width: 95%; \}/);
});

/* ---------------- ses sistemi ---------------- */

test("ses efektleri dogru olaylarda tetikleniyor", () => {
  assert.ok(extractFunction(html, "startGame").includes("playStartSound()"), "oyun basinda start sesi");

  const checkMatch = extractFunction(html, "checkMatch");
  const [matchBranch, wrongBranch] = checkMatch.split("// NO MATCH");
  assert.ok(matchBranch.includes("playMatchSound()"), "dogru eslesmede match sesi");
  assert.ok(wrongBranch.includes("playWrongSound()"), "yanlista wrong sesi");

  const endGame = extractFunction(html, "endGame");
  assert.ok(endGame.includes("playWinnerSound()"), "bitiste winner sesi");
  assert.ok(endGame.includes("playDrawSound()"), "beraberlikte notr bitis sesi");
});

test("yanlis sesi mevcut sira degisimi zamanlamasini bozmaz", () => {
  const checkMatch = extractFunction(html, "checkMatch");
  const wrongBranch = checkMatch.slice(checkMatch.indexOf("// NO MATCH"));

  // Kaynak prototipteki 800ms + 500ms zamanlamasi korunuyor; ses bu zincirin
  // disina yeni bir bekleme eklemiyor.
  assert.ok(wrongBranch.includes("}, 800);"));
  assert.ok(wrongBranch.includes("}, 500);"));
  assert.ok(
    wrongBranch.indexOf("playWrongSound()") < wrongBranch.indexOf("advanceToNextPlayer()"),
    "ses sira degisiminden once calmali",
  );
});

test("harici ses dosyasi veya yeni bagimlilik yok - Web Audio API kullaniliyor", () => {
  assert.doesNotMatch(html, /\.mp3|\.wav|\.ogg|new Audio\(/);
  assert.match(html, /window\.AudioContext \|\| window\.webkitAudioContext/);
});

test("AudioContext yalniz kullanici etkilesiminde acilir, otomatik ses yok", () => {
  // Init blogunda hicbir ses cagrisi olmamali.
  const initBlock = html.slice(html.indexOf("// ===== INIT ====="));
  assert.doesNotMatch(initBlock, /play(Start|Match|Wrong|Winner|Draw)Sound|ensureAudioContext/);

  // resume() promise'i yutuluyor - unhandled rejection olusmaz.
  assert.match(html, /Promise\.resolve\(audioContext\.resume\(\)\)\.catch\(function \(\) \{\}\)/);
  // Desteklenmeyen tarayicida sessizce null doner.
  assert.match(html, /if \(!AudioCtor\) return null;/);
});

test("ses kapaliyken hicbir nota calmaz, tekrar acilinca calar", () => {
  const audio = createAudioSandbox();

  audio.playTone(440, 0, 0.1);
  assert.equal(audio.stats.oscillators, 1, "acikken nota calmali");

  audio.setSoundEnabled(false);
  audio.playTone(440, 0, 0.1);
  audio.playTone(523.25, 0, 0.1);
  assert.equal(audio.stats.oscillators, 1, "kapaliyken hicbir nota calmamali");
  assert.equal(audio.ensureAudioContext(), null, "kapaliyken context acilmamali");

  audio.setSoundEnabled(true);
  audio.playTone(440, 0, 0.1);
  assert.equal(audio.stats.oscillators, 2, "tekrar acilinca calmali");
});

test("ses toggle butonu var, varsayilan acik ve tercih KAYDEDILMEZ", () => {
  assert.match(html, /let soundEnabled = true;/);
  assert.match(html, /id="sound-btn"[^>]*onclick="toggleSound\(\)"/);
  assert.match(html, /🔊 Ses Açık/);
  assert.match(html, /🔇 Ses Kapalı/);

  const toggle = extractFunction(html, "toggleSound");
  assert.ok(toggle.includes("soundEnabled = !soundEnabled"));
  assert.ok(!toggle.includes("localStorage"), "tercih kaydedilmemeli");
});

/* ---------------- prototip davranisi korundu ---------------- */

test("6 seviye, kart sayilari ve emoji temalari korundu", () => {
  for (const [level, cards, pairs] of [
    [1, 16, 8],
    [2, 20, 10],
    [3, 24, 12],
    [4, 32, 16],
    [5, 40, 20],
    [6, 60, 30],
  ]) {
    assert.ok(
      html.includes(`${level}: { cards: ${cards}, pairs: ${pairs}`),
      `seviye ${level} yapilandirmasi korunmali`,
    );
  }

  assert.match(html, /1: \['🐶','🐱'/);
  assert.match(html, /2: \['🍎','🍋'/);
  assert.match(html, /3: \['⚽','🏀'/);
  assert.match(html, /4: \['🦁','🐯'/);
  assert.match(html, /5: \['🌹','🌻'/);

  const levelSixEmojis = html.match(/6: \[([^\]]+)\]/)?.[1]?.split(",") ?? [];
  assert.equal(levelSixEmojis.length, 30, "seviye 6 tam 30 cift sembolu icermeli");
  assert.match(html, /\.card-grid\.count-60/);
});

test("Yeni Oyun, Escape ve sonuc modali davranisi korundu", () => {
  assert.match(html, /onclick="goToMenu\(\)"[^>]*>🔄 Yeni Oyun/);
  assert.match(html, /if \(e\.key === 'Escape'\) goToMenu\(\);/);
  assert.match(html, /id="modal-overlay"/);
  assert.match(html, /function showModal\(\)/);
  // Fisher-Yates karistirma ve dagitim animasyonu duruyor.
  assert.match(html, /Fisher-Yates shuffle/);
  assert.match(html, /card dealing/);
});

test("mobil duzen korundu ve 4 oyuncu paneli tasmayi onluyor", () => {
  assert.match(html, /@media \(max-width: 768px\)/);
  assert.match(html, /overflow-x: hidden/);
  // Mobilde uc skor kutusu esit paylasir, isim kesilmez.
  assert.match(html, /\.player-score \{ padding: 0\.45rem 0\.5rem; flex: 1 1 0; min-width: 0; \}/);
  assert.match(html, /@media \(max-width: 380px\)/);
  assert.match(html, /\.card-grid\.count-60 \{ grid-template-columns: repeat\(8, 1fr\); \}/);
});
