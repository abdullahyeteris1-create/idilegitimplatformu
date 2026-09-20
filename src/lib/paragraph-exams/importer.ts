import "server-only";

import { inflateRawSync } from "node:zlib";
import { type ParagraphCategory } from "@/lib/paragraph-exercises/paragraphQuestions";
import { type ParagraphExamDifficulty, type ParagraphExamGradeBand, type ParagraphExamQuestionOptions } from "./types";
import { validateExamInput, validateQuestionInput } from "./validation";

const MAX_FILE_BYTES = 10 * 1024 * 1024;
const MAX_UNCOMPRESSED_BYTES = 40 * 1024 * 1024;
const MAX_ENTRY_BYTES = 20 * 1024 * 1024;
const MAX_QUESTIONS = 100;
const DOCX_MIME = "application/vnd.openxmlformats-officedocument.wordprocessingml.document";

export type ImportQuestionStatus = "ready" | "review" | "error";
export type ImportWarning = { code: string; message: string };
export type ParagraphExamImportQuestion = {
  importId: string; number: number; passageText: string; questionText: string; options: string[];
  answerLetter: string | null; correctOption: number | null; explanation: string;
  category: ParagraphCategory; difficulty: ParagraphExamDifficulty; warnings: ImportWarning[]; status: ImportQuestionStatus;
};
export type ParagraphExamImportPreview = {
  fileName: string; questionCount: number; answerCount: number; readyCount: number; reviewCount: number; errorCount: number;
  questions: ParagraphExamImportQuestion[]; warnings: ImportWarning[];
};
type UploadFileLike = { name: string; type?: string; size: number; arrayBuffer(): Promise<ArrayBuffer> };
type ParsedQuestionBlock = { number: number; lines: string[]; duplicate: boolean };

const WARNING_MESSAGES: Record<string, string> = {
  duplicate_question_number: "Soru numarası tekrar ediyor; kontrol gerekli.",
  duplicate_answer_number: "Cevap anahtarında soru numarası tekrar ediyor; kontrol gerekli.",
  missing_answer: "Cevap anahtarında bu soru için cevap bulunamadı.",
  invalid_answer: "Cevap anahtarındaki harf A-E arasında değil.",
  answer_option_missing: "Cevap anahtarı, soruda bulunmayan bir seçeneği gösteriyor.",
  orphan_answer: "Cevap anahtarında metin içinde bulunmayan bir soru numarası var.",
  missing_option: "A-D seçenekleri eksiksiz olmalıdır.",
  empty_option: "Seçenek metni boş olamaz.",
  question_stem_uncertain: "Paragraf/soru kökü ayrımını kontrol edin.",
  passage_missing: "Paragraf metni bulunamadı; kontrol gerekli.",
  too_many_options: "A-E dışında seçenek desteklenmez.",
};
const warning = (code: string): ImportWarning => ({ code, message: WARNING_MESSAGES[code] ?? "Kontrol gerekli." });
const normalizeText = (value: string) => value.normalize("NFKC").replace(/\u00a0/gu, " ").replace(/[ \t]+/gu, " ").trim();
const normalizeMultilineText = (value: string) => value.normalize("NFKC").replace(/\u00a0/gu, " ").replace(/\r\n?/gu, "\n").split("\n").map((line) => line.replace(/[ \t]+/gu, " ").trim()).join("\n").replace(/\n{3,}/gu, "\n\n").trim();
const safeFileName = (value: string) => value.replace(/[^\p{L}\p{N}._ ()-]/gu, "_").slice(0, 120) || "deneme.docx";

function decodeXmlEntities(value: string): string {
  return value.replace(/&#x([0-9a-f]+);/giu, (_, hex: string) => String.fromCodePoint(Number.parseInt(hex, 16)))
    .replace(/&#([0-9]+);/gu, (_, decimal: string) => String.fromCodePoint(Number.parseInt(decimal, 10)))
    .replace(/&lt;/gu, "<").replace(/&gt;/gu, ">").replace(/&quot;/gu, '"').replace(/&apos;/gu, "'").replace(/&amp;/gu, "&");
}
function extractWordText(fragment: string): string {
  const tokens = /<w:(tab|br|cr|lastRenderedPageBreak)\b[^>]*\/>|<w:(?:t|delText)\b[^>]*>([\s\S]*?)<\/w:(?:t|delText)>/giu;
  let text = "";
  for (const match of fragment.matchAll(tokens)) {
    if (match[1] === "tab") text += "\t";
    else if (match[1]) text += "\n";
    else text += decodeXmlEntities(match[2] ?? "");
  }
  return text;
}
function extractDocumentBlocks(xml: string): string[] {
  const blocks: Array<{ index: number; text: string }> = [];
  const tables: Array<{ start: number; end: number; text: string }> = [];
  for (const match of xml.matchAll(/<w:tbl\b[\s\S]*?<\/w:tbl>/giu)) {
    const start = match.index ?? 0;
    const text = match[0];
    const rows: string[] = [];
    for (const row of text.matchAll(/<w:tr\b[\s\S]*?<\/w:tr>/giu)) {
      const cells = [...row[0].matchAll(/<w:tc\b[\s\S]*?<\/w:tc>/giu)].map((cell) => normalizeText(extractWordText(cell[0])));
      if (cells.some(Boolean)) rows.push(cells.join("\t"));
    }
    tables.push({ start, end: start + text.length, text: rows.join("\n") });
  }
  for (const match of xml.matchAll(/<w:p\b[\s\S]*?<\/w:p>/giu)) {
    const index = match.index ?? 0;
    if (!tables.some((table) => index >= table.start && index < table.end)) blocks.push({ index, text: extractWordText(match[0]) });
  }
  for (const table of tables) blocks.push({ index: table.start, text: table.text });
  return blocks.sort((a, b) => a.index - b.index).flatMap((block) => block.text.split("\n"));
}
function readZipEntries(buffer: Buffer): Map<string, Buffer> {
  const entries = new Map<string, Buffer>();
  const scanStart = Math.max(0, buffer.length - 65557);
  let eocd = -1;
  for (let index = buffer.length - 22; index >= scanStart; index -= 1) if (buffer.readUInt32LE(index) === 0x06054b50) { eocd = index; break; }
  if (eocd < 0) throw new Error("DOCX arşivi okunamadı.");
  const entryCount = buffer.readUInt16LE(eocd + 10);
  const centralSize = buffer.readUInt32LE(eocd + 12);
  const centralOffset = buffer.readUInt32LE(eocd + 16);
  if (entryCount > 2000 || centralOffset + centralSize > buffer.length) throw new Error("DOCX arşiv yapısı geçersiz.");
  let offset = centralOffset;
  let totalUncompressed = 0;
  for (let index = 0; index < entryCount; index += 1) {
    if (offset + 46 > buffer.length || buffer.readUInt32LE(offset) !== 0x02014b50) throw new Error("DOCX arşiv kaydı geçersiz.");
    const flags = buffer.readUInt16LE(offset + 8);
    const method = buffer.readUInt16LE(offset + 10);
    const compressedSize = buffer.readUInt32LE(offset + 20);
    const uncompressedSize = buffer.readUInt32LE(offset + 24);
    const nameLength = buffer.readUInt16LE(offset + 28);
    const extraLength = buffer.readUInt16LE(offset + 30);
    const commentLength = buffer.readUInt16LE(offset + 32);
    const localOffset = buffer.readUInt32LE(offset + 42);
    const name = buffer.subarray(offset + 46, offset + 46 + nameLength).toString("utf8");
    if (!name || name.includes("\\") || name.startsWith("/") || /^[A-Za-z]:/u.test(name) || name.replace(/\/+$/u, "").split("/").some((part) => part === ".." || part === "") || entries.has(name)) throw new Error("DOCX içinde güvenli olmayan dosya yolu var.");
    if ((flags & 1) !== 0 || uncompressedSize > MAX_ENTRY_BYTES || totalUncompressed + uncompressedSize > MAX_UNCOMPRESSED_BYTES) throw new Error("DOCX boyut veya sıkıştırma sınırlarını aşıyor.");
    if (/^(?:word\/(?:vbaProject\.bin|embeddings\/|activeX\/|oleObject\/)|customXml\/)/iu.test(name)) throw new Error("Makro veya gömülü nesne içeren DOCX desteklenmiyor.");
    if (localOffset + 30 > buffer.length || buffer.readUInt32LE(localOffset) !== 0x04034b50) throw new Error("DOCX yerel kaydı geçersiz.");
    const dataStart = localOffset + 30 + buffer.readUInt16LE(localOffset + 26) + buffer.readUInt16LE(localOffset + 28);
    const dataEnd = dataStart + compressedSize;
    if (dataStart > buffer.length || dataEnd > buffer.length) throw new Error("DOCX sıkıştırılmış veri kaydı geçersiz.");
    const compressed = buffer.subarray(dataStart, dataEnd);
    let data: Buffer;
    if (method === 0) data = Buffer.from(compressed);
    else if (method === 8) data = inflateRawSync(compressed);
    else throw new Error("DOCX sıkıştırma yöntemi desteklenmiyor.");
    if (data.length !== uncompressedSize || data.length > MAX_ENTRY_BYTES) throw new Error("DOCX açılmış veri sınırını aşıyor.");
    totalUncompressed += data.length;
    entries.set(name, data);
    offset += 46 + nameLength + extraLength + commentLength;
  }
  return entries;
}
function parseZipDocument(buffer: Buffer): string {
  const document = readZipEntries(buffer).get("word/document.xml");
  if (!document) throw new Error("DOCX içinde ana belge bulunamadı.");
  return extractDocumentBlocks(document.toString("utf8")).join("\n");
}
function findQuestionStart(line: string): { number: number; content: string } | null {
  const patterns = [/^\s*(\d{1,3})\s*[.)]\s*(.*)$/u, /^\s*(\d{1,3})\s*-\s*(.*)$/u, /^\s*(\d{1,3})\s+Soru\b[.:)]?\s*(.*)$/iu, /^\s*Soru\s+(\d{1,3})\s*[.:)]?\s*(.*)$/iu];
  for (const pattern of patterns) {
    const match = line.match(pattern);
    if (match) {
      const number = Number(match[1]);
      const content = normalizeText(match[2] ?? "").replace(/^Soru\b[.:)]?\s*/iu, "");
      if (number >= 1 && number <= 999) return { number, content };
    }
  }
  return null;
}
function splitPassageAndStem(lines: string[]): { passageText: string; questionText: string; uncertain: boolean } {
  const cleaned = lines.map(normalizeText).filter(Boolean);
  const stemPattern = /\?|(?:hangisidir|hangisi|hangisine|ulaşılamaz|ana düşüncesi|ana fikri|tamamlanmalıdır|tamamlanır|düşüncenin akışını|akışı bozan|çıkarılabilir|söylenmektedir|değinilmiştir|getirilmelidir|sonlandırılmalıdır|doğrudur|yanlıştır)/iu;
  const stemIndex = cleaned.findLastIndex((line) => stemPattern.test(line));
  if (stemIndex >= 0) {
    const passageText = normalizeMultilineText(cleaned.slice(0, stemIndex).join("\n"));
    return { passageText, questionText: normalizeMultilineText(cleaned.slice(stemIndex).join("\n")), uncertain: !passageText };
  }
  if (cleaned.length >= 2) return { passageText: normalizeMultilineText(cleaned.slice(0, -1).join("\n")), questionText: cleaned[cleaned.length - 1], uncertain: true };
  return { passageText: "", questionText: cleaned[0] ?? "", uncertain: true };
}
function parseAnswerKey(lines: string[]): { answers: Map<number, string>; warnings: ImportWarning[] } {
  const warnings: ImportWarning[] = [];
  const answers = new Map<number, string>();
  const answerIndex = lines.findIndex((line) => /^\s*CEVAP\s+ANAHTARI\b/iu.test(line));
  if (answerIndex < 0) return { answers, warnings };
  for (const match of lines.slice(answerIndex + 1).join(" ").matchAll(/\b(\d{1,3})\s*[\t .)\-:]?\s*([A-Z])\b/giu)) {
    const number = Number(match[1]);
    if (answers.has(number)) warnings.push(warning("duplicate_answer_number"));
    else answers.set(number, match[2].toUpperCase());
  }
  return { answers, warnings };
}
function parseQuestionBlocks(lines: string[]): { blocks: ParsedQuestionBlock[]; answerLines: string[]; warnings: ImportWarning[] } {
  const answerIndex = lines.findIndex((line) => /^\s*CEVAP\s+ANAHTARI\b/iu.test(line));
  const questionLines = answerIndex >= 0 ? lines.slice(0, answerIndex) : lines;
  const answerLines = answerIndex >= 0 ? lines.slice(answerIndex) : [];
  const blocks: ParsedQuestionBlock[] = [];
  const seen = new Set<number>();
  let current: ParsedQuestionBlock | null = null;
  for (const rawLine of questionLines) {
    const line = normalizeText(rawLine);
    const start = findQuestionStart(line);
    if (start) {
      if (current) blocks.push(current);
      current = { number: start.number, lines: start.content ? [start.content] : [], duplicate: seen.has(start.number) };
      seen.add(start.number);
    } else if (current) current.lines.push(line);
  }
  if (current) blocks.push(current);
  const numberCounts = new Map<number, number>();
  for (const block of blocks) numberCounts.set(block.number, (numberCounts.get(block.number) ?? 0) + 1);
  for (const block of blocks) if ((numberCounts.get(block.number) ?? 0) > 1) block.duplicate = true;
  return { blocks, answerLines, warnings: blocks.filter((block) => block.duplicate).map(() => warning("duplicate_question_number")) };
}
function parseBlock(block: ParsedQuestionBlock, answer: string | undefined): ParagraphExamImportQuestion {
  const warnings: ImportWarning[] = [];
  if (block.duplicate) warnings.push(warning("duplicate_question_number"));
  const optionLines = block.lines.map((line, index) => ({ line, index, match: line.match(/^\s*([A-E])\s*(?:\)|\.|:|-)\s*(.*)$/iu) })).filter((item) => item.match);
  const firstOptionIndex = optionLines[0]?.index ?? -1;
  const preamble = firstOptionIndex >= 0 ? block.lines.slice(0, firstOptionIndex) : block.lines;
  const options: string[] = [];
  let currentLabel = "";
  for (const line of block.lines.slice(Math.max(0, firstOptionIndex))) {
    const optionMatch = line.match(/^\s*([A-E])\s*(?:\)|\.|:|-)\s*(.*)$/iu);
    if (optionMatch) {
      currentLabel = optionMatch[1].toUpperCase();
      while (options.length < currentLabel.charCodeAt(0) - 65) options.push("");
      options[currentLabel.charCodeAt(0) - 65] = normalizeText(optionMatch[2] ?? "");
    } else if (currentLabel) {
      const optionIndex = currentLabel.charCodeAt(0) - 65;
      options[optionIndex] = normalizeText((options[optionIndex] ?? "") + " " + line);
    }
  }
  while (options.length > 0 && !options.at(-1)) options.pop();
  if (options.length > 5) warnings.push(warning("too_many_options"));
  if (options.length < 4 || options.slice(0, 4).some((option) => !option)) warnings.push(warning("missing_option"));
  if (options.some((option) => !option)) warnings.push(warning("empty_option"));
  const split = splitPassageAndStem(preamble);
  if (split.uncertain) warnings.push(warning("question_stem_uncertain"));
  if (!split.passageText) warnings.push(warning("passage_missing"));
  let correctOption: number | null = null;
  const answerLetter = answer ?? null;
  if (!answer) warnings.push(warning("missing_answer"));
  else if (!/^[A-E]$/u.test(answer)) warnings.push(warning("invalid_answer"));
  else {
    correctOption = answer.charCodeAt(0) - 65;
    if (correctOption >= options.length) {
      warnings.push(warning("answer_option_missing"));
      correctOption = null;
    }
  }
  const structuralError = options.length < 4 || options.slice(0, 4).some((option) => !option) || options.length > 5 || !split.questionText;
  return {
    importId: "q-" + block.number + "-" + Math.random().toString(36).slice(2, 10),
    number: block.number, passageText: split.passageText, questionText: split.questionText, options: options.slice(0, 5),
    answerLetter, correctOption, explanation: "DOCX içe aktarımında açıklama bilgisi bulunmuyor.",
    category: "main_idea", difficulty: "medium", warnings,
    status: structuralError ? "error" : warnings.length > 0 ? "review" : "ready",
  };
}
export function parseParagraphExamText(text: string, fileName = "deneme.docx"): ParagraphExamImportPreview {
  const lines = text.replace(/\r\n?/gu, "\n").split("\n").map((line) => line.trim()).filter((line, index, all) => line !== "" || all[index - 1] !== "");
  const { blocks, answerLines, warnings: blockWarnings } = parseQuestionBlocks(lines);
  if (blocks.length === 0) throw new Error("DOCX içinde soru bulunamadı.");
  if (blocks.length > MAX_QUESTIONS) throw new Error(`DOCX en fazla ${MAX_QUESTIONS} soru içerebilir.`);
  const { answers, warnings: answerWarnings } = parseAnswerKey(answerLines.length > 0 ? answerLines : lines);
  const questions = blocks.map((block) => parseBlock(block, answers.get(block.number)));
  const numbers = new Set(questions.map((question) => question.number));
  for (const number of answers.keys()) if (!numbers.has(number)) blockWarnings.push(warning("orphan_answer"));
  const warnings = [...blockWarnings, ...answerWarnings];
  return {
    fileName: safeFileName(fileName), questionCount: questions.length, answerCount: answers.size,
    readyCount: questions.filter((question) => question.status === "ready").length,
    reviewCount: questions.filter((question) => question.status === "review").length,
    errorCount: questions.filter((question) => question.status === "error").length,
    questions, warnings,
  };
}
export async function parseDocxFile(file: UploadFileLike): Promise<ParagraphExamImportPreview> {
  const lowerName = file.name.toLocaleLowerCase("en-US");
  if (!lowerName.endsWith(".docx") || lowerName.endsWith(".docm")) throw new Error("Yalnızca .docx dosyaları kabul edilir. .docm desteklenmez.");
  if (file.size > MAX_FILE_BYTES) throw new Error("Dosya boyutu 10 MB sınırını aşamaz.");
  if (file.type && ![DOCX_MIME, "application/zip", "application/octet-stream"].includes(file.type)) throw new Error("Dosya türü geçersiz. Yalnızca DOCX yükleyin.");
  const buffer = Buffer.from(await file.arrayBuffer());
  if (buffer.length > MAX_FILE_BYTES) throw new Error("Dosya boyutu 10 MB sınırını aşamaz.");
  return parseParagraphExamText(parseZipDocument(buffer), file.name);
}
export type ImportCreateInput = {
  exam: { title: string; description?: string | null; gradeBand: ParagraphExamGradeBand; durationSeconds: number };
  questions: Array<{ passageText: string; questionText: string; options: string[]; correctOption: number; explanation: string; category: ParagraphCategory; difficulty: ParagraphExamDifficulty; position?: number }>;
};
export function validateImportCreateInput(value: unknown):
  | { ok: true; value: { exam: ImportCreateInput["exam"]; questions: Array<{ passageText: string; questionText: string; options: ParagraphExamQuestionOptions; correctOption: number; explanation: string; category: ParagraphCategory; difficulty: ParagraphExamDifficulty; position: number }> } }
  | { ok: false; error: string } {
  if (!value || typeof value !== "object") return { ok: false, error: "Geçersiz içe aktarma verisi." };
  const body = value as Record<string, unknown>;
  const examResult = validateExamInput(body.exam);
  if (!examResult.ok) return examResult;
  if (!Array.isArray(body.questions) || body.questions.length === 0 || body.questions.length > MAX_QUESTIONS) return { ok: false, error: "İçe aktarılacak soru listesi geçersiz." };
  const questions: Array<{ passageText: string; questionText: string; options: ParagraphExamQuestionOptions; correctOption: number; explanation: string; category: ParagraphCategory; difficulty: ParagraphExamDifficulty; position: number }> = [];
  for (const [index, rawQuestion] of body.questions.entries()) {
    if (!rawQuestion || typeof rawQuestion !== "object") return { ok: false, error: `${index + 1}. soru geçersiz.` };
    const question = rawQuestion as Record<string, unknown>;
    const result = validateQuestionInput({ passageId: null, sourceQuestionId: null, questionText: question.questionText, options: question.options, correctOption: question.correctOption, explanation: question.explanation, category: question.category, difficulty: question.difficulty, gradeBand: examResult.value.gradeBand, position: index + 1, points: 1 });
    if (!result.ok) return { ok: false, error: `${index + 1}. soru: ${result.error}` };
    if (typeof question.passageText !== "string" || question.passageText.trim().length < 10 || question.passageText.length > 20000) return { ok: false, error: `${index + 1}. soru paragrafı geçersiz.` };
    questions.push({ passageText: question.passageText.trim().normalize("NFKC"), questionText: result.value.questionText, options: result.value.options as ParagraphExamQuestionOptions, correctOption: result.value.correctOption, explanation: result.value.explanation, category: result.value.category, difficulty: result.value.difficulty, position: index + 1 });
  }
  return { ok: true, value: { exam: examResult.value, questions } };
}
