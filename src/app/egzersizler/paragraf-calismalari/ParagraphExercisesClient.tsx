"use client";

import Link from "next/link";
import { useCallback, useRef, useState } from "react";
import { ExerciseEndScreenActions } from "@/components/exercises/ExerciseEndScreenActions";
import { saveExerciseResultSecure, type SecureExerciseResultInput } from "@/lib/results/secureResultStorage";
import { PARAGRAPH_CATEGORIES, selectParagraphQuestionsFromPool, type ParagraphCategory, type ParagraphQuestion } from "@/lib/paragraph-exercises/paragraphQuestions";
import { calculateAverageResponseTimeMs, calculateParagraphAccuracy } from "@/lib/paragraph-exercises/paragraphExerciseMetrics";
import styles from "./paragraph-exercises.module.css";

type Phase = "categories" | "quiz" | "result" | "completed";
type Answer = { selected: number; correct: boolean; responseTimeMs: number };
type SaveStatus = "idle" | "saving" | "success" | "error";
const labels = ["A", "B", "C", "D", "E"];
const now = () => performance.now();

function formatTime(ms: number) { return `${Math.max(1, Math.round(ms / 1000))} sn`; }

export function ParagraphExercisesClient({ questionPool }: { questionPool: ParagraphQuestion[] }) {
  const [phase, setPhase] = useState<Phase>("categories");
  const [category, setCategory] = useState<ParagraphCategory | "mixed">("mixed");
  const [questions, setQuestions] = useState<ParagraphQuestion[]>([]);
  const [index, setIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, Answer>>({});
  const [saving, setSaving] = useState(false);
  const [saveStatus, setSaveStatus] = useState<SaveStatus>("idle");
  const startedAt = useRef(0);
  const answeredIds = useRef(new Set<string>());
  const pendingPayload = useRef<SecureExerciseResultInput | null>(null);
  const question = questions[index];
  const answer = question ? answers[question.id] : undefined;
  const correctCount = Object.values(answers).filter((a) => a.correct).length;
  const totalTime = Object.values(answers).reduce((sum, a) => sum + a.responseTimeMs, 0);

  const start = useCallback((nextCategory: ParagraphCategory | "mixed") => {
    const selected = selectParagraphQuestionsFromPool(questionPool, nextCategory, 10);
    if (selected.length === 0) { setCategory(nextCategory); setPhase("completed"); return; }
    setCategory(nextCategory); setQuestions(selected); setIndex(0); setAnswers({}); answeredIds.current.clear(); pendingPayload.current = null; setSaveStatus("idle"); setPhase("quiz"); startedAt.current = now();
  }, [questionPool]);

  const persistResult = useCallback(async (payload: SecureExerciseResultInput) => {
    setSaving(true); setSaveStatus("saving");
    try { await saveExerciseResultSecure(payload); setSaveStatus("success"); }
    catch { setSaveStatus("error"); }
    finally { setSaving(false); }
  }, []);

  const choose = (selected: number) => {
    if (!question || answer || answeredIds.current.has(question.id)) return;
    answeredIds.current.add(question.id);
    const nextAnswer = { selected, correct: selected === question.correctIndex, responseTimeMs: Math.max(1, Math.round(now() - startedAt.current)) };
    setAnswers((current) => ({ ...current, [question.id]: nextAnswer }));
  };

  const next = async () => {
    if (!answer) return;
    if (index < questions.length - 1) { setIndex((current) => current + 1); startedAt.current = now(); return; }
    setSaving(true);
    const completedAt = new Date().toISOString();
    const wrongCount = questions.length - correctCount;
    const averageResponseTimeMs = calculateAverageResponseTimeMs(Object.values(answers).map((item) => item.responseTimeMs), questions.length);
    const payload: SecureExerciseResultInput = { exerciseType: "paragraph", exerciseTitle: "Paragraf Çalışmaları", score: calculateParagraphAccuracy(correctCount, questions.length), successRate: calculateParagraphAccuracy(correctCount, questions.length), correctCount, wrongCount, durationSeconds: Math.max(1, Math.round(totalTime / 1000)), completedAt, details: { category, totalQuestions: questions.length, averageResponseTimeMs, completedAt, questionIds: questions.map((item) => item.id).join(","), correctAnswers: correctCount, wrongAnswers: wrongCount, answers: questions.map((item) => ({ questionId: item.id, category: item.category, correct: answers[item.id]?.correct ?? false, responseTimeMs: answers[item.id]?.responseTimeMs ?? 1 })) } };
    pendingPayload.current = payload;
    await persistResult(payload);
    setPhase("result");
  };

  const retrySave = () => { if (pendingPayload.current) void persistResult(pendingPayload.current); };

  if (phase === "categories") return <main className={styles.page}><header className={styles.hero}><Link href="/egzersizler" className={styles.back}>← Egzersizler</Link><div className={styles.eyebrow}>OKUMA VE ANLAMA</div><h1>Paragraf Çalışmaları</h1><p>Paragraf sorularındaki temel becerilerini geliştir. Bir kategori seç, 10 soruluk çalışmaya hemen başla.</p><div className={styles.heroMeta}><span>6 çalışma türü</span><span>10 soru</span><span>6–7. sınıf düzeyi</span></div></header><section className={styles.grid} aria-label="Paragraf çalışma türleri">{PARAGRAPH_CATEGORIES.map((item, i) => <article className={styles.card} key={item.key}><div className={`${styles.number} ${styles[`tone${i}`]}`}>{String(i + 1).padStart(2, "0")}</div><div><h2>{item.title}</h2><p>{item.description}</p></div><button type="button" onClick={() => start(item.key)} className={styles.primary}>Çalışmaya Başla <span aria-hidden="true">→</span></button></article>)}</section></main>;

  if (phase === "result") { const accuracy = calculateParagraphAccuracy(correctCount, questions.length); return <main className={styles.page}><section className={styles.result}><div className={styles.resultIcon}>✓</div><div className={styles.eyebrow}>ÇALIŞMA TAMAMLANDI</div><h1>Sonuçların hazır</h1><p className={styles.resultLead}>Bugünkü paragraf çalışmanda gösterdiğin çabayı kutluyoruz.</p><div className={styles.stats}><div><strong>{correctCount}</strong><span>Doğru</span></div><div><strong>{questions.length - correctCount}</strong><span>Yanlış</span></div><div><strong>%{accuracy}</strong><span>Başarı</span></div><div><strong>{formatTime(calculateAverageResponseTimeMs(Object.values(answers).map((item) => item.responseTimeMs), questions.length))}</strong><span>Ortalama süre</span></div></div>{saveStatus === "success" && <p className={styles.saveMessage}>Sonucun kaydedildi.</p>}{saveStatus === "error" && <div className={styles.saveError}><p>Sonucun kaydedilemedi. İnternet bağlantını kontrol edip tekrar deneyebilirsin.</p><button type="button" onClick={retrySave} disabled={saving}>{saving ? "Kaydediliyor…" : "Tekrar Kaydet"}</button></div>}<button type="button" className={styles.next} onClick={() => start(category)}>Tekrar Çalış</button><ExerciseEndScreenActions showReplay={false} onReplay={() => start(category)} backHref="/egzersizler" exitHref="/egzersizler/paragraf-calismalari" exitLabel="Paragraf Çalışmalarına Dön" /></section></main>; }

  if (phase === "completed") { const mixed = category === "mixed"; return <main className={styles.page}><section className={styles.result}><div className={styles.resultIcon}>🎉</div><div className={styles.eyebrow}>TEBRİKLER</div><h1>{mixed ? "Bu sınıf grubundaki mevcut tüm paragraf sorularını tamamladın!" : "Bu bölümdeki tüm soruları tamamladın!"}</h1><p className={styles.resultLead}>Öğretmenin yeni sorular eklediğinde burada yeni çalışmalar görebilirsin.</p><ExerciseEndScreenActions showReplay={false} onReplay={() => setPhase("categories")} backHref="/egzersizler" exitHref="/egzersizler" exitLabel="Egzersizlere Dön" /></section></main>; }

  return <main className={styles.page}><section className={styles.quiz}><div className={styles.quizTop}><Link href="/egzersizler/paragraf-calismalari" className={styles.back}>← Kategoriler</Link><span className={styles.progress}>Soru {index + 1} / {questions.length}</span></div><div className={styles.progressBar}><span style={{ width: `${((index + 1) / questions.length) * 100}%` }} /></div><div className={styles.categoryPill}>{PARAGRAPH_CATEGORIES.find((item) => item.key === category)?.title ?? "Karma Test"}</div><div className={styles.questionCard}><div className={styles.paragraphLabel}>PARAGRAF</div><p className={styles.paragraph}>{question.paragraph}</p><h1>{question.question}</h1><div className={styles.options}>{question.options.map((option, optionIndex) => { const selected = answer?.selected === optionIndex; const correct = answer && optionIndex === question.correctIndex; const wrong = selected && !answer.correct; return <button key={option} type="button" disabled={Boolean(answer)} onClick={() => choose(optionIndex)} className={`${styles.option} ${correct ? styles.correct : ""} ${wrong ? styles.wrong : ""} ${selected ? styles.selected : ""}`}><span className={styles.badge}>{labels[optionIndex]}</span><span>{option}</span></button>; })}</div>{answer && <div className={`${styles.feedback} ${answer.correct ? styles.feedbackCorrect : styles.feedbackWrong}`}><strong>{answer.correct ? "Doğru ✓" : `Yanlış ✕ · Doğru cevap: ${labels[question.correctIndex]}`}</strong><p>{question.explanation}</p></div>}</div>{answer && <button type="button" className={styles.next} onClick={() => void next()} disabled={saving}>{index === questions.length - 1 ? (saving ? "Sonuç kaydediliyor…" : "Sonuçları Gör") : "Sonraki Soru →"}</button>}</section></main>;
}
