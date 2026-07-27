import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const PAGE_PATH = "src/app/egzersizler/blok-okuma/page.tsx";
const CLIENT_PATH = "src/app/egzersizler/blok-okuma/BlockReadingExerciseClient.tsx";

async function read(relativePath) {
  return readFile(new URL(`../${relativePath}`, import.meta.url), "utf8");
}

// ---------------------------------------------------------------------------
// 8-13) page.tsx / launch entegrasyonu
// ---------------------------------------------------------------------------

test("8) blok-okuma page.tsx dogru slug ile ortak helper'a delege eder", async () => {
  const source = await read(PAGE_PATH);

  assert.match(source, /const EXERCISE_SLUG = "blok-okuma";/);
  assert.match(
    source,
    /import \{ resolveEducationProgramExerciseLaunch \} from "@\/lib\/education-programs\/exerciseLaunchValidation";/,
  );
  assert.match(
    source,
    /await resolveEducationProgramExerciseLaunch\(\s*params\[LAUNCH_QUERY_PARAM\],\s*EXERCISE_SLUG,?\s*\)/,
  );
});

test("9) yalniz educationLaunch query parametresi okunur", async () => {
  const source = await read(PAGE_PATH);

  assert.match(source, /searchParams: Promise<\{\s*\[LAUNCH_QUERY_PARAM\]\?: string;\s*\}>/);
  assert.match(source, /const LAUNCH_QUERY_PARAM = "educationLaunch";/);
});

test("10) page.tsx kendi token/cookie/DB dogrulama mantigini kopyalamaz", async () => {
  const source = await read(PAGE_PATH);

  assert.doesNotMatch(source, /await cookies\(\)/);
  assert.doesNotMatch(source, /verifyStudentAccessToken/);
  assert.doesNotMatch(source, /readEducationProgramLaunchToken/);
  assert.doesNotMatch(source, /getEducationProgramTaskLaunchContext/);
  assert.doesNotMatch(source, /getSupabaseServiceRoleClient/);
});

test("11) client bilesenine educationProgramLaunch prop'u undefined fallback'iyle iletilir", async () => {
  const source = await read(PAGE_PATH);

  assert.match(
    source,
    /<BlockReadingExerciseClient educationProgramLaunch=\{educationProgramLaunch \?\? undefined\} \/>/,
  );
});

test("12) page.tsx Assignment System V2'ye bagli degildir", async () => {
  const source = await read(PAGE_PATH);

  assert.doesNotMatch(source, /@\/lib\/assignments\//);
  assert.doesNotMatch(source, /@\/components\/assignments\//);
});

test("13) build/route derlemesi icin page.tsx async server component olarak tanimlanmis", async () => {
  const source = await read(PAGE_PATH);

  assert.match(source, /export default async function BlockReadingPage/);
});

// ---------------------------------------------------------------------------
// 14-20) Client settings davranisi
// ---------------------------------------------------------------------------

test("14) educationProgramLaunch prop'u opsiyonel ve tipli olarak tanimlanir", async () => {
  const source = await read(CLIENT_PATH);

  assert.match(
    source,
    /import type \{ EducationProgramExerciseLaunchProps \} from "@\/lib\/education-programs\/exerciseLaunchProps";/,
  );
  assert.match(
    source,
    /export function BlockReadingExerciseClient\(\{\s*educationProgramLaunch,\s*\}: \{\s*educationProgramLaunch\?: EducationProgramExerciseLaunchProps;\s*\} = \{\}\)/,
  );
});

test("15) blockSize/speedMode/intervalMs/wordsPerMinute pickEducationProgramSettingOption ile okunur", async () => {
  const source = await read(CLIENT_PATH);

  assert.match(source, /pickEducationProgramSettingOption\(educationProgramLaunch\?\.settings, "blockSize", BLOCK_SIZE_OPTIONS, 3\)/);
  assert.match(source, /pickEducationProgramSettingOption\(educationProgramLaunch\?\.settings, "speedMode", SPEED_MODE_OPTIONS, "interval"\)/);
  assert.match(source, /pickEducationProgramSettingOption\(educationProgramLaunch\?\.settings, "intervalMs", INTERVAL_MS_OPTIONS, 750\)/);
  assert.match(source, /pickEducationProgramSettingOption\(educationProgramLaunch\?\.settings, "wordsPerMinute", WORDS_PER_MINUTE_OPTIONS, 150\)/);
});

test("16) durationSeconds/initialLevel/startingLevel bu egzersizde okunmaz (supportsLevel: false)", async () => {
  const source = await read(CLIENT_PATH);

  assert.doesNotMatch(source, /educationProgramLaunch\?\.initialLevel/);
  assert.doesNotMatch(source, /useAssignedDurationSeconds/);
  assert.doesNotMatch(source, /isValidLevel/);
});

test("17) assignedDurationSeconds duz deger olarak hesaplanir (useAssignedDurationSeconds KULLANILMAZ)", async () => {
  const source = await read(CLIENT_PATH);

  assert.match(
    source,
    /const assignedDurationSeconds = educationProgramLaunch\?\.durationSeconds \?\? Number\.POSITIVE_INFINITY;/,
  );
});

test("18) blockSize/speedMode/aktif hiz input'u Egitim Programi modunda kilitlenir", async () => {
  const source = await read(CLIENT_PATH);

  const blockSizeIndex = source.indexOf("Kelime Sayısı");
  const blockSizeSelect = source.slice(blockSizeIndex, source.indexOf("</select>", blockSizeIndex));
  assert.match(blockSizeSelect, /disabled=\{isEducationProgramMode\}/);

  const speedModeIndex = source.indexOf("Hız Modu");
  const speedModeSelect = source.slice(speedModeIndex, source.indexOf("</select>", speedModeIndex));
  assert.match(speedModeSelect, /disabled=\{isEducationProgramMode\}/);

  assert.match(source, /value=\{intervalInputMs\} disabled=\{isEducationProgramMode\}/);
  assert.match(source, /value=\{wordsPerMinuteInput\}\s*\n\s*disabled=\{isEducationProgramMode\}/);
});

test("19) fontSize, kategori ve metin secimi Egitim Programi modunda serbest kalir (ek kilit eklenmedi)", async () => {
  const source = await read(CLIENT_PATH);

  const fontIndex = source.indexOf(">Font<");
  const fontSelect = source.slice(fontIndex, source.indexOf("</select>", fontIndex));
  assert.doesNotMatch(fontSelect, /disabled=\{isEducationProgramMode/);

  const categoryIndex = source.indexOf(">Kategori<");
  const categorySelect = source.slice(categoryIndex, source.indexOf("</select>", categoryIndex));
  assert.doesNotMatch(categorySelect, /disabled/);

  const textIndex = source.indexOf(">Metin<");
  const textSelect = source.slice(textIndex, source.indexOf("</select>", textIndex));
  assert.doesNotMatch(textSelect, /disabled/);
});

test("20) egzersiz bileseni studentId/service-role/launch token gibi hassas alanlari okumaz", async () => {
  const source = await read(CLIENT_PATH);

  assert.doesNotMatch(source, /studentId/);
  assert.doesNotMatch(source, /SUPABASE_SERVICE_ROLE/);
  assert.doesNotMatch(source, /LAUNCH_SECRET/);
  assert.doesNotMatch(source, /signedToken|launchToken/i);
});

// ---------------------------------------------------------------------------
// 21-35) Coklu metin / biriken sure davranisi
// ---------------------------------------------------------------------------

test("21) cumulativeActiveSecondsRef ve completedTextCountRef client yasam dongusu icinde ref olarak tutulur (persist edilmez)", async () => {
  const source = await read(CLIENT_PATH);

  assert.match(source, /const cumulativeActiveSecondsRef = useRef\(0\);/);
  assert.match(source, /const completedTextCountRef = useRef\(0\);/);
  assert.doesNotMatch(source, /sessionStorage/);
  assert.doesNotMatch(source, /localStorage\.setItem/);
});

test("22) toplam aktif sure hesabi calculateTotalActiveSeconds ile yapilir (Date.now farki degil)", async () => {
  const source = await read(CLIENT_PATH);

  assert.match(
    source,
    /calculateTotalActiveSeconds\(\s*cumulativeActiveSecondsRef\.current,\s*elapsedSeconds,\s*\)/,
  );
});

test("23) handleTextEnd standalone modda dogrudan finalizeExercise'a yonlendirir (guard eklemez)", async () => {
  const source = await read(CLIENT_PATH);

  assert.match(
    source,
    /if \(!isEducationProgramMode\) \{\s*\n\s*finalizeExercise\(completedText\);\s*\n\s*return;\s*\n\s*\}/,
  );
});

test("24) handleTextEnd Egitim Programi modunda textEndInFlightRef ile cift-tetiklemeye karsi guard'lidir", async () => {
  const source = await read(CLIENT_PATH);

  assert.match(source, /const textEndInFlightRef = useRef\(false\);/);
  assert.match(
    source,
    /if \(textEndInFlightRef\.current\) \{\s*\n\s*return;\s*\n\s*\}\s*\n\s*textEndInFlightRef\.current = true;/,
  );
});

test("25) metin bitince cumulative tam olarak BIR kez guncellenir, sonra hasReachedAssignedDuration kontrolu yapilir", async () => {
  const source = await read(CLIENT_PATH);

  assert.match(
    source,
    /const nextTotalActiveSeconds = calculateTotalActiveSeconds\(\s*cumulativeActiveSecondsRef\.current,\s*elapsedSeconds,\s*\);\s*\n\s*cumulativeActiveSecondsRef\.current = nextTotalActiveSeconds;/,
  );
  assert.match(
    source,
    /if \(hasReachedAssignedDuration\(assignedDurationSeconds, nextTotalActiveSeconds, 0\)\) \{/,
  );
});

test("26) sure dolmadiysa finalizeExercise/saveExerciseResultSecure/completeTaskAfterResultSave cagrilmadan yeni-metin ekranina donulur", async () => {
  const source = await read(CLIENT_PATH);

  const handleTextEndStart = source.indexOf("const handleTextEnd = useCallback(");
  const handleTextEndEnd = source.indexOf("const handleFinishEarly", handleTextEndStart);
  const handleTextEndBody = source.slice(handleTextEndStart, handleTextEndEnd);

  // Ikinci (ve son) finalizeExercise cagrisindan SONRAKI kisim, sure
  // dolmadiginda calisan "ara durum" dalidir - bu kisimda finalizeExercise
  // BIR DAHA cagrilmamali.
  const lastFinalizeCallIndex = handleTextEndBody.lastIndexOf("finalizeExercise(completedText);");
  const afterFinalizeCall = handleTextEndBody.slice(lastFinalizeCallIndex + "finalizeExercise(completedText);".length);

  assert.doesNotMatch(afterFinalizeCall, /finalizeExercise\(/);
  assert.match(afterFinalizeCall, /setNewTextNotice\(\{/);
  assert.match(afterFinalizeCall, /resetFlowToReady\(\);/);
});

test("27) yeni-metin bildirimi tamamlanan sureyi, kalan sureyi ve tamamlanan metin sayisini icerir", async () => {
  const source = await read(CLIENT_PATH);

  assert.match(
    source,
    /setNewTextNotice\(\{\s*\n\s*cumulativeActiveSeconds: nextTotalActiveSeconds,\s*\n\s*remainingSeconds: calculateRemainingActiveSeconds\(assignedDurationSeconds, nextTotalActiveSeconds, 0\),\s*\n\s*completedTextCount: completedTextCountRef\.current,\s*\n\s*\}\);/,
  );
});

test("28) yeni-metin ekrani mevcut ready fazini yeniden kullanir; yeni bir modal/route/bilesen eklenmedi", async () => {
  const source = await read(CLIENT_PATH);

  assert.match(source, /if \(phase === "ready"\) \{/);
  assert.match(source, /isEducationProgramMode && newTextNotice \?/);
  assert.doesNotMatch(source, /Modal/);
  assert.doesNotMatch(source, /createPortal/);
});

test("29) yeni-metin banner metni tam olarak istenen baslik/aciklamayi icerir, tamamlanma mesaji degildir", async () => {
  const source = await read(CLIENT_PATH);

  assert.match(source, /Görev süreniz henüz dolmadı/);
  assert.match(
    source,
    /Bu metni tamamladınız\. Görevi tamamlamak için yeni bir metin seçerek devam etmelisiniz\./,
  );
});

test("30) Başlat butonu yeni-metin bildirimi varken 'Yeni Metinle Devam Et' olarak degisir", async () => {
  const source = await read(CLIENT_PATH);

  assert.match(source, /\{newTextNotice \? "Yeni Metinle Devam Et" : "Başlat"\}/);
});

test("31) yeni metin secildiginde/handleBeginPlay'de per-text state sifirlanir, banner kapanir, guard sifirlanir", async () => {
  const source = await read(CLIENT_PATH);

  const handleBeginPlayStart = source.indexOf("const handleBeginPlay = () => {");
  const handleBeginPlayEnd = source.indexOf("const handleRestart", handleBeginPlayStart);
  const body = source.slice(handleBeginPlayStart, handleBeginPlayEnd);

  assert.match(body, /setCurrentBlockIndex\(0\);/);
  assert.match(body, /setElapsedSeconds\(0\);/);
  assert.match(body, /setIsPaused\(false\);/);
  assert.match(body, /setNewTextNotice\(null\);/);
  assert.match(body, /textEndInFlightRef\.current = false;/);
});

test("32) handleBeginPlay cumulativeActiveSecondsRef/completedTextCountRef degerlerine dokunmaz (korunur)", async () => {
  const source = await read(CLIENT_PATH);

  const handleBeginPlayStart = source.indexOf("const handleBeginPlay = () => {");
  const handleBeginPlayEnd = source.indexOf("const handleRestart", handleBeginPlayStart);
  const body = source.slice(handleBeginPlayStart, handleBeginPlayEnd);

  assert.doesNotMatch(body, /cumulativeActiveSecondsRef\.current = /);
  assert.doesNotMatch(body, /completedTextCountRef\.current = /);
});

test("33) handleRestart 'Yeniden Baslat' butonu icin cumulative/completedTextCount'u BILEREK sifirlar (resetFlowToReady bunlara dokunmaz)", async () => {
  const source = await read(CLIENT_PATH);

  assert.match(
    source,
    /const handleRestart = \(\) => \{[\s\S]*?cumulativeActiveSecondsRef\.current = 0;\s*\n\s*completedTextCountRef\.current = 0;/,
  );

  const resetFlowStart = source.indexOf("const resetFlowToReady = useCallback(");
  const resetFlowEnd = source.indexOf("const handleStart", resetFlowStart);
  const resetFlowBody = source.slice(resetFlowStart, resetFlowEnd);
  assert.doesNotMatch(resetFlowBody, /cumulativeActiveSecondsRef/);
  assert.doesNotMatch(resetFlowBody, /completedTextCountRef/);
});

test("34) süre ogretmenin belirledigi degere metin ORTASINDA ulasirsa ikinci bir setInterval kurulmadan mevcut elapsedSeconds izlenerek yakalanir", async () => {
  const source = await read(CLIENT_PATH);

  const setIntervalMatches = [...source.matchAll(/window\.setInterval/g)];
  assert.equal(setIntervalMatches.length, 1, "yalniz mevcut tek setInterval korunmali, ikincisi eklenmemeli");

  assert.match(
    source,
    /if \(!isEducationProgramMode \|\| phase !== "running" \|\| isPaused\) \{\s*\n\s*return;\s*\n\s*\}\s*\n\s*\n\s*if \(hasReachedAssignedDuration\(assignedDurationSeconds, cumulativeActiveSecondsRef\.current, elapsedSeconds\)\) \{\s*\n\s*handleTextEnd\(false\);/,
  );
});

test("35) completedTextCount yalniz gercekten tamamlanan (completedText true olan) metinleri sayar", async () => {
  const source = await read(CLIENT_PATH);

  assert.match(
    source,
    /if \(completedText\) \{\s*\n\s*completedTextCountRef\.current \+= 1;\s*\n\s*\}/,
  );
});

// ---------------------------------------------------------------------------
// 36-39) Manuel Bitir davranisi
// ---------------------------------------------------------------------------

test("36) standalone modda 'Bitir' butonu mevcut finalizeExercise(false) davranisini korur (handleTextEnd uzerinden)", async () => {
  const source = await read(CLIENT_PATH);

  assert.match(
    source,
    /const handleFinishEarly = \(\) => \{\s*\n\s*handleTextEnd\(false\);\s*\n\s*\};/,
  );
});

test("37) Egitim Programi modunda 'Bitir' suresi dolmadiysa yeni-metin ekranina gecer, sonuc kaydetmez", async () => {
  const source = await read(CLIENT_PATH);
  // handleFinishEarly -> handleTextEnd(false) -> EP modunda ayni ara-durum
  // yoluna girer (bkz. 26. test), finalizeExercise sadece sure dolduysa cagrilir.
  assert.match(source, /handleTextEnd\(false\)/);
});

test("38) sure zaten dolduysa 'Bitir' normal final finish akisini calistirir (hasReachedAssignedDuration kontrolu handleTextEnd icinde ortak)", async () => {
  const source = await read(CLIENT_PATH);

  const handleTextEndStart = source.indexOf("const handleTextEnd = useCallback(");
  const handleTextEndEnd = source.indexOf("const handleFinishEarly", handleTextEndStart);
  const body = source.slice(handleTextEndStart, handleTextEndEnd);

  // Ayni hasReachedAssignedDuration kontrolu hem otomatik-bitis hem manuel
  // Bitir icin ortak - manuel Bitir icin ayri bir "sure doldu mu" kontrolu
  // TEKRAR yazilmadi (kod tekrari yok).
  const reachedDurationMatches = [...body.matchAll(/hasReachedAssignedDuration\(/g)];
  assert.equal(reachedDurationMatches.length, 1);
});

test("39) manuel Bitir ile yarida kesilen metin completedTextCount'a eklenmez (completedText=false)", async () => {
  const source = await read(CLIENT_PATH);

  assert.match(source, /const handleFinishEarly = \(\) => \{\s*\n\s*handleTextEnd\(false\);/);
});

// ---------------------------------------------------------------------------
// 48-55) Secure sonuc kaydi ve Egitim Programi gorev completion
// ---------------------------------------------------------------------------

test("48) legacy saveExerciseResult yerine saveExerciseResultSecure kullanilir (hem standalone hem EP modunda)", async () => {
  const source = await read(CLIENT_PATH);

  assert.match(
    source,
    /import \{ saveExerciseResultSecure, type SecureExerciseResultInput \} from "@\/lib\/results\/secureResultStorage";/,
  );
  assert.doesNotMatch(source, /from "@\/lib\/results\/resultStorage"/);
  assert.match(source, /await saveExerciseResultSecure\(payload\)/);
});

test("49) exerciseType payload'da tam olarak block-reading olarak gonderilir", async () => {
  const source = await read(CLIENT_PATH);

  assert.match(source, /exerciseType: "block-reading",/);
});

test("50) useEducationProgramTaskCompletion dogru exerciseType ve taskId ile cagrilir, isAssignmentMode ile de gate'lenir", async () => {
  const source = await read(CLIENT_PATH);

  assert.match(source, /const EXPECTED_RESULT_EXERCISE_TYPE = "block-reading";/);
  assert.match(
    source,
    /const educationProgramTaskId =\s*\n\s*isEducationProgramMode && !isAssignmentMode \? educationProgramLaunch\?\.taskId : undefined;/,
  );
  assert.match(
    source,
    /useEducationProgramTaskCompletion\(educationProgramTaskId, EXPECTED_RESULT_EXERCISE_TYPE\)/,
  );
});

test("51) persistResult saveInFlightRef/saveCompletedRef ile cift-kayda karsi guard'lidir", async () => {
  const source = await read(CLIENT_PATH);

  assert.match(
    source,
    /if \(saveInFlightRef\.current \|\| saveCompletedRef\.current\) \{\s*\n\s*return;\s*\n\s*\}/,
  );
});

test("52) sonuc kaydedildikten sonra completeTaskAfterResultSave await edilir (once kayit, sonra completion)", async () => {
  const source = await read(CLIENT_PATH);

  assert.match(
    source,
    /const saved = await saveExerciseResultSecure\(payload\);[\s\S]{0,300}await completeTaskAfterResultSave\(\);/,
  );
});

test("53) completion basarisiz olursa retry banner ayni ekranda kalir; otomatik router.push YAPILMAZ (Takistoskop hatasi tekrarlanmadi)", async () => {
  const source = await read(CLIENT_PATH);

  assert.match(source, /completionStatus\.state === "error" && completionStatus\.canRetry/);
  assert.match(source, /onClick=\{\(\) => void retryTaskCompletion\(\)\}/);
  assert.doesNotMatch(source, /completeTaskAfterResultSave\(\)[\s\S]{0,120}router\.push/);
});

test("54) retryTaskCompletion yalniz completion cagrisini tekrar dener, sonucu YENIDEN KAYDETMEZ", async () => {
  const source = await read(CLIENT_PATH);

  const retrySite = source.indexOf("void retryTaskCompletion()");
  assert.ok(retrySite >= 0);
  const nearbyBlock = source.slice(retrySite - 200, retrySite + 50);
  assert.doesNotMatch(nearbyBlock, /saveExerciseResultSecure/);
});

test("55) navigasyon butonlari (Yeniden Baslat / Ortak Sonuc Ekrani) saveStatus success olmadan aktif olmaz", async () => {
  const source = await read(CLIENT_PATH);

  const navSectionStart = source.indexOf('<div className="mt-6 grid gap-3 sm:grid-cols-2">');
  const navSectionEnd = source.indexOf("</div>", source.indexOf("Ortak Sonuc Ekrani", navSectionStart));
  const navSection = source.slice(navSectionStart, navSectionEnd);

  const disabledMatches = [...navSection.matchAll(/disabled=\{saveStatus !== "success"\}/g)];
  assert.equal(disabledMatches.length, 2, "hem Yeniden Baslat hem Ortak Sonuc Ekrani butonu kilitlenmeli");
});

// NOT: Golgeleme, Blok Okuma'dan SONRAKI bir turda kasitli olarak Egitim
// Programi'na entegre edildi (bkz. education-program-shadow-reading-*.test.mjs)
// - bu yuzden Golgeleme artik educationProgramLaunch icerir, bu beklenen ve
// dogru bir durumdur. Gruplama ise hala hicbir turda degistirilmedi.
test("Gruplama dosyalari bu turda degismedi (dokunulmadi)", async () => {
  const groupingSource = await read("src/app/egzersizler/gruplama/GroupingReadingExerciseClient.tsx").catch(() => null);

  if (groupingSource !== null) {
    assert.doesNotMatch(groupingSource, /educationProgramLaunch/);
  }
});
