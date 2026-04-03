"use server"

import { revalidatePath } from "next/cache"
import { createClient } from "@/lib/supabase/server"
import {
  type ActivityExamDefinition,
  type ActivityExamPublic,
  computeMcqScore,
  parseExamFromSettings,
  sanitizeOpenText,
  sumOpenScores,
  toPublicExam,
  validateAnswersForSubmit,
  type StudentExamAnswers,
  validateExamDefinition,
} from "@/lib/activities/exam"
export type ActivitySubmissionRow = {
  id: string
  activity_id: string
  student_id: string
  status: "rascunho" | "enviado"
  answers: StudentExamAnswers
  score_mcq: number
  open_scores: Record<string, number>
  score_total: number | null
  submitted_at: string | null
  created_at: string
  updated_at: string
}

function parseOpenScores(raw: unknown): Record<string, number> {
  if (!raw || typeof raw !== "object") return {}
  const o = raw as Record<string, unknown>
  const out: Record<string, number> = {}
  for (const [k, v] of Object.entries(o)) {
    if (typeof v === "number" && !Number.isNaN(v) && v >= 0) out[k] = v
  }
  return out
}

function mapSubmissionRow(data: Record<string, unknown>): ActivitySubmissionRow {
  return {
    id: data.id as string,
    activity_id: data.activity_id as string,
    student_id: data.student_id as string,
    status: data.status as "rascunho" | "enviado",
    answers: (data.answers && typeof data.answers === "object"
      ? (data.answers as StudentExamAnswers)
      : {}) as StudentExamAnswers,
    score_mcq: Number(data.score_mcq ?? 0),
    open_scores: parseOpenScores(data.open_scores),
    score_total:
      data.score_total === null || data.score_total === undefined
        ? null
        : Number(data.score_total),
    submitted_at:
      typeof data.submitted_at === "string" ? data.submitted_at : null,
    created_at: String(data.created_at),
    updated_at: String(data.updated_at),
  }
}

async function assertStudentMember(
  supabase: Awaited<ReturnType<typeof createClient>>,
  classroomId: string,
  userId: string
): Promise<boolean> {
  const { data } = await supabase
    .from("classroom_members")
    .select("id")
    .eq("classroom_id", classroomId)
    .eq("student_id", userId)
    .maybeSingle()
  return !!data
}

async function assertProfessorOwnsClassroom(
  supabase: Awaited<ReturnType<typeof createClient>>,
  classroomId: string,
  userId: string
): Promise<boolean> {
  const { data } = await supabase
    .from("classrooms")
    .select("id")
    .eq("id", classroomId)
    .eq("professor_id", userId)
    .maybeSingle()
  return !!data
}

function revalidateActivityPaths(classroomId: string, activityId: string) {
  revalidatePath(`/dashboard/aluno/salas/${classroomId}/atividades/${activityId}`)
  revalidatePath(`/dashboard/aluno/salas/${classroomId}`)
  revalidatePath(`/dashboard/professor/salas/${classroomId}`)
}

export type StudentSubmissionGrade = {
  status: "rascunho" | "enviado"
  score_total: number | null
  score_mcq: number
}

/** Notas do aluno nas atividades desta sala (para lista / resumo). */
export async function getMySubmissionGradesForClassroom(
  classroomId: string
): Promise<{ byActivity: Record<string, StudentSubmissionGrade>; error: string | null }> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { byActivity: {}, error: "Nao autenticado" }

  const member = await assertStudentMember(supabase, classroomId, user.id)
  if (!member) return { byActivity: {}, error: "Voce nao participa desta sala" }

  const { data: acts, error: e1 } = await supabase
    .from("classroom_activities")
    .select("id")
    .eq("classroom_id", classroomId)

  if (e1) return { byActivity: {}, error: e1.message }
  const activityIds = (acts ?? []).map((a) => a.id as string)
  if (activityIds.length === 0) return { byActivity: {}, error: null }

  const { data: subs, error: e2 } = await supabase
    .from("classroom_activity_submissions")
    .select("activity_id, status, score_total, score_mcq")
    .eq("student_id", user.id)
    .in("activity_id", activityIds)

  if (e2) return { byActivity: {}, error: e2.message }

  const byActivity: Record<string, StudentSubmissionGrade> = {}
  for (const row of subs ?? []) {
    const aid = row.activity_id as string
    byActivity[aid] = {
      status: row.status as "rascunho" | "enviado",
      score_total:
        row.score_total === null || row.score_total === undefined
          ? null
          : Number(row.score_total),
      score_mcq: Number(row.score_mcq ?? 0),
    }
  }

  return { byActivity, error: null }
}

/** Prova sem gabarito (para aluno). */
export async function getExamForStudent(
  classroomId: string,
  activityId: string
): Promise<
  | { ok: true; exam: ActivityExamPublic }
  | { ok: false; error: string }
> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { ok: false, error: "Nao autenticado" }

  const member = await assertStudentMember(supabase, classroomId, user.id)
  if (!member) return { ok: false, error: "Voce nao participa desta sala" }

  const { data, error } = await supabase
    .from("classroom_activities")
    .select("settings, status")
    .eq("id", activityId)
    .eq("classroom_id", classroomId)
    .maybeSingle()

  if (error) return { ok: false, error: error.message }
  if (!data || data.status === "rascunho") {
    return { ok: false, error: "Atividade nao encontrada" }
  }

  const exam = parseExamFromSettings(
    data.settings as Record<string, unknown> | undefined
  )
  if (!exam) return { ok: false, error: "Esta atividade nao tem questoes" }
  const err = validateExamDefinition(exam)
  if (err) return { ok: false, error: err }
  return { ok: true, exam: toPublicExam(exam) }
}

export async function getMySubmission(
  classroomId: string,
  activityId: string
): Promise<{
  submission: ActivitySubmissionRow | null
  error: string | null
}> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { submission: null, error: "Nao autenticado" }

  const member = await assertStudentMember(supabase, classroomId, user.id)
  if (!member) return { submission: null, error: "Voce nao participa desta sala" }

  const { data, error } = await supabase
    .from("classroom_activity_submissions")
    .select("*")
    .eq("activity_id", activityId)
    .eq("student_id", user.id)
    .maybeSingle()

  if (error) return { submission: null, error: error.message }
  if (!data) return { submission: null, error: null }
  return { submission: mapSubmissionRow(data as Record<string, unknown>), error: null }
}

export async function saveSubmissionDraft(
  classroomId: string,
  activityId: string,
  answers: StudentExamAnswers
): Promise<{ ok: true } | { ok: false; error: string }> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { ok: false, error: "Nao autenticado" }

  const member = await assertStudentMember(supabase, classroomId, user.id)
  if (!member) return { ok: false, error: "Voce nao participa desta sala" }

  const { data: act, error: actErr } = await supabase
    .from("classroom_activities")
    .select("id, status, settings")
    .eq("id", activityId)
    .eq("classroom_id", classroomId)
    .maybeSingle()

  if (actErr || !act) return { ok: false, error: "Atividade nao encontrada" }
  if (act.status === "rascunho") return { ok: false, error: "Atividade indisponivel" }
  if (act.status === "encerrada") {
    return { ok: false, error: "Atividade encerrada" }
  }

  const exam = parseExamFromSettings(act.settings as Record<string, unknown>)
  if (!exam) return { ok: false, error: "Sem questoes nesta atividade" }

  const sanitized: StudentExamAnswers = {}
  for (const q of exam.questions) {
    const a = answers[q.id]
    if (!a) continue
    if (q.type === "mcq" && a.type === "mcq") {
      sanitized[q.id] = {
        type: "mcq",
        choiceIndex: Math.max(0, Math.floor(a.choiceIndex)),
      }
    }
    if (q.type === "open" && a.type === "open") {
      sanitized[q.id] = { type: "open", text: sanitizeOpenText(a.text) }
    }
  }

  const { data: existing } = await supabase
    .from("classroom_activity_submissions")
    .select("id, status")
    .eq("activity_id", activityId)
    .eq("student_id", user.id)
    .maybeSingle()

  if (existing?.status === "enviado") {
    return { ok: false, error: "Prova ja enviada" }
  }

  if (existing) {
    const { error } = await supabase
      .from("classroom_activity_submissions")
      .update({
        answers: sanitized,
        updated_at: new Date().toISOString(),
      })
      .eq("id", existing.id)
      .eq("status", "rascunho")

    if (error) return { ok: false, error: error.message }
  } else {
    const { error } = await supabase.from("classroom_activity_submissions").insert({
      activity_id: activityId,
      student_id: user.id,
      status: "rascunho",
      answers: sanitized,
    })
    if (error) return { ok: false, error: error.message }
  }

  revalidateActivityPaths(classroomId, activityId)
  return { ok: true }
}

export async function submitExam(
  classroomId: string,
  activityId: string,
  answers: StudentExamAnswers
): Promise<{ ok: true } | { ok: false; error: string }> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { ok: false, error: "Nao autenticado" }

  const member = await assertStudentMember(supabase, classroomId, user.id)
  if (!member) return { ok: false, error: "Voce nao participa desta sala" }

  const { data: act, error: actErr } = await supabase
    .from("classroom_activities")
    .select("settings, status")
    .eq("id", activityId)
    .eq("classroom_id", classroomId)
    .maybeSingle()

  if (actErr || !act) return { ok: false, error: "Atividade nao encontrada" }
  if (act.status === "rascunho") return { ok: false, error: "Atividade indisponivel" }
  if (act.status === "encerrada") {
    return { ok: false, error: "Atividade encerrada" }
  }

  const exam = parseExamFromSettings(act.settings as Record<string, unknown>)
  if (!exam) return { ok: false, error: "Sem questoes nesta atividade" }

  const err = validateAnswersForSubmit(exam, answers)
  if (err) return { ok: false, error: err }

  const sanitized: StudentExamAnswers = {}
  for (const q of exam.questions) {
    const a = answers[q.id]!
    if (q.type === "mcq" && a.type === "mcq") {
      sanitized[q.id] = {
        type: "mcq",
        choiceIndex: a.choiceIndex,
      }
    } else if (q.type === "open" && a.type === "open") {
      sanitized[q.id] = { type: "open", text: sanitizeOpenText(a.text) }
    }
  }

  const scoreMcq = computeMcqScore(exam, sanitized)
  const now = new Date().toISOString()

  const { data: existing } = await supabase
    .from("classroom_activity_submissions")
    .select("id, status")
    .eq("activity_id", activityId)
    .eq("student_id", user.id)
    .maybeSingle()

  if (existing?.status === "enviado") {
    return { ok: false, error: "Prova ja enviada" }
  }

  const openScores: Record<string, number> = {}
  const scoreTotal = scoreMcq + sumOpenScores(exam, openScores)

  if (existing) {
    const { error } = await supabase
      .from("classroom_activity_submissions")
      .update({
        answers: sanitized,
        status: "enviado",
        score_mcq: scoreMcq,
        open_scores: openScores,
        score_total: scoreTotal,
        submitted_at: now,
      })
      .eq("id", existing.id)
      .eq("status", "rascunho")

    if (error) return { ok: false, error: error.message }
  } else {
    const { error } = await supabase.from("classroom_activity_submissions").insert({
      activity_id: activityId,
      student_id: user.id,
      status: "enviado",
      answers: sanitized,
      score_mcq: scoreMcq,
      open_scores: openScores,
      score_total: scoreTotal,
      submitted_at: now,
    })
    if (error) return { ok: false, error: error.message }
  }

  revalidateActivityPaths(classroomId, activityId)
  return { ok: true }
}

export type SubmissionListItem = ActivitySubmissionRow & {
  student_name: string | null
}

export async function listSubmissionsForActivity(
  classroomId: string,
  activityId: string
): Promise<{ rows: SubmissionListItem[]; error: string | null }> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { rows: [], error: "Nao autenticado" }

  const ok = await assertProfessorOwnsClassroom(supabase, classroomId, user.id)
  if (!ok) return { rows: [], error: "Sala nao encontrada" }

  const { data: act } = await supabase
    .from("classroom_activities")
    .select("id")
    .eq("id", activityId)
    .eq("classroom_id", classroomId)
    .maybeSingle()

  if (!act) return { rows: [], error: "Atividade nao encontrada" }

  const { data, error } = await supabase
    .from("classroom_activity_submissions")
    .select("*")
    .eq("activity_id", activityId)
    .order("submitted_at", { ascending: false, nullsFirst: false })

  if (error) return { rows: [], error: error.message }

  const subs = (data ?? []) as Record<string, unknown>[]
  const studentIds = [...new Set(subs.map((s) => s.student_id as string))]
  let nameById = new Map<string, string | null>()
  if (studentIds.length > 0) {
    const { data: profs } = await supabase
      .from("profiles")
      .select("id, full_name")
      .in("id", studentIds)
    nameById = new Map(
      (profs ?? []).map((p) => [p.id as string, p.full_name as string | null])
    )
  }

  const rows: SubmissionListItem[] = subs.map((row) => {
    const base = mapSubmissionRow(row)
    return {
      ...base,
      student_name: nameById.get(base.student_id) ?? null,
    }
  })

  return { rows, error: null }
}

export async function getSubmissionEnviosByActivity(
  classroomId: string,
  activityIds: string[]
): Promise<Record<string, number>> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user || activityIds.length === 0) return {}

  const ok = await assertProfessorOwnsClassroom(supabase, classroomId, user.id)
  if (!ok) return {}

  const { data, error } = await supabase
    .from("classroom_activity_submissions")
    .select("activity_id")
    .in("activity_id", activityIds)
    .eq("status", "enviado")

  if (error) return {}

  const counts: Record<string, number> = {}
  for (const id of activityIds) counts[id] = 0
  for (const row of data ?? []) {
    const aid = row.activity_id as string
    counts[aid] = (counts[aid] ?? 0) + 1
  }
  return counts
}

export async function countSubmissionsForActivity(
  classroomId: string,
  activityId: string
): Promise<{ enviados: number; total: number; error: string | null }> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { enviados: 0, total: 0, error: "Nao autenticado" }

  const ok = await assertProfessorOwnsClassroom(supabase, classroomId, user.id)
  if (!ok) return { enviados: 0, total: 0, error: "Sala nao encontrada" }

  const { count: total, error: e1 } = await supabase
    .from("classroom_activity_submissions")
    .select("*", { count: "exact", head: true })
    .eq("activity_id", activityId)

  const { count: enviados, error: e2 } = await supabase
    .from("classroom_activity_submissions")
    .select("*", { count: "exact", head: true })
    .eq("activity_id", activityId)
    .eq("status", "enviado")

  if (e1 || e2) {
    return {
      enviados: 0,
      total: 0,
      error: e1?.message ?? e2?.message ?? "Erro",
    }
  }

  return {
    enviados: enviados ?? 0,
    total: total ?? 0,
    error: null,
  }
}

export async function gradeOpenAnswers(
  classroomId: string,
  activityId: string,
  submissionId: string,
  openScores: Record<string, number>
): Promise<{ ok: true } | { ok: false; error: string }> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { ok: false, error: "Nao autenticado" }

  const ok = await assertProfessorOwnsClassroom(supabase, classroomId, user.id)
  if (!ok) return { ok: false, error: "Sala nao encontrada" }

  const { data: act } = await supabase
    .from("classroom_activities")
    .select("settings")
    .eq("id", activityId)
    .eq("classroom_id", classroomId)
    .maybeSingle()

  if (!act) return { ok: false, error: "Atividade nao encontrada" }

  const exam = parseExamFromSettings(act.settings as Record<string, unknown>)
  if (!exam) return { ok: false, error: "Atividade sem prova" }

  const merged: Record<string, number> = {}
  for (const q of exam.questions) {
    if (q.type !== "open") continue
    const v = openScores[q.id]
    if (v === undefined) continue
    if (typeof v !== "number" || Number.isNaN(v) || v < 0 || v > q.points) {
      return {
        ok: false,
        error: `Nota invalida na questao (max ${q.points})`,
      }
    }
    merged[q.id] = v
  }

  const { data: sub, error: fetchErr } = await supabase
    .from("classroom_activity_submissions")
    .select("id, score_mcq, status, open_scores")
    .eq("id", submissionId)
    .eq("activity_id", activityId)
    .maybeSingle()

  if (fetchErr || !sub) return { ok: false, error: "Entrega nao encontrada" }
  if (sub.status !== "enviado") {
    return { ok: false, error: "Apenas provas enviadas podem ser corrigidas" }
  }

  const prev = parseOpenScores(sub.open_scores)
  const nextOpen = { ...prev, ...merged }
  const scoreTotal =
    Number(sub.score_mcq ?? 0) + sumOpenScores(exam, nextOpen)

  const { error } = await supabase
    .from("classroom_activity_submissions")
    .update({
      open_scores: nextOpen,
      score_total: scoreTotal,
    })
    .eq("id", submissionId)
    .eq("status", "enviado")

  if (error) return { ok: false, error: error.message }
  revalidateActivityPaths(classroomId, activityId)
  return { ok: true }
}
