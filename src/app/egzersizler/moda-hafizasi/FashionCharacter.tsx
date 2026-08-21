"use client";

import { Fragment } from "react";
import type { FashionLook, FashionSelection } from "@/lib/moda-hafizasi/gameConfig";
import { getFashionColorHex } from "@/lib/moda-hafizasi/gameConfig";

/**
 * Katmanli SVG karakter.
 *
 * Tum parcalar tek bir viewBox (0 0 220 380) icinde sabit koordinatlara gore
 * cizilir; boylece kiyafet/canta/ayakkabi karakterden bagimsiz "havada"
 * duramaz. Renk degistirilebilen parcalar (ust, canta, ayakkabi, aksesuar)
 * yalnizca `fill` / `stroke` uzerinden boyanir - geometri hic degismez.
 *
 * Cizim sirasi (arkadan one):
 *   sac (arka) -> bacaklar -> canta (arka) -> kollar -> govde -> kafa -> yuz
 *   -> sac (on) -> alt kiyafet -> ust kiyafet -> eller -> ayakkabi
 *   -> canta (on) -> sac aksesuari
 */

const PLACEHOLDER_FILL = "#E4E8F0";
const PLACEHOLDER_STROKE = "#AFBACE";
const SHADE = "#0F172A";

type FashionCharacterProps = {
  look: FashionLook;
  colors: FashionSelection;
  className?: string;
  /** Erisilebilirlik metni; renk bilgisi ICERMEZ (cevabi sizdirmamak icin). */
  label?: string;
};

/**
 * Renk degistirilebilen parcalarin ana govdesine uygulanan cerceve.
 * Bos slotta kesikli gri, doluyken ince yumusak bir kontur verir - beyaz ve
 * krem gibi acik renklerin acik zeminde kaybolmasini engeller.
 */
function outlineProps(isPlaceholder: boolean) {
  return isPlaceholder
    ? { stroke: PLACEHOLDER_STROKE, strokeWidth: 2, strokeDasharray: "6 4" }
    : { stroke: "rgba(15, 23, 42, 0.18)", strokeWidth: 1.6 };
}

export function FashionCharacter({ look, colors, className, label }: FashionCharacterProps) {
  const skin = look.skinTone.base;
  const skinShade = look.skinTone.shade;
  const hair = look.hairColor;

  const topHex = getFashionColorHex(colors.top);
  const bagHex = getFashionColorHex(colors.bag);
  const shoeHex = getFashionColorHex(colors.shoes);
  const accessoryHex = getFashionColorHex(colors.accessory);

  const topColor = topHex ?? PLACEHOLDER_FILL;
  const bagColor = bagHex ?? PLACEHOLDER_FILL;
  const shoeColor = shoeHex ?? PLACEHOLDER_FILL;
  const accessoryColor = accessoryHex ?? PLACEHOLDER_FILL;

  const topEmpty = outlineProps(topHex === null);
  const bagEmpty = outlineProps(bagHex === null);
  const shoeEmpty = outlineProps(shoeHex === null);
  const accessoryEmpty = outlineProps(accessoryHex === null);

  const bottomColor = look.bottomColor;

  return (
    <svg
      viewBox="0 0 220 380"
      className={className}
      role="img"
      aria-label={label ?? "Moda karakteri"}
      xmlns="http://www.w3.org/2000/svg"
    >
      {/* Zemin golgesi */}
      <ellipse cx="110" cy="350" rx="64" ry="10" fill={SHADE} opacity="0.1" />

      {/* --- SAC (ARKA) --- */}
      <HairBack style={look.hairStyle} color={hair} />

      {/* --- BACAKLAR --- */}
      <path d="M99 250 Q96 292 96 326" stroke={skin} strokeWidth="19" strokeLinecap="round" fill="none" />
      <path d="M121 250 Q124 292 124 326" stroke={skin} strokeWidth="19" strokeLinecap="round" fill="none" />

      {/* --- CANTA (ARKA: sirt cantasinin govdesi) --- */}
      {look.bagStyle === "sirt" && (
        <g>
          <rect x="61" y="170" width="18" height="56" rx="9" fill={bagColor} {...bagEmpty} />
          <rect x="141" y="170" width="18" height="56" rx="9" fill={bagColor} {...bagEmpty} />
          <rect x="61" y="192" width="18" height="8" fill={SHADE} opacity="0.16" />
          <rect x="141" y="192" width="18" height="8" fill={SHADE} opacity="0.16" />
        </g>
      )}

      {/* --- KOLLAR --- */}
      <path d="M84 176 Q72 202 76 246" stroke={skin} strokeWidth="16" strokeLinecap="round" fill="none" />
      <path d="M136 176 Q148 202 144 246" stroke={skin} strokeWidth="16" strokeLinecap="round" fill="none" />

      {/* --- BOYUN + GOVDE --- */}
      <path d="M99 126 h22 v22 q0 8 -11 8 q-11 0 -11 -8 z" fill={skin} />
      <path d="M99 126 h22 v10 q-11 8 -22 0 z" fill={skinShade} opacity="0.5" />
      <path
        d="M78 174 C78 164 86 158 96 156 L124 156 C134 158 142 164 142 174 L140 226 C139 246 132 256 124 258 L96 258 C88 256 81 246 80 226 Z"
        fill={skin}
      />

      {/* --- KAFA --- */}
      <ellipse cx="65" cy="98" rx="7" ry="9.5" fill={skin} />
      <ellipse cx="155" cy="98" rx="7" ry="9.5" fill={skin} />
      <path
        d="M63 92 C63 48 84 40 110 40 C136 40 157 48 157 92 C157 124 138 146 110 146 C82 146 63 124 63 92 Z"
        fill={skin}
      />

      {/* --- YUZ --- */}
      <Face eyeColor={look.eyeColor} hairColor={hair} skinShade={skinShade} />

      {/* --- SAC (ON: kakul) --- */}
      <HairFront style={look.hairStyle} color={hair} />

      {/* --- ALT KIYAFET --- */}
      <BottomGarment style={look.bottomStyle} color={bottomColor} />

      {/* --- UST KIYAFET --- */}
      <TopGarment style={look.topStyle} color={topColor} emptyProps={topEmpty} />

      {/* --- ELLER --- */}
      <circle cx="76" cy="248" r="8.5" fill={skin} />
      <circle cx="144" cy="248" r="8.5" fill={skin} />

      {/* --- AYAKKABILAR --- */}
      <g transform="translate(96 326) scale(-1 1)">
        <Shoe style={look.shoeStyle} color={shoeColor} skin={skin} emptyProps={shoeEmpty} />
      </g>
      <g transform="translate(124 326)">
        <Shoe style={look.shoeStyle} color={shoeColor} skin={skin} emptyProps={shoeEmpty} />
      </g>

      {/* --- CANTA (ON: askilar ve govde) --- */}
      <BagFront style={look.bagStyle} color={bagColor} emptyProps={bagEmpty} />

      {/* --- SAC AKSESUARI --- */}
      <Accessory style={look.accessoryStyle} color={accessoryColor} emptyProps={accessoryEmpty} />
    </svg>
  );
}

type EmptyProps = ReturnType<typeof outlineProps>;

function Face({ eyeColor, hairColor, skinShade }: { eyeColor: string; hairColor: string; skinShade: string }) {
  return (
    <Fragment>
      {/* Yanaklar */}
      <ellipse cx="79" cy="120" rx="10" ry="5.5" fill="#FF9DB4" opacity="0.42" />
      <ellipse cx="141" cy="120" rx="10" ry="5.5" fill="#FF9DB4" opacity="0.42" />

      {/* Kaslar */}
      <path d="M82 76 Q92 69 103 75" stroke={hairColor} strokeWidth="3.4" strokeLinecap="round" fill="none" opacity="0.85" />
      <path d="M117 75 Q128 69 138 76" stroke={hairColor} strokeWidth="3.4" strokeLinecap="round" fill="none" opacity="0.85" />

      {/* Gozler */}
      {[92, 128].map((cx) => (
        <Fragment key={cx}>
          <ellipse cx={cx} cy="98" rx="10.5" ry="12.5" fill="#FFFFFF" />
          <circle cx={cx} cy="100" r="8" fill={eyeColor} />
          <circle cx={cx} cy="101" r="4" fill="#1B1B2B" />
          <circle cx={cx - 3.5} cy="96" r="3.4" fill="#FFFFFF" />
          <circle cx={cx + 3} cy="106" r="1.7" fill="#FFFFFF" opacity="0.75" />
          <path
            d={`M${cx - 11} 92 Q${cx} 83 ${cx + 11} 92`}
            stroke="#2A2233"
            strokeWidth="3.2"
            strokeLinecap="round"
            fill="none"
          />
        </Fragment>
      ))}
      {/* Kirpikler */}
      <path d="M81 91 l-6 -4" stroke="#2A2233" strokeWidth="2.8" strokeLinecap="round" fill="none" />
      <path d="M139 91 l6 -4" stroke="#2A2233" strokeWidth="2.8" strokeLinecap="round" fill="none" />

      {/* Burun */}
      <path d="M107 114 Q110 118 113 114" stroke={skinShade} strokeWidth="2.6" strokeLinecap="round" fill="none" />

      {/* Agiz */}
      <path d="M102 126 Q110 135 118 126" stroke="#C2415C" strokeWidth="3" strokeLinecap="round" fill="none" />
    </Fragment>
  );
}

function HairBack({ style, color }: { style: FashionLook["hairStyle"]; color: string }) {
  return (
    <Fragment>
      {style === "topuz" && (
        <Fragment>
          <circle cx="110" cy="26" r="24" fill={color} />
          <circle cx="102" cy="20" r="9" fill="#FFFFFF" opacity="0.14" />
        </Fragment>
      )}

      {style === "duz-uzun" && (
        <Fragment>
          <path d="M56 96 C46 148 46 200 52 238 C54 249 71 249 73 238 C68 198 70 146 76 104 Z" fill={color} />
          <path d="M164 96 C174 148 174 200 168 238 C166 249 149 249 147 238 C152 198 150 146 144 104 Z" fill={color} />
        </Fragment>
      )}

      {style === "bob" && (
        <Fragment>
          <path d="M55 96 C50 130 53 158 62 172 C69 182 82 177 79 165 C72 146 72 120 76 102 Z" fill={color} />
          <path d="M165 96 C170 130 167 158 158 172 C151 182 138 177 141 165 C148 146 148 120 144 102 Z" fill={color} />
        </Fragment>
      )}

      {style === "at-kuyrugu" && (
        <Fragment>
          <path
            d="M148 68 C178 62 197 92 192 126 C188 156 172 176 157 178 C146 179 142 166 151 157 C169 140 176 110 161 90 C155 82 149 76 146 74 Z"
            fill={color}
          />
          <path d="M143 82 C152 72 164 70 170 74" stroke="#FFFFFF" strokeWidth="5" opacity="0.15" fill="none" strokeLinecap="round" />
        </Fragment>
      )}

      {style === "orgulu" && (
        <Fragment>
          {[
            [58, 122, 11],
            [55, 145, 10.5],
            [54, 168, 10],
            [56, 190, 9.2],
            [59, 210, 8.2],
          ].map(([cx, cy, r]) => (
            <circle key={`l-${cy}`} cx={cx} cy={cy} r={r} fill={color} />
          ))}
          {[
            [162, 122, 11],
            [165, 145, 10.5],
            [166, 168, 10],
            [164, 190, 9.2],
            [161, 210, 8.2],
          ].map(([cx, cy, r]) => (
            <circle key={`r-${cy}`} cx={cx} cy={cy} r={r} fill={color} />
          ))}
        </Fragment>
      )}

      {/* Kafayi saran ana sac hacmi */}
      <path
        d="M110 26 C64 26 52 62 55 104 C56 126 64 142 76 150 L144 150 C156 142 164 126 165 104 C168 62 156 26 110 26 Z"
        fill={color}
      />
    </Fragment>
  );
}

function HairFront({ style, color }: { style: FashionLook["hairStyle"]; color: string }) {
  const bangs =
    style === "orgulu"
      ? "M62 96 C60 52 82 36 110 36 C138 36 160 52 158 96 C152 72 138 58 118 56 C114 66 106 66 102 56 C82 58 68 72 62 96 Z"
      : style === "at-kuyrugu" || style === "topuz"
        ? "M62 94 C60 50 82 34 110 34 C140 34 160 52 158 92 C150 74 138 64 120 60 C104 56 84 62 74 78 C68 84 64 90 62 94 Z"
        : "M62 96 C60 52 82 36 110 36 C138 36 160 52 158 96 C154 76 146 62 132 58 C124 70 96 72 86 62 C74 68 65 80 62 96 Z";

  return (
    <Fragment>
      <path d={bangs} fill={color} />
      <path
        d="M86 54 C95 45 108 42 117 45"
        stroke="#FFFFFF"
        strokeWidth="6"
        strokeLinecap="round"
        opacity="0.18"
        fill="none"
      />
    </Fragment>
  );
}

function BottomGarment({ style, color }: { style: FashionLook["bottomStyle"]; color: string }) {
  if (style === "none") return null;

  if (style === "etek") {
    return (
      <Fragment>
        <path d="M80 220 L140 220 L155 278 C136 289 84 289 65 278 Z" fill={color} />
        <path d="M65 278 C84 289 136 289 155 278 L156 284 C136 295 84 295 64 284 Z" fill={SHADE} opacity="0.16" />
        <path d="M80 220 L140 220 L140.5 230 L79.5 230 Z" fill={SHADE} opacity="0.14" />
      </Fragment>
    );
  }

  if (style === "pantolon") {
    return (
      <Fragment>
        <path d="M80 218 L140 218 L139 252 C126 258 94 258 81 252 Z" fill={color} />
        <path d="M99 248 Q96 288 96 308" stroke={color} strokeWidth="22" strokeLinecap="round" fill="none" />
        <path d="M121 248 Q124 288 124 308" stroke={color} strokeWidth="22" strokeLinecap="round" fill="none" />
        <path d="M110 252 L110 300" stroke={SHADE} strokeWidth="2" opacity="0.18" fill="none" />
        <path d="M80 218 L140 218 L140 227 L80 227 Z" fill={SHADE} opacity="0.16" />
      </Fragment>
    );
  }

  return (
    <Fragment>
      <path d="M80 218 L140 218 L139 252 C126 258 94 258 81 252 Z" fill={color} />
      <path d="M99 248 Q97 264 97 274" stroke={color} strokeWidth="23" strokeLinecap="round" fill="none" />
      <path d="M121 248 Q123 264 123 274" stroke={color} strokeWidth="23" strokeLinecap="round" fill="none" />
      <path d="M110 250 L110 272" stroke={SHADE} strokeWidth="2" opacity="0.18" fill="none" />
      <path d="M80 218 L140 218 L140 227 L80 227 Z" fill={SHADE} opacity="0.16" />
    </Fragment>
  );
}

function TopGarment({
  style,
  color,
  emptyProps,
}: {
  style: FashionLook["topStyle"];
  color: string;
  emptyProps: EmptyProps;
}) {
  const capSleeves = (
    <Fragment>
      <path d="M85 172 Q77 184 77 194" stroke={color} strokeWidth="21" strokeLinecap="round" fill="none" />
      <path d="M135 172 Q143 184 143 194" stroke={color} strokeWidth="21" strokeLinecap="round" fill="none" />
    </Fragment>
  );

  if (style === "elbise") {
    return (
      <Fragment>
        {capSleeves}
        <path
          d="M80 172 C80 162 88 156 98 154 C104 166 116 166 122 154 C132 156 140 162 140 172 L141 216 L158 286 C136 296 84 296 62 286 L79 216 Z"
          fill={color}
          {...emptyProps}
        />
        <path d="M79 212 L141 212 L141.5 224 L78.5 224 Z" fill={SHADE} opacity="0.16" />
        <path d="M62 286 C84 296 136 296 158 286 L159 292 C136 302 84 302 61 292 Z" fill={SHADE} opacity="0.14" />
      </Fragment>
    );
  }

  if (style === "kazak") {
    return (
      <Fragment>
        <path d="M84 174 Q72 202 76 240" stroke={color} strokeWidth="19" strokeLinecap="round" fill="none" />
        <path d="M136 174 Q148 202 144 240" stroke={color} strokeWidth="19" strokeLinecap="round" fill="none" />
        <circle cx="76" cy="239" r="9.6" fill={SHADE} opacity="0.16" />
        <circle cx="144" cy="239" r="9.6" fill={SHADE} opacity="0.16" />
        <path
          d="M80 172 C80 160 88 154 98 152 C104 164 116 164 122 152 C132 154 140 160 140 172 L140 234 C140 240 135 243 129 243 L91 243 C85 243 80 240 80 234 Z"
          fill={color}
          {...emptyProps}
        />
        <path d="M80 232 L140 232 L140 243 L80 243 Z" fill={SHADE} opacity="0.16" />
      </Fragment>
    );
  }

  if (style === "askili") {
    return (
      <Fragment>
        <path d="M94 154 L92 180" stroke={color} strokeWidth="7" strokeLinecap="round" fill="none" />
        <path d="M126 154 L128 180" stroke={color} strokeWidth="7" strokeLinecap="round" fill="none" />
        <path
          d="M82 178 C88 172 96 174 110 174 C124 174 132 172 138 178 L139 228 C139 234 134 237 128 237 L92 237 C86 237 81 234 81 228 Z"
          fill={color}
          {...emptyProps}
        />
        <path d="M81 226 L139 226 L139 237 L81 237 Z" fill={SHADE} opacity="0.14" />
      </Fragment>
    );
  }

  return (
    <Fragment>
      {capSleeves}
      <path
        d="M80 172 C80 162 88 156 98 154 C104 166 116 166 122 154 C132 156 140 162 140 172 L139 226 C139 232 134 235 128 235 L92 235 C86 235 81 232 81 226 Z"
        fill={color}
        {...emptyProps}
      />
      <path d="M81 224 L139 224 L139 235 L81 235 Z" fill={SHADE} opacity="0.14" />
    </Fragment>
  );
}

function BagFront({
  style,
  color,
  emptyProps,
}: {
  style: FashionLook["bagStyle"];
  color: string;
  emptyProps: EmptyProps;
}) {
  if (style === "sirt") {
    return (
      <Fragment>
        <path d="M96 158 Q91 188 95 216" stroke={color} strokeWidth="8" strokeLinecap="round" fill="none" />
        <path d="M124 158 Q129 188 125 216" stroke={color} strokeWidth="8" strokeLinecap="round" fill="none" />
        <rect x="97" y="186" width="26" height="7" rx="3.5" fill={color} />
        <rect x="106" y="184" width="8" height="11" rx="2" fill={SHADE} opacity="0.22" />
      </Fragment>
    );
  }

  if (style === "omuz") {
    return (
      <Fragment>
        <path d="M97 156 Q112 196 134 220" stroke={color} strokeWidth="7" strokeLinecap="round" fill="none" />
        <rect x="126" y="214" width="38" height="32" rx="10" fill={color} {...emptyProps} />
        <path d="M126 224 h38 v12 a10 10 0 0 1 -10 10 h-18 a10 10 0 0 1 -10 -10 z" fill={SHADE} opacity="0.16" />
        <rect x="126" y="214" width="38" height="12" rx="6" fill={SHADE} opacity="0.18" />
        <circle cx="145" cy="228" r="3.4" fill="#FFFFFF" opacity="0.65" />
      </Fragment>
    );
  }

  return (
    <Fragment>
      <path d="M104 156 Q112 190 122 208" stroke={color} strokeWidth="5.5" strokeLinecap="round" fill="none" />
      <rect x="112" y="204" width="30" height="26" rx="9" fill={color} {...emptyProps} />
      <rect x="112" y="204" width="30" height="10" rx="5" fill={SHADE} opacity="0.18" />
      <circle cx="127" cy="218" r="3" fill="#FFFFFF" opacity="0.6" />
    </Fragment>
  );
}

function Shoe({
  style,
  color,
  skin,
  emptyProps,
}: {
  style: FashionLook["shoeStyle"];
  color: string;
  skin: string;
  emptyProps: EmptyProps;
}) {
  if (style === "bot") {
    return (
      <Fragment>
        <rect x="-11" y="-38" width="21" height="32" rx="7" fill={color} {...emptyProps} />
        <ellipse cx="3" cy="2" rx="17" ry="10" fill={color} {...emptyProps} />
        <rect x="-11" y="-38" width="21" height="7" rx="3.5" fill="#FFFFFF" opacity="0.3" />
        <ellipse cx="3" cy="8" rx="17" ry="4.6" fill={SHADE} opacity="0.26" />
      </Fragment>
    );
  }

  if (style === "babet") {
    return (
      <Fragment>
        <ellipse cx="2" cy="-1" rx="18" ry="10" fill={color} {...emptyProps} />
        <ellipse cx="-7" cy="-6" rx="7" ry="4.2" fill={skin} />
        <ellipse cx="2" cy="5" rx="18" ry="4.2" fill={SHADE} opacity="0.24" />
        <circle cx="9" cy="-6" r="3.2" fill="#FFFFFF" opacity="0.55" />
      </Fragment>
    );
  }

  return (
    <Fragment>
      <rect x="-13" y="-15" width="18" height="20" rx="6" fill={color} {...emptyProps} />
      <ellipse cx="4" cy="2" rx="18" ry="11" fill={color} {...emptyProps} />
      <path d="M-2 -8 L8 3" stroke="#FFFFFF" strokeWidth="3" strokeLinecap="round" opacity="0.5" />
      <ellipse cx="4" cy="8" rx="18" ry="4.6" fill={SHADE} opacity="0.24" />
      <rect x="-13" y="-15" width="18" height="6" rx="3" fill="#FFFFFF" opacity="0.32" />
    </Fragment>
  );
}

function Accessory({
  style,
  color,
  emptyProps,
}: {
  style: FashionLook["accessoryStyle"];
  color: string;
  emptyProps: EmptyProps;
}) {
  if (style === "none") return null;

  if (style === "tac") {
    return (
      <Fragment>
        <path d="M86 56 L92 38 L101 51 L110 32 L119 51 L128 38 L134 56 Z" fill={color} {...emptyProps} />
        <rect x="84" y="54" width="52" height="8" rx="4" fill={color} {...emptyProps} />
        <circle cx="110" cy="46" r="3.2" fill="#FFFFFF" opacity="0.75" />
        <circle cx="94" cy="50" r="2.2" fill="#FFFFFF" opacity="0.6" />
        <circle cx="126" cy="50" r="2.2" fill="#FFFFFF" opacity="0.6" />
      </Fragment>
    );
  }

  if (style === "fiyonk") {
    return (
      <g transform="translate(141 58) rotate(12)">
        <path d="M0 0 C-4 -13 -21 -13 -21 -1 C-21 10 -5 10 0 0 Z" fill={color} {...emptyProps} />
        <path d="M0 0 C4 -13 21 -13 21 -1 C21 10 5 10 0 0 Z" fill={color} {...emptyProps} />
        <circle cx="0" cy="0" r="5.5" fill={color} />
        <circle cx="0" cy="0" r="5.5" fill={SHADE} opacity="0.18" />
      </g>
    );
  }

  if (style === "bant") {
    return (
      <Fragment>
        <path d="M67 82 Q110 42 153 82" stroke={color} strokeWidth="9" strokeLinecap="round" fill="none" />
        <circle cx="147" cy="70" r="6.5" fill={color} {...emptyProps} />
        <circle cx="147" cy="70" r="2.4" fill={SHADE} opacity="0.2" />
      </Fragment>
    );
  }

  return (
    <g transform="translate(80 64) rotate(-18)">
      <rect x="-14" y="-5.5" width="28" height="11" rx="5.5" fill={color} {...emptyProps} />
      <rect x="-14" y="-5.5" width="28" height="4" rx="2" fill="#FFFFFF" opacity="0.35" />
      <circle cx="9" cy="0" r="2.4" fill="#FFFFFF" opacity="0.7" />
    </g>
  );
}
