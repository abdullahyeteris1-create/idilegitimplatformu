import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const PAGE_PATH = "src/app/egzersizler/gruplama-calismasi/page.tsx";
const CLIENT_PATH = "src/app/egzersizler/gruplama-calismasi/GroupingExerciseClient.tsx";

async function read(relativePath) {
  return readFile(new URL(`../${relativePath}`, import.meta.url), "utf8");
}

// ---------------------------------------------------------------------------
// 9-12) page.tsx / launch entegrasyonu
// ---------------------------------------------------------------------------

test("9) gruplama-calismasi page.tsx ortak launch helper'ini kullanir, dogru slug ile delege eder", async () => {
  const source = await read(PAGE_PATH);

  assert.match(source, /const EXERCISE_SLUG = "gruplama-calismasi";/);
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

test("10) doğru slug kullanılıyor ve client bilesenine educationProgramLaunch prop'u undefined fallback'iyle iletilir", async () => {
  const source = await read(PAGE_PATH);

  assert.match(
    source,
    /<GroupingExerciseClient educationProgramLaunch=\{educationProgramLaunch \?\? undefined\} \/>/,
  );
});

test("11) launch prop aktariliyor; page.tsx kendi token/cookie/DB dogrulama mantigini kopyalamaz, Assignment V2'ye bagli degildir", async () => {
  const source = await read(PAGE_PATH);

  assert.doesNotMatch(source, /await cookies\(\)/);
  assert.doesNotMatch(source, /verifyStudentAccessToken/);
  assert.doesNotMatch(source, /getEducationProgramTaskLaunchContext/);
  assert.doesNotMatch(source, /getSupabaseServiceRoleClient/);
  assert.doesNotMatch(source, /@\/lib\/assignments\//);
  assert.doesNotMatch(source, /@\/components\/assignments\//);
});

// ---------------------------------------------------------------------------
// 12-15) Client settings davranisi
// ---------------------------------------------------------------------------

test("12) standalone fallback: educationProgramLaunch prop'u opsiyonel ve varsayilan {} ile tanimlanir", async () => {
  const source = await read(CLIENT_PATH);

  assert.match(
    source,
    /import type \{ EducationProgramExerciseLaunchProps \} from "@\/lib\/education-programs\/exerciseLaunchProps";/,
  );
  assert.match(
    source,
    /export function GroupingExerciseClient\(\{\s*educationProgramLaunch,\s*\}: \{\s*educationProgramLaunch\?: EducationProgramExerciseLaunchProps;\s*\} = \{\}\)/,
  );
});

test("13) teacher settings guvenli okunuyor: groupSize/speedMode/customMilliseconds sabit secenekle, customWordsPerMinute serbest aralikla (1-2000) okunur", async () => {
  const source = await read(CLIENT_PATH);

  assert.match(source, /pickEducationProgramSettingOption\(educationProgramLaunch\?\.settings, "groupSize", GROUP_SIZE_OPTIONS, 2\)/);
  assert.match(source, /pickEducationProgramSettingOption\(educationProgramLaunch\?\.settings, "speedMode", SPEED_MODE_OPTIONS, "milliseconds"\)/);
  assert.match(source, /pickEducationProgramSettingOption\(educationProgramLaunch\?\.settings, "customMilliseconds", CUSTOM_MILLISECONDS_OPTIONS, 500\)/);
  assert.match(
    source,
    /pickEducationProgramRangeSettingOption\(\s*\n\s*educationProgramLaunch\?\.settings,\s*\n\s*"customWordsPerMinute",\s*\n\s*CUSTOM_WORDS_PER_MINUTE_MIN,\s*\n\s*CUSTOM_WORDS_PER_MINUTE_MAX,\s*\n\s*300,\s*\n\s*\)/,
  );
  assert.match(source, /const CUSTOM_WORDS_PER_MINUTE_MIN = 1;/);
  assert.match(source, /const CUSTOM_WORDS_PER_MINUTE_MAX = 2000;/);
  assert.match(source, /CUSTOM_MILLISECONDS_OPTIONS\.map\(\(value\) =>/);
});

test("14) EP modunda yalniz dogru kontroller kilitlenir: groupSize/speedMode/customMilliseconds/customWordsPerMinute", async () => {
  const source = await read(CLIENT_PATH);

  const groupLabelIndex = source.indexOf(">Grup<");
  const groupSelect = source.slice(groupLabelIndex, source.indexOf("</select>", groupLabelIndex));
  assert.match(groupSelect, /disabled=\{\(phase === "running" && !paused\) \|\| isEducationProgramMode\}/);

  const speedLabelIndex = source.indexOf("Hiz Menusu");
  const speedSelect = source.slice(speedLabelIndex, source.indexOf("</select>", speedLabelIndex));
  assert.match(speedSelect, /disabled=\{isEducationProgramMode\}/);

  assert.match(source, /value=\{customMilliseconds\}\s*\n\s*disabled=\{isEducationProgramMode\}/);
  assert.match(source, /value=\{customWordsPerMinuteInput\}\s*\n\s*disabled=\{isEducationProgramMode\}/);
});

test("15) ogrenci tercihleri (fontSize/displayMode/scrollMode/kategori/metin) serbest kalir - EP modunda ek kilit eklenmedi", async () => {
  const source = await read(CLIENT_PATH);

  const displayLabelIndex = source.indexOf("Gorunum");
  const displaySelect = source.slice(displayLabelIndex, source.indexOf("</select>", displayLabelIndex));
  assert.doesNotMatch(displaySelect, /isEducationProgramMode/);

  const scrollLabelIndex = source.indexOf("Kaydirma");
  const scrollSelect = source.slice(scrollLabelIndex, source.indexOf("</select>", scrollLabelIndex));
  assert.doesNotMatch(scrollSelect, /isEducationProgramMode/);

  const fontLabelIndex = source.indexOf(">Font<");
  const fontSelect = source.slice(fontLabelIndex, source.indexOf("</select>", fontLabelIndex));
  assert.doesNotMatch(fontSelect, /isEducationProgramMode/);

  const categoryLabelIndex = source.indexOf(">Kategori<");
  const categorySelect = source.slice(categoryLabelIndex, source.indexOf("</select>", categoryLabelIndex));
  assert.doesNotMatch(categorySelect, /isEducationProgramMode/);
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
// 16-31) Coklu metin / biriken sure davranisi
// ---------------------------------------------------------------------------

test("cumulativeActiveSecondsRef ve completedTextCountRef client yasam dongusu icinde ref olarak tutulur (persist edilmez)", async () => {
  const source = await read(CLIENT_PATH);

  assert.match(source, /const cumulativeActiveSecondsRef = useRef\(0\);/);
  assert.match(source, /const completedTextCountRef = useRef\(0\);/);
  assert.doesNotMatch(source, /sessionStorage/);
  assert.doesNotMatch(source, /localStorage\.setItem/);
});

test("toplam aktif sure hesabi calculateGroupingReadingTotalActiveSeconds ile yapilir (Date.now farki degil)", async () => {
  const source = await read(CLIENT_PATH);

  assert.match(
    source,
    /calculateGroupingReadingTotalActiveSeconds\(\s*cumulativeActiveSecondsRef\.current,\s*elapsed,\s*\)/,
  );
});

test("16-17) ilk metin kisa biterse (sure dolmadan): handleTextEnd standalone modda finish'e yonlendirir, EP modunda guard'lidir, save/completion olmaz", async () => {
  const source = await read(CLIENT_PATH);

  assert.match(
    source,
    /if \(!isEducationProgramMode\) \{\s*\n\s*finish\(completedText\);\s*\n\s*return;\s*\n\s*\}/,
  );
  assert.match(source, /const textEndInFlightRef = useRef\(false\);/);
  assert.match(
    source,
    /if \(textEndInFlightRef\.current\) \{\s*\n\s*return;\s*\n\s*\}\s*\n\s*textEndInFlightRef\.current = true;/,
  );

  const handleTextEndStart = source.indexOf("const handleTextEnd = useCallback(");
  const handleTextEndEnd = source.indexOf("const handleRestart", handleTextEndStart);
  const handleTextEndBody = source.slice(handleTextEndStart, handleTextEndEnd);
  const lastFinishCallIndex = handleTextEndBody.lastIndexOf("finish(completedText);");
  const afterFinishCall = handleTextEndBody.slice(lastFinishCallIndex + "finish(completedText);".length);

  assert.doesNotMatch(afterFinishCall, /finish\(/);
  assert.match(afterFinishCall, /setNewTextNotice\(\{/);
  assert.match(afterFinishCall, /reset\(\);/);
});

test("metin bitince cumulative tam olarak BIR kez guncellenir, sonra hasGroupingReadingReachedAssignedDuration kontrolu yapilir", async () => {
  const source = await read(CLIENT_PATH);

  assert.match(
    source,
    /const nextTotalActiveSeconds = calculateGroupingReadingTotalActiveSeconds\(\s*cumulativeActiveSecondsRef\.current,\s*elapsed,\s*\);\s*\n\s*cumulativeActiveSecondsRef\.current = nextTotalActiveSeconds;/,
  );
  assert.match(
    source,
    /if \(hasGroupingReadingReachedAssignedDuration\(assignedDurationSeconds, nextTotalActiveSeconds, 0\)\) \{/,
  );
});

test("18) yeni metin uyarisi mevcut ready/running paylasilan fazi kullanir, banner tam metni icerir; result ekranina gecmez", async () => {
  const source = await read(CLIENT_PATH);

  assert.match(source, /isEducationProgramMode && newTextNotice \?/);
  assert.match(source, /Görev süreniz henüz dolmadı/);
  assert.match(
    source,
    /Bu metni tamamladınız\. Görevi tamamlamak için yeni bir metin seçerek devam etmelisiniz\./,
  );
  assert.doesNotMatch(source, /Modal/);
  assert.doesNotMatch(source, /createPortal/);
});

test("19-20) yeni-metin bildirimi cumulative korunmus toplam sureyi, dogru kalan sureyi ve tamamlanan metin sayisini icerir", async () => {
  const source = await read(CLIENT_PATH);

  assert.match(
    source,
    /setNewTextNotice\(\{\s*\n\s*cumulativeActiveSeconds: nextTotalActiveSeconds,\s*\n\s*remainingSeconds: calculateGroupingReadingRemainingActiveSeconds\(\s*\n\s*assignedDurationSeconds,\s*\n\s*nextTotalActiveSeconds,\s*\n\s*0,\s*\n\s*\),\s*\n\s*completedTextCount: completedTextCountRef\.current,\s*\n\s*\}\);/,
  );
});

test("Başlat butonu yeni-metin bildirimi varken 'Yeni Metinle Devam Et' olarak degisir", async () => {
  const source = await read(CLIENT_PATH);

  assert.match(source, /\{newTextNotice \? "Yeni Metinle Devam Et" : "Baslat"\}/);
});

test("startExercise (ikinci metinle devam) per-text state sifirlar, banner kapanir, guard sifirlanir; cumulative/completedTextCount'a dokunulmaz", async () => {
  const source = await read(CLIENT_PATH);

  const startExerciseStart = source.indexOf("const startExercise = () => {");
  const startExerciseEnd = source.indexOf("const controls", startExerciseStart);
  const body = source.slice(startExerciseStart, startExerciseEnd);

  assert.match(body, /setIndex\(0\);/);
  assert.match(body, /setElapsed\(0\);/);
  assert.match(body, /setPaused\(false\);/);
  assert.match(body, /setNewTextNotice\(null\);/);
  assert.match(body, /textEndInFlightRef\.current = false;/);
  assert.doesNotMatch(body, /cumulativeActiveSecondsRef\.current = /);
  assert.doesNotMatch(body, /completedTextCountRef\.current = /);
});

test("21) handleRestart 'Yeniden'/'Yeniden Baslat' butonlari icin cumulative/completedTextCount'u BILEREK sifirlar (reset() bunlara dokunmaz)", async () => {
  const source = await read(CLIENT_PATH);

  assert.match(
    source,
    /const handleRestart = \(\) => \{[\s\S]*?cumulativeActiveSecondsRef\.current = 0;\s*\n\s*completedTextCountRef\.current = 0;/,
  );

  const resetStart = source.indexOf("const reset = useCallback(");
  const resetEnd = source.indexOf("const finish = useCallback(", resetStart);
  const resetBody = source.slice(resetStart, resetEnd);
  assert.doesNotMatch(resetBody, /cumulativeActiveSecondsRef/);
  assert.doesNotMatch(resetBody, /completedTextCountRef/);

  // Hem "Yeniden" (calisirken) hem "Yeniden Baslat" (result ekrani) butonu
  // handleRestart'i kullanir, artik cikplak reset()'i degil.
  const runningRestartMatches = [...source.matchAll(/onClick=\{handleRestart\}/g)];
  assert.ok(runningRestartMatches.length >= 2);
});

test("22) assigned sure dolunca otomatik finish: mevcut elapsed sayaci izlenerek yakalanir, ikinci setInterval kurulmaz", async () => {
  const source = await read(CLIENT_PATH);

  const setIntervalMatches = [...source.matchAll(/window\.setInterval/g)];
  assert.equal(setIntervalMatches.length, 1, "yalniz mevcut tek setInterval korunmali, ikincisi eklenmemeli");

  assert.match(
    source,
    /if \(!isEducationProgramMode \|\| phase !== "running" \|\| paused\) \{\s*\n\s*return;\s*\n\s*\}\s*\n\s*\n\s*if \(hasGroupingReadingReachedAssignedDuration\(assignedDurationSeconds, cumulativeActiveSecondsRef\.current, elapsed\)\) \{\s*\n\s*handleTextEnd\(false\);/,
  );
});

test("23-24) metin ortasinda finish: completedTextCount yarim metni saymiyor (yalniz completedText true ise artar)", async () => {
  const source = await read(CLIENT_PATH);

  assert.match(
    source,
    /if \(completedText\) \{\s*\n\s*completedTextCountRef\.current \+= 1;\s*\n\s*\}/,
  );
});

test("26-27) pause ve ready fazinda sure ilerlemez, otomatik scroll de calismaz (elapsed interval ve scroll efekti phase==='running' && !paused'a bagli)", async () => {
  const source = await read(CLIENT_PATH);

  assert.match(
    source,
    /useEffect\(\(\) => \{\s*\n\s*if \(phase !== "running" \|\| paused\) \{\s*\n\s*return;\s*\n\s*\}\s*\n\s*\n\s*const id = window\.setInterval\(\(\) => \{\s*\n\s*setElapsed/,
  );
  assert.match(
    source,
    /useEffect\(\(\) => \{\s*\n\s*if \(phase === "running" && !paused\) \{\s*\n\s*activeRef\.current\?\.scrollIntoView/,
  );
});

test("28) tek elapsed interval'i (yukaridaki test 22'de de dogrulandi) - mevcut tek zamanlayici genisletildi, yeni bir tane kurulmadi", async () => {
  const source = await read(CLIENT_PATH);
  const setIntervalMatches = [...source.matchAll(/window\.setInterval/g)];
  assert.equal(setIntervalMatches.length, 1);
});

test("29-30) metin-bitisi/auto-finish cakismasi textEndInFlightRef ile engellenir, yeni metinde scroll basa doner (reset() scrollTo top cagirir)", async () => {
  const source = await read(CLIENT_PATH);

  const guardMatches = [...source.matchAll(/textEndInFlightRef\.current = true;/g)];
  assert.equal(guardMatches.length, 1, "guard yalniz handleTextEnd icinde bir kez set edilmeli");

  const resetStart = source.indexOf("const reset = useCallback(");
  const resetEnd = source.indexOf("const finish = useCallback(", resetStart);
  const resetBody = source.slice(resetStart, resetEnd);
  assert.match(resetBody, /areaRef\.current\?\.scrollTo\(\{ top: 0, behavior: "smooth" \}\);/);
});

test("31) displayMode davranisi (gecmis gruplarin solmasi) client kodunda degismedi", async () => {
  const source = await read(CLIENT_PATH);

  assert.match(source, /displayMode === "fade" && past/);
});

// ---------------------------------------------------------------------------
// 25) Manuel Bitir davranisi
// ---------------------------------------------------------------------------

test("25) standalone modda 'Bitir' butonu mevcut finish(false) davranisini korur (handleTextEnd uzerinden)", async () => {
  const source = await read(CLIENT_PATH);

  assert.match(source, /onClick=\{\(\) => handleTextEnd\(false\)\}/);

  const handleTextEndStart = source.indexOf("const handleTextEnd = useCallback(");
  const handleTextEndEnd = source.indexOf("const handleRestart", handleTextEndStart);
  const body = source.slice(handleTextEndStart, handleTextEndEnd);

  const reachedDurationMatches = [...body.matchAll(/hasGroupingReadingReachedAssignedDuration\(/g)];
  assert.equal(reachedDurationMatches.length, 1, "manuel Bitir icin ayri bir sure kontrolu tekrarlanmadi");
});

// ---------------------------------------------------------------------------
// 32-38) Save guard / legacy kaldirilmasi / secure save / completion
// ---------------------------------------------------------------------------

test("32-33) saveInFlightRef/saveCompletedRef ile cift-kayda karsi guard, savedRef standalone icin korunmus", async () => {
  const source = await read(CLIENT_PATH);

  assert.match(
    source,
    /if \(saveInFlightRef\.current \|\| saveCompletedRef\.current\) \{\s*\n\s*return;\s*\n\s*\}/,
  );
  assert.match(source, /if \(!selected \|\| !totalGroups \|\| savedRef\.current\) \{/);
});

test("34-35) legacy saveExerciseResult kaldirildi, saveExerciseResultSecure kullanilir (hem standalone hem EP modunda)", async () => {
  const source = await read(CLIENT_PATH);

  assert.match(
    source,
    /import \{ saveExerciseResultSecure, type SecureExerciseResultInput \} from "@\/lib\/results\/secureResultStorage";/,
  );
  assert.doesNotMatch(source, /from "@\/lib\/results\/resultStorage"/);
  assert.match(source, /await saveExerciseResultSecure\(payload\)/);
  assert.match(source, /exerciseType: "grouping-reading",/);
});

test("36) save basarisizken completion cagrilmaz (try/catch ile ayrilmis)", async () => {
  const source = await read(CLIENT_PATH);

  assert.match(
    source,
    /try \{\s*\n\s*const saved = await saveExerciseResultSecure\(payload\);[\s\S]{0,400}await completeTaskAfterResultSave\(\);\s*\n\s*\} catch \{/,
  );
});

test("37-38) completion basarisiz olursa retry banner ayni ekranda kalir, otomatik yonlendirme yok, retry result'i yeniden kaydetmez", async () => {
  const source = await read(CLIENT_PATH);

  assert.match(source, /completionStatus\.state === "error" && completionStatus\.canRetry/);
  assert.match(source, /onClick=\{\(\) => void retryTaskCompletion\(\)\}/);
  assert.doesNotMatch(source, /completeTaskAfterResultSave\(\)[\s\S]{0,120}router\.push/);

  const retrySite = source.indexOf("void retryTaskCompletion()");
  assert.ok(retrySite >= 0);
  const nearbyBlock = source.slice(retrySite - 200, retrySite + 50);
  assert.doesNotMatch(nearbyBlock, /saveExerciseResultSecure/);
});

test("useEducationProgramTaskCompletion dogru exerciseType ve taskId ile cagrilir, isAssignmentMode ile de gate'lenir", async () => {
  const source = await read(CLIENT_PATH);

  assert.match(source, /const EXPECTED_RESULT_EXERCISE_TYPE = "grouping-reading";/);
  assert.match(
    source,
    /const educationProgramTaskId =\s*\n\s*isEducationProgramMode && !isAssignmentMode \? educationProgramLaunch\?\.taskId : undefined;/,
  );
  assert.match(
    source,
    /useEducationProgramTaskCompletion\(educationProgramTaskId, EXPECTED_RESULT_EXERCISE_TYPE\)/,
  );
});

test("39) navigasyon butonlari (Yeniden Baslat / Ortak Sonuc) saveStatus success olmadan aktif olmaz, standalone davranis (mesaj/ekran) korunur", async () => {
  const source = await read(CLIENT_PATH);

  const navSectionStart = source.indexOf('<div className="mt-6 grid gap-3 sm:grid-cols-2">');
  const navSectionEnd = source.indexOf("</div>", source.indexOf("Ortak Sonuc", navSectionStart));
  const navSection = source.slice(navSectionStart, navSectionEnd);

  const disabledMatches = [...navSection.matchAll(/disabled=\{saveStatus !== "success"\}/g)];
  assert.equal(disabledMatches.length, 2, "hem Yeniden Baslat hem Ortak Sonuc butonu kilitlenmeli");

  assert.match(source, /"Metin tamamlandi\."\s*\n\s*: "Egzersiz erken bitirildi\."/);
});

// ---------------------------------------------------------------------------
// 43-44) Diger egzersizlerin degismedigi
// ---------------------------------------------------------------------------

test("43) Blok Okuma production kaynaklari bu turda degismedi (dokunulmadi)", async () => {
  const blockReadingClientSource = await read(
    "src/app/egzersizler/blok-okuma/BlockReadingExerciseClient.tsx",
  );
  const blockReadingEngineSource = await read("src/lib/exercise-engine/blockReading.ts");

  assert.match(blockReadingClientSource, /exerciseType: "block-reading",/);
  assert.doesNotMatch(blockReadingEngineSource, /calculateGroupingReading/);
  assert.doesNotMatch(blockReadingEngineSource, /hasGroupingReadingReachedAssignedDuration/);
});

test("44) Golgeleme production kaynaklari bu turda degismedi (dokunulmadi)", async () => {
  const shadowReadingClientSource = await read(
    "src/app/egzersizler/golgeleme/ShadowReadingExerciseClient.tsx",
  );
  const shadowReadingEngineSource = await read("src/lib/exercise-engine/shadowReading.ts");

  assert.match(shadowReadingClientSource, /exerciseType: "shadow-reading",/);
  assert.doesNotMatch(shadowReadingEngineSource, /calculateGroupingReading/);
  assert.doesNotMatch(shadowReadingEngineSource, /hasGroupingReadingReachedAssignedDuration/);
});
