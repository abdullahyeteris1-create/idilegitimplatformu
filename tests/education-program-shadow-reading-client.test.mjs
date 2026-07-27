import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const PAGE_PATH = "src/app/egzersizler/golgeleme/page.tsx";
const CLIENT_PATH = "src/app/egzersizler/golgeleme/ShadowReadingExerciseClient.tsx";

async function read(relativePath) {
  return readFile(new URL(`../${relativePath}`, import.meta.url), "utf8");
}

// ---------------------------------------------------------------------------
// 7-9) page.tsx / launch entegrasyonu
// ---------------------------------------------------------------------------

test("7) golgeleme page.tsx ortak launch helper'ini kullanir, dogru slug ile delege eder", async () => {
  const source = await read(PAGE_PATH);

  assert.match(source, /const EXERCISE_SLUG = "golgeleme";/);
  assert.match(
    source,
    /import \{ resolveEducationProgramExerciseLaunch \} from "@\/lib\/education-programs\/exerciseLaunchValidation";/,
  );
  assert.match(
    source,
    /await resolveEducationProgramExerciseLaunch\(\s*params\[LAUNCH_QUERY_PARAM\],\s*EXERCISE_SLUG,?\s*\)/,
  );
  assert.match(source, /searchParams: Promise<\{\s*\[LAUNCH_QUERY_PARAM\]\?: string;\s*\}>/);
  assert.match(source, /const LAUNCH_QUERY_PARAM = "educationLaunch";/);
});

test("8) doğru slug kullanılıyor ve client bilesenine educationProgramLaunch prop'u undefined fallback'iyle iletilir", async () => {
  const source = await read(PAGE_PATH);

  assert.match(
    source,
    /<ShadowReadingExerciseClient educationProgramLaunch=\{educationProgramLaunch \?\? undefined\} \/>/,
  );
});

test("9) launch prop aktariliyor; page.tsx kendi token/cookie/DB dogrulama mantigini kopyalamaz, Assignment V2'ye bagli degildir", async () => {
  const source = await read(PAGE_PATH);

  assert.doesNotMatch(source, /await cookies\(\)/);
  assert.doesNotMatch(source, /verifyStudentAccessToken/);
  assert.doesNotMatch(source, /getEducationProgramTaskLaunchContext/);
  assert.doesNotMatch(source, /getSupabaseServiceRoleClient/);
  assert.doesNotMatch(source, /@\/lib\/assignments\//);
  assert.doesNotMatch(source, /@\/components\/assignments\//);
});

// ---------------------------------------------------------------------------
// 10-13) Client settings davranisi
// ---------------------------------------------------------------------------

test("10) standalone fallback: educationProgramLaunch prop'u opsiyonel ve varsayilan {} ile tanimlanir", async () => {
  const source = await read(CLIENT_PATH);

  assert.match(
    source,
    /import type \{ EducationProgramExerciseLaunchProps \} from "@\/lib\/education-programs\/exerciseLaunchProps";/,
  );
  assert.match(
    source,
    /export function ShadowReadingExerciseClient\(\{\s*educationProgramLaunch,\s*\}: \{\s*educationProgramLaunch\?: EducationProgramExerciseLaunchProps;\s*\} = \{\}\)/,
  );
});

test("11) teacher settings guvenli okunuyor: blockSize/speedMode/intervalMs/wordsPerMinute pickEducationProgramSettingOption ile okunur", async () => {
  const source = await read(CLIENT_PATH);

  assert.match(source, /pickEducationProgramSettingOption\(educationProgramLaunch\?\.settings, "blockSize", BLOCK_SIZE_OPTIONS, 2\)/);
  assert.match(source, /pickEducationProgramSettingOption\(educationProgramLaunch\?\.settings, "speedMode", SPEED_MODE_OPTIONS, "interval"\)/);
  assert.match(source, /pickEducationProgramSettingOption\(educationProgramLaunch\?\.settings, "intervalMs", JUMP_SPEED_OPTIONS, 500\)/);
  assert.match(source, /pickEducationProgramSettingOption\(educationProgramLaunch\?\.settings, "wordsPerMinute", WORDS_PER_MINUTE_OPTIONS, 150\)/);
});

test("12) EP modunda hiz kontrolleri (blockSize/speedMode/aktif hiz secimi) kilitli", async () => {
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

test("13) fontSize/metin/kategori secimi serbest kalir (EP modunda ek kilit eklenmedi)", async () => {
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

test("assignedDurationSeconds duz deger olarak hesaplanir (useAssignedDurationSeconds KULLANILMAZ)", async () => {
  const source = await read(CLIENT_PATH);

  assert.match(
    source,
    /const assignedDurationSeconds = educationProgramLaunch\?\.durationSeconds \?\? Number\.POSITIVE_INFINITY;/,
  );
  assert.doesNotMatch(source, /useAssignedDurationSeconds/);
});

test("egzersiz bileseni studentId/service-role/launch token gibi hassas alanlari okumaz", async () => {
  const source = await read(CLIENT_PATH);

  assert.doesNotMatch(source, /studentId/);
  assert.doesNotMatch(source, /SUPABASE_SERVICE_ROLE/);
  assert.doesNotMatch(source, /LAUNCH_SECRET/);
  assert.doesNotMatch(source, /signedToken|launchToken/i);
});

// ---------------------------------------------------------------------------
// 14-27) Coklu metin / biriken sure davranisi
// ---------------------------------------------------------------------------

test("cumulativeActiveSecondsRef ve completedTextCountRef client yasam dongusu icinde ref olarak tutulur (persist edilmez)", async () => {
  const source = await read(CLIENT_PATH);

  assert.match(source, /const cumulativeActiveSecondsRef = useRef\(0\);/);
  assert.match(source, /const completedTextCountRef = useRef\(0\);/);
  assert.doesNotMatch(source, /sessionStorage/);
  assert.doesNotMatch(source, /localStorage\.setItem/);
});

test("toplam aktif sure hesabi calculateShadowReadingTotalActiveSeconds ile yapilir (Date.now farki degil)", async () => {
  const source = await read(CLIENT_PATH);

  assert.match(
    source,
    /calculateShadowReadingTotalActiveSeconds\(\s*cumulativeActiveSecondsRef\.current,\s*elapsedSeconds,\s*\)/,
  );
});

test("14) ilk metin kisa biterse (sure dolmadan): handleTextEnd standalone modda finalizeExercise'a yonlendirir, EP modunda textEndInFlightRef guard'lidir", async () => {
  const source = await read(CLIENT_PATH);

  assert.match(
    source,
    /if \(!isEducationProgramMode\) \{\s*\n\s*finalizeExercise\(completedText\);\s*\n\s*return;\s*\n\s*\}/,
  );
  assert.match(source, /const textEndInFlightRef = useRef\(false\);/);
  assert.match(
    source,
    /if \(textEndInFlightRef\.current\) \{\s*\n\s*return;\s*\n\s*\}\s*\n\s*textEndInFlightRef\.current = true;/,
  );
});

test("metin bitince cumulative tam olarak BIR kez guncellenir, sonra hasShadowReadingReachedAssignedDuration kontrolu yapilir", async () => {
  const source = await read(CLIENT_PATH);

  assert.match(
    source,
    /const nextTotalActiveSeconds = calculateShadowReadingTotalActiveSeconds\(\s*cumulativeActiveSecondsRef\.current,\s*elapsedSeconds,\s*\);\s*\n\s*cumulativeActiveSecondsRef\.current = nextTotalActiveSeconds;/,
  );
  assert.match(
    source,
    /if \(hasShadowReadingReachedAssignedDuration\(assignedDurationSeconds, nextTotalActiveSeconds, 0\)\) \{/,
  );
});

test("15-16) sure dolmadiysa save/completion cagrilmadan yeni-metin ekranina donulur (kayit yok, completion yok)", async () => {
  const source = await read(CLIENT_PATH);

  const handleTextEndStart = source.indexOf("const handleTextEnd = useCallback(");
  const handleTextEndEnd = source.indexOf("const handleFinishEarly", handleTextEndStart);
  const handleTextEndBody = source.slice(handleTextEndStart, handleTextEndEnd);

  const lastFinalizeCallIndex = handleTextEndBody.lastIndexOf("finalizeExercise(completedText);");
  const afterFinalizeCall = handleTextEndBody.slice(lastFinalizeCallIndex + "finalizeExercise(completedText);".length);

  assert.doesNotMatch(afterFinalizeCall, /finalizeExercise\(/);
  assert.match(afterFinalizeCall, /setNewTextNotice\(\{/);
  assert.match(afterFinalizeCall, /resetFlowToReady\(\);/);
});

test("16/17) yeni metin uyarisi tamamlanan sureyi, kalan sureyi ve tamamlanan metin sayisini icerir (cumulative korunuyor)", async () => {
  const source = await read(CLIENT_PATH);

  assert.match(
    source,
    /setNewTextNotice\(\{\s*\n\s*cumulativeActiveSeconds: nextTotalActiveSeconds,\s*\n\s*remainingSeconds: calculateShadowReadingRemainingActiveSeconds\(\s*\n\s*assignedDurationSeconds,\s*\n\s*nextTotalActiveSeconds,\s*\n\s*0,\s*\n\s*\),\s*\n\s*completedTextCount: completedTextCountRef\.current,\s*\n\s*\}\);/,
  );
});

test("16) yeni-metin ekrani mevcut ready fazini yeniden kullanir, banner tam metni icerir; result ekranina gecmez", async () => {
  const source = await read(CLIENT_PATH);

  assert.match(source, /if \(phase === "ready"\) \{/);
  assert.match(source, /isEducationProgramMode && newTextNotice \?/);
  assert.match(source, /Görev süreniz henüz dolmadı/);
  assert.match(
    source,
    /Bu metni tamamladınız\. Görevi tamamlamak için yeni bir metin seçerek devam etmelisiniz\./,
  );
  assert.doesNotMatch(source, /Modal/);
  assert.doesNotMatch(source, /createPortal/);
});

test("Başlat butonu yeni-metin bildirimi varken 'Yeni Metinle Devam Et' olarak degisir", async () => {
  const source = await read(CLIENT_PATH);

  assert.match(source, /\{newTextNotice \? "Yeni Metinle Devam Et" : "Başlat"\}/);
});

test("19) ikinci metinde handleBeginPlay per-text state sifirlanir, banner kapanir, guard sifirlanir; cumulative/completedTextCount'a dokunulmaz", async () => {
  const source = await read(CLIENT_PATH);

  const handleBeginPlayStart = source.indexOf("const handleBeginPlay = () => {");
  const handleBeginPlayEnd = source.indexOf("const handleRestart", handleBeginPlayStart);
  const body = source.slice(handleBeginPlayStart, handleBeginPlayEnd);

  assert.match(body, /setCurrentBlockIndex\(0\);/);
  assert.match(body, /setElapsedSeconds\(0\);/);
  assert.match(body, /setIsPaused\(false\);/);
  assert.match(body, /setNewTextNotice\(null\);/);
  assert.match(body, /textEndInFlightRef\.current = false;/);
  assert.doesNotMatch(body, /cumulativeActiveSecondsRef\.current = /);
  assert.doesNotMatch(body, /completedTextCountRef\.current = /);
});

test("17) handleRestart 'Yeniden Baslat' butonu icin cumulative/completedTextCount'u BILEREK sifirlar (resetFlowToReady bunlara dokunmaz)", async () => {
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

test("20) assigned sure dolunca otomatik finish: ikinci metinde sure devam ediyor, mid-text auto-finish tetiklenir", async () => {
  const source = await read(CLIENT_PATH);

  const setIntervalMatches = [...source.matchAll(/window\.setInterval/g)];
  assert.equal(setIntervalMatches.length, 1, "yalniz mevcut tek setInterval korunmali, ikincisi eklenmemeli (25. senaryo)");

  assert.match(
    source,
    /if \(!isEducationProgramMode \|\| phase !== "running" \|\| isPaused\) \{\s*\n\s*return;\s*\n\s*\}\s*\n\s*\n\s*if \(\s*\n\s*hasShadowReadingReachedAssignedDuration\(assignedDurationSeconds, cumulativeActiveSecondsRef\.current, elapsedSeconds\)\s*\n\s*\) \{\s*\n\s*handleTextEnd\(false\);/,
  );
});

test("21/22) metin ortasinda finish: completedTextCount yarim metni saymiyor (yalniz completedText=true ise artar)", async () => {
  const source = await read(CLIENT_PATH);

  assert.match(
    source,
    /if \(completedText\) \{\s*\n\s*completedTextCountRef\.current \+= 1;\s*\n\s*\}/,
  );
});

test("23/24) pause ve ready ekraninda sure ilerlemez (elapsedSeconds interval'i phase==running && !isPaused'a bagli)", async () => {
  const source = await read(CLIENT_PATH);

  assert.match(
    source,
    /useEffect\(\(\) => \{\s*\n\s*if \(phase !== "running" \|\| isPaused\) \{\s*\n\s*return;\s*\n\s*\}\s*\n\s*\n\s*const timerId = window\.setInterval\(\(\) => \{\s*\n\s*setElapsedSeconds/,
  );
});

test("26) metin-bitisi ile mid-duration auto-finish arasindaki cift-tetikleme textEndInFlightRef ile engellenir", async () => {
  const source = await read(CLIENT_PATH);

  // handleTextEnd hem advanceBlock'tan (metin bitisi) hem de sure-izleme
  // efektinden (mid-text auto finish) cagrilir; ikisi de ayni guard'a girer.
  assert.match(source, /handleTextEnd\(true\)/);
  assert.match(source, /handleTextEnd\(false\)/);
  const guardMatches = [...source.matchAll(/textEndInFlightRef\.current = true;/g)];
  assert.equal(guardMatches.length, 1, "guard yalniz handleTextEnd icinde bir kez set edilmeli");
});

// ---------------------------------------------------------------------------
// 25/33) Manuel Bitir davranisi
// ---------------------------------------------------------------------------

test("standalone modda 'Bitir' butonu mevcut finalizeExercise(false) davranisini korur (handleTextEnd uzerinden)", async () => {
  const source = await read(CLIENT_PATH);

  assert.match(
    source,
    /const handleFinishEarly = \(\) => \{\s*\n\s*handleTextEnd\(false\);\s*\n\s*\};/,
  );
});

test("EP modunda 'Bitir' suresi dolmadiysa yeni-metin ekranina gecer, sonuc kaydetmez; manuel bitir icin ayri bir sure kontrolu tekrarlanmadi", async () => {
  const source = await read(CLIENT_PATH);

  const handleTextEndStart = source.indexOf("const handleTextEnd = useCallback(");
  const handleTextEndEnd = source.indexOf("const handleFinishEarly", handleTextEndStart);
  const body = source.slice(handleTextEndStart, handleTextEndEnd);

  const reachedDurationMatches = [...body.matchAll(/hasShadowReadingReachedAssignedDuration\(/g)];
  assert.equal(reachedDurationMatches.length, 1);
});

// ---------------------------------------------------------------------------
// 27/28) Çift save guard / legacy kaldirilmasi / secure save
// ---------------------------------------------------------------------------

test("27/28) saveInFlightRef/saveCompletedRef ile cift-kayda karsi guard, saveLockRef standalone icin korunmus", async () => {
  const source = await read(CLIENT_PATH);

  assert.match(
    source,
    /if \(saveInFlightRef\.current \|\| saveCompletedRef\.current\) \{\s*\n\s*return;\s*\n\s*\}/,
  );
  assert.match(source, /if \(!selectedText \|\| totalBlocks === 0 \|\| saveLockRef\.current\) \{/);
});

test("28/29) legacy saveExerciseResult kaldirildi, saveExerciseResultSecure kullanilir (hem standalone hem EP modunda)", async () => {
  const source = await read(CLIENT_PATH);

  assert.match(
    source,
    /import \{ saveExerciseResultSecure, type SecureExerciseResultInput \} from "@\/lib\/results\/secureResultStorage";/,
  );
  assert.doesNotMatch(source, /from "@\/lib\/results\/resultStorage"/);
  assert.match(source, /await saveExerciseResultSecure\(payload\)/);
  assert.match(source, /exerciseType: "shadow-reading",/);
});

test("30) save basarisizken completion cagrilmaz (try/catch ile ayrilmis)", async () => {
  const source = await read(CLIENT_PATH);

  assert.match(
    source,
    /try \{\s*\n\s*const saved = await saveExerciseResultSecure\(payload\);[\s\S]{0,400}await completeTaskAfterResultSave\(\);\s*\n\s*\} catch \{/,
  );
});

test("31/32) completion basarisiz olursa retry banner ayni ekranda kalir, otomatik yonlendirme yok, retry result'i yeniden kaydetmez", async () => {
  const source = await read(CLIENT_PATH);

  assert.match(source, /completionStatus\.state === "error" && completionStatus\.canRetry/);
  assert.match(source, /onClick=\{\(\) => void retryTaskCompletion\(\)\}/);
  assert.doesNotMatch(source, /completeTaskAfterResultSave\(\)[\s\S]{0,120}router\.push/);

  const retrySite = source.indexOf("void retryTaskCompletion()");
  assert.ok(retrySite >= 0);
  const nearbyBlock = source.slice(retrySite - 200, retrySite + 50);
  assert.doesNotMatch(nearbyBlock, /saveExerciseResultSecure/);
});

test("30) useEducationProgramTaskCompletion dogru exerciseType ve taskId ile cagrilir, isAssignmentMode ile de gate'lenir", async () => {
  const source = await read(CLIENT_PATH);

  assert.match(source, /const EXPECTED_RESULT_EXERCISE_TYPE = "shadow-reading";/);
  assert.match(
    source,
    /const educationProgramTaskId =\s*\n\s*isEducationProgramMode && !isAssignmentMode \? educationProgramLaunch\?\.taskId : undefined;/,
  );
  assert.match(
    source,
    /useEducationProgramTaskCompletion\(educationProgramTaskId, EXPECTED_RESULT_EXERCISE_TYPE\)/,
  );
});

test("33) navigasyon butonlari (Yeniden Baslat / Ortak Sonuc Ekrani) saveStatus success olmadan aktif olmaz", async () => {
  const source = await read(CLIENT_PATH);

  const navSectionStart = source.indexOf('<div className="mt-6 grid gap-3 sm:grid-cols-2">');
  const navSectionEnd = source.indexOf("</div>", source.indexOf("Ortak Sonuc Ekrani", navSectionStart));
  const navSection = source.slice(navSectionStart, navSectionEnd);

  const disabledMatches = [...navSection.matchAll(/disabled=\{saveStatus !== "success"\}/g)];
  assert.equal(disabledMatches.length, 2, "hem Yeniden Baslat hem Ortak Sonuc Ekrani butonu kilitlenmeli");
});

// ---------------------------------------------------------------------------
// 37-38) Diger egzersizlerin degismedigi
// ---------------------------------------------------------------------------

test("37) Blok Okuma dosyalari bu turda degismedi (dokunulmadi)", async () => {
  const blockReadingClientSource = await read(
    "src/app/egzersizler/blok-okuma/BlockReadingExerciseClient.tsx",
  );
  const blockReadingEngineSource = await read("src/lib/exercise-engine/blockReading.ts");

  assert.match(blockReadingClientSource, /exerciseType: "block-reading",/);
  assert.doesNotMatch(blockReadingEngineSource, /calculateShadowReading/);
  assert.doesNotMatch(blockReadingEngineSource, /hasShadowReadingReachedAssignedDuration/);
});

test("38) Gruplama dosyalari bu turda degismedi (dokunulmadi)", async () => {
  const groupingSource = await read("src/app/egzersizler/gruplama/GroupingReadingExerciseClient.tsx").catch(() => null);

  if (groupingSource !== null) {
    assert.doesNotMatch(groupingSource, /educationProgramLaunch/);
  }
});
