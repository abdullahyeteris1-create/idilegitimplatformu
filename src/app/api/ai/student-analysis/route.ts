import OpenAI from "openai";
import { createClient } from "@supabase/supabase-js";
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { isAdminSessionValid } from "@/lib/auth/adminSession";
import type { StudentAnalysis } from "@/lib/ai/studentAnalysisTypes";
import type { ExerciseType } from "@/lib/results/types";

export const runtime = "nodejs";

const AI_MODEL = process.env.OPENAI_ANALYSIS_MODEL ?? "gpt-5-mini";
const MAX_RESULTS = 30;
const STUDENTS_TABLE = process.env.NEXT_PUBLIC_SUPABASE_STUDENTS_TABLE ?? "students";
const RESULTS_TABLE = process.env.NEXT_PUBLIC_SUPABASE_RESULTS_TABLE ?? "exercise_results";
const activeRequests = new Set<string>();

const EXERCISE_TITLES: Record<ExerciseType, string> = {
  tachistoscope: "Takistoskop",
  "similar-words": "Benzer Kelimeler",
  "block-reading": "Blok Okuma",
  "shadow-reading": "Gölgeleme",
  "focused-reading": "Odaklı Okuma",
  "two-side-focus": "Çift Taraflı Odak",
  "attention-maze": "Dikkat Labirenti",
  "memory-game": "Hafıza Geliştirme",
  "word-finding": "Kelime Bulma",
  "eye-muscle": "Göz Kaslarını Geliştirme",
  "reading-comprehension": "Anlama Testi",
  "letter-number-counting-focus": "Harf / Rakam Sayma Odak Çalışması",
  "card-matching": "Kart Eşleştirme Çalışması",
  "visual-puzzle": "Görsel Puzzle Çalışması",
  "eye-brain": "Göz Beyin Çalışması",
  "word-guess": "Kelime Tahmin",
  "catch-same": "Aynı Olanı Yakala",
  hangman: "Adam Asmaca",
  "grouping-reading": "Gruplama Çalışması",
  "eye-columns": "Göz Egzersizleri: Kolonlar",
  "square-vision": "KAREL: Kare Görme Alanı",
  "color-match": "Renk Uyumu",
  "reading-speed-test": "Okuma Hızı Testi",
};

const EXERCISE_TYPES = new Set<ExerciseType>(Object.keys(EXERCISE_TITLES) as ExerciseType[]);
const BLOCKED_DETAIL_KEY = /(name|student|username|password|email|phone|address|note|parent|veli|ad|soyad)/i;

const ANALYSIS_SCHEMA = {
  type: "object",
  additionalProperties: false,
  required: ["generalAssessment", "strengths", "improvementAreas", "recommendedExercises"],
  properties: {
    generalAssessment: { type: "string" },
    strengths: { type: "array", maxItems: 4, items: { type: "string" } },
    improvementAreas: { type: "array", maxItems: 4, items: { type: "string" } },
    recommendedExercises: {
      type: "array",
      maxItems: 4,
      items: {
        type: "object",
        additionalProperties: false,
        required: ["exerciseType", "title", "reason", "suggestedSettings"],
        properties: {
          exerciseType: { type: "string", enum: [...EXERCISE_TYPES] },
          title: { type: "string" },
          reason: { type: "string" },
          suggestedSettings: {
            type: "string",
            description: "Kesin ayar çıkarılamıyorsa: Öğretmen değerlendirmesine göre ayarlanmalıdır.",
          },
        },
      },
    },
  },
} as const;

type AnonymousResult = {
  exerciseType: ExerciseType;
  exerciseTitle: string;
  date: string;
  durationSeconds: number;
  correctCount: number | null;
  wrongCount: number | null;
  score: number | null;
  successRate: number | null;
  details?: Record<string, unknown>;
};

function errorResponse(error: string, status: number) {
  return NextResponse.json({ ok: false, error }, { status });
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function parseStudentId(payload: unknown): string | null {
  if (!isRecord(payload) || Object.keys(payload).length !== 1 || typeof payload.studentId !== "string") {
    return null;
  }

  const studentId = payload.studentId.trim();
  return /^[a-zA-Z0-9-]{1,128}$/.test(studentId) ? studentId : null;
}

function finiteNumber(value: unknown): number {
  const number = Number(value);
  return Number.isFinite(number) ? number : 0;
}

function optionalFiniteNumber(value: unknown): number | null {
  if (value === null || value === undefined || value === "") {
    return null;
  }

  const number = Number(value);
  return Number.isFinite(number) ? number : null;
}

function readDurationSeconds(details: Record<string, unknown> | undefined): number {
  if (!details) {
    return 0;
  }

  const secondsKeys = [
    "durationSeconds",
    "readingDurationSeconds",
    "actualDurationSeconds",
    "elapsedSeconds",
    "selectedDuration",
  ];

  for (const key of secondsKeys) {
    const value = optionalFiniteNumber(details[key]);
    if (value !== null && value >= 0) {
      return value;
    }
  }

  const durationMinutes = optionalFiniteNumber(details.durationMinutes);
  return durationMinutes !== null && durationMinutes >= 0 ? durationMinutes * 60 : 0;
}

function sanitizeDetails(value: unknown, depth = 0): Record<string, unknown> | undefined {
  if (!isRecord(value) || depth > 2) {
    return undefined;
  }

  const output: Record<string, unknown> = {};
  for (const [key, item] of Object.entries(value).slice(0, 24)) {
    if (BLOCKED_DETAIL_KEY.test(key) || key.length > 40) {
      continue;
    }

    if (typeof item === "number" && Number.isFinite(item)) {
      output[key] = item;
    } else if (typeof item === "boolean") {
      output[key] = item;
    } else if (typeof item === "string") {
      output[key] = item.slice(0, 160);
    } else if (Array.isArray(item)) {
      output[key] = item.slice(0, 12).filter((entry) => ["string", "number", "boolean"].includes(typeof entry)).map((entry) => typeof entry === "string" ? entry.slice(0, 80) : entry);
    } else {
      const nested = sanitizeDetails(item, depth + 1);
      if (nested && Object.keys(nested).length > 0) {
        output[key] = nested;
      }
    }
  }

  return Object.keys(output).length > 0 ? output : undefined;
}

function mapAnonymousResult(row: Record<string, unknown>): AnonymousResult | null {
  const exerciseType = String(row.exercise_type ?? "") as ExerciseType;
  if (!EXERCISE_TYPES.has(exerciseType)) {
    return null;
  }

  const rawDetails = isRecord(row.details) ? row.details : undefined;
  const details = sanitizeDetails(rawDetails);
  const correctCount = finiteNumber(row.correct_count);
  const wrongCount = finiteNumber(row.wrong_count);
  const isReadingSpeedTest = exerciseType === "reading-speed-test";
  const storedSuccessRate = isReadingSpeedTest ? null : optionalFiniteNumber(row.success_rate);
  const totalAnswers = correctCount + wrongCount;
  const successRate = storedSuccessRate ?? (
    totalAnswers > 0 ? Math.round((correctCount / totalAnswers) * 100) : null
  );

  return {
    exerciseType,
    exerciseTitle: EXERCISE_TITLES[exerciseType],
    date: String(row.completed_at ?? ""),
    durationSeconds: readDurationSeconds(rawDetails),
    correctCount: isReadingSpeedTest ? null : correctCount,
    wrongCount: isReadingSpeedTest ? null : wrongCount,
    score: isReadingSpeedTest ? null : finiteNumber(row.score),
    successRate,
    ...(details ? { details } : {}),
  };
}

function parseAnalysis(value: unknown): StudentAnalysis | null {
  if (!isRecord(value) || typeof value.generalAssessment !== "string" || !value.generalAssessment.trim()) {
    return null;
  }
  if (!Array.isArray(value.strengths) || !Array.isArray(value.improvementAreas) || !Array.isArray(value.recommendedExercises)) {
    return null;
  }

  if (!value.strengths.every((item) => typeof item === "string")) {
    return null;
  }
  if (!value.improvementAreas.every((item) => typeof item === "string")) {
    return null;
  }

  const recommendedExercises = [] as StudentAnalysis["recommendedExercises"];
  for (const item of value.recommendedExercises) {
    if (
      !isRecord(item) ||
      typeof item.exerciseType !== "string" ||
      typeof item.title !== "string" ||
      typeof item.reason !== "string" ||
      typeof item.suggestedSettings !== "string" ||
      !EXERCISE_TYPES.has(item.exerciseType as ExerciseType)
    ) {
      return null;
    }

    const exerciseType = item.exerciseType as ExerciseType;
    recommendedExercises.push({
      exerciseType,
      title: item.title,
      reason: item.reason,
      suggestedSettings: item.suggestedSettings,
    });
  }

  return {
    generalAssessment: value.generalAssessment.trim(),
    strengths: value.strengths,
    improvementAreas: value.improvementAreas,
    recommendedExercises,
  };
}

function systemInstructions(): string {
  return `Sen hızlı okuma öğretmenine yardımcı olan eğitim analiz asistanısın.
Öğrenciye tıbbi veya psikolojik teşhis koyma. Yalnızca sağlanan anonim egzersiz sonuçlarına dayan.
Başarı oranı, süre, doğru/yanlış ve ayar değişimlerini karşılaştır. Tek bir sonuca aşırı anlam yükleme; düzenli tekrar edilen sonuçlara daha fazla önem ver.
En yeni sonuçlarla eski sonuçlar arasında gelişim varsa belirt. Veri azsa açıkça "yeterli veri bulunmuyor" ifadesini kullan.
Veride olmayan başarıyı, sorunu veya ayarı uydurma. Öğretmenin kararının yerini alma; yalnızca ölçülü, eğitimsel öneriler sun.
Bütün metinler Türkçe ve kısa olsun. En fazla dörder güçlü yön, gelişim alanı ve çalışma önerisi üret.
Yalnızca şu platform çalışmalarını öner: ${Object.entries(EXERCISE_TITLES).map(([type, title]) => `${type} (${title})`).join(", ")}.
Öneri başlığını ilgili platform adıyla yaz. Her recommendedExercises öğesinde suggestedSettings mutlaka bulunmalıdır.
Kesin ayar veriden güvenle çıkarılamıyorsa sayı uydurma ve suggestedSettings alanına tam olarak "Öğretmen değerlendirmesine göre ayarlanmalıdır." yaz.
Yalnızca verilen JSON Schema'ya uygun veri döndür.`;
}

export async function POST(request: NextRequest) {
  if (!isAdminSessionValid(request)) {
    return errorResponse("Yetkisiz erişim.", 401);
  }

  let payload: unknown;
  try {
    payload = await request.json();
  } catch {
    return errorResponse("Geçersiz istek.", 400);
  }

  const studentId = parseStudentId(payload);
  if (!studentId) {
    return errorResponse("Geçerli bir öğrenci seçin.", 400);
  }

  const apiKey = process.env.OPENAI_API_KEY?.trim();
  if (!apiKey) {
    return errorResponse("OpenAI API yapılandırması eksik.", 500);
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim();
  if (!supabaseUrl || !supabaseKey) {
    return errorResponse("Öğrenci sonuçlarına şu anda ulaşılamıyor.", 500);
  }

  if (activeRequests.has(studentId)) {
    return errorResponse("Bu öğrenci için analiz zaten hazırlanıyor. Lütfen biraz bekleyin.", 429);
  }
  activeRequests.add(studentId);

  try {
    const supabase = createClient(supabaseUrl, supabaseKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
    const { data: studentRows, error: studentError } = await supabase
      .from(STUDENTS_TABLE)
      .select("id")
      .eq("id", studentId)
      .limit(1);

    if (studentError) {
      throw new Error(`Student lookup failed: ${studentError.code ?? "unknown"}`);
    }
    if (!studentRows?.length) {
      return errorResponse("Öğrenci bulunamadı.", 404);
    }

    const { data: resultRows, error: resultsError } = await supabase
      .from(RESULTS_TABLE)
      .select("exercise_type, completed_at, correct_count, wrong_count, score, success_rate, details")
      .eq("student_id", studentId)
      .order("completed_at", { ascending: false })
      .limit(MAX_RESULTS);

    if (resultsError) {
      if (process.env.NODE_ENV === "development") {
        console.error("AI result lookup failed", {
          code: resultsError.code,
          message: resultsError.message,
        });
      }
      throw new Error(`Result lookup failed: ${resultsError.code ?? "unknown"}`);
    }

    const results = (resultRows ?? []).map((row) => mapAnonymousResult(row as Record<string, unknown>)).filter((result): result is AnonymousResult => result !== null);
    if (results.length === 0) {
      return errorResponse("Bu öğrenci için analiz edilecek egzersiz sonucu bulunamadı.", 404);
    }

    const openai = new OpenAI({ apiKey });
    const response = await openai.responses.create({
      model: AI_MODEL,
      store: false,
      reasoning: { effort: "low" },
      instructions: systemInstructions(),
      input: `Sonuçları en yeniden eskiye analiz et. Anonim egzersiz sonuçları:\n${JSON.stringify(results)}`,
      max_output_tokens: 4000,
      text: {
        format: {
          type: "json_schema",
          name: "student_development_analysis",
          strict: true,
          schema: ANALYSIS_SCHEMA,
        },
      },
    });

    const outputText = response.output_text?.trim() ?? "";
    if (!outputText) {
      if (process.env.NODE_ENV === "development") {
        console.error("AI response validation failed", {
          hasOutputText: false,
          outputLength: 0,
          responseStatus: response.status,
          incompleteReason: response.incomplete_details?.reason ?? null,
          parsedKeys: [],
          strengthsIsArray: false,
          improvementAreasIsArray: false,
          recommendationsIsArray: false,
        });
      }
      return errorResponse("AI boş yanıt döndürdü.", 502);
    }

    let parsed: unknown;
    try {
      parsed = JSON.parse(outputText);
    } catch {
      if (process.env.NODE_ENV === "development") {
        console.error("AI response JSON parse failed", {
          hasOutputText: true,
          outputLength: outputText.length,
          responseStatus: response.status,
          incompleteReason: response.incomplete_details?.reason ?? null,
        });
      }
      return errorResponse("AI yanıtı işlenemedi.", 502);
    }

    const analysis = parseAnalysis(parsed);
    if (!analysis) {
      const parsedRecord = isRecord(parsed) ? parsed : null;
      if (process.env.NODE_ENV === "development") {
        console.error("AI response validation failed", {
          hasOutputText: true,
          outputLength: outputText.length,
          responseStatus: response.status,
          incompleteReason: response.incomplete_details?.reason ?? null,
          parsedKeys: parsedRecord ? Object.keys(parsedRecord) : [],
          strengthsIsArray: Array.isArray(parsedRecord?.strengths),
          improvementAreasIsArray: Array.isArray(parsedRecord?.improvementAreas),
          recommendationsIsArray: Array.isArray(parsedRecord?.recommendedExercises),
        });
      }
      return errorResponse("AI yanıtı doğrulanamadı.", 502);
    }

    return NextResponse.json({ ok: true, analysis });
  } catch (error) {
    console.error("AI student analysis failed", {
      message: error instanceof Error ? error.message : "Unknown error",
    });

    if (error instanceof OpenAI.RateLimitError) {
      const code = error.code?.toLowerCase();
      if (code === "insufficient_quota" || code === "billing_hard_limit_reached") {
        return errorResponse("Kullanılabilir API kredisi bulunamadı.", 402);
      }
      return errorResponse("AI hizmeti şu anda yoğun. Biraz sonra tekrar deneyin.", 429);
    }

    if (error instanceof OpenAI.APIError && (error.status === 402 || error.code === "insufficient_quota")) {
      return errorResponse("Kullanılabilir API kredisi bulunamadı.", 402);
    }

    if (error instanceof OpenAI.APIError) {
      return errorResponse("AI hizmetinden geçerli bir yanıt alınamadı.", 502);
    }

    return errorResponse("Analiz hazırlanırken bir sorun oluştu.", 500);
  } finally {
    activeRequests.delete(studentId);
  }
}
