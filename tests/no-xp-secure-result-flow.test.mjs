import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

import { saveExerciseResultSecure } from "../src/lib/results/secureResultStorage.ts";
import {
  exerciseTypeAwardsXp,
  getExerciseXpAward,
  getExerciseXpEventType,
  listNoXpExerciseTypes,
} from "../src/lib/xp/xpPolicy.ts";

/**
 * Urun karari: bu bes tur sonucunu GUVENLI ve sunucu dogrulamali yoldan
 * kaydeder fakat XP KAZANMAZ. Eski akis sonucu anon Supabase client ile
 * dogrudan yaziyor, studentId/studentName'i client payload'undan aliyordu.
 */
const NO_XP_EXERCISES = [
  {
    slug: "adam-asmaca",
    exerciseType: "hangman",
    component: "src/app/egzersizler/adam-asmaca/HangmanExerciseClient.tsx",
  },
  {
    slug: "kelime-tahmin",
    exerciseType: "word-guess",
    component: "src/app/egzersizler/kelime-tahmin/WordGuessExerciseClient.tsx",
  },
  {
    slug: "dikkat-labirenti",
    exerciseType: "attention-maze",
    component: "src/app/egzersizler/dikkat-labirenti/AttentionMazeExerciseClient.tsx",
  },
  {
    slug: "gorsel-puzzle",
    exerciseType: "visual-puzzle",
    component: "src/app/egzersizler/gorsel-puzzle/VisualPuzzleExerciseClient.tsx",
  },
  {
    slug: "odakli-okuma",
    exerciseType: "focused-reading",
    component: "src/app/egzersizler/odakli-okuma/FocusedReadingExerciseClient.tsx",
  },
];

/** XP kazanmaya DEVAM eden turler - regresyon korumasi. */
const XP_EARNING_TYPES = [
  { exerciseType: "reading-comprehension", eventType: "reading_comprehension_completed" },
  { exerciseType: "reading-speed-test", eventType: "reading_speed_test_completed" },
  { exerciseType: "tachistoscope", eventType: "exercise_completed" },
  { exerciseType: "memory-game", eventType: "exercise_completed" },
  { exerciseType: "eye-muscle", eventType: "exercise_completed" },
  { exerciseType: "square-vision", eventType: "exercise_completed" },
];

const ROUTE_PATH = "src/app/api/student/results/route.ts";

async function read(relativePath) {
  return readFile(new URL(`../${relativePath}`, import.meta.url), "utf8");
}

/**
 * Sunucuyu taklit eden fetch. XP politikasini endpoint gibi uygular ve
 * exercise_results / student_xp_events / student_xp_summary'yi bellekte
 * modelleyip yan etkileri gozlemlenebilir kilar.
 */
function createServerStub({ initialTotalXp = 500 } = {}) {
  const db = {
    results: [],
    xpEvents: [],
    summaryTotalXp: initialTotalXp,
  };
  const calls = [];

  const stub = async (url, init) => {
    const body = JSON.parse(init.body);
    calls.push({ url, init, body });

    if (!url.startsWith("/api/student/results")) {
      return { ok: true, status: 200, json: async () => ({}) };
    }

    // Kimlik ASLA istekten alinmaz; oturumdan turetilir.
    assert.equal(body.studentId, undefined, "istek studentId tasimamali");
    assert.equal(body.studentName, undefined, "istek studentName tasimamali");
    const sessionStudentId = "session-student";

    const existing = db.results.find(
      (row) => row.student_id === sessionStudentId && row.submission_key === body.submissionKey,
    );
    const replayed = Boolean(existing);
    const awardsXp = exerciseTypeAwardsXp(body.exerciseType);

    let row = existing;
    if (!row) {
      row = {
        id: `result-${db.results.length + 1}`,
        student_id: sessionStudentId,
        exercise_type: body.exerciseType,
        exercise_title: body.exerciseTitle,
        score: body.score,
        success_rate: body.successRate,
        correct_count: body.correctCount,
        wrong_count: body.wrongCount,
        submission_key: body.submissionKey,
        details: body.details ?? {},
        completed_at: body.completedAt,
      };
      db.results.push(row);

      if (awardsXp) {
        db.xpEvents.push({
          student_id: sessionStudentId,
          idempotency_key: `result:${body.submissionKey}`,
          event_type: getExerciseXpEventType(body.exerciseType),
          xp_amount: 5,
        });
        db.summaryTotalXp += 5;
      }
    }

    const awardedXp = replayed || !awardsXp ? 0 : 5;

    return {
      ok: true,
      status: replayed ? 200 : 201,
      json: async () => ({
        success: true,
        replayed,
        result: {
          id: row.id,
          studentId: row.student_id,
          exerciseType: row.exercise_type,
          exerciseTitle: row.exercise_title,
          score: row.score,
          successRate: row.success_rate,
          correctCount: row.correct_count,
          wrongCount: row.wrong_count,
          durationSeconds: body.durationSeconds,
          date: row.completed_at,
          details: row.details,
        },
        reward: {
          eventType: getExerciseXpEventType(body.exerciseType),
          awardedXp,
          currentTotalXp: db.summaryTotalXp,
          replayed,
          rewardKey: `result:${body.submissionKey}`,
        },
      }),
    };
  };

  stub.calls = calls;
  stub.db = db;
  return stub;
}

async function withFetchStub(stub, run) {
  const original = globalThis.fetch;
  globalThis.fetch = stub;
  try {
    return await run();
  } finally {
    globalThis.fetch = original;
  }
}

function buildInput(exerciseType) {
  return {
    exerciseType,
    exerciseTitle: "Test Egzersizi",
    score: 42,
    successRate: 80,
    correctCount: 4,
    wrongCount: 1,
    durationSeconds: 30,
    details: { category: "Test" },
  };
}

// --- Merkezi politika ---

test("merkezi politika XP vermeyen turleri tam olarak bes tur ile sinirliyor", () => {
  assert.deepEqual(listNoXpExerciseTypes(), [
    "attention-maze",
    "focused-reading",
    "hangman",
    "visual-puzzle",
    "word-guess",
  ]);
});

test("XP vermeyen turler icin getExerciseXpAward 0, event tipi null dondurur", () => {
  for (const { exerciseType } of NO_XP_EXERCISES) {
    assert.equal(exerciseTypeAwardsXp(exerciseType), false, exerciseType);
    assert.equal(getExerciseXpAward(exerciseType), 0, exerciseType);
    assert.equal(getExerciseXpEventType(exerciseType), null, exerciseType);
  }
});

test("REGRESYON: XP veren turlerin politikasi degismedi", () => {
  for (const { exerciseType, eventType } of XP_EARNING_TYPES) {
    assert.equal(exerciseTypeAwardsXp(exerciseType), true, exerciseType);
    assert.equal(getExerciseXpEventType(exerciseType), eventType, exerciseType);
    // Miktar SQL'de merkezi olarak belirlenir; TS ikinci bir kaynak olmamali.
    assert.equal(getExerciseXpAward(exerciseType), null, exerciseType);
  }
});

// --- Egzersiz bazli kayit yolu ---

for (const exercise of NO_XP_EXERCISES) {
  test(`${exercise.slug}: eski anon insert yolunu (saveExerciseResult) KULLANMIYOR`, async () => {
    const source = await read(exercise.component);

    assert.doesNotMatch(source, /\bsaveExerciseResult\b(?!Secure)/);
    assert.doesNotMatch(source, /from "@\/lib\/results\/resultStorage"/);
    assert.match(source, /saveExerciseResultSecure/);
  });

  test(`${exercise.slug}: client payload'inda studentId/studentName YOK`, async () => {
    const source = await read(exercise.component);

    assert.doesNotMatch(source, /studentId:\s*student\?\./);
    assert.doesNotMatch(source, /studentName:\s*student\?\./);
    assert.doesNotMatch(source, /getCurrentStudent/);
  });

  test(`${exercise.slug}: details semasi DETAIL_SCHEMAS icinde tanimli`, async () => {
    const source = await read(ROUTE_PATH);
    const quoted = `"${exercise.exerciseType}": {`;
    const bare = `\n  ${exercise.exerciseType}: {`;

    assert.ok(
      source.includes(quoted) || source.includes(bare),
      `${exercise.exerciseType} semasi yoksa validateDetails 400 doner ve sonuc TAMAMEN kaybolur`,
    );
  });

  test(`${exercise.slug}: sonuc kaydolur, submission_key dolar, XP olusmaz`, async () => {
    const stub = createServerStub();

    const saved = await withFetchStub(stub, () =>
      saveExerciseResultSecure(buildInput(exercise.exerciseType)),
    );

    assert.equal(stub.calls[0].url, "/api/student/results");
    assert.equal(stub.calls[0].init.method, "POST");
    assert.equal(stub.calls[0].init.credentials, "same-origin");
    assert.equal(stub.calls[0].body.exerciseType, exercise.exerciseType);
    assert.ok(stub.calls[0].body.submissionKey, "submission_key dolu olmali");

    assert.equal(stub.db.results.length, 1, "bir sonuc satiri olusmali");
    assert.equal(stub.db.results[0].exercise_type, exercise.exerciseType);
    assert.ok(stub.db.results[0].submission_key);

    assert.equal(stub.db.xpEvents.length, 0, "student_xp_events olusmamali");
    assert.equal(stub.db.summaryTotalXp, 500, "student_xp_summary degismemeli");
    assert.equal(saved.exerciseType, exercise.exerciseType);
  });

  test(`${exercise.slug}: ayni submission key ile retry ikinci satir/XP uretmez`, async () => {
    const stub = createServerStub();
    const input = buildInput(exercise.exerciseType);

    await withFetchStub(stub, async () => {
      await saveExerciseResultSecure(input);
      await saveExerciseResultSecure(input);
    });

    assert.equal(stub.calls.length, 2, "iki istek gonderilmeli");
    assert.equal(
      stub.calls[0].body.submissionKey,
      stub.calls[1].body.submissionKey,
      "retry ayni anahtari tasimali",
    );
    assert.equal(stub.db.results.length, 1, "ikinci sonuc satiri olusmamali");
    assert.equal(stub.db.xpEvents.length, 0);
    assert.equal(stub.db.summaryTotalXp, 500);
  });
}

test("XP vermeyen kayitta reward.awardedXp 0 ve currentTotalXp degismemis toplamdir", async () => {
  const stub = createServerStub({ initialTotalXp: 875 });

  await withFetchStub(stub, () => saveExerciseResultSecure(buildInput("hangman")));

  const payload = await (await stub("/api/student/results", {
    body: JSON.stringify({ ...buildInput("hangman"), submissionKey: "probe-key" }),
  })).json();

  assert.equal(payload.success, true);
  assert.equal(payload.reward.awardedXp, 0);
  assert.equal(payload.reward.eventType, null);
  assert.equal(payload.reward.currentTotalXp, 875, "toplam XP degismemeli");
  assert.equal(stub.db.summaryTotalXp, 875);
});

test("REGRESYON: XP veren egzersizde sonuc + XP event + summary artisi eskisi gibi", async () => {
  const stub = createServerStub({ initialTotalXp: 100 });

  await withFetchStub(stub, () => saveExerciseResultSecure(buildInput("memory-game")));

  assert.equal(stub.db.results.length, 1);
  assert.equal(stub.db.xpEvents.length, 1, "XP event olusmali");
  assert.equal(stub.db.xpEvents[0].event_type, "exercise_completed");
  assert.equal(stub.db.xpEvents[0].xp_amount, 5);
  assert.equal(stub.db.summaryTotalXp, 105, "summary 5 artmali");
});

test("REGRESYON: XP veren egzersizde retry ikinci XP uretmez", async () => {
  const stub = createServerStub({ initialTotalXp: 100 });
  const input = buildInput("memory-game");

  await withFetchStub(stub, async () => {
    await saveExerciseResultSecure(input);
    await saveExerciseResultSecure(input);
  });

  assert.equal(stub.db.results.length, 1);
  assert.equal(stub.db.xpEvents.length, 1);
  assert.equal(stub.db.summaryTotalXp, 105);
});

test("API hatasinda hata firlatilir; sessiz ikinci kayit yolu denenmez", async () => {
  const failing = async () => ({ ok: false, status: 400, json: async () => ({ message: "gecersiz" }) });
  failing.calls = [];

  await assert.rejects(
    () => withFetchStub(failing, () => saveExerciseResultSecure(buildInput("visual-puzzle"))),
    /Sonuç kaydedilemedi/,
  );
});

test("endpoint XP'siz yolda award RPC'sini cagirmaz, XP'li yolda cagirir", async () => {
  const source = await read(ROUTE_PATH);

  assert.match(source, /if \(!exerciseTypeAwardsXp\(body\.exerciseType\)\)/);
  assert.match(source, /recordStudentResultWithoutXp/);
  assert.match(source, /recordStudentResultAndAwardXp/);

  const noXpBranch = stripComments(
    source.slice(
      source.indexOf("if (!exerciseTypeAwardsXp("),
      source.indexOf("const recorded = await recordStudentResultAndAwardXp"),
    ),
  );
  assert.doesNotMatch(noXpBranch, /recordStudentResultAndAwardXp/);
  assert.doesNotMatch(noXpBranch, /award_student_xp_v1/);
});

/** Yorum satirlarini/bloklarini atar; assertion'lar yalniz gercek kodu gormeli. */
function stripComments(source) {
  return source.replace(/\/\*[\s\S]*?\*\//g, "").replace(/^\s*\/\/.*$/gm, "");
}

test("XP'siz kayit yolu anon client kullanmaz ve XP tablolarina YAZMAZ", async () => {
  const code = stripComments(await read("src/lib/results/secureResultRepository.ts"));

  // Anon tarayici client'i (eski yolun kaynagi) hic import edilmemeli.
  assert.doesNotMatch(code, /@\/lib\/supabase\/client/);
  // XP tablolarina/RPC'lerine tek bir erisim bile olmamali.
  assert.doesNotMatch(code, /student_xp_events/);
  assert.doesNotMatch(code, /student_xp_summary/);
  assert.doesNotMatch(code, /award_student_xp/);
  // Es zamanli ikinci gonderim UNIQUE index ile yakalanmali.
  assert.match(code, /23505/);
});
