import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import path from "node:path";
import test from "node:test";

const PREVIEW_KEY = "test-word-race-preview-key-0123456789abcdef";

process.env.WORD_RACE_PREVIEW_ENABLED = "true";
process.env.WORD_RACE_PREVIEW_KEY = PREVIEW_KEY;

const {
  createWordRacePreviewToken,
  isValidWordRacePreviewKey,
  isValidWordRacePreviewToken,
  isWordRacePreviewEnabled,
  WORD_RACE_PREVIEW_TOKEN_TTL_SECONDS,
} = await import("../src/lib/preview/wordRacePreview.ts");

const { GET } = await import("../src/app/preview/kelime-yarisi/content/route.ts");

const ROOT = process.cwd();
const SOURCE_PROTOTYPE = path.join(ROOT, "prototypes", "kelime-yarisi.html");
const PRIVATE_PROTOTYPE = path.join(ROOT, "src", "private-previews", "kelime-yarisi.html");

function withEnv(env, run) {
  const previous = {
    WORD_RACE_PREVIEW_ENABLED: process.env.WORD_RACE_PREVIEW_ENABLED,
    WORD_RACE_PREVIEW_KEY: process.env.WORD_RACE_PREVIEW_KEY,
  };

  Object.assign(process.env, env);

  try {
    return run();
  } finally {
    Object.assign(process.env, previous);
  }
}

function contentRequest(token) {
  const url = new URL("http://localhost/preview/kelime-yarisi/content");

  if (token !== undefined) {
    url.searchParams.set("token", token);
  }

  return new Request(url);
}

test("onizleme varsayilan olarak kapali: dogru anahtar bile kabul edilmez", () => {
  withEnv({ WORD_RACE_PREVIEW_ENABLED: "false" }, () => {
    assert.equal(isWordRacePreviewEnabled(), false);
    assert.equal(isValidWordRacePreviewKey(PREVIEW_KEY), false);
  });

  withEnv({ WORD_RACE_PREVIEW_ENABLED: undefined }, () => {
    assert.equal(isValidWordRacePreviewKey(PREVIEW_KEY), false);
  });

  // "true" disindaki degerler acmaz.
  withEnv({ WORD_RACE_PREVIEW_ENABLED: "1" }, () => {
    assert.equal(isValidWordRacePreviewKey(PREVIEW_KEY), false);
  });
});

test("onizleme acikken anahtar eksik, bos veya yanlissa reddedilir", () => {
  assert.equal(isValidWordRacePreviewKey(undefined), false);
  assert.equal(isValidWordRacePreviewKey(""), false);
  assert.equal(isValidWordRacePreviewKey("yanlis-anahtar"), false);
  assert.equal(isValidWordRacePreviewKey(`${PREVIEW_KEY}x`), false);
  assert.equal(isValidWordRacePreviewKey(PREVIEW_KEY.slice(0, -1)), false);
  assert.equal(isValidWordRacePreviewKey(PREVIEW_KEY), true);
});

test("anahtar tanimli degilse onizleme acik olsa da kapali kalir", () => {
  withEnv({ WORD_RACE_PREVIEW_KEY: "" }, () => {
    assert.equal(isValidWordRacePreviewKey(""), false);
    assert.equal(createWordRacePreviewToken(), null);
  });
});

test("kisa omurlu token uretilir, imzasi ve suresi dogrulanir", () => {
  const now = Date.now();
  const token = createWordRacePreviewToken(now);

  assert.ok(token);
  assert.match(token, /^\d+\.[0-9a-f]{64}$/);
  assert.equal(isValidWordRacePreviewToken(token, now), true);

  const justBeforeExpiry = now + (WORD_RACE_PREVIEW_TOKEN_TTL_SECONDS - 1) * 1000;
  assert.equal(isValidWordRacePreviewToken(token, justBeforeExpiry), true);

  const afterExpiry = now + (WORD_RACE_PREVIEW_TOKEN_TTL_SECONDS + 1) * 1000;
  assert.equal(isValidWordRacePreviewToken(token, afterExpiry), false);
});

test("kurcalanmis token reddedilir", () => {
  const now = Date.now();
  const token = createWordRacePreviewToken(now);
  const [expiresAt, signature] = token.split(".");

  // Suresi uzatilmis ama imzasi eski token.
  assert.equal(isValidWordRacePreviewToken(`${Number(expiresAt) + 3600}.${signature}`, now), false);
  assert.equal(isValidWordRacePreviewToken(`${expiresAt}.${"0".repeat(64)}`, now), false);
  assert.equal(isValidWordRacePreviewToken(expiresAt, now), false);
  assert.equal(isValidWordRacePreviewToken(`abc.${signature}`, now), false);
  assert.equal(isValidWordRacePreviewToken(undefined, now), false);

  // Ham preview anahtari token yerine kullanilamaz.
  assert.equal(isValidWordRacePreviewToken(PREVIEW_KEY, now), false);
});

test("content route: token yoksa veya gecersizse 404 doner, govde sizdirmaz", async () => {
  for (const request of [contentRequest(), contentRequest(""), contentRequest("gecersiz.token")]) {
    const response = await GET(request);
    assert.equal(response.status, 404);
    assert.equal(response.headers.get("Cache-Control"), "no-store");
    assert.doesNotMatch(await response.text(), /Kelime Yar/i);
  }
});

test("content route: onizleme kapaliyken gecerli token bile 404 alir", async () => {
  const token = createWordRacePreviewToken();

  // withEnv senkron calisir; donen promise'i disarida bekliyoruz ki env
  // geri yuklenmesi istegin baslamasindan sonra gerceklessin.
  const response = await withEnv({ WORD_RACE_PREVIEW_ENABLED: "false" }, () =>
    GET(contentRequest(token)),
  );

  assert.equal(response.status, 404);
});

test("content route: gecerli token prototipin birebir HTML'ini dondurur", async () => {
  const response = await GET(contentRequest(createWordRacePreviewToken()));

  assert.equal(response.status, 200);
  assert.equal(response.headers.get("Content-Type"), "text/html; charset=utf-8");
  assert.match(response.headers.get("Cache-Control"), /no-store/);
  assert.equal(response.headers.get("X-Robots-Tag"), "noindex, nofollow, noarchive");

  const served = await response.text();
  const source = await readFile(SOURCE_PROTOTYPE, "utf8");

  assert.equal(served, source);
});

test("sunulan kopya kaynak prototiple ayni hash'e sahip (prototip degistirilmedi)", async () => {
  const [source, copy] = await Promise.all([
    readFile(SOURCE_PROTOTYPE),
    readFile(PRIVATE_PROTOTYPE),
  ]);

  // Satir sonu donusumunden bagimsiz olsun diye normalize edip hash aliyoruz;
  // boylece test farkli git checkout ayarlarinda da ayni sonucu verir.
  const hash = (buffer) =>
    createHash("sha256").update(buffer.toString("utf8").replace(/\r\n/g, "\n"), "utf8").digest("hex");

  assert.equal(hash(copy), hash(source));
  assert.equal(
    hash(source),
    "324ad6ad848bab26d9f18c2c4578075e3363a918759022d9bd0e7d9d9d602bd8",
  );
});

test("prototip public/ altina kopyalanmadi (dogrudan statik URL yok)", async () => {
  await assert.rejects(
    () => readFile(path.join(ROOT, "public", "previews", "kelime-yarisi", "index.html")),
    /ENOENT/,
  );
});

test("onizleme sayfasi anahtari sunucuda dogrular ve istemciye sizdirmaz", async () => {
  const page = await readFile(path.join(ROOT, "src", "app", "preview", "kelime-yarisi", "page.tsx"), "utf8");

  assert.doesNotMatch(page, /"use client"/);
  assert.match(page, /notFound\(\)/);
  assert.match(page, /isValidWordRacePreviewKey/);
  assert.match(page, /index: false/);
  assert.match(page, /sandbox="allow-scripts"/);
  // Anahtarin kendisi degil, kisa omurlu token iframe'e gecirilir.
  assert.doesNotMatch(page, /WORD_RACE_PREVIEW_KEY/);
  assert.doesNotMatch(page, /NEXT_PUBLIC_/);
});
