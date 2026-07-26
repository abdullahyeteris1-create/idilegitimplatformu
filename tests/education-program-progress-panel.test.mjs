import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

async function read(relativePath) {
  return readFile(new URL(`../${relativePath}`, import.meta.url), "utf8");
}

const PANEL_PATH =
  "src/components/education-programs/EducationProgramProgressPanel.tsx";
const PANEL_CSS_PATH =
  "src/components/education-programs/EducationProgramProgressPanel.module.css";
const VIEW_PATH =
  "src/components/education-programs/StudentEducationProgramStudentView.tsx";
const VIEW_CSS_PATH =
  "src/components/education-programs/StudentEducationProgramStudentView.module.css";
const EXPLORER_CSS_PATH =
  "src/components/education-programs/StudentEducationProgramDaysExplorer.module.css";

// --- FAZ 4-2B-2: Panel yalniz mevcut veriyi kullanir ---

test("Panel yalniz mevcut veri alanlarini prop olarak alir", async () => {
  const source = await read(PANEL_PATH);

  const expectedProps = [
    "overallTaskProgress",
    "completedTaskCount",
    "totalTaskCount",
    "completedDays",
    "totalDays",
    "currentDayNumber",
    "todayCompletedTaskCount",
    "todayTotalTaskCount",
    "selectedDayDurationSeconds",
  ];

  for (const prop of expectedProps) {
    assert.match(source, new RegExp(prop), `${prop} prop olarak beklenir`);
  }
});

test("Panelde seri/puan/dogru-yanlis/sahte istatistik alani yoktur", async () => {
  const source = await read(PANEL_PATH);

  assert.doesNotMatch(source, /\bseri\b/i);
  assert.doesNotMatch(source, /streak/i);
  assert.doesNotMatch(source, /\bscore\b/i);
  assert.doesNotMatch(source, /correctCount|wrongCount/);
  assert.doesNotMatch(source, /successRate/);
  assert.doesNotMatch(source, /Math\.random/);
});

test("Panel hicbir repository/API/RPC/completion/launch dosyasina bagli degildir", async () => {
  const source = await read(PANEL_PATH);

  assert.doesNotMatch(source, /studentProgramRepository/);
  assert.doesNotMatch(source, /getSupabaseServiceRoleClient/);
  assert.doesNotMatch(source, /completeEducationProgramTask/);
  assert.doesNotMatch(source, /useEducationProgramTaskCompletion/);
  assert.doesNotMatch(source, /launchToken/i);
  assert.doesNotMatch(source, /fetch\(/);
  assert.doesNotMatch(source, /@\/lib\/assignments\//);
  assert.doesNotMatch(source, /@\/components\/assignments\//);
});

// --- ARIA ---

test("Genel ilerleme progressbar dogru ARIA ozelliklerini tasir", async () => {
  const source = await read(PANEL_PATH);

  assert.match(source, /role="progressbar"/);
  assert.match(source, /aria-label="Genel program ilerlemesi"/);
  assert.match(source, /aria-valuemin=\{0\}/);
  assert.match(source, /aria-valuemax=\{100\}/);
  assert.match(source, /aria-valuenow=\{overallTaskProgress\}/);
});

test("Bugunku gun progressbar'i da ARIA deger ozelliklerini tasir", async () => {
  const source = await read(PANEL_PATH);

  assert.match(source, /aria-label="Bugünkü gün ilerlemesi"/);
  assert.match(source, /aria-valuenow=\{todayPercent\}/);
});

// --- Secili gun suresi ---

test("Secili gunun suresi 0 ise sure satiri gizlenir", async () => {
  const source = await read(PANEL_PATH);

  assert.match(source, /selectedDayDurationSeconds > 0 \? \(/);
});

test("Sure formatlama icin mevcut formatStudentProgramDuration yeniden kullanilir", async () => {
  const source = await read(PANEL_PATH);

  assert.match(
    source,
    /import \{[\s\S]*formatStudentProgramDuration[\s\S]*\} from "@\/lib\/education-programs\/studentProgramPresentation"/,
  );
  assert.match(source, /formatStudentProgramDuration\(selectedDayDurationSeconds\)/);
});

test("Motivasyon metni sabit ve genel, kisisellestirilmis analiz gibi sunulmaz", async () => {
  const source = await read(PANEL_PATH);

  assert.match(
    source,
    /Her tamamlanan görev sizi hedefinize biraz daha yaklaştırır\./,
  );
});

// --- Tema ---

test("Panel ana metinleri sabit renk degil --idil-text/--idil-muted token'lariyla okunur", async () => {
  const css = await read(PANEL_CSS_PATH);

  assert.match(css, /\.panel\s*\{[^}]*color:\s*var\(--idil-text\)/s);
  assert.match(css, /\.ringPercent\s*\{[^}]*color:\s*var\(--idil-text\)/s);
  assert.match(css, /\.statValue\s*\{[^}]*color:\s*var\(--idil-text\)/s);
});

test("Panel aktif/basari vurgulari icin mevcut --idil-program-accent/--idil-program-success token'larini kullanir", async () => {
  const css = await read(PANEL_CSS_PATH);

  assert.match(css, /var\(--idil-program-accent\)/);
  assert.match(css, /var\(--idil-program-success\)/);
});

test("Panel icinde yeni bir global token tanimlanmaz (yalniz mevcut --idil-* tuketilir)", async () => {
  const css = await read(PANEL_CSS_PATH);

  assert.doesNotMatch(css, /:root\s*\{/);
  assert.doesNotMatch(css, /--idil-panel-/);
});

// --- 3 kolonlu masaustu duzeni ---

test("StudentEducationProgramStudentView 3 kolonlu is alanini kurar (Explorer + Panel)", async () => {
  const source = await read(VIEW_PATH);

  assert.match(source, /<div className=\{styles\.workspaceGrid\}>/);
  assert.match(source, /<StudentEducationProgramDaysExplorer/);
  assert.match(source, /<EducationProgramProgressPanel/);
});

test("workspaceGrid onerilen genislikleri ve 1200px tablet dususunu tasir", async () => {
  const css = await read(VIEW_CSS_PATH);

  assert.match(
    css,
    /\.workspaceGrid\s*\{[^}]*grid-template-columns:\s*minmax\(0, 1fr\) minmax\(260px, 320px\)/s,
  );
  assert.match(css, /@media \(max-width: 1200px\)\s*\{\s*\.workspaceGrid/);
});

test("980px altindaki gun navigasyonu davranisi degismedi (Explorer kendi grid'ini korur)", async () => {
  const explorerCss = await read(EXPLORER_CSS_PATH);

  assert.match(
    explorerCss,
    /grid-template-columns: minmax\(240px, 300px\) minmax\(0, 1fr\)/,
  );
  assert.match(explorerCss, /@media \(max-width: 980px\)/);
  assert.match(explorerCss, /flex-direction: row;/);
});

// --- Kapsam sinirlari ---

test("Bu faz repository/RPC/API/migration dosyalarina dokunmadi", async () => {
  const viewSource = await read(VIEW_PATH);
  const panelSource = await read(PANEL_PATH);

  const forbidden = /supabase\/migrations|studentProgramRepository\.ts|\/api\/student\/education-program/;
  assert.doesNotMatch(viewSource, forbidden);
  assert.doesNotMatch(panelSource, forbidden);
});

test("Program tamamlandi karti bu fazda kaldirilmadi (repository filtresi nedeniyle erisilemez oldugu bilinerek oldugu gibi birakildi)", async () => {
  const viewSource = await read(VIEW_PATH);

  assert.match(viewSource, /program\.status === "completed"/);
  assert.match(viewSource, /styles\.completionCard/);
});
