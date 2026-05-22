"use server"

import { put } from "@vercel/blob"
import { randomUUID } from "crypto"
import { revalidatePath } from "next/cache"
import { after } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { runArticleReview } from "@/lib/content/review-agent"
import {
  effectiveContentType,
  safeUploadFilename,
} from "@/lib/activities/attachments"
import { sanitizeActivityHtml } from "@/lib/sanitize-activity-html"
import {
  mergeActivitySettings,
  parseExamFromSettings,
  validateExamDefinition,
  validateExamQuestionDisciplinas,
  type ActivityExamDefinition,
} from "@/lib/activities/exam"
import {
  DICA_MAX_IMAGES,
  type ContentItemRow,
  type ContentItemSettings,
  type ContentItemStatus,
  type ContentItemType,
  type ContentVisibility,
  type ShareMethod,
} from "@/lib/content/types"

const TRIX_IMAGE_MAX_BYTES = 5 * 1024 * 1024
/** Capa em video (MP4/WebM/MOV) */
const COVER_VIDEO_MAX_BYTES = 80 * 1024 * 1024

function validateDicaMediaForPublish(settings: ContentItemSettings): string | null {
  const v = settings.dicaVideoUrl?.trim() || null
  const raw = settings.dicaImageUrls
  const imgs = Array.isArray(raw)
    ? raw.filter((x): x is string => typeof x === "string" && x.trim().length > 0)
    : []
  if (v && imgs.length > 0) {
    return "Use apenas um video ou imagens, nao os dois"
  }
  if (v) return null
  if (imgs.length >= 1 && imgs.length <= DICA_MAX_IMAGES) return null
  if (imgs.length === 0) return "Adicione um video ou 1 imagem"
  return "No maximo 1 imagem"
}

function effectiveVideoContentType(file: File): string {
  if (file.type && /^video\//i.test(file.type)) return file.type
  const ext = file.name.split(".").pop()?.toLowerCase()
  if (ext === "mp4" || ext === "m4v") return "video/mp4"
  if (ext === "webm") return "video/webm"
  if (ext === "mov") return "video/quicktime"
  return "video/mp4"
}

function isArticleCoverVideoFile(file: File): boolean {
  if (/^video\/(mp4|webm|quicktime|x-m4v|x-msvideo)$/i.test(file.type)) return true
  if (!file.type?.trim() && /\.(mp4|webm|mov|m4v)$/i.test(file.name)) return true
  return false
}

async function assertProfessor(supabase: Awaited<ReturnType<typeof createClient>>) {
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { user: null as null, error: "Nao autenticado" as const }
  const { data: profile } = await supabase
    .from("profiles")
    .select("user_type")
    .eq("id", user.id)
    .single()
  if (profile?.user_type !== "professor") {
    return { user: null, error: "Apenas professores" as const }
  }
  return { user, error: null as null }
}

async function assertOwnsArticle(
  supabase: Awaited<ReturnType<typeof createClient>>,
  articleId: string,
  userId: string
): Promise<boolean> {
  const { data } = await supabase
    .from("content_items")
    .select("id")
    .eq("id", articleId)
    .eq("author_id", userId)
    .maybeSingle()
  return !!data
}

export type ProfessorContentListItem = {
  id: string
  type: ContentItemType
  title: string
  excerpt: string
  disciplina: string | null
  /** URL relativa servida por /api/article-attachment */
  coverUrl: string | null
  coverVideoUrl: string | null
  /** exercise, assessment ou simulado */
  questionCount: number | null
  /** assessment ou simulado publicado (ISO) */
  dueAt: string | null
  status: ContentItemRow["status"]
  visibility: ContentVisibility
  published_at: string | null
  like_count: number
  share_count: number
  updated_at: string
  reviewSeal: "none" | "excellence" | null
  reviewScore: number | null
}

function plainTextExcerpt(html: string | null | undefined, max = 200): string {
  if (!html?.trim()) return ""
  const t = html
    .replace(/<[^>]*>/g, " ")
    .replace(/\s+/g, " ")
    .trim()
  return t.length > max ? `${t.slice(0, max)}…` : t
}

/** Artigos e exercícios do professor (rascunhos e publicados), visão tipo feed. */
export async function listMyContentItemsForProfessor(): Promise<
  ProfessorContentListItem[]
> {
  const supabase = await createClient()
  const p = await assertProfessor(supabase)
  if (!p.user) return []

  const { data, error } = await supabase
    .from("content_items")
    .select(
      "id, type, title, body_html, status, visibility, published_at, like_count, share_count, updated_at, settings, content_review_results(score, seal)"
    )
    .eq("author_id", p.user.id)
    .in("type", ["article", "exercise", "assessment", "simulado", "dica"])
    .order("updated_at", { ascending: false })

  if (error) return []

  type RowWithReview = {
    id: string; type: string; title: string; body_html: string | null
    status: string; visibility: string; published_at: string | null
    like_count: number; share_count: number; updated_at: string
    settings: Record<string, unknown>
    content_review_results: Array<{ score: number; seal: string }> | null
  }

  return ((data ?? []) as RowWithReview[]).map((row) => {
    const reviewArr = Array.isArray(row.content_review_results)
      ? row.content_review_results
      : []
    const reviewData = reviewArr[0] ?? null
    const settings = (row.settings ?? {}) as ContentItemSettings
    const exam = parseExamFromSettings(settings as Record<string, unknown>)
    const qCount = exam?.questions.length ?? null
    const dueIso =
      typeof settings.dueAt === "string" && settings.dueAt.trim()
        ? settings.dueAt.trim()
        : null
    const dicaImages = Array.isArray(settings.dicaImageUrls)
      ? settings.dicaImageUrls.filter(
          (x): x is string => typeof x === "string" && x.trim().length > 0
        )
      : []
    const dicaVid = settings.dicaVideoUrl?.trim() || null
    const excerpt =
      row.type === "exercise" ||
      row.type === "assessment" ||
      row.type === "simulado"
        ? qCount != null && qCount > 0
          ? `${qCount} questao${qCount === 1 ? "" : "es"}${
              (row.type === "assessment" || row.type === "simulado") && dueIso
                ? ` — ate ${new Date(dueIso).toLocaleString("pt-BR")}`
                : ""
            }`
          : plainTextExcerpt(row.body_html)
        : row.type === "dica"
          ? plainTextExcerpt(row.body_html)
          : plainTextExcerpt(row.body_html)
    return {
      id: row.id,
      type: row.type as ContentItemType,
      title: row.title,
      excerpt,
      disciplina: settings.disciplina?.trim() || null,
      coverUrl:
        row.type === "dica"
          ? dicaImages[0] ?? null
          : settings.coverUrl?.trim() || null,
      coverVideoUrl:
        row.type === "dica" ? dicaVid : settings.coverVideoUrl?.trim() || null,
      questionCount:
        row.type === "exercise" ||
        row.type === "assessment" ||
        row.type === "simulado"
          ? qCount
          : null,
      dueAt:
        row.type === "assessment" || row.type === "simulado" ? dueIso : null,
      status: row.status as ContentItemRow["status"],
      visibility: row.visibility as ContentVisibility,
      published_at: row.published_at,
      like_count: row.like_count,
      share_count: row.share_count,
      updated_at: row.updated_at,
      reviewSeal: (reviewData?.seal as "none" | "excellence") ?? null,
      reviewScore: reviewData?.score ?? null,
    }
  })
}

export async function listMyClassroomsForArticle(): Promise<
  { id: string; name: string; subject: string }[]
> {
  const supabase = await createClient()
  const p = await assertProfessor(supabase)
  if (!p.user) return []

  const { data } = await supabase
    .from("classrooms")
    .select("id, name, subject")
    .eq("professor_id", p.user.id)
    .eq("status", "ativa")
    .order("name")

  return (data ?? []).map((r) => ({
    id: r.id,
    name: r.name,
    subject: r.subject,
  }))
}

/** Rascunho vazio para obter id antes de uploads Trix no artigo. Usa RPC no Supabase para evitar bloqueio de RLS no INSERT direto. */
export async function createArticleDraft(): Promise<
  { ok: true; id: string } | { ok: false; error: string }
> {
  const supabase = await createClient()
  const { data: id, error } = await supabase.rpc("create_article_draft")
  if (error) {
    return { ok: false, error: error.message ?? "Erro ao criar rascunho" }
  }
  if (id == null) return { ok: false, error: "Erro ao criar rascunho" }
  return { ok: true, id: String(id) }
}

export async function createExerciseDraft(): Promise<
  { ok: true; id: string } | { ok: false; error: string }
> {
  const supabase = await createClient()
  const { data: id, error } = await supabase.rpc("create_exercise_draft")
  if (error) {
    return { ok: false, error: error.message ?? "Erro ao criar rascunho" }
  }
  if (id == null) return { ok: false, error: "Erro ao criar rascunho" }
  return { ok: true, id: String(id) }
}

export async function createAssessmentDraft(): Promise<
  { ok: true; id: string } | { ok: false; error: string }
> {
  const supabase = await createClient()
  const { data: id, error } = await supabase.rpc("create_assessment_draft")
  if (error) {
    return { ok: false, error: error.message ?? "Erro ao criar rascunho" }
  }
  if (id == null) return { ok: false, error: "Erro ao criar rascunho" }
  return { ok: true, id: String(id) }
}

export async function createSimuladoDraft(): Promise<
  { ok: true; id: string } | { ok: false; error: string }
> {
  const supabase = await createClient()
  const { data: id, error } = await supabase.rpc("create_simulado_draft")
  if (error) {
    return { ok: false, error: error.message ?? "Erro ao criar rascunho" }
  }
  if (id == null) return { ok: false, error: "Erro ao criar rascunho" }
  return { ok: true, id: String(id) }
}

export async function createDicaDraft(): Promise<
  { ok: true; id: string } | { ok: false; error: string }
> {
  const supabase = await createClient()
  const { data: id, error } = await supabase.rpc("create_dica_draft")
  if (error) {
    return { ok: false, error: error.message ?? "Erro ao criar rascunho" }
  }
  if (id == null) return { ok: false, error: "Erro ao criar rascunho" }
  return { ok: true, id: String(id) }
}

export type SaveExerciseDraftInput = {
  id: string
  title?: string
  bodyHtml?: string
  settings: ContentItemSettings
  /** Substitui settings.exam (pode ser null para limpar) */
  exam?: ActivityExamDefinition | null
}

export async function saveExerciseDraft(
  input: SaveExerciseDraftInput
): Promise<{ ok: true } | { ok: false; error: string }> {
  const supabase = await createClient()
  const p = await assertProfessor(supabase)
  if (!p.user) return { ok: false, error: p.error ?? "Nao autenticado" }

  const { data: row, error: fetchErr } = await supabase
    .from("content_items")
    .select("id, settings, type")
    .eq("id", input.id)
    .eq("author_id", p.user.id)
    .eq("type", "exercise")
    .maybeSingle()

  if (fetchErr || !row) return { ok: false, error: "Exercicio nao encontrado" }

  const current = (row.settings ?? {}) as Record<string, unknown>
  const baseSettings: ContentItemSettings = {
    tags: input.settings.tags?.filter(Boolean) ?? [],
    disciplina: input.settings.disciplina?.trim() || undefined,
    nivel: input.settings.nivel?.trim() || undefined,
    coverUrl: input.settings.coverUrl ?? null,
    coverVideoUrl: null,
  }
  let merged: Record<string, unknown> = {
    ...current,
    ...baseSettings,
  }
  merged = mergeActivitySettings(merged, {
    exam: input.exam !== undefined ? input.exam : undefined,
  })

  const examOnly = parseExamFromSettings(merged)
  if (examOnly) {
    const verr = validateExamDefinition(examOnly)
    if (verr) return { ok: false, error: verr }
  }

  const patch: Record<string, unknown> = { settings: merged }
  if (input.title !== undefined) patch.title = input.title.trim()
  if (input.bodyHtml !== undefined) {
    patch.body_html = sanitizeActivityHtml(input.bodyHtml.trim() || "") || null
  }

  const { error: upErr } = await supabase
    .from("content_items")
    .update(patch)
    .eq("id", input.id)
    .eq("author_id", p.user.id)
    .eq("type", "exercise")

  if (upErr) return { ok: false, error: upErr.message }
  revalidatePath("/dashboard/professor/criar")
  revalidatePath("/dashboard/professor/conteudos")
  revalidatePath(`/conteudo/${input.id}`)
  return { ok: true }
}

export type SaveAssessmentDraftInput = SaveExerciseDraftInput & {
  dueAt?: string | null
  startsAt?: string | null
}

export async function saveAssessmentDraft(
  input: SaveAssessmentDraftInput
): Promise<{ ok: true } | { ok: false; error: string }> {
  const supabase = await createClient()
  const p = await assertProfessor(supabase)
  if (!p.user) return { ok: false, error: p.error ?? "Nao autenticado" }

  const { data: row, error: fetchErr } = await supabase
    .from("content_items")
    .select("id, settings, type")
    .eq("id", input.id)
    .eq("author_id", p.user.id)
    .eq("type", "assessment")
    .maybeSingle()

  if (fetchErr || !row) return { ok: false, error: "Avaliacao nao encontrada" }

  const current = (row.settings ?? {}) as Record<string, unknown>
  const baseSettings: ContentItemSettings = {
    tags: input.settings.tags?.filter(Boolean) ?? [],
    disciplina: input.settings.disciplina?.trim() || undefined,
    nivel: input.settings.nivel?.trim() || undefined,
    coverUrl: input.settings.coverUrl ?? null,
    coverVideoUrl: null,
  }
  let merged: Record<string, unknown> = {
    ...current,
    ...baseSettings,
  }
  merged = mergeActivitySettings(merged, {
    exam: input.exam !== undefined ? input.exam : undefined,
  })
  if (input.dueAt !== undefined) merged.dueAt = input.dueAt
  if (input.startsAt !== undefined) merged.startsAt = input.startsAt

  const examOnly = parseExamFromSettings(merged)
  if (examOnly) {
    const verr = validateExamDefinition(examOnly)
    if (verr) return { ok: false, error: verr }
  }

  const patch: Record<string, unknown> = { settings: merged }
  if (input.title !== undefined) patch.title = input.title.trim()
  if (input.bodyHtml !== undefined) {
    patch.body_html = sanitizeActivityHtml(input.bodyHtml.trim() || "") || null
  }

  const { error: upErr } = await supabase
    .from("content_items")
    .update(patch)
    .eq("id", input.id)
    .eq("author_id", p.user.id)
    .eq("type", "assessment")

  if (upErr) return { ok: false, error: upErr.message }
  revalidatePath("/dashboard/professor/criar")
  revalidatePath("/dashboard/professor/conteudos")
  revalidatePath(`/conteudo/${input.id}`)
  return { ok: true }
}

export async function saveSimuladoDraft(
  input: SaveAssessmentDraftInput
): Promise<{ ok: true } | { ok: false; error: string }> {
  const supabase = await createClient()
  const p = await assertProfessor(supabase)
  if (!p.user) return { ok: false, error: p.error ?? "Nao autenticado" }

  const { data: row, error: fetchErr } = await supabase
    .from("content_items")
    .select("id, settings, type")
    .eq("id", input.id)
    .eq("author_id", p.user.id)
    .eq("type", "simulado")
    .maybeSingle()

  if (fetchErr || !row) return { ok: false, error: "Simulado nao encontrado" }

  const current = (row.settings ?? {}) as Record<string, unknown>
  const baseSettings: ContentItemSettings = {
    tags: input.settings.tags?.filter(Boolean) ?? [],
    disciplina: input.settings.disciplina?.trim() || undefined,
    nivel: input.settings.nivel?.trim() || undefined,
    coverUrl: input.settings.coverUrl ?? null,
    coverVideoUrl: null,
  }
  let merged: Record<string, unknown> = {
    ...current,
    ...baseSettings,
  }
  merged = mergeActivitySettings(merged, {
    exam: input.exam !== undefined ? input.exam : undefined,
  })
  if (input.dueAt !== undefined) merged.dueAt = input.dueAt
  if (input.startsAt !== undefined) merged.startsAt = input.startsAt

  const examOnly = parseExamFromSettings(merged)
  if (examOnly) {
    const verr = validateExamDefinition(examOnly)
    if (verr) return { ok: false, error: verr }
  }

  const patch: Record<string, unknown> = { settings: merged }
  if (input.title !== undefined) patch.title = input.title.trim()
  if (input.bodyHtml !== undefined) {
    patch.body_html = sanitizeActivityHtml(input.bodyHtml.trim() || "") || null
  }

  const { error: upErr } = await supabase
    .from("content_items")
    .update(patch)
    .eq("id", input.id)
    .eq("author_id", p.user.id)
    .eq("type", "simulado")

  if (upErr) return { ok: false, error: upErr.message }
  revalidatePath("/dashboard/professor/criar")
  revalidatePath("/dashboard/professor/conteudos")
  revalidatePath(`/conteudo/${input.id}`)
  return { ok: true }
}

export type PublishExerciseInput = {
  id: string
  title: string
  bodyHtml: string
  visibility: ContentVisibility
  classroomIds?: string[]
  settings: ContentItemSettings
}

export async function publishExercise(
  input: PublishExerciseInput
): Promise<{ ok: true } | { ok: false; error: string }> {
  const supabase = await createClient()
  const p = await assertProfessor(supabase)
  if (!p.user) return { ok: false, error: p.error ?? "Nao autenticado" }

  const { data: existingRow, error: exErr } = await supabase
    .from("content_items")
    .select("published_at, status, settings, type")
    .eq("id", input.id)
    .eq("author_id", p.user.id)
    .eq("type", "exercise")
    .maybeSingle()

  if (exErr || !existingRow) return { ok: false, error: "Exercicio nao encontrado" }

  const title = input.title.trim()
  if (!title) return { ok: false, error: "Titulo obrigatorio" }

  if (input.visibility === "classrooms") {
    const ids = input.classroomIds ?? []
    if (ids.length === 0) {
      return { ok: false, error: "Selecione ao menos uma turma" }
    }
    for (const cid of ids) {
      const owns = await supabase
        .from("classrooms")
        .select("id")
        .eq("id", cid)
        .eq("professor_id", p.user.id)
        .maybeSingle()
      if (!owns.data) {
        return { ok: false, error: "Turma invalida" }
      }
    }
  }

  const bodyHtml = sanitizeActivityHtml(input.bodyHtml.trim() || "")
  const settingsMerged = mergeActivitySettings(
    {
      ...((existingRow.settings ?? {}) as Record<string, unknown>),
      tags: input.settings.tags?.filter(Boolean) ?? [],
      disciplina: input.settings.disciplina?.trim() || undefined,
      nivel: input.settings.nivel?.trim() || undefined,
      coverUrl: input.settings.coverUrl ?? null,
      coverVideoUrl: null,
    },
    { exam: input.settings.exam !== undefined ? input.settings.exam : undefined }
  )
  const exam = parseExamFromSettings(settingsMerged)
  if (!exam || exam.questions.length === 0) {
    return { ok: false, error: "Adicione ao menos uma questao" }
  }
  const verr = validateExamDefinition(exam)
  if (verr) return { ok: false, error: verr }

  const settings = settingsMerged as unknown as ContentItemSettings

  const publishedAt =
    existingRow.status === "published" && existingRow.published_at
      ? existingRow.published_at
      : new Date().toISOString()

  const { error: upErr } = await supabase
    .from("content_items")
    .update({
      title,
      body_html: bodyHtml || null,
      status: "published",
      visibility: input.visibility,
      published_at: publishedAt,
      settings: settings as Record<string, unknown>,
    })
    .eq("id", input.id)
    .eq("author_id", p.user.id)
    .eq("type", "exercise")

  if (upErr) return { ok: false, error: upErr.message }

  await supabase.from("content_item_classrooms").delete().eq("content_item_id", input.id)

  if (input.visibility === "classrooms") {
    const rows = (input.classroomIds ?? []).map((classroom_id) => ({
      content_item_id: input.id,
      classroom_id,
    }))
    const { error: jErr } = await supabase.from("content_item_classrooms").insert(rows)
    if (jErr) return { ok: false, error: jErr.message }
  }

  revalidatePath("/dashboard/aluno")
  revalidatePath("/dashboard/professor")
  revalidatePath("/dashboard/professor/conteudos")
  revalidatePath(`/conteudo/${input.id}`)
  return { ok: true }
}

export type PublishAssessmentInput = PublishExerciseInput & {
  dueAt: string
  startsAt?: string | null
}

export async function publishAssessment(
  input: PublishAssessmentInput
): Promise<{ ok: true } | { ok: false; error: string }> {
  const supabase = await createClient()
  const p = await assertProfessor(supabase)
  if (!p.user) return { ok: false, error: p.error ?? "Nao autenticado" }

  const { data: existingRow, error: exErr } = await supabase
    .from("content_items")
    .select("published_at, status, settings, type")
    .eq("id", input.id)
    .eq("author_id", p.user.id)
    .eq("type", "assessment")
    .maybeSingle()

  if (exErr || !existingRow) return { ok: false, error: "Avaliacao nao encontrada" }

  const title = input.title.trim()
  if (!title) return { ok: false, error: "Titulo obrigatorio" }

  const dueTrim = input.dueAt.trim()
  if (!dueTrim) {
    return { ok: false, error: "Informe a data e hora limite de entrega" }
  }
  const dueMs = new Date(dueTrim).getTime()
  if (Number.isNaN(dueMs)) {
    return { ok: false, error: "Data limite invalida" }
  }
  let startsIso: string | null = null
  if (input.startsAt != null && String(input.startsAt).trim()) {
    const s = String(input.startsAt).trim()
    const startMs = new Date(s).getTime()
    if (Number.isNaN(startMs)) {
      return { ok: false, error: "Data de abertura invalida" }
    }
    if (startMs > dueMs) {
      return { ok: false, error: "A abertura deve ser antes ou no limite de entrega" }
    }
    startsIso = new Date(s).toISOString()
  }

  if (input.visibility === "classrooms") {
    const ids = input.classroomIds ?? []
    if (ids.length === 0) {
      return { ok: false, error: "Selecione ao menos uma turma" }
    }
    for (const cid of ids) {
      const owns = await supabase
        .from("classrooms")
        .select("id")
        .eq("id", cid)
        .eq("professor_id", p.user.id)
        .maybeSingle()
      if (!owns.data) {
        return { ok: false, error: "Turma invalida" }
      }
    }
  }

  const bodyHtml = sanitizeActivityHtml(input.bodyHtml.trim() || "")
  const prev = (existingRow.settings ?? {}) as Record<string, unknown>
  const settingsMerged = mergeActivitySettings(
    {
      ...prev,
      tags: input.settings.tags?.filter(Boolean) ?? [],
      disciplina: input.settings.disciplina?.trim() || undefined,
      nivel: input.settings.nivel?.trim() || undefined,
      coverUrl: input.settings.coverUrl ?? null,
      coverVideoUrl: null,
      dueAt: new Date(dueTrim).toISOString(),
      startsAt: startsIso,
      assessmentClosed: prev.assessmentClosed === true,
    },
    { exam: input.settings.exam !== undefined ? input.settings.exam : undefined }
  )
  const exam = parseExamFromSettings(settingsMerged)
  if (!exam || exam.questions.length === 0) {
    return { ok: false, error: "Adicione ao menos uma questao" }
  }
  const verr = validateExamDefinition(exam)
  if (verr) return { ok: false, error: verr }

  const settings = settingsMerged as unknown as ContentItemSettings

  const publishedAt =
    existingRow.status === "published" && existingRow.published_at
      ? existingRow.published_at
      : new Date().toISOString()

  const { error: upErr } = await supabase
    .from("content_items")
    .update({
      title,
      body_html: bodyHtml || null,
      status: "published",
      visibility: input.visibility,
      published_at: publishedAt,
      settings: settings as Record<string, unknown>,
    })
    .eq("id", input.id)
    .eq("author_id", p.user.id)
    .eq("type", "assessment")

  if (upErr) return { ok: false, error: upErr.message }

  await supabase.from("content_item_classrooms").delete().eq("content_item_id", input.id)

  if (input.visibility === "classrooms") {
    const rows = (input.classroomIds ?? []).map((classroom_id) => ({
      content_item_id: input.id,
      classroom_id,
    }))
    const { error: jErr } = await supabase.from("content_item_classrooms").insert(rows)
    if (jErr) return { ok: false, error: jErr.message }
  }

  revalidatePath("/dashboard/aluno")
  revalidatePath("/dashboard/professor")
  revalidatePath("/dashboard/professor/conteudos")
  revalidatePath(`/conteudo/${input.id}`)
  return { ok: true }
}

export async function publishSimulado(
  input: PublishAssessmentInput
): Promise<{ ok: true } | { ok: false; error: string }> {
  const supabase = await createClient()
  const p = await assertProfessor(supabase)
  if (!p.user) return { ok: false, error: p.error ?? "Nao autenticado" }

  const { data: existingRow, error: exErr } = await supabase
    .from("content_items")
    .select("published_at, status, settings, type")
    .eq("id", input.id)
    .eq("author_id", p.user.id)
    .eq("type", "simulado")
    .maybeSingle()

  if (exErr || !existingRow) return { ok: false, error: "Simulado nao encontrado" }

  const title = input.title.trim()
  if (!title) return { ok: false, error: "Titulo obrigatorio" }

  const dueTrim = input.dueAt.trim()
  if (!dueTrim) {
    return { ok: false, error: "Informe a data e hora limite de entrega" }
  }
  const dueMs = new Date(dueTrim).getTime()
  if (Number.isNaN(dueMs)) {
    return { ok: false, error: "Data limite invalida" }
  }
  let startsIso: string | null = null
  if (input.startsAt != null && String(input.startsAt).trim()) {
    const s = String(input.startsAt).trim()
    const startMs = new Date(s).getTime()
    if (Number.isNaN(startMs)) {
      return { ok: false, error: "Data de abertura invalida" }
    }
    if (startMs > dueMs) {
      return { ok: false, error: "A abertura deve ser antes ou no limite de entrega" }
    }
    startsIso = new Date(s).toISOString()
  }

  if (input.visibility === "classrooms") {
    const ids = input.classroomIds ?? []
    if (ids.length === 0) {
      return { ok: false, error: "Selecione ao menos uma turma" }
    }
    for (const cid of ids) {
      const owns = await supabase
        .from("classrooms")
        .select("id")
        .eq("id", cid)
        .eq("professor_id", p.user.id)
        .maybeSingle()
      if (!owns.data) {
        return { ok: false, error: "Turma invalida" }
      }
    }
  }

  const bodyHtml = sanitizeActivityHtml(input.bodyHtml.trim() || "")
  const prev = (existingRow.settings ?? {}) as Record<string, unknown>
  const settingsMerged = mergeActivitySettings(
    {
      ...prev,
      tags: input.settings.tags?.filter(Boolean) ?? [],
      disciplina: input.settings.disciplina?.trim() || undefined,
      nivel: input.settings.nivel?.trim() || undefined,
      coverUrl: input.settings.coverUrl ?? null,
      coverVideoUrl: null,
      dueAt: new Date(dueTrim).toISOString(),
      startsAt: startsIso,
      assessmentClosed: prev.assessmentClosed === true,
    },
    { exam: input.settings.exam !== undefined ? input.settings.exam : undefined }
  )
  const exam = parseExamFromSettings(settingsMerged)
  if (!exam || exam.questions.length === 0) {
    return { ok: false, error: "Adicione ao menos uma questao" }
  }
  const verr = validateExamDefinition(exam)
  if (verr) return { ok: false, error: verr }
  const derr = validateExamQuestionDisciplinas(exam)
  if (derr) return { ok: false, error: derr }

  const settings = settingsMerged as unknown as ContentItemSettings

  const publishedAt =
    existingRow.status === "published" && existingRow.published_at
      ? existingRow.published_at
      : new Date().toISOString()

  const { error: upErr } = await supabase
    .from("content_items")
    .update({
      title,
      body_html: bodyHtml || null,
      status: "published",
      visibility: input.visibility,
      published_at: publishedAt,
      settings: settings as Record<string, unknown>,
    })
    .eq("id", input.id)
    .eq("author_id", p.user.id)
    .eq("type", "simulado")

  if (upErr) return { ok: false, error: upErr.message }

  await supabase.from("content_item_classrooms").delete().eq("content_item_id", input.id)

  if (input.visibility === "classrooms") {
    const rows = (input.classroomIds ?? []).map((classroom_id) => ({
      content_item_id: input.id,
      classroom_id,
    }))
    const { error: jErr } = await supabase.from("content_item_classrooms").insert(rows)
    if (jErr) return { ok: false, error: jErr.message }
  }

  revalidatePath("/dashboard/aluno")
  revalidatePath("/dashboard/professor")
  revalidatePath("/dashboard/professor/conteudos")
  revalidatePath(`/conteudo/${input.id}`)
  return { ok: true }
}

export async function closeContentAssessment(
  contentItemId: string
): Promise<{ ok: true } | { ok: false; error: string }> {
  const supabase = await createClient()
  const p = await assertProfessor(supabase)
  if (!p.user) return { ok: false, error: p.error ?? "Nao autenticado" }

  const { data: row, error: fetchErr } = await supabase
    .from("content_items")
    .select("id, settings, status, type")
    .eq("id", contentItemId)
    .eq("author_id", p.user.id)
    .in("type", ["assessment", "simulado"])
    .maybeSingle()

  if (fetchErr || !row) return { ok: false, error: "Conteudo nao encontrado" }
  if (row.status !== "published") {
    return { ok: false, error: "Publique o conteudo antes de encerrar" }
  }

  const merged = {
    ...((row.settings ?? {}) as Record<string, unknown>),
    assessmentClosed: true,
  }

  const { error: upErr } = await supabase
    .from("content_items")
    .update({ settings: merged })
    .eq("id", contentItemId)
    .eq("author_id", p.user.id)
    .in("type", ["assessment", "simulado"])

  if (upErr) return { ok: false, error: upErr.message }
  revalidatePath("/dashboard/professor/criar")
  revalidatePath("/dashboard/professor/conteudos")
  revalidatePath(`/conteudo/${contentItemId}`)
  return { ok: true }
}

export type PublishArticleInput = {
  id: string
  title: string
  bodyHtml: string
  visibility: ContentVisibility
  /** Obrigatorio se visibility === 'classrooms' */
  classroomIds?: string[]
  settings: ContentItemSettings
}

export async function publishArticle(
  input: PublishArticleInput
): Promise<{ ok: true } | { ok: false; error: string }> {
  const supabase = await createClient()
  const p = await assertProfessor(supabase)
  if (!p.user) return { ok: false, error: p.error ?? "Nao autenticado" }

  const okOwn = await assertOwnsArticle(supabase, input.id, p.user.id)
  if (!okOwn) return { ok: false, error: "Artigo nao encontrado" }

  const title = input.title.trim()
  if (!title) return { ok: false, error: "Titulo obrigatorio" }

  if (input.visibility === "classrooms") {
    const ids = input.classroomIds ?? []
    if (ids.length === 0) {
      return { ok: false, error: "Selecione ao menos uma turma" }
    }
    for (const cid of ids) {
      const owns = await supabase
        .from("classrooms")
        .select("id")
        .eq("id", cid)
        .eq("professor_id", p.user.id)
        .maybeSingle()
      if (!owns.data) {
        return { ok: false, error: "Turma invalida" }
      }
    }
  }

  const bodyHtml = sanitizeActivityHtml(input.bodyHtml.trim() || "")
  const settings: ContentItemSettings = {
    tags: input.settings.tags?.filter(Boolean) ?? [],
    disciplina: input.settings.disciplina?.trim() || undefined,
    nivel: input.settings.nivel?.trim() || undefined,
    coverUrl: input.settings.coverUrl ?? null,
    coverVideoUrl: input.settings.coverVideoUrl ?? null,
  }

  const { error: upErr } = await supabase
    .from("content_items")
    .update({
      title,
      body_html: bodyHtml || null,
      status: "verificando",
      visibility: input.visibility,
      published_at: null,
      settings,
    })
    .eq("id", input.id)
    .eq("author_id", p.user.id)
    .eq("type", "article")

  if (upErr) return { ok: false, error: upErr.message }

  await supabase.from("content_item_classrooms").delete().eq("content_item_id", input.id)

  if (input.visibility === "classrooms") {
    const rows = (input.classroomIds ?? []).map((classroom_id) => ({
      content_item_id: input.id,
      classroom_id,
    }))
    const { error: jErr } = await supabase.from("content_item_classrooms").insert(rows)
    if (jErr) return { ok: false, error: jErr.message }
  }

  // Agente roda em background após resposta enviada ao cliente
  const itemId = input.id
  after(async () => {
    try {
      await runArticleReview(itemId)
    } catch (err) {
      console.error("[review] Erro no agente de revisao:", err)
    }
  })

  revalidatePath("/dashboard/professor")
  revalidatePath("/dashboard/professor/conteudos")
  revalidatePath(`/conteudo/${input.id}`)
  return { ok: true }
}

export type SaveDicaDraftInput = {
  id: string
  title?: string
  bodyHtml?: string
  settings: ContentItemSettings
}

export async function saveDicaDraft(
  input: SaveDicaDraftInput
): Promise<{ ok: true } | { ok: false; error: string }> {
  const supabase = await createClient()
  const p = await assertProfessor(supabase)
  if (!p.user) return { ok: false, error: p.error ?? "Nao autenticado" }

  const { data: row, error: fetchErr } = await supabase
    .from("content_items")
    .select("id, settings, type")
    .eq("id", input.id)
    .eq("author_id", p.user.id)
    .eq("type", "dica")
    .maybeSingle()

  if (fetchErr || !row) return { ok: false, error: "Dica nao encontrada" }

  const current = (row.settings ?? {}) as Record<string, unknown>
  const normalizedImgs =
    input.settings.dicaImageUrls != null
      ? input.settings.dicaImageUrls
          .filter((x): x is string => typeof x === "string" && x.trim().length > 0)
          .slice(0, DICA_MAX_IMAGES)
      : null

  const nextVideo =
    input.settings.dicaVideoUrl !== undefined
      ? input.settings.dicaVideoUrl?.trim() || null
      : (typeof current.dicaVideoUrl === "string" ? current.dicaVideoUrl.trim() || null : null)

  const nextImages =
    input.settings.dicaImageUrls !== undefined
      ? normalizedImgs && normalizedImgs.length > 0
        ? normalizedImgs
        : null
      : Array.isArray(current.dicaImageUrls)
        ? (current.dicaImageUrls as string[])
            .filter((x): x is string => typeof x === "string" && x.trim().length > 0)
            .slice(0, DICA_MAX_IMAGES)
        : null

  const merged: Record<string, unknown> = {
    ...current,
    tags: input.settings.tags?.filter(Boolean) ?? [],
    disciplina: input.settings.disciplina?.trim() || undefined,
    nivel: input.settings.nivel?.trim() || undefined,
    dicaVideoUrl: nextVideo,
    dicaImageUrls: nextImages,
  }

  const patch: Record<string, unknown> = { settings: merged }
  if (input.title !== undefined) patch.title = input.title.trim()
  if (input.bodyHtml !== undefined) {
    patch.body_html =
      sanitizeActivityHtml(input.bodyHtml.trim().replace(/\n/g, "<br/>")) || null
  }

  const { error: upErr } = await supabase
    .from("content_items")
    .update(patch)
    .eq("id", input.id)
    .eq("author_id", p.user.id)
    .eq("type", "dica")

  if (upErr) return { ok: false, error: upErr.message }
  revalidatePath("/dashboard/professor/criar")
  revalidatePath("/dashboard/professor/conteudos")
  revalidatePath(`/conteudo/${input.id}`)
  return { ok: true }
}

export type PublishDicaInput = PublishArticleInput

export async function publishDica(
  input: PublishDicaInput
): Promise<{ ok: true } | { ok: false; error: string }> {
  const supabase = await createClient()
  const p = await assertProfessor(supabase)
  if (!p.user) return { ok: false, error: p.error ?? "Nao autenticado" }

  const { data: existingRow, error: exErr } = await supabase
    .from("content_items")
    .select("published_at, status, settings, type")
    .eq("id", input.id)
    .eq("author_id", p.user.id)
    .eq("type", "dica")
    .maybeSingle()

  if (exErr || !existingRow) return { ok: false, error: "Dica nao encontrada" }

  const title = input.title.trim()
  if (!title) return { ok: false, error: "Titulo obrigatorio" }

  const bodyHtml = sanitizeActivityHtml(input.bodyHtml.trim().replace(/\n/g, "<br/>"))
  if (!bodyHtml?.trim()) {
    return { ok: false, error: "Escreva a descricao da dica" }
  }

  if (input.visibility === "classrooms") {
    const ids = input.classroomIds ?? []
    if (ids.length === 0) {
      return { ok: false, error: "Selecione ao menos uma turma" }
    }
    for (const cid of ids) {
      const owns = await supabase
        .from("classrooms")
        .select("id")
        .eq("id", cid)
        .eq("professor_id", p.user.id)
        .maybeSingle()
      if (!owns.data) {
        return { ok: false, error: "Turma invalida" }
      }
    }
  }

  const imgs = input.settings.dicaImageUrls
  const normalizedImgs = Array.isArray(imgs)
    ? imgs
        .filter((x): x is string => typeof x === "string" && x.trim().length > 0)
        .slice(0, DICA_MAX_IMAGES)
    : []

  const settings: ContentItemSettings = {
    tags: input.settings.tags?.filter(Boolean) ?? [],
    disciplina: input.settings.disciplina?.trim() || undefined,
    nivel: input.settings.nivel?.trim() || undefined,
    coverUrl: null,
    coverVideoUrl: null,
    dicaVideoUrl: input.settings.dicaVideoUrl?.trim() || null,
    dicaImageUrls: normalizedImgs.length > 0 ? normalizedImgs : null,
  }

  const verr = validateDicaMediaForPublish(settings)
  if (verr) return { ok: false, error: verr }

  const publishedAt =
    existingRow.status === "published" && existingRow.published_at
      ? existingRow.published_at
      : new Date().toISOString()

  const { error: upErr } = await supabase
    .from("content_items")
    .update({
      title,
      body_html: bodyHtml,
      status: "published",
      visibility: input.visibility,
      published_at: publishedAt,
      settings: settings as Record<string, unknown>,
    })
    .eq("id", input.id)
    .eq("author_id", p.user.id)
    .eq("type", "dica")

  if (upErr) return { ok: false, error: upErr.message }

  await supabase.from("content_item_classrooms").delete().eq("content_item_id", input.id)

  if (input.visibility === "classrooms") {
    const rows = (input.classroomIds ?? []).map((classroom_id) => ({
      content_item_id: input.id,
      classroom_id,
    }))
    const { error: jErr } = await supabase.from("content_item_classrooms").insert(rows)
    if (jErr) return { ok: false, error: jErr.message }
  }

  revalidatePath("/dashboard/aluno")
  revalidatePath("/dashboard/professor")
  revalidatePath("/dashboard/professor/conteudos")
  revalidatePath(`/conteudo/${input.id}`)
  return { ok: true }
}

export type ArticleForEdit = {
  id: string
  title: string
  body_html: string | null
  status: ContentItemStatus
  visibility: ContentVisibility
  settings: ContentItemSettings
  classroomIds: string[]
}

export async function getArticleForEdit(
  id: string
): Promise<{ ok: true; article: ArticleForEdit } | { ok: false; error: string }> {
  const supabase = await createClient()
  const p = await assertProfessor(supabase)
  if (!p.user) return { ok: false, error: p.error ?? "Nao autenticado" }

  const { data: row, error } = await supabase
    .from("content_items")
    .select("id, title, body_html, status, visibility, settings")
    .eq("id", id)
    .eq("author_id", p.user.id)
    .eq("type", "article")
    .maybeSingle()

  if (error || !row) return { ok: false, error: "Artigo nao encontrado" }

  const { data: cicRows } = await supabase
    .from("content_item_classrooms")
    .select("classroom_id")
    .eq("content_item_id", id)

  const r = row as Pick<
    ContentItemRow,
    "id" | "title" | "body_html" | "status" | "visibility" | "settings"
  >

  return {
    ok: true,
    article: {
      id: r.id,
      title: r.title,
      body_html: r.body_html,
      status: r.status,
      visibility: r.visibility,
      settings: (r.settings ?? {}) as ContentItemSettings,
      classroomIds: (cicRows ?? []).map((c) => c.classroom_id as string),
    },
  }
}

export type ExerciseForEdit = ArticleForEdit

export type AssessmentForEdit = ArticleForEdit & {
  dueAt: string | null
  startsAt: string | null
  assessmentClosed: boolean
}

export async function loadProfessorContentForEdit(
  id: string
): Promise<
  | { ok: true; kind: "article"; article: ArticleForEdit }
  | { ok: true; kind: "exercise"; exercise: ExerciseForEdit }
  | { ok: true; kind: "assessment"; assessment: AssessmentForEdit }
  | { ok: true; kind: "simulado"; simulado: AssessmentForEdit }
  | { ok: true; kind: "dica"; dica: ArticleForEdit }
  | { ok: false; error: string }
> {
  const supabase = await createClient()
  const p = await assertProfessor(supabase)
  if (!p.user) return { ok: false, error: p.error ?? "Nao autenticado" }

  const { data: row, error } = await supabase
    .from("content_items")
    .select("id, type, title, body_html, status, visibility, settings")
    .eq("id", id)
    .eq("author_id", p.user.id)
    .maybeSingle()

  if (error || !row) return { ok: false, error: "Conteudo nao encontrado" }

  const itemType = row.type as ContentItemType
  if (
    itemType !== "article" &&
    itemType !== "exercise" &&
    itemType !== "assessment" &&
    itemType !== "simulado" &&
    itemType !== "dica"
  ) {
    return { ok: false, error: "Conteudo nao encontrado" }
  }

  const { data: cicRows } = await supabase
    .from("content_item_classrooms")
    .select("classroom_id")
    .eq("content_item_id", id)

  const classroomIds = (cicRows ?? []).map((c) => c.classroom_id as string)
  const r = row as Pick<
    ContentItemRow,
    "id" | "title" | "body_html" | "status" | "visibility" | "settings"
  >
  const base: ArticleForEdit = {
    id: r.id,
    title: r.title,
    body_html: r.body_html,
    status: r.status,
    visibility: r.visibility,
    settings: (r.settings ?? {}) as ContentItemSettings,
    classroomIds,
  }

  if (itemType === "article") {
    return { ok: true, kind: "article", article: base }
  }
  if (itemType === "dica") {
    return { ok: true, kind: "dica", dica: base }
  }
  if (itemType === "exercise") {
    return { ok: true, kind: "exercise", exercise: base }
  }
  const st = (r.settings ?? {}) as Record<string, unknown>
  const timed: AssessmentForEdit = {
    ...base,
    dueAt: typeof st.dueAt === "string" ? st.dueAt : null,
    startsAt: typeof st.startsAt === "string" ? st.startsAt : null,
    assessmentClosed: st.assessmentClosed === true,
  }
  if (itemType === "simulado") {
    return { ok: true, kind: "simulado", simulado: timed }
  }
  return {
    ok: true,
    kind: "assessment",
    assessment: timed,
  }
}

export async function deleteContentItem(
  id: string
): Promise<{ ok: true } | { ok: false; error: string }> {
  const supabase = await createClient()
  const p = await assertProfessor(supabase)
  if (!p.user) return { ok: false, error: p.error ?? "Nao autenticado" }

  const { error } = await supabase
    .from("content_items")
    .delete()
    .eq("id", id)
    .eq("author_id", p.user.id)

  if (error) return { ok: false, error: error.message }

  revalidatePath("/dashboard/aluno")
  revalidatePath("/dashboard/professor")
  revalidatePath("/dashboard/professor/conteudos")
  revalidatePath(`/conteudo/${id}`)
  return { ok: true }
}

export async function uploadTrixArticleImage(
  contentItemId: string,
  formData: FormData
): Promise<
  { ok: true; displayUrl: string; pathname: string } | { ok: false; error: string }
> {
  const token = process.env.BLOB_READ_WRITE_TOKEN
  if (!token) {
    return { ok: false, error: "BLOB_READ_WRITE_TOKEN nao configurado" }
  }

  const supabase = await createClient()
  const p = await assertProfessor(supabase)
  if (!p.user) return { ok: false, error: p.error ?? "Nao autenticado" }

  const owns = await assertOwnsArticle(supabase, contentItemId, p.user.id)
  if (!owns) return { ok: false, error: "Artigo nao encontrado" }

  const file = formData.get("file")
  if (!(file instanceof File) || file.size === 0) {
    return { ok: false, error: "Nenhum arquivo" }
  }
  if (file.size > TRIX_IMAGE_MAX_BYTES) {
    return {
      ok: false,
      error: `Imagem muito grande (max ${TRIX_IMAGE_MAX_BYTES / 1024 / 1024} MB)`,
    }
  }
  const isImage =
    /^image\/(jpeg|png|gif|webp)$/i.test(file.type) ||
    (!file.type?.trim() && /\.(jpe?g|png|gif|webp)$/i.test(file.name))
  if (!isImage) {
    return { ok: false, error: "Apenas imagens JPEG, PNG, GIF ou WebP" }
  }

  const safe = safeUploadFilename(file.name)
  const pathname = `articles/${contentItemId}/trix/${randomUUID()}-${safe}`
  const contentType = effectiveContentType(file)
  try {
    const blob = await put(pathname, file, {
      access: "private",
      token,
      contentType,
    })
    const displayUrl = `/api/article-attachment?pathname=${encodeURIComponent(blob.pathname)}&filename=${encodeURIComponent(file.name)}`
    return { ok: true, displayUrl, pathname: blob.pathname }
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Falha no upload"
    return { ok: false, error: msg }
  }
}

/** Capa do artigo (settings.coverUrl); mesmo padrão de URL que imagens do Trix. */
export async function uploadArticleCoverImage(
  contentItemId: string,
  formData: FormData
): Promise<
  { ok: true; displayUrl: string; pathname: string } | { ok: false; error: string }
> {
  const token = process.env.BLOB_READ_WRITE_TOKEN
  if (!token) {
    return { ok: false, error: "BLOB_READ_WRITE_TOKEN nao configurado" }
  }

  const supabase = await createClient()
  const p = await assertProfessor(supabase)
  if (!p.user) return { ok: false, error: p.error ?? "Nao autenticado" }

  const owns = await assertOwnsArticle(supabase, contentItemId, p.user.id)
  if (!owns) return { ok: false, error: "Artigo nao encontrado" }

  const file = formData.get("file")
  if (!(file instanceof File) || file.size === 0) {
    return { ok: false, error: "Nenhum arquivo" }
  }
  if (file.size > TRIX_IMAGE_MAX_BYTES) {
    return {
      ok: false,
      error: `Imagem muito grande (max ${TRIX_IMAGE_MAX_BYTES / 1024 / 1024} MB)`,
    }
  }
  const isImage =
    /^image\/(jpeg|png|gif|webp)$/i.test(file.type) ||
    (!file.type?.trim() && /\.(jpe?g|png|gif|webp)$/i.test(file.name))
  if (!isImage) {
    return { ok: false, error: "Apenas imagens JPEG, PNG, GIF ou WebP" }
  }

  const safe = safeUploadFilename(file.name)
  const pathname = `articles/${contentItemId}/cover/${randomUUID()}-${safe}`
  const contentType = effectiveContentType(file)
  try {
    const blob = await put(pathname, file, {
      access: "private",
      token,
      contentType,
    })
    const displayUrl = `/api/article-attachment?pathname=${encodeURIComponent(blob.pathname)}&filename=${encodeURIComponent(file.name)}`
    return { ok: true, displayUrl, pathname: blob.pathname }
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Falha no upload"
    return { ok: false, error: msg }
  }
}

/** Imagem da galeria da dica (settings.dicaImageUrls; ate 4). */
export async function uploadDicaImage(
  contentItemId: string,
  formData: FormData
): Promise<
  { ok: true; displayUrl: string; pathname: string } | { ok: false; error: string }
> {
  const token = process.env.BLOB_READ_WRITE_TOKEN
  if (!token) {
    return { ok: false, error: "BLOB_READ_WRITE_TOKEN nao configurado" }
  }

  const supabase = await createClient()
  const p = await assertProfessor(supabase)
  if (!p.user) return { ok: false, error: "Nao autenticado" }

  const owns = await assertOwnsArticle(supabase, contentItemId, p.user.id)
  if (!owns) return { ok: false, error: "Conteudo nao encontrado" }

  const { data: ci } = await supabase
    .from("content_items")
    .select("type")
    .eq("id", contentItemId)
    .eq("author_id", p.user.id)
    .maybeSingle()
  if (ci?.type !== "dica") {
    return { ok: false, error: "Conteudo nao encontrado" }
  }

  const file = formData.get("file")
  if (!(file instanceof File) || file.size === 0) {
    return { ok: false, error: "Nenhum arquivo" }
  }
  if (file.size > TRIX_IMAGE_MAX_BYTES) {
    return {
      ok: false,
      error: `Imagem muito grande (max ${TRIX_IMAGE_MAX_BYTES / 1024 / 1024} MB)`,
    }
  }
  const isImage =
    /^image\/(jpeg|png|gif|webp)$/i.test(file.type) ||
    (!file.type?.trim() && /\.(jpe?g|png|gif|webp)$/i.test(file.name))
  if (!isImage) {
    return { ok: false, error: "Apenas imagens JPEG, PNG, GIF ou WebP" }
  }

  const safe = safeUploadFilename(file.name)
  const pathname = `articles/${contentItemId}/dica/${randomUUID()}-${safe}`
  const contentType = effectiveContentType(file)
  try {
    const blob = await put(pathname, file, {
      access: "private",
      token,
      contentType,
    })
    const displayUrl = `/api/article-attachment?pathname=${encodeURIComponent(blob.pathname)}&filename=${encodeURIComponent(file.name)}`
    return { ok: true, displayUrl, pathname: blob.pathname }
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Falha no upload"
    return { ok: false, error: msg }
  }
}

/** Capa em video (settings.coverVideoUrl); exclusiva com imagem de capa. */
export async function uploadArticleCoverVideo(
  contentItemId: string,
  formData: FormData
): Promise<
  { ok: true; displayUrl: string; pathname: string } | { ok: false; error: string }
> {
  const token = process.env.BLOB_READ_WRITE_TOKEN
  if (!token) {
    return { ok: false, error: "BLOB_READ_WRITE_TOKEN nao configurado" }
  }

  const supabase = await createClient()
  const p = await assertProfessor(supabase)
  if (!p.user) return { ok: false, error: p.error ?? "Nao autenticado" }

  const owns = await assertOwnsArticle(supabase, contentItemId, p.user.id)
  if (!owns) return { ok: false, error: "Artigo nao encontrado" }

  const file = formData.get("file")
  if (!(file instanceof File) || file.size === 0) {
    return { ok: false, error: "Nenhum arquivo" }
  }
  if (file.size > COVER_VIDEO_MAX_BYTES) {
    return {
      ok: false,
      error: `Video muito grande (max ${COVER_VIDEO_MAX_BYTES / 1024 / 1024} MB)`,
    }
  }
  if (!isArticleCoverVideoFile(file)) {
    return { ok: false, error: "Apenas video MP4, WebM ou MOV" }
  }

  const safe = safeUploadFilename(file.name)
  const pathname = `articles/${contentItemId}/cover/${randomUUID()}-${safe}`
  const contentType = effectiveVideoContentType(file)
  try {
    const blob = await put(pathname, file, {
      access: "private",
      token,
      contentType,
    })
    const displayUrl = `/api/article-attachment?pathname=${encodeURIComponent(blob.pathname)}&filename=${encodeURIComponent(file.name)}`
    return { ok: true, displayUrl, pathname: blob.pathname }
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Falha no upload"
    return { ok: false, error: msg }
  }
}

export type FeedContentItem = ContentItemRow & {
  author: { full_name: string | null; avatar_url: string | null }
}

/** @deprecated Use FeedContentItem */
export type FeedArticle = FeedContentItem

export async function getFeedArticlesForCurrentUser(limit = 20): Promise<FeedContentItem[]> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return []

  const { data: raw, error } = await supabase.rpc("feed_content_items_for_user", {
    p_limit: limit,
  })
  if (error) return []

  const list: ContentItemRow[] = Array.isArray(raw)
    ? (raw as ContentItemRow[])
    : raw != null
      ? [raw as ContentItemRow]
      : []

  if (list.length === 0) return []

  const articles = list
  const authorIds = [
    ...new Set(
      articles.map((a) => a.author_id).filter((id): id is string => typeof id === "string" && id.length > 0)
    ),
  ]

  let profiles: { id: string; full_name: string | null; avatar_url: string | null }[] = []
  if (authorIds.length > 0) {
    const { data: profRows } = await supabase
      .from("profiles")
      .select("id, full_name, avatar_url")
      .in("id", authorIds)
    profiles = profRows ?? []
  }

  const byId = new Map(profiles.map((p) => [p.id, p]))

  return articles
    .filter(
      (a) =>
        a.type === "article" ||
        a.type === "exercise" ||
        a.type === "assessment" ||
        a.type === "simulado" ||
        a.type === "dica"
    )
    .map((a) => ({
      ...a,
      settings: (a.settings ?? {}) as ContentItemSettings,
      author: {
        full_name: byId.get(a.author_id)?.full_name ?? null,
        avatar_url: byId.get(a.author_id)?.avatar_url ?? null,
      },
    }))
}

export async function getMyLikesForContentIds(
  contentIds: string[]
): Promise<Set<string>> {
  if (contentIds.length === 0) return new Set()
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return new Set()

  const { data } = await supabase
    .from("content_reactions")
    .select("content_item_id")
    .eq("user_id", user.id)
    .eq("reaction_type", "like")
    .in("content_item_id", contentIds)

  return new Set((data ?? []).map((r) => r.content_item_id))
}

export async function toggleContentLike(
  contentItemId: string
): Promise<
  | { ok: true; liked: boolean; likeCount: number }
  | { ok: false; error: string }
> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { ok: false, error: "Nao autenticado" }

  const { data: existing } = await supabase
    .from("content_reactions")
    .select("id")
    .eq("content_item_id", contentItemId)
    .eq("user_id", user.id)
    .eq("reaction_type", "like")
    .maybeSingle()

  if (existing) {
    const { error: delErr } = await supabase
      .from("content_reactions")
      .delete()
      .eq("id", existing.id)
    if (delErr) return { ok: false, error: delErr.message }
  } else {
    const { error: insErr } = await supabase.from("content_reactions").insert({
      content_item_id: contentItemId,
      user_id: user.id,
      reaction_type: "like",
    })
    if (insErr) return { ok: false, error: insErr.message }
  }

  const { data: row } = await supabase
    .from("content_items")
    .select("like_count")
    .eq("id", contentItemId)
    .single()

  revalidatePath("/dashboard/aluno")
  revalidatePath(`/conteudo/${contentItemId}`)

  return {
    ok: true,
    liked: !existing,
    likeCount: row?.like_count ?? 0,
  }
}

export async function recordContentShare(
  contentItemId: string,
  method: ShareMethod
): Promise<{ ok: true; shareCount: number } | { ok: false; error: string }> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  const { error } = await supabase.from("content_share_events").insert({
    content_item_id: contentItemId,
    user_id: user?.id ?? null,
    share_method: method,
  })
  if (error) return { ok: false, error: error.message }

  const { data: row } = await supabase
    .from("content_items")
    .select("share_count")
    .eq("id", contentItemId)
    .single()

  revalidatePath("/dashboard/aluno")
  revalidatePath(`/conteudo/${contentItemId}`)

  return { ok: true, shareCount: row?.share_count ?? 0 }
}

export async function getContentItemById(
  id: string
): Promise<
  | {
      ok: true
      item: ContentItemRow
      author: { full_name: string | null; avatar_url: string | null }
    }
  | { ok: false; error: string }
> {
  const supabase = await createClient()
  const { data: item, error } = await supabase
    .from("content_items")
    .select("*")
    .eq("id", id)
    .maybeSingle()

  if (error || !item) return { ok: false, error: "Conteudo nao encontrado" }

  const row = item as ContentItemRow
  const { data: author } = await supabase
    .from("profiles")
    .select("full_name, avatar_url")
    .eq("id", row.author_id)
    .maybeSingle()

  return {
    ok: true,
    item: { ...row, settings: (row.settings ?? {}) as ContentItemSettings },
    author: {
      full_name: author?.full_name ?? null,
      avatar_url: author?.avatar_url ?? null,
    },
  }
}
