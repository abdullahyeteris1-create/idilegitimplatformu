import { NextRequest, NextResponse } from "next/server";
import { clearStudentSessionCookie } from "@/lib/auth/studentSession";
import { verifyStudentAccess } from "@/lib/auth/verifyStudentAccess";
import { getSupabaseServiceRoleClient } from "@/lib/supabase/server";
import { getStudentExerciseRecommendations } from "@/lib/recommendations/studentExerciseRecommendations";

export const runtime = "nodejs";
const RESULTS_TABLE = process.env.NEXT_PUBLIC_SUPABASE_RESULTS_TABLE ?? "exercise_results";
const WINDOW_DAYS = 14;
const QUERY_LIMIT = 50;

function accessFailure(access: Exclude<Awaited<ReturnType<typeof verifyStudentAccess>>, { ok: true }>) {
  const response = NextResponse.json({ message: access.message }, { status: access.status });
  if (access.clearSessionCookie) clearStudentSessionCookie(response);
  return response;
}

export async function GET(request: NextRequest) {
  const access = await verifyStudentAccess(request);
  if (!access.ok) return accessFailure(access);
  const supabase = getSupabaseServiceRoleClient();
  if (!supabase) return NextResponse.json({ message: "Öneriler şu anda yüklenemiyor." }, { status: 500 });

  const since = new Date(Date.now() - WINDOW_DAYS * 86_400_000).toISOString();
  const { data, error } = await supabase
    .from(RESULTS_TABLE)
    .select("id,exercise_type,success_rate,completed_at,created_at")
    .eq("student_id", access.studentId)
    .gte("completed_at", since)
    .order("completed_at", { ascending: false })
    .limit(QUERY_LIMIT);
  if (error || !Array.isArray(data)) return NextResponse.json({ message: "Öneriler şu anda yüklenemiyor." }, { status: 500 });

  const result = getStudentExerciseRecommendations(data.map((row) => ({
    id: String(row.id ?? ""),
    exerciseType: String(row.exercise_type ?? ""),
    successRate: typeof row.success_rate === "number" ? row.success_rate : Number(row.success_rate),
    completedAt: typeof row.completed_at === "string" ? row.completed_at : typeof row.created_at === "string" ? row.created_at : null,
  })));
  return NextResponse.json({
    analysis: result.analysis,
    recommendations: result.recommendations,
    ...result.summary,
    generatedAt: new Date().toISOString(),
  }, { headers: { "Cache-Control": "private, max-age=60" } });
}
