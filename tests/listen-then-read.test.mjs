import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { countReadingWords } from "../src/lib/one-minute-reading/metrics.ts";
import {
  getListenThenReadPassagesForGrade,
  LISTEN_THEN_READ_PASSAGES,
} from "../src/lib/listen-then-read/content.ts";
import {
  chooseTurkishSpeechVoice,
  getListenThenReadVoiceStatus,
  isTurkishSpeechVoice,
} from "../src/lib/listen-then-read/speech.ts";

const clientSource = await readFile(new URL("../src/app/egzersizler/dinle-sen-oku/ListenThenReadClient.tsx", import.meta.url), "utf8");
const centerSource = await readFile(new URL("../src/app/egzersizler/ExercisesCenterClient.tsx", import.meta.url), "utf8");
const previewSource = await readFile(new URL("../src/components/exercises-preview/exercisePreviewGroups.ts", import.meta.url), "utf8");

test("new exercise has 8 passages, two per grade, with 3 questions each", () => {
  assert.equal(LISTEN_THEN_READ_PASSAGES.length, 8);
  const ranges = new Map([[1, [50, 70]], [2, [70, 90]], [3, [90, 110]], [4, [110, 130]]]);
  for (const grade of [1, 2, 3, 4]) assert.equal(getListenThenReadPassagesForGrade(grade).length, 2);
  for (const passage of LISTEN_THEN_READ_PASSAGES) {
    const [minimum, maximum] = ranges.get(passage.grade);
    const wordCount = countReadingWords(passage.paragraphs.join(" "));
    assert.ok(wordCount >= minimum && wordCount <= maximum, `${passage.title}: ${wordCount}`);
    assert.equal(passage.comprehensionQuestions.length, 3, passage.title);
    for (const question of passage.comprehensionQuestions) {
      assert.equal(question.options.length, 3, question.id);
      assert.ok(question.correctAnswer >= 0 && question.correctAnswer < question.options.length, question.id);
      assert.equal(new Set(question.options).size, question.options.length, question.id);
    }
  }
});

test("Turkish voice is preferred and default fallback is explicit", () => {
  const turkish = { lang: "tr-TR", name: "Turkish voice" };
  const english = { lang: "en-US", name: "English voice" };
  assert.equal(isTurkishSpeechVoice(turkish), true);
  assert.equal(isTurkishSpeechVoice(english), false);
  assert.equal(chooseTurkishSpeechVoice([english, turkish]), turkish);
  assert.equal(getListenThenReadVoiceStatus(true, []), "loading");
  assert.equal(getListenThenReadVoiceStatus(true, [english]), "default");
  assert.equal(getListenThenReadVoiceStatus(true, [turkish]), "turkish");
  assert.equal(getListenThenReadVoiceStatus(false, [turkish]), "unsupported");
});

test("model reading is user-started and speech controls prevent overlap", () => {
  const listeningBlock = clientSource.slice(clientSource.indexOf('if (phase === "listening")'), clientSource.indexOf('if (phase === "model-complete")'));
  assert.match(listeningBlock, /Dinlemeyi Başlat/);
  assert.doesNotMatch(listeningBlock, /useEffect|autoPlay/);
  assert.match(clientSource, /synthesis\.cancel\(\);[\s\S]*synthesis\.speak\(utterance\)/);
  assert.match(clientSource, /window\.speechSynthesis\.pause\(\)/);
  assert.match(clientSource, /window\.speechSynthesis\.resume\(\)/);
  assert.match(clientSource, /Baştan Dinle/);
});

test("natural model finish leads to the student stage without auto-starting it", () => {
  assert.match(clientSource, /setPhase\("model-complete"\)/);
  assert.match(clientSource, /Şimdi sıra sende!/);
  assert.match(clientSource, /Ben Okumaya Hazırım/);
  const studentBlock = clientSource.slice(clientSource.indexOf('if (phase === "student-reading")'), clientSource.indexOf('if (phase === "comprehension")'));
  assert.match(studentBlock, /Şimdi Sen Oku/);
  assert.match(studentBlock, /Okumayı Tamamladım/);
  assert.match(studentBlock, /Tekrar Dinle/);
  assert.doesNotMatch(studentBlock, /startSpeech\(/);
});

test("student confirmation, comprehension scoring and result labels are present", () => {
  assert.match(clientSource, /Metnin tamamını sesli okudun mu\?/);
  assert.match(clientSource, /Evet, Tamamladım/);
  assert.match(clientSource, /Okumaya Devam Et/);
  assert.match(clientSource, /comprehensionCorrect/);
  assert.match(clientSource, /Çalışmayı Tamamladın/);
  for (const marker of ["Dinleme", "Sesli Okuma", "Anlama", "Yeni Metin", "Tekrar Çalış", "Ana Sayfaya Dön"]) assert.match(clientSource, new RegExp(marker));
});

test("result persistence records completion facts and speech mode without microphone APIs", () => {
  for (const marker of ["passageId", "grade", "listeningCompleted: true", "readingCompleted: true", "comprehensionCorrect", "comprehensionTotal", "speechRateMode"]) assert.match(clientSource, new RegExp(marker));
  for (const forbidden of ["getUserMedia", "MediaRecorder", "SpeechRecognition", "webkitSpeechRecognition", "navigator.mediaDevices"]) assert.doesNotMatch(clientSource, new RegExp(forbidden));
  assert.match(clientSource, /speechRunRef\.current \+= 1/);
  assert.match(clientSource, /if \(speechRunRef\.current !== runId\) return;/);
  assert.match(clientSource, /window\.speechSynthesis\.cancel\(\)/);
});

test("the exercise is exposed in the assessment category", () => {
  assert.match(centerSource, /title: "Dinle – Sen Oku"/);
  assert.match(centerSource, /href: "\/egzersizler\/dinle-sen-oku"/);
  assert.match(previewSource, /"dinle-sen-oku"/);
});
