import { NextResponse } from "next/server";
import { clearStudentSessionCookie } from "@/lib/auth/studentSession";
import type { StudentAccessFailure } from "@/lib/auth/verifyStudentAccess";
import { ParagraphExamRepositoryError } from "./repository";

export function repositoryErrorResponse(error: unknown, fallback = "İşlem gerçekleştirilemedi."): NextResponse {
  if (error instanceof ParagraphExamRepositoryError) {
    return NextResponse.json({ ok: false, error: error.message || fallback }, { status: error.status ?? (error.code === "23505" ? 409 : 500) });
  }
  console.error("paragraph_exam_request_failed", error);
  return NextResponse.json({ ok: false, error: fallback }, { status: 500 });
}

export function studentAccessErrorResponse(access: Exclude<Awaited<ReturnType<typeof import("@/lib/auth/verifyStudentAccess").verifyStudentAccess>>, { ok: true }>): NextResponse {
  const response = NextResponse.json({ ok: false, error: access.message }, { status: access.status });
  if (access.clearSessionCookie) clearStudentSessionCookie(response);
  return response;
}

export function isStudentAccessFailure(value: Awaited<ReturnType<typeof import("@/lib/auth/verifyStudentAccess").verifyStudentAccess>>): value is StudentAccessFailure {
  return value.ok === false;
}

export function badRequest(message: string): NextResponse {
  return NextResponse.json({ ok: false, error: message }, { status: 400 });
}
