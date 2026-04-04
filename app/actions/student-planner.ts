"use server"

import { revalidatePath } from "next/cache"
import {
  addDays,
  eachDayOfInterval,
  format,
  isValid,
  parseISO,
  startOfWeek,
  subDays,
} from "date-fns"
import { createClient } from "@/lib/supabase/server"
import { parseExamFromSettings } from "@/lib/activities/exam"
import type { ClassroomActivityRow } from "@/lib/activities/types"
import type {
  ClassroomPlannerItem,
  PersonalPlannerTask,
  PlannerDayColumn,
  PlannerWeekPayload,
} from "@/lib/student-planner/types"
import {
  STREAK_TIMEZONE,
  computeCurrentStreak,
  nowLocalDateIso,
  toLocalDateIso,
} from "@/lib/student-planner/streak"

const PLAN_PATH = "/dashboard/aluno/plano"
const STREAK_LOOKBACK_DAYS = 400

async function computePlannerStreakDays(
  supabase: Awaited<ReturnType<typeof createClient>>,
  studentId: string
): Promise<number> {
  const cutoff = subDays(new Date(), STREAK_LOOKBACK_DAYS).toISOString()

  const [personalRes, subRes] = await Promise.all([
    supabase
      .from("student_planner_personal_tasks")
      .select("done_at")
      .eq("student_id", studentId)
      .eq("is_done", true)
      .not("done_at", "is", null)
      .gte("done_at", cutoff),
    supabase
      .from("classroom_activity_submissions")
      .select("submitted_at")
      .eq("student_id", studentId)
      .eq("status", "enviado")
      .not("submitted_at", "is", null)
      .gte("submitted_at", cutoff),
  ])

  if (personalRes.error || subRes.error) return 0

  const activeDays = new Set<string>()
  for (const r of personalRes.data ?? []) {
    const t = r.done_at as string | null
    if (t) activeDays.add(toLocalDateIso(t, STREAK_TIMEZONE))
  }
  for (const r of subRes.data ?? []) {
    const t = r.submitted_at as string | null
    if (t) activeDays.add(toLocalDateIso(t, STREAK_TIMEZONE))
  }

  return computeCurrentStreak(activeDays, nowLocalDateIso(STREAK_TIMEZONE))
}

function toWeekMonday(input: string | undefined): Date {
  if (!input?.trim()) {
    return startOfWeek(new Date(), { weekStartsOn: 1 })
  }
  const d = parseISO(input.trim())
  if (!isValid(d)) return startOfWeek(new Date(), { weekStartsOn: 1 })
  return startOfWeek(d, { weekStartsOn: 1 })
}

function isoDate(d: Date): string {
  return format(d, "yyyy-MM-dd")
}

function activityCalendarDate(
  dueAt: string | null,
  startsAt: string | null
): string | null {
  const raw = dueAt ?? startsAt
  if (!raw) return null
  try {
    return format(parseISO(raw), "yyyy-MM-dd")
  } catch {
    return null
  }
}

const WEEKDAY_SHORT_PT = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sab"]

export async function getPlannerWeek(
  weekStartIso?: string
): Promise<PlannerWeekPayload> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) {
    return {
      weekStartIso: "",
      weekEndIso: "",
      days: [],
      undatedClassroomItems: [],
      evaluativeWeekItems: [],
      stats: {
        personalDone: 0,
        personalTotal: 0,
        classroomActivitiesInWeek: 0,
        classroomSubmitted: 0,
        streakDays: 0,
      },
      error: "Nao autenticado",
    }
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("user_type")
    .eq("id", user.id)
    .maybeSingle()

  if (profile?.user_type !== "aluno") {
    return {
      weekStartIso: "",
      weekEndIso: "",
      days: [],
      undatedClassroomItems: [],
      evaluativeWeekItems: [],
      stats: {
        personalDone: 0,
        personalTotal: 0,
        classroomActivitiesInWeek: 0,
        classroomSubmitted: 0,
        streakDays: 0,
      },
      error: "Apenas alunos",
    }
  }

  const streakDays = await computePlannerStreakDays(supabase, user.id)

  const monday = toWeekMonday(weekStartIso)
  const sunday = addDays(monday, 6)
  const weekStartStr = isoDate(monday)
  const weekEndStr = isoDate(sunday)

  const { data: members, error: mErr } = await supabase
    .from("classroom_members")
    .select("classroom_id")
    .eq("student_id", user.id)

  if (mErr) {
    return {
      weekStartIso: weekStartStr,
      weekEndIso: weekEndStr,
      days: [],
      undatedClassroomItems: [],
      evaluativeWeekItems: [],
      stats: {
        personalDone: 0,
        personalTotal: 0,
        classroomActivitiesInWeek: 0,
        classroomSubmitted: 0,
        streakDays,
      },
      error: mErr.message,
    }
  }

  const classroomIds = (members ?? []).map((m) => m.classroom_id as string)
  const roomMeta = new Map<
    string,
    { name: string; subject: string }
  >()

  if (classroomIds.length > 0) {
    const { data: rooms } = await supabase
      .from("classrooms")
      .select("id, name, subject")
      .in("id", classroomIds)

    for (const r of rooms ?? []) {
      roomMeta.set(r.id as string, {
        name: (r.name as string) ?? "Sala",
        subject: (r.subject as string) ?? "",
      })
    }
  }

  let activities: ClassroomActivityRow[] = []
  if (classroomIds.length > 0) {
    const { data: actRows, error: aErr } = await supabase
      .from("classroom_activities")
      .select("*")
      .in("classroom_id", classroomIds)
      .neq("status", "rascunho")
      .order("due_at", { ascending: true, nullsFirst: false })

    if (aErr) {
      return {
        weekStartIso: weekStartStr,
        weekEndIso: weekEndStr,
        days: [],
        undatedClassroomItems: [],
        evaluativeWeekItems: [],
        stats: {
          personalDone: 0,
          personalTotal: 0,
          classroomActivitiesInWeek: 0,
          classroomSubmitted: 0,
          streakDays,
        },
        error: aErr.message,
      }
    }
    activities = (actRows ?? []) as ClassroomActivityRow[]
  }

  const activityIds = activities.map((a) => a.id)
  const submissionByActivity = new Map<string, "rascunho" | "enviado">()
  if (activityIds.length > 0) {
    const { data: subs } = await supabase
      .from("classroom_activity_submissions")
      .select("activity_id, status")
      .eq("student_id", user.id)
      .in("activity_id", activityIds)

    for (const s of subs ?? []) {
      const aid = s.activity_id as string
      const st = s.status as string
      if (st === "rascunho" || st === "enviado") {
        submissionByActivity.set(aid, st)
      }
    }
  }

  const undated: ClassroomPlannerItem[] = []
  const byDate = new Map<string, ClassroomPlannerItem[]>()

  for (const act of activities) {
    const meta = roomMeta.get(act.classroom_id)
    const roomName = meta?.name ?? "Sala"
    const subject = meta?.subject ?? ""
    const href = `/dashboard/aluno/salas/${act.classroom_id}/atividades/${act.id}`
    const sub = submissionByActivity.get(act.id) ?? null

    const isEvaluative = parseExamFromSettings(act.settings) != null

    const item: ClassroomPlannerItem = {
      kind: "classroom",
      activityId: act.id,
      classroomId: act.classroom_id,
      classroomName: roomName,
      subject,
      activityTitle: act.title,
      activityType: act.type,
      dueAt: act.due_at,
      startsAt: act.starts_at,
      href,
      submissionStatus: sub,
      isEvaluative,
    }

    const dk = activityCalendarDate(act.due_at, act.starts_at)
    if (dk == null) {
      undated.push(item)
      continue
    }

    if (dk < weekStartStr || dk > weekEndStr) {
      continue
    }

    const list = byDate.get(dk) ?? []
    list.push(item)
    byDate.set(dk, list)
  }

  const { data: personalRows, error: pErr } = await supabase
    .from("student_planner_personal_tasks")
    .select("*")
    .eq("student_id", user.id)
    .gte("scheduled_on", weekStartStr)
    .lte("scheduled_on", weekEndStr)
    .order("scheduled_on", { ascending: true })

  if (pErr) {
    return {
      weekStartIso: weekStartStr,
      weekEndIso: weekEndStr,
      days: [],
      undatedClassroomItems: undated,
      evaluativeWeekItems: [],
      stats: {
        personalDone: 0,
        personalTotal: 0,
        classroomActivitiesInWeek: 0,
        classroomSubmitted: 0,
        streakDays,
      },
      error: pErr.message,
    }
  }

  const personalByDate = new Map<string, PersonalPlannerTask[]>()
  const personalList: PersonalPlannerTask[] = []
  for (const row of personalRows ?? []) {
    const t: PersonalPlannerTask = {
      kind: "personal",
      id: row.id as string,
      title: row.title as string,
      notes: (row.notes as string | null) ?? null,
      scheduledOn: row.scheduled_on as string,
      isDone: Boolean(row.is_done),
      doneAt:
        typeof row.done_at === "string" ? row.done_at : null,
    }
    personalList.push(t)
    const d = row.scheduled_on as string
    const list = personalByDate.get(d) ?? []
    list.push(t)
    personalByDate.set(d, list)
  }

  const dayInterval = eachDayOfInterval({ start: monday, end: sunday })
  const days: PlannerDayColumn[] = dayInterval.map((d) => {
    const dateIso = isoDate(d)
    const dow = d.getDay()
    return {
      dateIso,
      weekdayShort: WEEKDAY_SHORT_PT[dow] ?? "",
      dayOfMonth: d.getDate(),
      classroomItems: byDate.get(dateIso) ?? [],
      personalItems: personalByDate.get(dateIso) ?? [],
    }
  })

  let classroomInWeek = 0
  let classroomSubmitted = 0
  for (const [, list] of byDate) {
    for (const it of list) {
      classroomInWeek += 1
      if (it.submissionStatus === "enviado") classroomSubmitted += 1
    }
  }

  const personalDone = personalList.filter((t) => t.isDone).length
  const personalTotal = personalList.length

  const evaluativeWeekItems: ClassroomPlannerItem[] = []
  for (const col of days) {
    for (const it of col.classroomItems) {
      if (it.isEvaluative) evaluativeWeekItems.push(it)
    }
  }
  for (const it of undated) {
    if (it.isEvaluative) evaluativeWeekItems.push(it)
  }
  evaluativeWeekItems.sort((a, b) => {
    const da = activityCalendarDate(a.dueAt, a.startsAt) ?? "9999-12-31"
    const db = activityCalendarDate(b.dueAt, b.startsAt) ?? "9999-12-31"
    if (da !== db) return da.localeCompare(db)
    return a.activityTitle.localeCompare(b.activityTitle, "pt-BR")
  })

  return {
    weekStartIso: weekStartStr,
    weekEndIso: weekEndStr,
    days,
    undatedClassroomItems: undated,
    evaluativeWeekItems,
    stats: {
      personalDone,
      personalTotal,
      classroomActivitiesInWeek: classroomInWeek,
      classroomSubmitted,
      streakDays,
    },
    error: null,
  }
}

export async function createPersonalPlannerTask(input: {
  title: string
  notes?: string
  scheduledOn: string
}): Promise<{ ok: true; id: string } | { ok: false; error: string }> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { ok: false, error: "Nao autenticado" }

  const title = input.title.trim()
  if (!title) return { ok: false, error: "Titulo obrigatorio" }

  const scheduled = input.scheduledOn.trim()
  if (!/^\d{4}-\d{2}-\d{2}$/.test(scheduled)) {
    return { ok: false, error: "Data invalida" }
  }

  const { data, error } = await supabase
    .from("student_planner_personal_tasks")
    .insert({
      student_id: user.id,
      title,
      notes: input.notes?.trim() || null,
      scheduled_on: scheduled,
      is_done: false,
    })
    .select("id")
    .single()

  if (error || !data) return { ok: false, error: error?.message ?? "Erro" }
  revalidatePath(PLAN_PATH)
  return { ok: true, id: data.id as string }
}

export async function updatePersonalPlannerTask(
  id: string,
  input: { title?: string; notes?: string | null; scheduledOn?: string }
): Promise<{ ok: true } | { ok: false; error: string }> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { ok: false, error: "Nao autenticado" }

  const patch: Record<string, unknown> = {}
  if (input.title !== undefined) patch.title = input.title.trim()
  if (input.notes !== undefined) patch.notes = input.notes
  if (input.scheduledOn !== undefined) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(input.scheduledOn)) {
      return { ok: false, error: "Data invalida" }
    }
    patch.scheduled_on = input.scheduledOn
  }

  if (Object.keys(patch).length === 0) return { ok: true }

  const { error } = await supabase
    .from("student_planner_personal_tasks")
    .update(patch)
    .eq("id", id)
    .eq("student_id", user.id)

  if (error) return { ok: false, error: error.message }
  revalidatePath(PLAN_PATH)
  return { ok: true }
}

export async function deletePersonalPlannerTask(
  id: string
): Promise<{ ok: true } | { ok: false; error: string }> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { ok: false, error: "Nao autenticado" }

  const { error } = await supabase
    .from("student_planner_personal_tasks")
    .delete()
    .eq("id", id)
    .eq("student_id", user.id)

  if (error) return { ok: false, error: error.message }
  revalidatePath(PLAN_PATH)
  return { ok: true }
}

export async function togglePersonalPlannerTaskDone(
  id: string,
  isDone: boolean
): Promise<{ ok: true } | { ok: false; error: string }> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { ok: false, error: "Nao autenticado" }

  const doneAt = isDone ? new Date().toISOString() : null

  const { error } = await supabase
    .from("student_planner_personal_tasks")
    .update({
      is_done: isDone,
      done_at: doneAt,
    })
    .eq("id", id)
    .eq("student_id", user.id)

  if (error) return { ok: false, error: error.message }
  revalidatePath(PLAN_PATH)
  return { ok: true }
}
