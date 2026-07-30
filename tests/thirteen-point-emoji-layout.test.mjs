import assert from "node:assert/strict";
import { test } from "node:test";
import fs from "node:fs/promises";

import {
  EMOJI_MAX_SIZE_PX,
  EMOJI_MIN_SIZE_PX,
  resolveEmojiFontSizePx,
  resolveEmojiPickerPlacement,
  resolveEmojiPickerWidth,
  resolveEmojiSizePx,
  resolveSafeTargetPosition,
  TARGET_SAFE_PADDING_PX,
} from "../src/lib/exercise-engine/thirteenPointEmojiLayout.ts";
import { THIRTEEN_POINT_POSITIONS } from "../src/lib/exercise-engine/thirteenPointEmojiTracking.ts";

const CLIENT_PATH = "src/app/egzersizler/13-nokta-emoji-takip/ThirteenPointEmojiTrackingClient.tsx";

async function readClient() {
  return fs.readFile(CLIENT_PATH, "utf8");
}

function makeTriggerRect({ top, left, width = 160, height = 44 }) {
  return { top, left, width, height, bottom: top + height };
}

// --- Emoji boyutu (gercek davranis) ---------------------------------------

test("emoji boyutu container kisa kenarina gore olceklenir ve sinirlar icinde kalir", () => {
  // mobil ~390px ekran, dar calisma alani
  const mobile = resolveEmojiSizePx(342, 400);
  assert.ok(mobile >= EMOJI_MIN_SIZE_PX && mobile <= EMOJI_MAX_SIZE_PX);
  assert.ok(mobile >= 28 && mobile <= 36, `mobil emoji boyutu 28-36 araliginda olmali, alinan: ${mobile}`);

  // tablet ~768px
  const tablet = resolveEmojiSizePx(720, 430);
  assert.ok(tablet >= 34 && tablet <= 42, `tablet emoji boyutu 34-42 araliginda olmali, alinan: ${tablet}`);

  // masaustu 1440px -> sahne max 1280px
  const desktop = resolveEmojiSizePx(1180, 520);
  assert.ok(desktop >= 38 && desktop <= 48, `masaustu emoji boyutu 38-48 araliginda olmali, alinan: ${desktop}`);
});

test("emoji boyutu olculmemis container icin guvenli minimuma duser", () => {
  assert.equal(resolveEmojiSizePx(0, 0), EMOJI_MIN_SIZE_PX);
  assert.equal(resolveEmojiSizePx(Number.NaN, 500), EMOJI_MIN_SIZE_PX);
  assert.equal(resolveEmojiSizePx(-100, -100), EMOJI_MIN_SIZE_PX);
});

test("emoji font boyutu kutu boyutundan kucuktur (glif kutuyu tasmasin)", () => {
  const size = resolveEmojiSizePx(1180, 520);
  assert.ok(resolveEmojiFontSizePx(size) < size);
});

// --- Guvenli koordinat eslemesi (asil tasma duzeltmesi) -------------------

const CONTAINER_CASES = [
  { name: "mobil 390px", width: 342, height: 380 },
  { name: "mobil yatay", width: 700, height: 260 },
  { name: "tablet 768px", width: 720, height: 430 },
  { name: "masaustu 1024px", width: 950, height: 470 },
  { name: "masaustu 1440px", width: 1180, height: 520 },
];

test("13 noktanin HICBIRI hicbir container olcusunde container disina tasmaz", () => {
  for (const container of CONTAINER_CASES) {
    const emojiSize = resolveEmojiSizePx(container.width, container.height);
    const half = emojiSize / 2;

    for (const point of THIRTEEN_POINT_POSITIONS) {
      const { left, top } = resolveSafeTargetPosition({
        xPercent: point.x,
        yPercent: point.y,
        containerWidth: container.width,
        containerHeight: container.height,
        emojiSize,
      });

      // Emoji MERKEZ bazli konumlandirildigi icin kutu sinirlari left/top +- half.
      assert.ok(left - half >= 0, `${container.name} / ${point.id}: sol kenardan tasti (${left - half})`);
      assert.ok(top - half >= 0, `${container.name} / ${point.id}: ust kenardan tasti (${top - half})`);
      assert.ok(
        left + half <= container.width,
        `${container.name} / ${point.id}: sag kenardan tasti (${left + half} > ${container.width})`,
      );
      assert.ok(
        top + half <= container.height,
        `${container.name} / ${point.id}: alt kenardan tasti (${top + half} > ${container.height})`,
      );
    }
  }
});

test("sol ust ve sag alt kose noktalari gorsel guvenli boslugu da korur", () => {
  const width = 1180;
  const height = 520;
  const emojiSize = resolveEmojiSizePx(width, height);
  const half = emojiSize / 2;

  const topLeft = THIRTEEN_POINT_POSITIONS.find((point) => point.id === "outer-north-west");
  const bottomRight = THIRTEEN_POINT_POSITIONS.find((point) => point.id === "outer-south-east");

  const mapped = (point) =>
    resolveSafeTargetPosition({
      xPercent: point.x,
      yPercent: point.y,
      containerWidth: width,
      containerHeight: height,
      emojiSize,
    });

  const first = mapped(topLeft);
  const last = mapped(bottomRight);

  assert.ok(first.left - half >= TARGET_SAFE_PADDING_PX - 0.001);
  assert.ok(first.top - half >= TARGET_SAFE_PADDING_PX - 0.001);
  assert.ok(last.left + half <= width - TARGET_SAFE_PADDING_PX + 0.001);
  assert.ok(last.top + half <= height - TARGET_SAFE_PADDING_PX + 0.001);
});

test("merkez nokta guvenli eslemeden sonra da tam ortada kalir", () => {
  const width = 1000;
  const height = 500;
  const emojiSize = resolveEmojiSizePx(width, height);
  const center = THIRTEEN_POINT_POSITIONS.find((point) => point.id === "center");

  const { left, top } = resolveSafeTargetPosition({
    xPercent: center.x,
    yPercent: center.y,
    containerWidth: width,
    containerHeight: height,
    emojiSize,
  });

  assert.ok(Math.abs(left - width / 2) < 0.001);
  assert.ok(Math.abs(top - height / 2) < 0.001);
});

test("13 nokta geometrisi degismedi - esleme goreli sirayi korur", () => {
  const width = 1000;
  const height = 500;
  const emojiSize = resolveEmojiSizePx(width, height);
  const mapped = THIRTEEN_POINT_POSITIONS.map((point) => ({
    id: point.id,
    ...resolveSafeTargetPosition({
      xPercent: point.x,
      yPercent: point.y,
      containerWidth: width,
      containerHeight: height,
      emojiSize,
    }),
  }));

  const west = mapped.find((point) => point.id === "edge-west");
  const east = mapped.find((point) => point.id === "edge-east");
  const north = mapped.find((point) => point.id === "edge-north");
  const south = mapped.find((point) => point.id === "edge-south");

  assert.ok(west.left < east.left, "bati dogunun solunda kalmali");
  assert.ok(north.top < south.top, "kuzey guneyin ustunde kalmali");
  assert.equal(mapped.length, 13);
});

test("container guvenli alan birakamayacak kadar kucukse merkeze duser (NaN/negatif uretmez)", () => {
  const { left, top } = resolveSafeTargetPosition({
    xPercent: 88,
    yPercent: 88,
    containerWidth: 40,
    containerHeight: 30,
    emojiSize: 48,
  });

  assert.equal(left, 20);
  assert.equal(top, 15);
  assert.ok(Number.isFinite(left) && Number.isFinite(top));
});

// --- Emoji secim popover'i (viewport tasmasi) -----------------------------

test("popover genisligi dar ekranda viewport'a sigar, genis ekranda maksimumu asmaz", () => {
  // Genis ekran: sabit maksimum (320) asilmaz.
  assert.equal(resolveEmojiPickerWidth(1440), 320);
  // 390px mobil: 390-32=358 > 320 oldugu icin yine maksimumda kalir ve sigar.
  assert.equal(resolveEmojiPickerWidth(390), 320);
  assert.ok(resolveEmojiPickerWidth(390) <= 390 - 32);
  // Cok dar ekran: viewport'a gore daralir.
  assert.equal(resolveEmojiPickerWidth(320), 288);
  assert.ok(resolveEmojiPickerWidth(320) <= 320 - 32);
  // Patolojik olarak dar viewport negatif genislik uretmez.
  assert.equal(resolveEmojiPickerWidth(20), 0);
});

test("popover ayar cubugunun ustunde acilir (ayarlar sayfanin altinda)", () => {
  const placement = resolveEmojiPickerPlacement({
    triggerRect: makeTriggerRect({ top: 700, left: 600 }),
    popoverWidth: 320,
    popoverHeight: 200,
    viewportWidth: 1440,
    viewportHeight: 800,
  });

  assert.equal(placement.placement, "above");
  assert.ok(placement.top + 200 <= 700, "panel tetikleyicinin ustunde bitmeli");
});

test("popover yukarida yer yoksa asagi duser", () => {
  const placement = resolveEmojiPickerPlacement({
    triggerRect: makeTriggerRect({ top: 40, left: 600 }),
    popoverWidth: 320,
    popoverHeight: 300,
    viewportWidth: 1440,
    viewportHeight: 800,
  });

  assert.equal(placement.placement, "below");
});

test("popover sag kenarda ekran disina tasmaz", () => {
  const viewportWidth = 1440;
  const placement = resolveEmojiPickerPlacement({
    triggerRect: makeTriggerRect({ top: 700, left: 1400, width: 120 }),
    popoverWidth: 320,
    popoverHeight: 200,
    viewportWidth,
    viewportHeight: 800,
  });

  assert.ok(placement.left >= 16, "sol kenar bosluguna uymali");
  assert.ok(placement.left + 320 <= viewportWidth - 16, "sag kenardan tasmamali");
});

test("popover sol kenarda ekran disina tasmaz", () => {
  const placement = resolveEmojiPickerPlacement({
    triggerRect: makeTriggerRect({ top: 700, left: 0, width: 100 }),
    popoverWidth: 320,
    popoverHeight: 200,
    viewportWidth: 1440,
    viewportHeight: 800,
  });

  assert.ok(placement.left >= 16);
});

test("popover dar mobil viewport'ta (390px) her iki kenarda da sigar", () => {
  const viewportWidth = 390;
  const width = resolveEmojiPickerWidth(viewportWidth);

  for (const left of [0, 100, 260, 380]) {
    const placement = resolveEmojiPickerPlacement({
      triggerRect: makeTriggerRect({ top: 640, left, width: 120 }),
      popoverWidth: width,
      popoverHeight: 220,
      viewportWidth,
      viewportHeight: 780,
    });

    assert.ok(placement.left >= 16, `left=${left} icin sol tasma`);
    assert.ok(placement.left + width <= viewportWidth - 16, `left=${left} icin sag tasma`);
    assert.ok(placement.top >= 16, `left=${left} icin ust tasma`);
    assert.ok(placement.top + 220 <= 780 - 16, `left=${left} icin alt tasma`);
  }
});

test("popover cok kisa viewport'ta bile ust kenar bosluguna kirpilir", () => {
  const placement = resolveEmojiPickerPlacement({
    triggerRect: makeTriggerRect({ top: 200, left: 100 }),
    popoverWidth: 320,
    popoverHeight: 600,
    viewportWidth: 800,
    viewportHeight: 400,
  });

  assert.ok(placement.top >= 16);
  assert.ok(Number.isFinite(placement.left) && Number.isFinite(placement.top));
});

// --- Bilesen kablolamasi ---------------------------------------------------

test("surekli gorunur emoji buton dizisi kaldirildi, tek tetikleyici var", async () => {
  const client = await readClient();

  // Eski yapi: ayar panelinde dogrudan EMOJI_OPTIONS.map + "🎲 Rastgele" butonu
  assert.doesNotMatch(client, /role="group" aria-label="Emoji seçimi"/);
  assert.doesNotMatch(client, /🎲 Rastgele<\/button>/);

  assert.match(client, /id="thirteen-point-emoji-trigger"/);
  assert.match(client, /aria-haspopup="dialog"/);
  assert.match(client, /aria-expanded=\{isEmojiPickerOpen\}/);
  assert.match(client, /aria-controls=\{EMOJI_PICKER_ID\}/);
});

test("tetikleyici secili emojiyi ve rastgele modda 'Rastgele' etiketini gosterir", async () => {
  const client = await readClient();

  assert.match(client, /\{emojiMode === "random" \? "🎲" : selectedEmoji\}/);
  assert.match(client, /\{emojiMode === "random" \? "Rastgele" : "Emoji Seç"\}/);
  assert.match(client, /const isEmojiPickerDisabled = isLocked \|\| emojiMode === "random";/);
  assert.match(client, /disabled=\{isEmojiPickerDisabled\}/);
});

test("popover fixed konumlandirma kullanir (ayar cubugunun overflow'u kirpmasin)", async () => {
  const client = await readClient();

  assert.match(client, /position: "fixed"/);
  assert.match(client, /resolveEmojiPickerPlacement\(\{/);
  assert.match(client, /resolveEmojiPickerWidth\(window\.innerWidth\)/);
  assert.match(client, /max-h-64 overflow-y-auto/);
  assert.match(client, /z-50/);
  assert.match(client, /maxWidth: "calc\(100vw - 2rem\)"/);
});

test("popover icindeki emojiler kompakt grid ve erisilebilir butonlardir", async () => {
  const client = await readClient();

  assert.match(client, /grid grid-cols-5 gap-2 sm:grid-cols-6/);
  assert.match(client, /aria-pressed=\{isSelected\}/);
  assert.match(client, /aria-label=\{option\.label\}/);
  assert.match(client, /title=\{option\.label\}/);
  assert.match(client, /min-h-11 min-w-11/);
  assert.match(client, /focus-visible:ring-2/);
});

test("emoji secimi state'i gunceller ve paneli kapatir", async () => {
  const client = await readClient();

  assert.match(
    client,
    /const handleEmojiSelect = \(value: string\) => \{\s*setSelectedEmoji\(clampEmoji\(value\)\);\s*setEmojiMode\("fixed"\);\s*setIsEmojiPickerOpen\(false\);/,
  );
  assert.match(client, /onClick=\{\(\) => handleEmojiSelect\(option\.value\)\}/);
});

test("panel dis tiklama, Escape, egzersiz baslangici ve sifirlama ile kapanir", async () => {
  const client = await readClient();

  assert.match(client, /document\.addEventListener\("mousedown", handlePointerDown\)/);
  assert.match(client, /document\.removeEventListener\("mousedown", handlePointerDown\)/);
  assert.match(client, /if \(event\.key !== "Escape"\) return;/);
  assert.match(client, /if \(status === "running"\) setIsEmojiPickerOpen\(false\);/);
  assert.match(client, /if \(isEmojiPickerDisabled\) setIsEmojiPickerOpen\(false\);/);

  const resetBody = client.slice(client.indexOf("const handleReset = () => {"), client.indexOf("const handleEmojiSelect"));
  assert.match(resetBody, /setIsEmojiPickerOpen\(false\);/);
  // Sifirlama sonuc/completion uretmez.
  assert.doesNotMatch(resetBody, /persistResult|completeTaskAfterResultSave/);
});

test("emoji modu ayri bir kompakt select olarak sunulur ve rastgele davranisi korunur", async () => {
  const client = await readClient();

  assert.match(client, /id="thirteen-point-emoji-mode"/);
  assert.match(client, /<option value="fixed">Sabit<\/option><option value="random">Rastgele<\/option>/);
  assert.match(client, /if \(nextMode === "random"\) setIsEmojiPickerOpen\(false\);/);
  // Motor tarafi degismedi: emoji secimi hala chooseEmoji ile yapiliyor.
  assert.match(client, /chooseEmoji\(emojiMode, selectedEmoji, previousEmojiRef\.current\)/);
});

test("Education Program / Assignment kilidi tum ayar kontrollerini disabled yapar", async () => {
  const client = await readClient();

  assert.match(client, /const isLocked = isEducationProgramMode \|\| isAssignmentMode;/);
  // hiz, sure, hareket, emoji modu, ses
  assert.equal([...client.matchAll(/disabled=\{isLocked\}/g)].length, 5);
  // emoji tetikleyicisi de kilit durumunu isEmojiPickerDisabled uzerinden alir
  assert.match(client, /const isEmojiPickerDisabled = isLocked \|\| emojiMode === "random";/);
});

test("ayar paneli genis masaustunde tek satir, dar ekranda kademeli daralir", async () => {
  const client = await readClient();

  assert.match(
    client,
    /grid grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-\[1\.15fr_0\.85fr_1\.1fr_0\.9fr_1fr_0\.6fr_0\.7fr\] xl:items-end/,
  );
  // 7 ayar hucresi -> xl'de 7 sutun
  assert.equal([...client.matchAll(/className=\{SETTINGS_FIELD_CLASS\}/g)].length, 7);
  assert.match(client, /const SETTINGS_FIELD_CLASS = "min-w-0";/);
  assert.match(client, /min-h-11/);
});

test("calisma alani buyutuldu ama tum ekrani kaplamaz", async () => {
  const client = await readClient();

  assert.match(client, /min-h-\[clamp\(18rem,48dvh,32rem\)\]/);
  // Eski sabit min-yukseklikler kaldirildi
  assert.doesNotMatch(client, /min-h-\[22rem\]/);
  assert.doesNotMatch(client, /sm:min-h-\[28rem\]/);
  // Sahne kabuğu korunuyor (fixed stage disina cikilmadi)
  assert.match(client, /ExerciseFullscreenShell/);
});

test("noktalar ve emoji ayni guvenli eslemeyi kullanir ve merkez bazli konumlanir", async () => {
  const client = await readClient();

  assert.match(client, /resolveSafeTargetPosition\(\{/);
  assert.match(client, /safePositions\.map\(\(point\) => \(/);
  assert.match(client, /const currentSafePosition =/);
  // Merkezleme
  assert.equal([...client.matchAll(/transform: "translate\(-50%, -50%\)"/g)].length, 3);
  // Emoji boyutu guvenli alan hesabiyla ayni kaynaktan gelir
  assert.match(client, /width: `\$\{emojiSizePx\}px`/);
  assert.match(client, /fontSize: `\$\{emojiFontSizePx\}px`/);
});

test("calisma alani ResizeObserver ile olculur ve olcum oncesi guvenli fallback vardir", async () => {
  const client = await readClient();

  assert.match(client, /new ResizeObserver\(measure\)/);
  assert.match(client, /observer\.disconnect\(\)/);
  assert.match(client, /const isPlayAreaMeasured = playAreaWidth > 0 && playAreaHeight > 0;/);
  assert.match(client, /isPlayAreaMeasured \? `\$\{currentSafePosition\.left\}px` : `\$\{currentPosition\.x\}%`/);
});

test("timer, pause/resume ve tek seferlik completion mantigi degismedi", async () => {
  const client = await readClient();

  assert.match(client, /if \(finalizedRef\.current\) return;\s*finalizedRef\.current = true;/);
  assert.match(client, /if \(saveInFlightRef\.current \|\| saveCompletedRef\.current\) return;/);
  assert.match(client, /countdownIntervalRef\.current = window\.setInterval\(\(\) => \{\s*setRemainingSeconds\(\(value\) => Math\.max\(0, value - 1\)\);/);
  assert.match(client, /if \(status === "running" && remainingSeconds <= 0\) finishExercise\(\);/);
  assert.match(client, /setStatus\("paused"\)/);
  // Sonuc sozlesmesi degismedi
  assert.match(client, /exerciseType: RESULT_EXERCISE_TYPE/);
  assert.match(client, /const RESULT_EXERCISE_TYPE = "thirteen-point-emoji-tracking";/);
});

test("emoji ogesi tiklama/secim engelleyici stillere sahiptir", async () => {
  const theme = await fs.readFile("src/components/exercises/thirteen-point-emoji-theme.module.css", "utf8");

  assert.match(theme, /pointer-events: none;/);
  assert.match(theme, /user-select: none;/);
  assert.match(theme, /line-height: 1;/);
  // Boyut artik JS'ten geliyor - CSS'te sabit clamp kalmamali
  assert.doesNotMatch(theme, /width: clamp\(2\.5rem, 7vw, 4rem\)/);
  assert.doesNotMatch(theme, /font-size: clamp\(2\.25rem, 7vw, 4rem\)/);
});
