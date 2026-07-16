import type { SupabaseClient } from "@supabase/supabase-js";
import type {
  AssignmentSettings,
  DailyAssignment,
  DailyAssignmentItem,
  GenerateDailyAssignmentInput,
  StudentAssignmentProfile,
} from "@/lib/assignments/assignmentTypes";
import { normalizeEducationLevel } from "@/lib/assignments/educationLevels";
import { ASSIGNMENT_EXERCISE_BY_SLUG } from "@/lib/assignments/exerciseCatalog";

const DAILY_ASSIGNMENTS_TABLE = "daily_assignments";
const DAILY_ASSIGNMENT_ITEMS_TABLE = "daily_assignment_items";
const STUDENTS_TABLE = process.env.NEXT_PUBLIC_SUPABASE_STUDENTS_TABLE ?? "students";
const EXERCISE_RESULTS_TABLE = process.env.NEXT_PUBLIC_SUPABASE_RESULTS_TABLE ?? "exercise_results";
const TEXT_LIBRARY_TABLE = process.env.NEXT_PUBLIC_SUPABASE_TEXT_LIBRARY_TABLE ?? "text_library";
const QUESTION_LIBRARY_TABLE = process.env.NEXT_PUBLIC_SUPABASE_QUESTION_LIBRARY_TABLE ?? "question_library";

function mapAssignmentRow(row: Record<string, unknown>, items: DailyAssignmentItem[]): DailyAssignment {
  return {
    id: String(row.id ?? ""),
    studentId: String(row.student_id ?? ""),
    assignmentDate: String(row.assignment_date ?? ""),
    title: String(row.title ?? "Gunluk Odev Plani"),
    status: String(row.status ?? "pending") as DailyAssignment["status"],
    generationMode: String(row.generation_mode ?? "automatic") as DailyAssignment["generationMode"],
    educationLevel: normalizeEducationLevel(row.education_level),
    teacherNote: typeof row.teacher_note === "string" ? row.teacher_note : undefined,
    warningMessage: typeof row.warning_message === "string" ? row.warning_message : undefined,
    createdBy: typeof row.created_by === "string" ? row.created_by : undefined,
    createdAt: String(row.created_at ?? new Date().toISOString()),
    updatedAt: String(row.updated_at ?? new Date().toISOString()),
    items,
  };
}

function mapItemRow(row: Record<string, unknown>): DailyAssignmentItem {
  return {
    id: String(row.id ?? ""),
    assignmentId: String(row.assignment_id ?? ""),
    studentId: String(row.student_id ?? ""),
    exerciseSlug: String(row.exercise_slug ?? ""),
    exerciseTitle: String(row.exercise_title ?? ""),
    category: String(row.category ?? "speed") as DailyAssignmentItem["category"],
    sortOrder: Number(row.sort_order ?? 0),
    settingsJson: (row.settings_json as AssignmentSettings) ?? {},
    status: String(row.status ?? "pending") as DailyAssignmentItem["status"],
    targetType: typeof row.target_type === "string" ? (row.target_type as DailyAssignmentItem["targetType"]) : undefined,
    targetValue: typeof row.target_value === "number" ? row.target_value : undefined,
    resultId: typeof row.result_id === "string" ? row.result_id : undefined,
    assignedTextId: typeof row.assigned_text_id === "string" ? row.assigned_text_id : undefined,
    assignedTextTitle: typeof row.assigned_text_title === "string" ? row.assigned_text_title : undefined,
    isRepeat: row.is_repeat === true,
    teacherNote: typeof row.teacher_note === "string" ? row.teacher_note : undefined,
    startedAt: typeof row.started_at === "string" ? row.started_at : undefined,
    completedAt: typeof row.completed_at === "string" ? row.completed_at : undefined,
    createdAt: String(row.created_at ?? new Date().toISOString()),
    updatedAt: String(row.updated_at ?? new Date().toISOString()),
  };
}

export async function getStudentAssignmentProfile(
  supabase: SupabaseClient,
  studentId: string,
): Promise<StudentAssignmentProfile | null> {
  const { data, error } = await supabase
    .from(STUDENTS_TABLE)
    .select("id,name,class_name,education_level,assignment_mode")
    .eq("id", studentId)
    .maybeSingle();

  if (error || !data) {
    return null;
  }

  const assignmentMode =
    data.assignment_mode === "manual" || data.assignment_mode === "ai_assisted" || data.assignment_mode === "automatic"
      ? data.assignment_mode
      : "automatic";

  return {
    id: String(data.id),
    name: String(data.name ?? ""),
    className: typeof data.class_name === "string" ? data.class_name : undefined,
    educationLevel: normalizeEducationLevel(data.education_level),
    assignmentMode,
  };
}

export async function getDailyAssignmentByDate(
  supabase: SupabaseClient,
  studentId: string,
  assignmentDate: string,
): Promise<DailyAssignment | null> {
  const { data: assignmentRows, error: assignmentError } = await supabase
    .from(DAILY_ASSIGNMENTS_TABLE)
    .select("*")
    .eq("student_id", studentId)
    .eq("assignment_date", assignmentDate)
    .limit(1);

  if (assignmentError || !Array.isArray(assignmentRows) || assignmentRows.length === 0) {
    return null;
  }

  const assignmentRow = assignmentRows[0] as Record<string, unknown>;

  const { data: itemRows } = await supabase
    .from(DAILY_ASSIGNMENT_ITEMS_TABLE)
    .select("*")
    .eq("assignment_id", String(assignmentRow.id))
    .order("sort_order", { ascending: true });

  const items = Array.isArray(itemRows)
    ? itemRows.map((row) => mapItemRow(row as Record<string, unknown>))
    : [];

  return mapAssignmentRow(assignmentRow, items);
}

export async function listRecentAssignments(
  supabase: SupabaseClient,
  studentId: string,
  beforeDate: string,
  limit = 7,
): Promise<DailyAssignment[]> {
  const { data: rows, error } = await supabase
    .from(DAILY_ASSIGNMENTS_TABLE)
    .select("*")
    .eq("student_id", studentId)
    .lt("assignment_date", beforeDate)
    .order("assignment_date", { ascending: false })
    .limit(limit);

  if (error || !Array.isArray(rows) || rows.length === 0) {
    return [];
  }

  const assignmentIds = rows.map((row) => String((row as Record<string, unknown>).id));
  const { data: itemRows } = await supabase
    .from(DAILY_ASSIGNMENT_ITEMS_TABLE)
    .select("*")
    .in("assignment_id", assignmentIds)
    .order("sort_order", { ascending: true });

  const itemsByAssignmentId = new Map<string, DailyAssignmentItem[]>();
  for (const row of Array.isArray(itemRows) ? itemRows : []) {
    const item = mapItemRow(row as Record<string, unknown>);
    const bucket = itemsByAssignmentId.get(item.assignmentId) ?? [];
    bucket.push(item);
    itemsByAssignmentId.set(item.assignmentId, bucket);
  }

  return rows.map((row) => {
    const assignmentRow = row as Record<string, unknown>;
    return mapAssignmentRow(
      assignmentRow,
      itemsByAssignmentId.get(String(assignmentRow.id)) ?? [],
    );
  });
}

export async function listRecentResultsByExerciseSlug(
  supabase: SupabaseClient,
  studentId: string,
  exerciseSlug: string,
  limit = 5,
): Promise<Array<Record<string, unknown>>> {
  const definition = ASSIGNMENT_EXERCISE_BY_SLUG.get(exerciseSlug);
  if (!definition) {
    return [];
  }

  const { data, error } = await supabase
    .from(EXERCISE_RESULTS_TABLE)
    .select("id,success_rate,score,correct_count,wrong_count,exercise_type,completed_at")
    .eq("student_id", studentId)
    .eq("exercise_type", definition.resultExerciseType)
    .order("completed_at", { ascending: false })
    .limit(limit);

  if (error || !Array.isArray(data)) {
    return [];
  }

  return data as Array<Record<string, unknown>>;
}

export async function listComprehensionTextCandidates(
  supabase: SupabaseClient,
): Promise<Array<Record<string, unknown>>> {
  const { data: texts, error: textError } = await supabase
    .from(TEXT_LIBRARY_TABLE)
    .select("id,title,category,is_active,education_level,updated_at")
    .eq("is_active", true)
    .order("title", { ascending: true });

  if (textError || !Array.isArray(texts) || texts.length === 0) {
    return [];
  }

  const textIds = texts.map((row) => String((row as Record<string, unknown>).id));
  const { data: questionRows, error: questionError } = await supabase
    .from(QUESTION_LIBRARY_TABLE)
    .select("text_id,id")
    .in("text_id", textIds)
    .eq("is_active", true);

  if (questionError || !Array.isArray(questionRows)) {
    return [];
  }

  const validTextIds = new Set(questionRows.map((row) => String((row as Record<string, unknown>).text_id)));
  return texts.filter((row) => validTextIds.has(String((row as Record<string, unknown>).id))) as Array<Record<string, unknown>>;
}

export async function createDailyAssignment(
  supabase: SupabaseClient,
  input: GenerateDailyAssignmentInput & {
    title: string;
    status: DailyAssignment["status"];
    generationMode: DailyAssignment["generationMode"];
    educationLevel?: string;
    warningMessage?: string;
    teacherNote?: string;
    items: Array<{
      exerciseSlug: string;
      exerciseTitle: string;
      category: DailyAssignmentItem["category"];
      sortOrder: number;
      settingsJson: AssignmentSettings;
      status: DailyAssignmentItem["status"];
      targetType?: DailyAssignmentItem["targetType"];
      targetValue?: number;
      assignedTextId?: string;
      assignedTextTitle?: string;
      isRepeat?: boolean;
      teacherNote?: string;
    }>;
  },
): Promise<DailyAssignment | null> {
  const assignmentPayload = {
    student_id: input.studentId,
    assignment_date: input.assignmentDate,
    title: input.title,
    status: input.status,
    generation_mode: input.generationMode,
    education_level: input.educationLevel ?? null,
    warning_message: input.warningMessage ?? null,
    teacher_note: input.teacherNote ?? null,
    created_by: input.createdBy ?? null,
  };

  const { data: assignmentRow, error: assignmentError } = await supabase
    .from(DAILY_ASSIGNMENTS_TABLE)
    .insert(assignmentPayload)
    .select("*")
    .single();

  if (assignmentError || !assignmentRow) {
    if (assignmentError?.code === "23505") {
      return getDailyAssignmentByDate(supabase, input.studentId, input.assignmentDate);
    }

    return null;
  }

  const assignmentId = String((assignmentRow as Record<string, unknown>).id);

  const itemPayloads = input.items.map((item) => ({
    assignment_id: assignmentId,
    student_id: input.studentId,
    exercise_slug: item.exerciseSlug,
    exercise_title: item.exerciseTitle,
    category: item.category,
    sort_order: item.sortOrder,
    settings_json: item.settingsJson,
    status: item.status,
    target_type: item.targetType ?? null,
    target_value: item.targetValue ?? null,
    assigned_text_id: item.assignedTextId ?? null,
    assigned_text_title: item.assignedTextTitle ?? null,
    is_repeat: item.isRepeat ?? false,
    teacher_note: item.teacherNote ?? null,
  }));

  const { data: itemRows, error: itemError } = await supabase
    .from(DAILY_ASSIGNMENT_ITEMS_TABLE)
    .insert(itemPayloads)
    .select("*")
    .order("sort_order", { ascending: true });

  if (itemError || !Array.isArray(itemRows)) {
    return null;
  }

  return mapAssignmentRow(
    assignmentRow as Record<string, unknown>,
    itemRows.map((row) => mapItemRow(row as Record<string, unknown>)),
  );
}

export async function getAssignmentItemById(
  supabase: SupabaseClient,
  itemId: string,
): Promise<DailyAssignmentItem | null> {
  const { data, error } = await supabase
    .from(DAILY_ASSIGNMENT_ITEMS_TABLE)
    .select("*")
    .eq("id", itemId)
    .maybeSingle();

  if (error || !data) {
    return null;
  }

  return mapItemRow(data as Record<string, unknown>);
}

export async function getResultById(
  supabase: SupabaseClient,
  resultId: string,
): Promise<Record<string, unknown> | null> {
  const { data, error } = await supabase
    .from(EXERCISE_RESULTS_TABLE)
    .select("id,student_id,exercise_type,success_rate,score,completed_at")
    .eq("id", resultId)
    .maybeSingle();

  if (error || !data) {
    return null;
  }

  return data as Record<string, unknown>;
}

export async function completeAssignmentItem(
  supabase: SupabaseClient,
  itemId: string,
  resultId: string,
): Promise<void> {
  await supabase
    .from(DAILY_ASSIGNMENT_ITEMS_TABLE)
    .update({
      result_id: resultId,
      status: "completed",
      completed_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq("id", itemId);
}

export async function recomputeAssignmentStatus(
  supabase: SupabaseClient,
  assignmentId: string,
): Promise<void> {
  const { data } = await supabase
    .from(DAILY_ASSIGNMENT_ITEMS_TABLE)
    .select("status")
    .eq("assignment_id", assignmentId);

  const statuses = Array.isArray(data)
    ? data.map((row) => String((row as Record<string, unknown>).status ?? "pending"))
    : [];

  const allCompleted = statuses.length > 0 && statuses.every((status) => status === "completed");
  const anyStarted = statuses.some((status) => status === "started" || status === "completed");

  await supabase
    .from(DAILY_ASSIGNMENTS_TABLE)
    .update({
      status: allCompleted ? "completed" : anyStarted ? "in_progress" : "pending",
      updated_at: new Date().toISOString(),
    })
    .eq("id", assignmentId);
}

export async function getDailyAssignmentById(
  supabase: SupabaseClient,
  assignmentId: string,
): Promise<DailyAssignment | null> {
  const { data, error } = await supabase
    .from(DAILY_ASSIGNMENTS_TABLE)
    .select("*")
    .eq("id", assignmentId)
    .maybeSingle();

  if (error || !data) {
    return null;
  }

  const { data: itemRows } = await supabase
    .from(DAILY_ASSIGNMENT_ITEMS_TABLE)
    .select("*")
    .eq("assignment_id", assignmentId)
    .order("sort_order", { ascending: true });

  return mapAssignmentRow(
    data as Record<string, unknown>,
    Array.isArray(itemRows)
      ? itemRows.map((row) => mapItemRow(row as Record<string, unknown>))
      : [],
  );
}

export async function updateDailyAssignment(
  supabase: SupabaseClient,
  assignmentId: string,
  updates: { title?: string; status?: DailyAssignment["status"]; teacherNote?: string | null; warningMessage?: string | null },
): Promise<DailyAssignment | null> {
  const payload: Record<string, unknown> = {
    updated_at: new Date().toISOString(),
  };

  if (updates.title !== undefined) payload.title = updates.title;
  if (updates.status !== undefined) payload.status = updates.status;
  if (updates.teacherNote !== undefined) payload.teacher_note = updates.teacherNote;
  if (updates.warningMessage !== undefined) payload.warning_message = updates.warningMessage;

  const { error } = await supabase
    .from(DAILY_ASSIGNMENTS_TABLE)
    .update(payload)
    .eq("id", assignmentId);

  if (error) {
    return null;
  }

  return getDailyAssignmentById(supabase, assignmentId);
}

export async function updateDailyAssignmentItem(
  supabase: SupabaseClient,
  itemId: string,
  updates: {
    exerciseSlug?: string;
    exerciseTitle?: string;
    category?: DailyAssignmentItem["category"];
    sortOrder?: number;
    settingsJson?: AssignmentSettings;
    status?: DailyAssignmentItem["status"];
    targetType?: DailyAssignmentItem["targetType"] | null;
    targetValue?: number | null;
    assignedTextId?: string | null;
    assignedTextTitle?: string | null;
    isRepeat?: boolean;
    teacherNote?: string | null;
  },
): Promise<DailyAssignmentItem | null> {
  const payload: Record<string, unknown> = {
    updated_at: new Date().toISOString(),
  };

  if (updates.exerciseSlug !== undefined) payload.exercise_slug = updates.exerciseSlug;
  if (updates.exerciseTitle !== undefined) payload.exercise_title = updates.exerciseTitle;
  if (updates.category !== undefined) payload.category = updates.category;
  if (updates.sortOrder !== undefined) payload.sort_order = updates.sortOrder;
  if (updates.settingsJson !== undefined) payload.settings_json = updates.settingsJson;
  if (updates.status !== undefined) payload.status = updates.status;
  if (updates.targetType !== undefined) payload.target_type = updates.targetType;
  if (updates.targetValue !== undefined) payload.target_value = updates.targetValue;
  if (updates.assignedTextId !== undefined) payload.assigned_text_id = updates.assignedTextId;
  if (updates.assignedTextTitle !== undefined) payload.assigned_text_title = updates.assignedTextTitle;
  if (updates.isRepeat !== undefined) payload.is_repeat = updates.isRepeat;
  if (updates.teacherNote !== undefined) payload.teacher_note = updates.teacherNote;

  const { data, error } = await supabase
    .from(DAILY_ASSIGNMENT_ITEMS_TABLE)
    .update(payload)
    .eq("id", itemId)
    .select("*")
    .maybeSingle();

  if (error || !data) {
    return null;
  }

  return mapItemRow(data as Record<string, unknown>);
}

export async function createDailyAssignmentItem(
  supabase: SupabaseClient,
  input: {
    assignmentId: string;
    studentId: string;
    exerciseSlug: string;
    exerciseTitle: string;
    category: DailyAssignmentItem["category"];
    sortOrder: number;
    settingsJson: AssignmentSettings;
    status?: DailyAssignmentItem["status"];
    targetType?: DailyAssignmentItem["targetType"];
    targetValue?: number;
    assignedTextId?: string;
    assignedTextTitle?: string;
    isRepeat?: boolean;
    teacherNote?: string;
  },
): Promise<DailyAssignmentItem | null> {
  const { data, error } = await supabase
    .from(DAILY_ASSIGNMENT_ITEMS_TABLE)
    .insert({
      assignment_id: input.assignmentId,
      student_id: input.studentId,
      exercise_slug: input.exerciseSlug,
      exercise_title: input.exerciseTitle,
      category: input.category,
      sort_order: input.sortOrder,
      settings_json: input.settingsJson,
      status: input.status ?? "pending",
      target_type: input.targetType ?? null,
      target_value: input.targetValue ?? null,
      assigned_text_id: input.assignedTextId ?? null,
      assigned_text_title: input.assignedTextTitle ?? null,
      is_repeat: input.isRepeat ?? false,
      teacher_note: input.teacherNote ?? null,
    })
    .select("*")
    .single();

  if (error || !data) {
    return null;
  }

  return mapItemRow(data as Record<string, unknown>);
}

export async function deleteDailyAssignmentItem(
  supabase: SupabaseClient,
  itemId: string,
): Promise<boolean> {
  const { error } = await supabase
    .from(DAILY_ASSIGNMENT_ITEMS_TABLE)
    .delete()
    .eq("id", itemId);

  return !error;
}

export async function deleteDailyAssignment(
  supabase: SupabaseClient,
  assignmentId: string,
): Promise<boolean> {
  const { error } = await supabase
    .from(DAILY_ASSIGNMENTS_TABLE)
    .delete()
    .eq("id", assignmentId);

  return !error;
}

export async function hasStartedAssignment(
  supabase: SupabaseClient,
  assignmentId: string,
): Promise<boolean> {
  const assignment = await getDailyAssignmentById(supabase, assignmentId);
  if (!assignment) {
    return true;
  }

  if (assignment.status !== "pending") {
    return true;
  }

  return assignment.items.some((item) => item.status !== "pending");
}
