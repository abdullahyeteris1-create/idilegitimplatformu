// 13 Nokta Emoji Takip egzersizinin YERLESIM (layout) matematigi.
//
// Bu dosya 13 nokta geometrisini DEGISTIRMEZ - THIRTEEN_POINT_POSITIONS
// icindeki yuzde koordinatlari oldugu gibi kalir. Burada yapilan tek sey,
// o yuzdeleri container'in GERCEK kullanilabilir alanina guvenli bicimde
// eslemektir: emoji koordinat merkezine oturdugu icin, %12 ve %88 gibi
// kenara yakin noktalarda emojinin yarisi container disina tasiyordu.
// Guvenli esleme, emoji yariciapi + gorsel bosluk kadar iceriden baslayan
// bir alt-dikdortgene normalize eder; boylece emoji kutusu hicbir kosede
// container sinirini asmaz.
//
// Saf fonksiyonlardir (DOM/React bagimsiz) - davranis testleri dogrudan
// bunlari cagirir.

/** Emoji kutusunun izin verilen en kucuk/en buyuk kenar uzunlugu (px). */
export const EMOJI_MIN_SIZE_PX = 28;
export const EMOJI_MAX_SIZE_PX = 48;
/** Emoji kutusu, calisma alaninin kisa kenarinin bu orani kadar buyur. */
export const EMOJI_SIZE_RATIO = 0.09;
/**
 * Emoji glifi font'a gore kutusundan biraz tasabildigi icin, guvenli alan
 * hesabina emoji yariciapina EK olarak bu gorsel bosluk eklenir.
 */
export const TARGET_SAFE_PADDING_PX = 8;
/** Emoji glifi kutuyu tasmasin diye font-size kutu boyutunun bu kati olur. */
export const EMOJI_FONT_SIZE_RATIO = 0.8;

export const EMOJI_PICKER_MAX_WIDTH_PX = 320;
export const EMOJI_PICKER_VIEWPORT_MARGIN_PX = 16;
export const EMOJI_PICKER_GAP_PX = 8;

export type SafeTargetPosition = {
  /** Container'in sol kenarina gore emoji MERKEZININ x konumu (px). */
  left: number;
  /** Container'in ust kenarina gore emoji MERKEZININ y konumu (px). */
  top: number;
};

function clampUnitInterval(value: number): number {
  if (!Number.isFinite(value)) return 0.5;
  return Math.min(1, Math.max(0, value));
}

/**
 * Calisma alaninin olculerine gore responsive emoji boyutu (px).
 * Kisa kenar esas alinir - genis ama alcak bir alanda emoji dikeyde tasmasin.
 */
export function resolveEmojiSizePx(containerWidth: number, containerHeight: number): number {
  const shortestSide = Math.min(containerWidth, containerHeight);
  if (!Number.isFinite(shortestSide) || shortestSide <= 0) {
    return EMOJI_MIN_SIZE_PX;
  }

  return Math.round(
    Math.min(EMOJI_MAX_SIZE_PX, Math.max(EMOJI_MIN_SIZE_PX, shortestSide * EMOJI_SIZE_RATIO)),
  );
}

/** Emoji kutusu icindeki glif boyutu - kutuyu tasmayacak sekilde kucultulur. */
export function resolveEmojiFontSizePx(emojiSizePx: number): number {
  return Math.round(emojiSizePx * EMOJI_FONT_SIZE_RATIO);
}

/**
 * Yuzde koordinatini (0-100) container'in guvenli alt-dikdortgenine esler.
 *
 * safeInset = emojiSize / 2 + padding
 * x = safeInset + (xPercent / 100) * (width - 2 * safeInset)
 *
 * Container guvenli alan birakamayacak kadar kucukse merkeze duser (emoji
 * yine de container'i asar ama hicbir kosede kirpilmayi artirmaz).
 */
export function resolveSafeTargetPosition(input: {
  xPercent: number;
  yPercent: number;
  containerWidth: number;
  containerHeight: number;
  emojiSize: number;
  padding?: number;
}): SafeTargetPosition {
  const { xPercent, yPercent, containerWidth, containerHeight, emojiSize } = input;
  const padding = input.padding ?? TARGET_SAFE_PADDING_PX;

  const safeInsetX = emojiSize / 2 + padding;
  const safeInsetY = emojiSize / 2 + padding;
  const usableWidth = containerWidth - safeInsetX * 2;
  const usableHeight = containerHeight - safeInsetY * 2;

  return {
    left:
      usableWidth <= 0
        ? containerWidth / 2
        : safeInsetX + clampUnitInterval(xPercent / 100) * usableWidth,
    top:
      usableHeight <= 0
        ? containerHeight / 2
        : safeInsetY + clampUnitInterval(yPercent / 100) * usableHeight,
  };
}

export type EmojiPickerPlacement = {
  left: number;
  top: number;
  /** Panelin tetikleyicinin ustunde mi altinda mi acildigi (test/aria icin). */
  placement: "above" | "below";
};

export type TriggerRect = {
  top: number;
  left: number;
  width: number;
  height: number;
  bottom: number;
};

/** Popover genisligi: sabit maksimumu asmaz, dar ekranda viewport'a sigar. */
export function resolveEmojiPickerWidth(
  viewportWidth: number,
  margin = EMOJI_PICKER_VIEWPORT_MARGIN_PX,
): number {
  return Math.max(0, Math.min(EMOJI_PICKER_MAX_WIDTH_PX, viewportWidth - margin * 2));
}

/**
 * Emoji secim panelinin viewport koordinatlarini hesaplar (position: fixed).
 *
 * Ayar paneli sayfanin ALTINDA oldugu icin varsayilan tercih panelin
 * tetikleyicinin USTUNDE acilmasidir; yukarida yer yoksa altina duser.
 * Yatayda tetikleyiciye gore ortalanir, sonra viewport kenar bosluguna
 * kirpilir - boylece sag ve sol kosede ekran disina tasmaz.
 */
export function resolveEmojiPickerPlacement(input: {
  triggerRect: TriggerRect;
  popoverWidth: number;
  popoverHeight: number;
  viewportWidth: number;
  viewportHeight: number;
  gap?: number;
  margin?: number;
}): EmojiPickerPlacement {
  const { triggerRect, popoverWidth, popoverHeight, viewportWidth, viewportHeight } = input;
  const gap = input.gap ?? EMOJI_PICKER_GAP_PX;
  const margin = input.margin ?? EMOJI_PICKER_VIEWPORT_MARGIN_PX;

  const spaceAbove = triggerRect.top - margin - gap;
  const spaceBelow = viewportHeight - triggerRect.bottom - margin - gap;
  const fitsAbove = spaceAbove >= popoverHeight;
  // Yukarida sigmiyorsa asagi dener; ikisi de sigmiyorsa daha genis olani secer.
  const placement: "above" | "below" =
    fitsAbove || spaceAbove >= spaceBelow ? "above" : "below";

  const rawTop =
    placement === "above"
      ? triggerRect.top - gap - popoverHeight
      : triggerRect.bottom + gap;

  const maxTop = Math.max(margin, viewportHeight - margin - popoverHeight);
  const top = Math.min(maxTop, Math.max(margin, rawTop));

  const rawLeft = triggerRect.left + triggerRect.width / 2 - popoverWidth / 2;
  const maxLeft = Math.max(margin, viewportWidth - margin - popoverWidth);
  const left = Math.min(maxLeft, Math.max(margin, rawLeft));

  return { left, top, placement };
}
