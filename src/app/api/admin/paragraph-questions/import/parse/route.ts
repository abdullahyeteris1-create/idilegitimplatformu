import { NextResponse, type NextRequest } from "next/server";
import { isAdminSessionValid } from "@/lib/auth/adminSession";
import {
  addQuestionBankDuplicate,
  parseQuestionBankDocxFile,
  toQuestionBankImportDraft,
} from "@/lib/paragraph-exercises/paragraphQuestionBankImporter";
import { findQuestionDuplicates, validateQuestionInput } from "@/lib/paragraph-exercises/paragraphQuestionAdminRepository";

export const runtime = "nodejs";

const no = () => NextResponse.json({ ok: false, error: "Yetkisiz erişim." }, { status: 401 });

export async function POST(request: NextRequest) {
  if (!isAdminSessionValid(request)) return no();
  try {
    const form = await request.formData();
    const file = form.get("file");
    if (!(file instanceof File)) return NextResponse.json({ ok: false, error: "Bir DOCX dosyası seçin." }, { status: 400 });
    let preview = await parseQuestionBankDocxFile(file);
    const candidates = preview.questions
      .map((question, questionIndex) => ({ question, questionIndex, draft: toQuestionBankImportDraft(question) }))
      .filter(({ question, draft }) => question.status !== "error" && draft.correctIndex !== null)
      .map(({ question, questionIndex, draft }) => {
        const result = validateQuestionInput({ ...draft, correctIndex: draft.correctIndex }, { allowEmptyPassage: true, allowFourOptions: true });
        return result.ok ? { question, questionIndex, input: result.value } : null;
      })
      .filter((item): item is { question: typeof preview.questions[number]; questionIndex: number; input: Parameters<typeof findQuestionDuplicates>[0][number] } => item !== null);
    const duplicates = await findQuestionDuplicates(candidates.map((item) => item.input));
    for (const duplicate of duplicates) {
      const candidate = candidates[duplicate.inputIndex];
      if (candidate) preview = addQuestionBankDuplicate(preview, candidate.question.importId, duplicate.existingId);
    }
    return NextResponse.json({ ok: true, preview });
  } catch (error) {
    console.error("paragraph_question_bank_import_parse_failed", error);
    return NextResponse.json({ ok: false, error: error instanceof Error ? error.message : "DOCX dosyası işlenemedi." }, { status: 400 });
  }
}
