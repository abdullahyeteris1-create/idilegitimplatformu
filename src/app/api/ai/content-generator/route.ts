import OpenAI from "openai";
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { getAdminSessionFromCookies, isAdminSessionValid } from "@/lib/auth/adminSession";
import {
  CONTENT_LENGTHS,
  CONTENT_TYPES,
  DIFFICULTIES,
  GRADE_LEVELS,
  type ContentGeneratorRequest,
  type GeneratedContent,
  type GeneratedQuestion,
} from "@/lib/ai/contentGeneratorTypes";

export const runtime = "nodejs";

const AI_MODEL = process.env.OPENAI_CONTENT_MODEL ?? process.env.OPENAI_ANALYSIS_MODEL ?? "gpt-5-mini";
const activeRequests = new Set<string>();

const LENGTH_RULES = {
  short: { label: "Kısa", targetWordCount: 200, acceptedMin: 130, acceptedMax: 280 },
  medium: { label: "Orta", targetWordCount: 375, acceptedMin: 260, acceptedMax: 500 },
  long: { label: "Uzun", targetWordCount: 600, acceptedMin: 450, acceptedMax: 780 },
} as const;

const DIFFICULTY_LABELS = { easy: "Kolay", medium: "Orta", hard: "Zor" } as const;
const CONTENT_TYPE_LABELS = {
  informative: "Bilgilendirici",
  story: "Hikâye",
  "general-culture": "Genel kültür",
  scientific: "Bilimsel",
  "daily-life": "Günlük yaşam",
} as const;

const UNSAFE_TOPIC_PATTERNS = [
  /\b(pornografi|porno|cinsel ilişki|çıplaklık)\b/iu,
  /\b(kumar|bahis|casino|rulet)\b/iu,
  /\b(uyuşturucu|kokain|eroin|metamfetamin|alkolü özendir)\b/iu,
  /\b(bomba yap|patlayıcı yap|silah yap|zehir hazırla)\b/iu,
  /\b(intihar|kendine zarar|işkence|vahşet)\b/iu,
  /\b(siyasi propaganda|dini propaganda|nefret söylemi)\b/iu,
  /\b(tıbbi teşhis|tedavi reçetesi|ilaç dozu)\b/iu,
  /\b(öğrenci adı|telefon numarası|ev adresi|e-?posta adresi|kişisel veri)\b/iu,
];

const CONTENT_SCHEMA = {
  type: "object",
  additionalProperties: false,
  required: ["title", "content", "summary", "targetWords", "questions"],
  properties: {
    title: { type: "string" },
    content: { type: "string" },
    summary: { type: "string" },
    targetWords: {
      type: "array",
      minItems: 3,
      maxItems: 8,
      items: {
        type: "object",
        additionalProperties: false,
        required: ["word", "meaning"],
        properties: {
          word: { type: "string" },
          meaning: { type: "string" },
        },
      },
    },
    questions: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        required: ["question", "options", "correctOptionIndex", "explanation"],
        properties: {
          question: { type: "string" },
          options: {
            type: "array",
            minItems: 4,
            maxItems: 4,
            items: { type: "string" },
          },
          correctOptionIndex: { type: "integer", minimum: 0, maximum: 3 },
          explanation: { type: "string" },
        },
      },
    },
  },
} as const;

type ValidationResult =
  | { ok: true; content: GeneratedContent }
  | {
      ok: false;
      code: "structure" | "question_count" | "word_count" | "target_words" | "summary";
      actualWordCount?: number;
    };

function errorResponse(error: string, status: number) {
  return NextResponse.json({ ok: false, error }, { status });
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isAllowed<T extends readonly string[]>(values: T, value: unknown): value is T[number] {
  return typeof value === "string" && values.includes(value as T[number]);
}

function parseRequest(value: unknown): ContentGeneratorRequest | null {
  if (!isRecord(value)) return null;
  const allowedKeys = ["gradeLevel", "topic", "length", "difficulty", "questionCount", "contentType"];
  if (Object.keys(value).some((key) => !allowedKeys.includes(key))) return null;

  const topic = typeof value.topic === "string" ? value.topic.trim() : "";
  if (
    !isAllowed(GRADE_LEVELS, value.gradeLevel) ||
    topic.length < 3 ||
    topic.length > 150 ||
    !isAllowed(CONTENT_LENGTHS, value.length) ||
    !isAllowed(DIFFICULTIES, value.difficulty) ||
    !Number.isInteger(value.questionCount) ||
    Number(value.questionCount) < 3 ||
    Number(value.questionCount) > 10 ||
    !isAllowed(CONTENT_TYPES, value.contentType)
  ) {
    return null;
  }

  return {
    gradeLevel: value.gradeLevel,
    topic,
    length: value.length,
    difficulty: value.difficulty,
    questionCount: Number(value.questionCount),
    contentType: value.contentType,
  };
}

function isUnsafeTopic(topic: string): boolean {
  const normalized = topic.normalize("NFKC");
  return UNSAFE_TOPIC_PATTERNS.some((pattern) => pattern.test(normalized));
}

function countWords(value: string): number {
  return value.trim().split(/\s+/u).filter(Boolean).length;
}

function normalizeForMatch(value: string): string {
  return value.normalize("NFKC").toLocaleLowerCase("tr-TR").replace(/\s+/gu, " ").trim();
}

function nonEmptyString(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

function parseGeneratedContent(
  value: unknown,
  request: ContentGeneratorRequest,
  allowWordCountTolerance = false,
): ValidationResult {
  if (!isRecord(value) || !nonEmptyString(value.title) || !nonEmptyString(value.content) || !nonEmptyString(value.summary)) {
    return { ok: false, code: "structure" };
  }
  if (!Array.isArray(value.targetWords) || value.targetWords.length < 3 || value.targetWords.length > 8) {
    return { ok: false, code: "target_words" };
  }
  if (!Array.isArray(value.questions)) return { ok: false, code: "structure" };
  if (value.questions.length !== request.questionCount) return { ok: false, code: "question_count" };

  const targetWords = [] as GeneratedContent["targetWords"];
  const normalizedContent = normalizeForMatch(value.content);
  for (const item of value.targetWords) {
    if (!isRecord(item) || !nonEmptyString(item.word) || !nonEmptyString(item.meaning)) {
      return { ok: false, code: "target_words" };
    }
    const word = item.word.trim();
    if (!normalizedContent.includes(normalizeForMatch(word))) return { ok: false, code: "target_words" };
    targetWords.push({ word, meaning: item.meaning.trim() });
  }

  const questions = [] as GeneratedQuestion[];
  for (const item of value.questions) {
    if (
      !isRecord(item) ||
      !nonEmptyString(item.question) ||
      !Array.isArray(item.options) ||
      item.options.length !== 4 ||
      !item.options.every(nonEmptyString) ||
      !Number.isInteger(item.correctOptionIndex) ||
      Number(item.correctOptionIndex) < 0 ||
      Number(item.correctOptionIndex) > 3 ||
      !nonEmptyString(item.explanation)
    ) {
      return { ok: false, code: "structure" };
    }
    questions.push({
      question: item.question.trim(),
      options: item.options.map((option) => option.trim()) as [string, string, string, string],
      correctOptionIndex: Number(item.correctOptionIndex),
      explanation: item.explanation.trim(),
    });
  }

  const wordCount = countWords(value.content);
  const lengthRule = LENGTH_RULES[request.length];
  const minimumWordCount = allowWordCountTolerance
    ? Math.floor(lengthRule.acceptedMin * 0.9)
    : lengthRule.acceptedMin;
  const maximumWordCount = allowWordCountTolerance
    ? Math.ceil(lengthRule.acceptedMax * 1.1)
    : lengthRule.acceptedMax;
  if (wordCount < minimumWordCount || wordCount > maximumWordCount) {
    return { ok: false, code: "word_count", actualWordCount: wordCount };
  }

  const sentenceCount = value.summary.split(/[.!?]+/u).map((part) => part.trim()).filter(Boolean).length;
  if (sentenceCount < 2 || sentenceCount > 4) return { ok: false, code: "summary" };

  return {
    ok: true,
    content: {
      title: value.title.trim(),
      content: value.content.trim(),
      summary: value.summary.trim(),
      targetWords,
      questions,
    },
  };
}

function systemInstructions(request: ContentGeneratorRequest, correction?: string): string {
  const length = LENGTH_RULES[request.length];
  return `Sen Türkçe hızlı okuma ve okuduğunu anlama içerikleri hazırlayan eğitim içerik asistanısın.
İçeriği ${request.gradeLevel}, ${DIFFICULTY_LABELS[request.difficulty]} zorluk, ${length.label} uzunluk ve ${CONTENT_TYPE_LABELS[request.contentType]} türüne göre oluştur.
Metni yaklaşık ${length.targetWordCount} kelime olarak oluştur.
Kelime sayısını yalnızca ana okuma metni için uygula; başlık, özet, sorular ve hedef kelimeler bu sayıya dahil değildir.
Yalnızca öğrenciye uygun içerik üret. Ayrıntılı şiddet, cinsellik, kumar, madde özendirmesi, travmatik anlatım, ayrımcılık, siyasi/dini propaganda, tıbbi teşhis veya tedavi, tehlikeli talimat ve kişisel veri üretme.
Metinden cevaplanamayacak soru oluşturma. Sorular kopya olmasın; her soruda yalnızca bir doğru cevap bulunsun. Doğru seçenekleri dengeli dağıt, hepsini A yapma.
Tam ${request.questionCount} soru üret. Her soruda tam dört seçenek olsun. Hedef kelimeler 3-8 adet olsun ve metinde aynen geçsin. Özet 2-4 cümle olsun.
Bilim ve tarih konularında emin olmadığın kesin bilgiyi uydurma. Başlık dışında metni düz yazı yaz; Markdown başlığı veya kod bloğu kullanma.
İçerik öğretmen onayından geçmeden yayımlanmayacaktır. Yalnızca JSON Schema'ya uygun çıktı döndür.${correction ? `\nÖnceki çıktı doğrulanamadı. Şu sorunu düzelt: ${correction}` : ""}`;
}

function correctionFor(
  code: Exclude<ValidationResult, { ok: true }>["code"],
  request: ContentGeneratorRequest,
  actualWordCount?: number,
): string {
  if (code === "question_count") return `Soru sayısını tam ${request.questionCount} yap.`;
  if (code === "word_count") {
    const actual = typeof actualWordCount === "number" ? actualWordCount : "belirlenen aralığın dışında";
    return `Ürettiğin ana okuma metni ${actual} kelime. Metni yaklaşık ${LENGTH_RULES[request.length].targetWordCount} kelime olacak şekilde uzat/kısalt. JSON yapısını, soru sayısını ve diğer alanları koru.`;
  }
  if (code === "target_words") return "3-8 hedef kelimenin her birini ana metinde aynen kullan ve anlamlarını doldur.";
  if (code === "summary") return "Özeti 2-4 tamamlanmış cümle olarak yaz.";
  return "Eksik veya geçersiz alanları JSON Schema'ya tam uyacak şekilde düzelt.";
}

async function createResponse(openai: OpenAI, request: ContentGeneratorRequest, correction?: string) {
  return openai.responses.create({
    model: AI_MODEL,
    store: false,
    reasoning: { effort: "low" },
    instructions: systemInstructions(request, correction),
    input: `Konu: ${request.topic}`,
    max_output_tokens: 6000,
    text: {
      format: {
        type: "json_schema",
        name: "teacher_content_draft",
        strict: true,
        schema: {
          ...CONTENT_SCHEMA,
          properties: {
            ...CONTENT_SCHEMA.properties,
            questions: {
              ...CONTENT_SCHEMA.properties.questions,
              minItems: request.questionCount,
              maxItems: request.questionCount,
            },
          },
        },
      },
    },
  });
}

export async function POST(request: NextRequest) {
  if (!isAdminSessionValid(request)) return errorResponse("Yetkisiz erişim.", 401);

  let payload: unknown;
  try {
    payload = await request.json();
  } catch {
    return errorResponse("İçerik bilgilerini kontrol edin.", 400);
  }

  const generatorRequest = parseRequest(payload);
  if (!generatorRequest) return errorResponse("İçerik bilgilerini kontrol edin.", 400);
  if (isUnsafeTopic(generatorRequest.topic)) {
    return errorResponse("Bu konu öğrenci içeriği üretimi için uygun değildir. Lütfen farklı bir konu seçin.", 400);
  }

  const apiKey = process.env.OPENAI_API_KEY?.trim();
  if (!apiKey) return errorResponse("OpenAI API yapılandırması eksik.", 500);

  const sessionKey = getAdminSessionFromCookies(request)?.trim();
  if (!sessionKey) return errorResponse("Yetkisiz erişim.", 401);
  if (activeRequests.has(sessionKey)) {
    return errorResponse("Bu öğretmen için içerik zaten hazırlanıyor. Lütfen biraz bekleyin.", 429);
  }
  activeRequests.add(sessionKey);

  try {
    const openai = new OpenAI({ apiKey });
    let response = await createResponse(openai, generatorRequest);
    let outputText = response.output_text?.trim() ?? "";
    if (!outputText) return errorResponse("AI boş yanıt döndürdü.", 502);

    let parsed: unknown;
    try {
      parsed = JSON.parse(outputText);
    } catch {
      return errorResponse("AI yanıtı işlenemedi.", 502);
    }

    let validation = parseGeneratedContent(parsed, generatorRequest);
    if (!validation.ok) {
      const firstCode = validation.code;
      response = await createResponse(
        openai,
        generatorRequest,
        correctionFor(firstCode, generatorRequest, validation.actualWordCount),
      );
      outputText = response.output_text?.trim() ?? "";
      if (!outputText) return errorResponse("AI boş yanıt döndürdü.", 502);
      try {
        parsed = JSON.parse(outputText);
      } catch {
        return errorResponse("AI yanıtı işlenemedi.", 502);
      }
      validation = parseGeneratedContent(parsed, generatorRequest, true);
    }

    if (!validation.ok) {
      if (process.env.NODE_ENV === "development") {
        const lengthRule = LENGTH_RULES[generatorRequest.length];
        const actualWordCount = isRecord(parsed) && typeof parsed.content === "string"
          ? countWords(parsed.content)
          : null;
        console.error("AI content validation failed", {
          validationCode: validation.code,
          requestedLength: generatorRequest.length,
          actualWordCount,
          minimumWordCount: lengthRule.acceptedMin,
          maximumWordCount: lengthRule.acceptedMax,
          hasOutputText: Boolean(outputText),
          outputLength: outputText.length,
          parsedKeys: isRecord(parsed) ? Object.keys(parsed) : [],
        });
      }
      const message = validation.code === "question_count"
        ? "AI istenen soru sayısını oluşturamadı. Lütfen yeniden deneyin."
        : validation.code === "word_count"
          ? "AI istenen metin uzunluğunu oluşturamadı. Lütfen yeniden deneyin."
          : "AI yanıtı doğrulanamadı. Lütfen yeniden deneyin.";
      return errorResponse(message, 502);
    }

    return NextResponse.json({ ok: true, content: validation.content });
  } catch (error) {
    console.error("AI content generation failed", {
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
      return errorResponse("İçerik hazırlanırken bir sorun oluştu.", 502);
    }
    return errorResponse("İçerik hazırlanırken bir sorun oluştu.", 500);
  } finally {
    activeRequests.delete(sessionKey);
  }
}
