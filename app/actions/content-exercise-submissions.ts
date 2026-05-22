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
import { parseAssessmentSettings } from "@/lib/content/assessment-settings"

function isExamLikeContentType(t: string): boolean {
  return t === "exercise" || t === "assessment" || t === "simulado"
}

function isTimedExamContentType(t: string): boolean {
  return t === "assessment" || t === "simulado"
}

/** Rascunho/envio: bloqueia fora da janela ou se encerrada (nao aplica se ja enviado — tratar antes). */
function assertAssessmentStudentWriteAllowed(
  settings: Record<string, unknown>
): string | null {
  const p = parseAssessmentSettings(settings)
  if (p.assessmentClosed) return "Avaliacao encerrada pelo professor."
  const now = Date.now()
  if (p.startsAt) {
    const t = new Date(p.startsAt).getTime()
    if (!Number.isNaN(t) && t > now) return "A avaliacao ainda nao esta aberta."
  }
  if (p.dueAt) {
    const t = new Date(p.dueAt).getTime()
    if (!Number.isNaN(t) && t < now) return "O prazo de entrega encerrou."
  }
  return null
}

export type ContentExerciseSubmissionRow = {
  id: string
  content_item_id: string
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

function mapRow(data: Record<string, unknown>): ContentExerciseSubmissionRow {
  return {
    id: data.id as string,
    content_item_id: data.content_item_id as string,
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

function revalidateContentExercisePaths(contentItemId: string) {
  revalidatePath(`/conteudo/${contentItemId}`)
  revalidatePath("/dashboard/aluno")
  revalidatePath("/dashboard/professor/conteudos")
}

/** Prova sem gabarito (aluno com acesso ao conteudo). */
export async function getExamForContentExercise(
  contentItemId: string
): Promise<{ ok: true; exam: ActivityExamPublic } | { ok: false; error: string }> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { ok: false, error: "Nao autenticado" }

  const { data: row, error } = await supabase
    .from("content_items")
    .select("settings, status, type, author_id")
    .eq("id", contentItemId)
    .maybeSingle()

  if (error) return { ok: false, error: error.message }
  if (!row || !isExamLikeContentType(row.type)) {
    return { ok: false, error: "Conteudo nao encontrado" }
  }
  if (row.status !== "published") {
    return { ok: false, error: "Conteudo indisponivel" }
  }
  if (row.author_id === user.id) {
    return { ok: false, error: "Use a visualizacao do autor" }
  }

  if (isTimedExamContentType(row.type)) {
    const { data: sub } = await supabase
      .from("content_exercise_submissions")
      .select("status")
      .eq("content_item_id", contentItemId)
      .eq("student_id", user.id)
      .maybeSingle()
    if (sub?.status !== "enviado") {
      const settings = row.settings as Record<string, unknown>
      const p = parseAssessmentSettings(settings)
      if (p.assessmentClosed) {
        return { ok: false, error: "Avaliacao encerrada pelo professor." }
      }
      const now = Date.now()
      if (p.startsAt) {
        const t = new Date(p.startsAt).getTime()
        if (!Number.isNaN(t) && t > now) {
          return { ok: false, error: "A avaliacao ainda nao esta aberta." }
        }
      }
      if (p.dueAt) {
        const t = new Date(p.dueAt).getTime()
        if (!Number.isNaN(t) && t < now) {
          return { ok: false, error: "O prazo de entrega encerrou." }
        }
      }
    }
  }

  const exam = parseExamFromSettings(row.settings as Record<string, unknown>)
  if (!exam) return { ok: false, error: "Este conteudo nao tem questoes" }
  const err = validateExamDefinition(exam)
  if (err) return { ok: false, error: err }
  return { ok: true, exam: toPublicExam(exam) }
}

export async function getMyContentExerciseSubmission(
  contentItemId: string
): Promise<{
  submission: ContentExerciseSubmissionRow | null
  error: string | null
}> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { submission: null, error: "Nao autenticado" }

  const { data, error } = await supabase
    .from("content_exercise_submissions")
    .select("*")
    .eq("content_item_id", contentItemId)
    .eq("student_id", user.id)
    .maybeSingle()

  if (error) return { submission: null, error: error.message }
  if (!data) return { submission: null, error: null }
  return { submission: mapRow(data as Record<string, unknown>), error: null }
}

export async function saveContentExerciseDraft(
  contentItemId: string,
  answers: StudentExamAnswers
): Promise<{ ok: true } | { ok: false; error: string }> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { ok: false, error: "Nao autenticado" }

  const { data: item, error: itemErr } = await supabase
    .from("content_items")
    .select("id, status, settings, type, author_id")
    .eq("id", contentItemId)
    .maybeSingle()

  if (itemErr || !item) return { ok: false, error: "Conteudo nao encontrado" }
  if (!isExamLikeContentType(item.type)) {
    return { ok: false, error: "Conteudo nao encontrado" }
  }
  if (item.status !== "published") {
    return { ok: false, error: "Conteudo indisponivel" }
  }
  if (item.author_id === user.id) {
    return { ok: false, error: "Autor nao envia resposta aqui" }
  }

  const exam = parseExamFromSettings(item.settings as Record<string, unknown>)
  if (!exam) return { ok: false, error: "Sem questoes neste conteudo" }

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
    .from("content_exercise_submissions")
    .select("id, status")
    .eq("content_item_id", contentItemId)
    .eq("student_id", user.id)
    .maybeSingle()

  if (existing?.status === "enviado") {
    return { ok: false, error: "Prova ja enviada" }
  }

  if (isTimedExamContentType(item.type)) {
    const werr = assertAssessmentStudentWriteAllowed(
      item.settings as Record<string, unknown>
    )
    if (werr) return { ok: false, error: werr }
  }

  if (existing) {
    const { error } = await supabase
      .from("content_exercise_submissions")
      .update({
        answers: sanitized,
        updated_at: new Date().toISOString(),
      })
      .eq("id", existing.id)
      .eq("status", "rascunho")

    if (error) return { ok: false, error: error.message }
  } else {
    const { error } = await supabase.from("content_exercise_submissions").insert({
      content_item_id: contentItemId,
      student_id: user.id,
      status: "rascunho",
      answers: sanitized,
    })
    if (error) return { ok: false, error: error.message }
  }

  revalidateContentExercisePaths(contentItemId)
  return { ok: true }
}

export async function submitContentExercise(
  contentItemId: string,
  answers: StudentExamAnswers
): Promise<{ ok: true } | { ok: false; error: string }> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { ok: false, error: "Nao autenticado" }

  const { data: item, error: actErr } = await supabase
    .from("content_items")
    .select("settings, status, type, author_id")
    .eq("id", contentItemId)
    .maybeSingle()

  if (actErr || !item) return { ok: false, error: "Conteudo nao encontrado" }
  if (!isExamLikeContentType(item.type)) {
    return { ok: false, error: "Conteudo nao encontrado" }
  }
  if (item.status !== "published") {
    return { ok: false, error: "Conteudo indisponivel" }
  }
  if (item.author_id === user.id) {
    return { ok: false, error: "Autor nao envia resposta aqui" }
  }

  const exam = parseExamFromSettings(item.settings as Record<string, unknown>)
  if (!exam) return { ok: false, error: "Sem questoes neste conteudo" }

  if (isTimedExamContentType(item.type)) {
    const werr = assertAssessmentStudentWriteAllowed(
      item.settings as Record<string, unknown>
    )
    if (werr) return { ok: false, error: werr }
  }

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
    .from("content_exercise_submissions")
    .select("id, status")
    .eq("content_item_id", contentItemId)
    .eq("student_id", user.id)
    .maybeSingle()

  if (existing?.status === "enviado") {
    return { ok: false, error: "Prova ja enviada" }
  }

  const openScores: Record<string, number> = {}
  const scoreTotal = scoreMcq + sumOpenScores(exam, openScores)

  if (existing) {
    const { error } = await supabase
      .from("content_exercise_submissions")
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
    const { error } = await supabase.from("content_exercise_submissions").insert({
      content_item_id: contentItemId,
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

  revalidateContentExercisePaths(contentItemId)
  return { ok: true }
}

export type ContentExerciseSubmissionListItem = ContentExerciseSubmissionRow & {
  student_name: string | null
}

export async function listContentExerciseSubmissionsForAuthor(
  contentItemId: string
): Promise<{ rows: ContentExerciseSubmissionListItem[]; error: string | null }> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { rows: [], error: "Nao autenticado" }

  const { data: item } = await supabase
    .from("content_items")
    .select("id, author_id, type")
    .eq("id", contentItemId)
    .maybeSingle()

  if (
    !item ||
    item.author_id !== user.id ||
    !isExamLikeContentType(item.type)
  ) {
    return { rows: [], error: "Conteudo nao encontrado" }
  }

  const { data, error } = await supabase
    .from("content_exercise_submissions")
    .select("*")
    .eq("content_item_id", contentItemId)
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

  const rows: ContentExerciseSubmissionListItem[] = subs.map((row) => {
    const base = mapRow(row)
    return {
      ...base,
      student_name: nameById.get(base.student_id) ?? null,
    }
  })

  return { rows, error: null }
}

export async function gradeContentExerciseOpenAnswers(
  contentItemId: string,
  submissionId: string,
  openScores: Record<string, number>
): Promise<{ ok: true } | { ok: false; error: string }> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { ok: false, error: "Nao autenticado" }

  const { data: ci } = await supabase
    .from("content_items")
    .select("settings, author_id, type")
    .eq("id", contentItemId)
    .maybeSingle()

  if (!ci || ci.author_id !== user.id || !isExamLikeContentType(ci.type)) {
    return { ok: false, error: "Conteudo nao encontrado" }
  }

  const exam = parseExamFromSettings(ci.settings as Record<string, unknown>)
  if (!exam) return { ok: false, error: "Conteudo sem questoes" }

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
    .from("content_exercise_submissions")
    .select("id, student_id, score_mcq, status, open_scores")
    .eq("id", submissionId)
    .eq("content_item_id", contentItemId)
    .maybeSingle()

  if (fetchErr || !sub) return { ok: false, error: "Entrega nao encontrada" }
  if (sub.status !== "enviado") {
    return { ok: false, error: "Apenas entregas enviadas podem ser corrigidas" }
  }

  const prev = parseOpenScores(sub.open_scores)
  const nextOpen = { ...prev, ...merged }
  const scoreTotal =
    Number(sub.score_mcq ?? 0) + sumOpenScores(exam, nextOpen)

  const { error } = await supabase
    .from("content_exercise_submissions")
    .update({
      open_scores: nextOpen,
      score_total: scoreTotal,
    })
    .eq("id", submissionId)
    .eq("status", "enviado")

  if (error) return { ok: false, error: error.message }
  revalidateContentExercisePaths(contentItemId)
  return { ok: true }
}

/** Gabarito MCQ para feedback ao aluno apos envio (servidor). */
export async function getMcqSolutionsForContentExercise(
  contentItemId: string
): Promise<Record<string, number> | null> {
  const supabase = await createClient()
  const { data: row } = await supabase
    .from("content_items")
    .select("settings, type")
    .eq("id", contentItemId)
    .maybeSingle()

  if (!row || !isExamLikeContentType(row.type)) return null
  const exam = parseExamFromSettings(row.settings as Record<string, unknown>)
  if (!exam) return null
  const out: Record<string, number> = {}
  for (const q of exam.questions) {
    if (q.type === "mcq") out[q.id] = q.correctIndex
  }
  return out
}

/** Definicao completa com gabarito (correcao / preview autor). */
export async function getExamDefinitionForContentItem(
  contentItemId: string
): Promise<ActivityExamDefinition | null> {
  const supabase = await createClient()
  const { data: row } = await supabase
    .from("content_items")
    .select("settings, type")
    .eq("id", contentItemId)
    .maybeSingle()

  if (!row || !isExamLikeContentType(row.type)) return null
  return parseExamFromSettings(row.settings as Record<string, unknown>)
}
