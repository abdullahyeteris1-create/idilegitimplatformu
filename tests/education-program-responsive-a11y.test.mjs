import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

// FAZ 4-2B-3: Egitim Programim ekraninin YALNIZ sunum katmani icin
// source-contract kontrolleri. Burada is mantigi, repository, API, RPC veya
// completion akisi test EDILMEZ - bunlar kendi test dosyalarinda kalir.
// Testler kasitli olarak tam CSS snapshot degil: yalniz kirilirsa gercek bir
// responsive/erisilebilirlik gerilemesi anlamina gelen kritik selector ve
// kurallar dogrulanir.

async function read(relativePath) {
  return readFile(new URL(`../${relativePath}`, import.meta.url), "utf8");
}

const VIEW_CSS_PATH =
  "src/components/education-programs/StudentEducationProgramStudentView.module.css";
const EXPLORER_CSS_PATH =
  "src/components/education-programs/StudentEducationProgramDaysExplorer.module.css";
const HERO_CSS_PATH =
  "src/components/education-programs/StudentEducationProgramHero.module.css";
const PANEL_CSS_PATH =
  "src/components/education-programs/EducationProgramProgressPanel.module.css";
const LAUNCH_CSS_PATH =
  "src/components/education-programs/TaskLaunchForm.module.css";
const PANEL_PATH =
  "src/components/education-programs/EducationProgramProgressPanel.tsx";
const EXPLORER_PATH =
  "src/components/education-programs/StudentEducationProgramDaysExplorer.tsx";

// --- Mobil: 360 / 390 ---

test("360px sinifi icin ayri ince ayar breakpoint'i (max-width: 380px) tanimlidir", async () => {
  for (const path of [VIEW_CSS_PATH, EXPLORER_CSS_PATH, HERO_CSS_PATH, PANEL_CSS_PATH]) {
    const css = await read(path);
    assert.match(
      css,
      /@media \(max-width: 380px\)/,
      `${path} icinde 380px ince ayar kurali beklenir`,
    );
  }
});

test("390px mobil, 640px mobil kurallarinin kapsamindadir (hero 2 kolona duser, 1 kolona degil)", async () => {
  const css = await read(HERO_CSS_PATH);

  const mobileBlock = css.slice(css.indexOf("@media (max-width: 640px)"));
  assert.match(
    mobileBlock,
    /\.summaryGrid\s*\{[^}]*grid-template-columns:\s*repeat\(2, minmax\(0, 1fr\)\)/s,
    "hero ozet grid'i mobilde guvenli 2 kolona duser (tek kolon hero'yu asiri uzatiyordu)",
  );
});

test("360px'te progress ring kuculur ve aria tasiyan sarmalayici yapisi korunur", async () => {
  const css = await read(PANEL_CSS_PATH);
  const source = await read(PANEL_PATH);

  const narrowBlock = css.slice(css.indexOf("@media (max-width: 380px)"));
  assert.match(narrowBlock, /\.ringWrap\s*\{[^}]*width:\s*112px/s);

  // Kucultme yalniz gorsel: progressbar ARIA degerleri ve SVG'nin dekoratif
  // (aria-hidden) rolu degismemis olmali.
  assert.match(source, /aria-valuenow=\{overallTaskProgress\}/);
  assert.match(source, /<svg viewBox="0 0 120 120"[^>]*aria-hidden="true"/);
});

test("mobilde gorev kartinin sabit min-height'i serbest birakilir (gereksiz dikey bosluk olmaz)", async () => {
  const css = await read(VIEW_CSS_PATH);

  const narrowBlock = css.slice(css.indexOf("@media (max-width: 480px)"));
  assert.match(narrowBlock, /\.taskCard\s*\{[^}]*min-height:\s*0/s);
});

// --- Tablet: 768 / 1024 ---

test("1200px altinda panel tam genislige duser ve tablet araliginda yatay bilgi duzenine gecer", async () => {
  const viewCss = await read(VIEW_CSS_PATH);
  const panelCss = await read(PANEL_CSS_PATH);

  // 768 ve 1024 bu kuralla tek kolona duser -> panel tam genislik.
  assert.match(viewCss, /@media \(max-width: 1200px\)\s*\{\s*\.workspaceGrid/);

  assert.match(
    panelCss,
    /@media \(min-width: 721px\) and \(max-width: 1200px\)/,
    "tablet araliginda panel yatay yerlesime gecmeli",
  );
  const tabletBlock = panelCss.slice(
    panelCss.indexOf("@media (min-width: 721px) and (max-width: 1200px)"),
  );
  assert.match(tabletBlock, /\.panel\s*\{[^}]*display:\s*grid/s);
});

test("768px'te gorev kartlari en fazla guvenli iki kolon kalir", async () => {
  const css = await read(VIEW_CSS_PATH);

  assert.match(
    css,
    /@media \(max-width: 980px\)\s*\{\s*\.taskGrid\s*\{\s*grid-template-columns:\s*repeat\(2, minmax\(0, 1fr\)\)/,
  );
});

// --- Masaustu: 1366 / 1920 ---

test("1366px sinifinda (1201-1500) sag panel ve gun navigasyonu daraltilarak orta gorev alani genisletilir", async () => {
  const viewCss = await read(VIEW_CSS_PATH);
  const explorerCss = await read(EXPLORER_CSS_PATH);

  assert.match(viewCss, /@media \(min-width: 1201px\) and \(max-width: 1500px\)/);
  assert.match(explorerCss, /@media \(min-width: 981px\) and \(max-width: 1500px\)/);

  // Taban (>=1501px) olculeri degismemis olmali.
  assert.match(
    viewCss,
    /\.workspaceGrid\s*\{[^}]*grid-template-columns:\s*minmax\(0, 1fr\) minmax\(260px, 320px\)/s,
  );
  assert.match(
    explorerCss,
    /grid-template-columns: minmax\(240px, 300px\) minmax\(0, 1fr\)/,
  );
});

test("1920px'te icerik makul bir max-width ile sinirli kalir", async () => {
  const css = await read(VIEW_CSS_PATH);

  assert.match(css, /\.shell\s*\{[^}]*width:\s*min\(100%, 1180px\)/s);
  const wideBlock = css.slice(css.indexOf("@media (min-width: 1600px)"));
  assert.match(wideBlock, /\.shell\s*\{[^}]*width:\s*min\(100%, 1320px\)/s);
});

test("gorev grid'i kalan genislige uyarlanir, kartlar ne ezilir ne devlesir", async () => {
  const css = await read(VIEW_CSS_PATH);

  assert.match(
    css,
    /\.taskGrid\s*\{[^}]*grid-template-columns:\s*repeat\(auto-fit, minmax\(160px, 1fr\)\)/s,
  );
});

// --- Uzun metin tasmasi ---

test("uzun baslik/aciklama/etiketler kelime icinden kirilarak tasma yapmaz", async () => {
  const viewCss = await read(VIEW_CSS_PATH);
  const heroCss = await read(HERO_CSS_PATH);
  const panelCss = await read(PANEL_CSS_PATH);

  assert.match(viewCss, /\.taskCard h3\s*\{[^}]*overflow-wrap:\s*anywhere/s);
  assert.match(viewCss, /\.dayHeader h2\s*\{[^}]*overflow-wrap:\s*anywhere/s);
  assert.match(heroCss, /\.hero h1\s*\{[^}]*overflow-wrap:\s*anywhere/s);
  assert.match(heroCss, /\.studentMessage\s*\{[^}]*overflow-wrap:\s*anywhere/s);
  assert.match(panelCss, /\.statLabel\s*\{[^}]*overflow-wrap:\s*anywhere/s);
});

// --- Gun navigasyonu: yatay scroll + snap ---

test("980px altinda gun navigasyonu yatay kaydirilabilir kalir ve hafif scroll-snap kullanir", async () => {
  const css = await read(EXPLORER_CSS_PATH);
  const mobileBlock = css.slice(css.indexOf("@media (max-width: 980px)"));

  assert.match(mobileBlock, /flex-direction: row;/);
  assert.match(mobileBlock, /overflow-x: auto;/);
  // proximity (mandatory degil): kullanicinin serbest kaydirmasini engellemez.
  assert.match(mobileBlock, /scroll-snap-type:\s*x proximity/);
  assert.match(mobileBlock, /\.navItem\s*\{[^}]*scroll-snap-align:\s*start/s);
});

test("yatay kaydirma alaninin scrollbar deneyimi tema token'lariyla iyilestirilir", async () => {
  const css = await read(EXPLORER_CSS_PATH);

  assert.match(css, /scrollbar-width:\s*thin/);
  assert.match(css, /\.dayNavList::-webkit-scrollbar/);
  assert.match(css, /var\(--idil-accent-soft\)/);
});

test("aktif gun secimi renk disinda da belirgindir ve aria-current korunur", async () => {
  const css = await read(EXPLORER_CSS_PATH);
  const source = await read(EXPLORER_PATH);

  assert.match(css, /\.navItemSelected \.navItemDayNumber\s*\{[^}]*color:\s*var\(--idil-accent\)/s);
  assert.match(source, /aria-current=\{isSelected \? "true" : undefined\}/);
});

test("kilitli gun tiklanabilir gorunmez ve hover almaz", async () => {
  const css = await read(EXPLORER_CSS_PATH);
  const source = await read(EXPLORER_PATH);

  assert.match(css, /\.navItem:disabled\s*\{[^}]*cursor:\s*not-allowed/s);
  assert.match(css, /\.navItem:hover:not\(:disabled\)/);
  assert.match(source, /disabled=\{isLocked\}/);
});

// --- Dokunma hedefleri ---

test("tum birincil dokunma hedefleri minimum 44px yuksekligi korur", async () => {
  const viewCss = await read(VIEW_CSS_PATH);
  const explorerCss = await read(EXPLORER_CSS_PATH);
  const launchCss = await read(LAUNCH_CSS_PATH);

  assert.match(viewCss, /\.backLink\s*\{[^}]*min-height:\s*44px/s);
  assert.match(viewCss, /\.retryButton\s*\{[^}]*min-height:\s*44px/s);
  assert.match(explorerCss, /\.navItem\s*\{[^}]*min-height:\s*44px/s);
  assert.match(launchCss, /\.launchButton\s*\{[^}]*min-height:\s*44px/s);
});

test("sonuc ekranindaki 'Eğitim Programıma Dön' baglantisi da 44px hedefi tasir", async () => {
  const css = await read("src/components/results/result-summary-theme.module.css");

  assert.match(
    css,
    /\.educationProgramNoticeLink\s*\{[^}]*min-height:\s*44px/s,
  );
});

// --- focus-visible ---

test("tum interaktif elemanlarda gorunur focus-visible halkasi vardir ve outline kaldirilmaz", async () => {
  const viewCss = await read(VIEW_CSS_PATH);
  const explorerCss = await read(EXPLORER_CSS_PATH);
  const launchCss = await read(LAUNCH_CSS_PATH);
  const resultCss = await read(
    "src/components/results/result-summary-theme.module.css",
  );

  assert.match(viewCss, /\.backLink:focus-visible\s*\{[^}]*outline:\s*3px solid var\(--idil-accent\)/s);
  assert.match(viewCss, /\.retryButton:focus-visible\s*\{[^}]*outline:\s*2px solid var\(--idil-accent\)/s);
  assert.match(explorerCss, /\.navItem:focus-visible\s*\{[^}]*outline:\s*3px solid var\(--idil-accent\)/s);
  assert.match(launchCss, /\.launchButton:focus-visible\s*\{[^}]*outline:\s*3px solid var\(--idil-accent\)/s);
  assert.match(resultCss, /\.educationProgramNoticeLink:focus-visible/);

  for (const css of [viewCss, explorerCss, launchCss]) {
    assert.doesNotMatch(
      css,
      /:focus-visible\s*\{[^}]*outline:\s*none/s,
      "focus halkasi hicbir yerde kaldirilmamali",
    );
  }
});

// --- prefers-reduced-motion ---

test("reduced-motion altinda transform tabanli hover hareketleri devre disi kalir", async () => {
  const viewCss = await read(VIEW_CSS_PATH);
  const explorerCss = await read(EXPLORER_CSS_PATH);
  const launchCss = await read(LAUNCH_CSS_PATH);

  for (const [label, css] of [
    ["view", viewCss],
    ["explorer", explorerCss],
    ["launch", launchCss],
  ]) {
    const reducedBlock = css.slice(css.indexOf("@media (prefers-reduced-motion: reduce)"));
    assert.match(
      reducedBlock,
      /transform:\s*none/,
      `${label}: transition:none tek basina hover ziplamasini engellemiyor`,
    );
  }
});

test("reduced-motion altinda ilerleme ring animasyonu kapanir ama deger gosterimi kalir", async () => {
  const css = await read(PANEL_CSS_PATH);
  const source = await read(PANEL_PATH);

  const reducedBlock = css.slice(css.indexOf("@media (prefers-reduced-motion: reduce)"));
  assert.match(reducedBlock, /\.ringFill\s*\{[^}]*transition:\s*none/s);

  // Islevsel geri bildirim (yuzde metni) animasyondan bagimsiz.
  assert.match(source, /className=\{styles\.ringPercent\}>%\{overallTaskProgress\}/);
});

// --- Tema ve kontrast ---

test("acik temada durum rozetleri okunabilir tona cekilir, koyu tema kurallari korunur", async () => {
  const css = await read(VIEW_CSS_PATH);

  assert.match(css, /\[data-idil-theme="light"\] \.statusAvailable/);
  assert.match(css, /\[data-idil-theme="light"\] \.statusInProgress/);
  assert.match(css, /\[data-idil-theme="light"\] \.statusCompleted/);

  // Koyu tema taban degerleri silinmedi.
  assert.match(css, /\.statusCompleted\s*\{[^}]*color:\s*#4ade80/s);
});

test("sayfa arka plani uzerindeki eyebrow sabit hex yerine tema token'i kullanir", async () => {
  const css = await read(VIEW_CSS_PATH);

  assert.match(css, /\.eyebrow\s*\{[^}]*color:\s*var\(--idil-accent\)/s);
});

test("bu fazda yeni global token tanimlanmadi", async () => {
  for (const path of [VIEW_CSS_PATH, EXPLORER_CSS_PATH, HERO_CSS_PATH, PANEL_CSS_PATH, LAUNCH_CSS_PATH]) {
    const css = await read(path);
    assert.doesNotMatch(css, /:root\s*\{/, `${path} icinde :root tanimi olmamali`);
  }
});

// --- Kapsam sinirlari ---

test("bu faz yalniz sunum katmanina dokundu: CSS dosyalarinda is mantigi izi yok", async () => {
  for (const path of [VIEW_CSS_PATH, EXPLORER_CSS_PATH, HERO_CSS_PATH, PANEL_CSS_PATH, LAUNCH_CSS_PATH]) {
    const css = await read(path);
    assert.doesNotMatch(css, /supabase|launchToken/i, `${path}`);
  }
});
