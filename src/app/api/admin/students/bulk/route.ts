import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { isAdminSessionValid } from "@/lib/auth/adminSession";
import { hashStudentPassword } from "@/lib/auth/studentPassword";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import { validateStudentPassword } from "@/lib/students/studentPasswordValidation";

export const runtime = "nodejs";

const STUDENTS_TABLE = process.env.NEXT_PUBLIC_SUPABASE_STUDENTS_TABLE ?? "students";
const MAX_ROWS = 500;

type BulkRow = {
  rowNumber?: unknown;
  name?: unknown;
  class_name?: unknown;
  education_level?: unknown;
  parent_name?: unknown;
  phone?: unknown;
  username?: unknown;
  password?: unknown;
  is_active?: unknown;
  notes?: unknown;
};

function errorResponse(message: string, status: number) {
  return NextResponse.json({ ok: false, message }, { status });
}

function asOptionalString(value: unknown): string | null {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

export async function POST(request: NextRequest) {
  if (!isAdminSessionValid(request)) {
    return errorResponse("Yetkisiz erişim.", 401);
  }

  let rows: BulkRow[];
  try {
    const body = (await request.json()) as { rows?: unknown };
    if (!Array.isArray(body.rows) || body.rows.length === 0 || body.rows.length > MAX_ROWS) {
      return errorResponse(`En fazla ${MAX_ROWS} satır içeren bir aktarım gönderin.`, 400);
    }
    rows = body.rows.filter((row): row is BulkRow => Boolean(row && typeof row === "object"));
  } catch {
    return errorResponse("Geçersiz istek gövdesi.", 400);
  }

  const supabase = getSupabaseServerClient();
  if (!supabase) {
    return errorResponse("Sunucu yapılandırması eksik.", 500);
  }
  const db = supabase;

  const errors: Array<{ rowNumber: number; username?: string; message: string }> = [];
  const importedUsernames: string[] = [];
  let nextIndex = 0;

  async function worker() {
    while (nextIndex < rows.length) {
      const index = nextIndex;
      nextIndex += 1;
      const row = rows[index];
      const rowNumber = typeof row.rowNumber === "number" ? row.rowNumber : index + 2;
      const name = asOptionalString(row.name);
      const username = asOptionalString(row.username);
      const password = typeof row.password === "string" ? row.password : "";

      if (!name || !username) {
        errors.push({ rowNumber, username: username ?? undefined, message: "Ad soyad ve kullanıcı adı zorunludur." });
        continue;
      }

      const passwordValidation = validateStudentPassword(password, { username, name });
      if (!passwordValidation.ok) {
        errors.push({ rowNumber, username, message: passwordValidation.message });
        continue;
      }

      const passwordHash = await hashStudentPassword(passwordValidation.value);
      const { error } = await db.from(STUDENTS_TABLE).insert({
        name,
        username,
        // Retained temporarily for schemas where the legacy column is NOT NULL.
        password,
        password_hash: passwordHash,
        password_hash_version: 1,
        password_changed_at: null,
        class_name: asOptionalString(row.class_name),
        education_level: asOptionalString(row.education_level),
        parent_name: asOptionalString(row.parent_name),
        phone: asOptionalString(row.phone),
        is_active: row.is_active !== false,
        notes: asOptionalString(row.notes),
        updated_at: new Date().toISOString(),
      });

      if (error) {
        errors.push({
          rowNumber,
          username,
          message: error.code === "23505" ? "Kullanıcı adı zaten kullanılıyor." : "Öğrenci kaydedilemedi.",
        });
      } else {
        importedUsernames.push(username);
      }
    }
  }

  await Promise.all(Array.from({ length: Math.min(4, rows.length) }, () => worker()));

  return NextResponse.json({ ok: true, importedUsernames, errors });
}
