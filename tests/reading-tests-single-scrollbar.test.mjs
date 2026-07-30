import assert from "node:assert/strict";
import { test } from "node:test";
import fs from "node:fs/promises";

const COMPREHENSION_PATH = "src/app/egzersizler/anlama-testi/ReadingComprehensionTestClient.tsx";
const SPEED_PATH = "src/app/egzersizler/okuma-hizi-testi/ReadingSpeedTestClient.tsx";
const GLOBALS_PATH = "src/app/globals.css";
const COMPREHENSION_CSS = "src/components/exercises/reading-comprehension-theme.module.css";
const SPEED_CSS = "src/components/exercises/reading-speed-test-theme.module.css";

async function read(path) {
  return fs.readFile(path, "utf8");
}

/**
 * Okuma fazindaki gercek container zincirini kaynaktan cikarir.
 * Exact string eslesmesi yerine ANLAMSAL ozellikler dogrulanir; sinif
 * sirasi veya bicimlendirme degisse de test gecerli kalir.
 */
function extractReadingChain(source) {
  // 1) Sahne karti: reading fazinin stageClassName'i (footer={readingFooter}
  //    ile eslesen blok)
  const stageMatch = source.match(
    /stageClassName="([^"]*)"\s*\n\s*footer=\{readingFooter\}/,
  );

  // 2) Hikaye metnini saran div ve <article>
  const wrapperMatch = source.match(
    /<div className="(relative[^"]*)">\s*\n\s*<article/,
  );
  const articleMatch = source.match(
    /<article\s*\n\s*className=\{`([^`]*)`/,
  );

  return {
    stage: stageMatch?.[1] ?? null,
    wrapper: wrapperMatch?.[1] ?? null,
    article: articleMatch?.[1] ?? null,
  };
}

const VERTICAL_SCROLL_CLASS = /\b(overflow-y-auto|overflow-y-scroll|overflow-auto|overflow-scroll)\b/;
const FIXED_VH_HEIGHT = /\b(?:md:|lg:|sm:|xl:)?(?:h|max-h|min-h)-\[\d+(?:\.\d+)?(?:vh|dvh)\]/;

function countVerticalScrollContainers(classNames) {
  return classNames.filter((value) => value && VERTICAL_SCROLL_CLASS.test(value)).length;
}

// --- Kok neden: global .exercise-stage-fit --------------------------------

test("kok neden korunuyor: .exercise-stage-fit hala overflow:auto (dis scroll kaynagi)", async () => {
  const globals = await read(GLOBALS_PATH);
  const block = globals.match(/\.exercise-stage-fit\s*\{[^}]*\}/)?.[0];

  assert.ok(block, ".exercise-stage-fit tanimi bulunmali");
  assert.match(block, /overflow:\s*auto/);
  assert.match(block, /height:\s*100%/);
  // Bu global ~20 egzersiz tarafindan paylasildigi icin BILINCLI olarak
  // degistirilmedi. Duzeltme, icerigin karti hic asmamasini saglayarak
  // overflow:auto'nun scrollbar cizmesini engeller.
});

// --- Her iki ekran icin ortak yapisal invaryant ---------------------------

for (const [label, path] of [
  ["Anlama Testi", COMPREHENSION_PATH],
  ["Okuma Hızı Testi", SPEED_PATH],
]) {
  test(`${label}: okuma fazinda tam olarak TEK dikey scroll container var`, async () => {
    const chain = extractReadingChain(await read(path));

    assert.ok(chain.stage, "stageClassName cikarilabilmeli");
    assert.ok(chain.wrapper, "sarmalayici div cikarilabilmeli");
    assert.ok(chain.article, "article className cikarilabilmeli");

    // Sahne karti ve sarmalayici scroll URETMEMELI
    assert.doesNotMatch(chain.stage, VERTICAL_SCROLL_CLASS, "sahne karti scroll uretmemeli");
    assert.doesNotMatch(chain.wrapper, VERTICAL_SCROLL_CLASS, "sarmalayici scroll uretmemeli");

    // Yalniz article scroll etmeli
    assert.match(chain.article, /\boverflow-y-auto\b/, "hikaye metni tek scroll container olmali");

    assert.equal(
      countVerticalScrollContainers([chain.stage, chain.wrapper, chain.article]),
      1,
      "dikey eksende birden fazla scroll container olmamali",
    );
  });

  test(`${label}: hikaye alaninda sabit vh yuksekligi KALMADI`, async () => {
    const chain = extractReadingChain(await read(path));

    // Asil hata buydu: h-[62vh]/md:h-[66vh] karttan bagimsiz sabit yukseklik
    // olusturup karti tasiriyordu.
    assert.doesNotMatch(chain.article, FIXED_VH_HEIGHT, "article sabit vh yuksekligi almamali");
    assert.doesNotMatch(chain.wrapper, FIXED_VH_HEIGHT, "sarmalayici sabit vh yuksekligi almamali");
    assert.doesNotMatch(chain.article, /\bh-\[62vh\]|\bmd:h-\[66vh\]/);
  });

  test(`${label}: yukseklik zinciri flex-1 + min-h-0 ile kuruluyor`, async () => {
    const chain = extractReadingChain(await read(path));

    for (const [name, value] of [["sarmalayici", chain.wrapper], ["article", chain.article]]) {
      assert.match(value, /\bflex-1\b/, `${name} flex-1 almali`);
      assert.match(value, /\bmin-h-0\b/, `${name} min-h-0 almali (flex child kuculebilmeli)`);
    }

    // Sahne karti flex kolon olmali ki flex-1 cocuk calissin
    assert.match(chain.stage, /\bflex\b/);
    assert.match(chain.stage, /\bflex-col\b/);
    assert.match(chain.wrapper, /\bflex-col\b/);
  });

  test(`${label}: hikaye alani overscroll-contain kullaniyor`, async () => {
    const chain = extractReadingChain(await read(path));
    assert.match(chain.article, /\boverscroll-contain\b/);
  });

  test(`${label}: article'da min-h/max-h ile flex-1 cakismasi yok`, async () => {
    const chain = extractReadingChain(await read(path));
    assert.doesNotMatch(chain.article, /\bmax-h-\[/, "flex-1 ile max-height birlikte kullanilmamali");
    assert.doesNotMatch(chain.article, /\bh-full\b/, "flex-1 varken h-full gereksiz cakisma yaratir");
  });
}

// --- Anlama Testi'ne ozel: soru ekrani ------------------------------------

test("Anlama Testi: soru ekrani da tek scroll container kuralina uyuyor", async () => {
  const source = await read(COMPREHENSION_PATH);
  const questionsScroller = source.match(/<div className="(w-full min-h-0 flex-1[^"]*)">\s*\n\s*\{selectedText\.questions\.length === 0/);

  assert.ok(questionsScroller, "soru listesi scroll container'i bulunmali");
  const value = questionsScroller[1];

  assert.match(value, /\boverflow-y-auto\b/);
  assert.match(value, /\bflex-1\b/);
  assert.match(value, /\bmin-h-0\b/);
  // Eski sabit yukseklik kaldirildi
  assert.doesNotMatch(value, FIXED_VH_HEIGHT);
  assert.doesNotMatch(source, /max-h-\[66vh\]/);
});

// --- Davranisin korundugu (regresyon) -------------------------------------

test("Anlama Testi: timer, font, durdur/devam, Sorulara Gec ve sonuc akisi korunuyor", async () => {
  const source = await read(COMPREHENSION_PATH);

  assert.match(source, /setElapsedSeconds\(\(prev\) => prev \+ 1\)/);
  assert.match(source, /setTotalPausedSeconds\(\(prev\) => prev \+ 1\)/);
  assert.match(source, /const \[fontSize, setFontSize\] = useState<FontSizePx>\(18\)/);
  assert.match(source, /const handlePauseReading = \(\) => \{/);
  assert.match(source, /const handleResumeReading = \(\) => \{/);
  assert.match(source, /const handleGoToQuestions = \(\) => \{/);
  assert.match(source, /Sorulara Gec/);
  assert.match(source, /const handleFinishTest = \(\) => \{/);
  assert.match(source, /exerciseType: "reading-comprehension"/);
  assert.match(source, /saveExerciseResultSecure/);
  assert.match(source, /useEducationProgramTaskCompletion/);
  // Font hala inline style ile uygulaniyor (layout degisikligi bunu bozmadi)
  assert.match(source, /style=\{\{ fontSize: `\$\{fontSize\}px`, lineHeight: 1\.75 \}\}/);
});

test("Okuma Hızı Testi: timer, hiz olcumu, font ve sonuc akisi korunuyor", async () => {
  const source = await read(SPEED_PATH);

  assert.match(source, /calculateReadingSpeed/);
  assert.match(source, /saveExerciseResultSecure/);
  assert.match(source, /useEducationProgramTaskCompletion/);
  assert.match(source, /style=\{\{ fontSize: `\$\{fontSize\}px`, lineHeight: 1\.75 \}\}/);
  assert.match(source, /exerciseType: "reading-speed-test"/);
});

test("duraklatma overlay'i hikaye alaninin uzerinde konumlanmaya devam ediyor", async () => {
  for (const path of [COMPREHENSION_PATH, SPEED_PATH]) {
    const source = await read(path);
    // absolute inset-0 overlay, relative sarmalayiciya gore konumlanir
    assert.match(source, /className=\{`absolute inset-0 flex items-center justify-center rounded-2xl bg-white\/65/);
    const chain = extractReadingChain(source);
    assert.match(chain.wrapper, /\brelative\b/, "overlay icin sarmalayici relative kalmali");
  }
});

// --- Scrollbar gorunumu ----------------------------------------------------

test("scrollbar-gutter:stable eklendi ve tema padding'i ezilmedi", async () => {
  for (const path of [COMPREHENSION_CSS, SPEED_CSS]) {
    const css = await read(path);
    const block = css.match(/\.readingArticle\s*\{\s*scrollbar-gutter:\s*stable;\s*\}/);
    assert.ok(block, `${path} icinde scrollbar-gutter:stable olmali`);
    // Tailwind px-4/md:px-7 ezilmemeli (CSS module unlayered oldugu icin
    // buraya padding yazmak tasarimi bozardi)
    assert.doesNotMatch(block[0], /padding-right/);
  }
});

test("tema renkleri ve mevcut scrollbar stilleri korunuyor", async () => {
  const css = await read(COMPREHENSION_CSS);
  assert.match(css, /\.darkTheme \.readingArticle/);
  assert.match(css, /\.lightTheme \.readingArticle/);
});
