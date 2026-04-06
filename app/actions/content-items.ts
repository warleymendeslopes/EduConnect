"use server"

import { put } from "@vercel/blob"
import { randomUUID } from "crypto"
import { revalidatePath } from "next/cache"
import { createClient } from "@/lib/supabase/server"
import {
  effectiveContentType,
  safeUploadFilename,
} from "@/lib/activities/attachments"
import { sanitizeActivityHtml } from "@/lib/sanitize-activity-html"
import type {
  ContentItemRow,
  ContentItemSettings,
  ContentItemStatus,
  ContentVisibility,
  ShareMethod,
} from "@/lib/content/types"

const TRIX_IMAGE_MAX_BYTES = 5 * 1024 * 1024
/** Capa em video (MP4/WebM/MOV) */
const COVER_VIDEO_MAX_BYTES = 80 * 1024 * 1024

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
  title: string
  excerpt: string
  disciplina: string | null
  /** URL relativa servida por /api/article-attachment */
  coverUrl: string | null
  coverVideoUrl: string | null
  status: ContentItemRow["status"]
  visibility: ContentVisibility
  published_at: string | null
  like_count: number
  share_count: number
  updated_at: string
}

function plainTextExcerpt(html: string | null | undefined, max = 200): string {
  if (!html?.trim()) return ""
  const t = html
    .replace(/<[^>]*>/g, " ")
    .replace(/\s+/g, " ")
    .trim()
  return t.length > max ? `${t.slice(0, max)}…` : t
}

/** Todos os artigos do professor (rascunhos e publicados), visão tipo feed. */
export async function listMyContentItemsForProfessor(): Promise<
  ProfessorContentListItem[]
> {
  const supabase = await createClient()
  const p = await assertProfessor(supabase)
  if (!p.user) return []

  const { data, error } = await supabase
    .from("content_items")
    .select(
      "id, title, body_html, status, visibility, published_at, like_count, share_count, updated_at, settings"
    )
    .eq("author_id", p.user.id)
    .eq("type", "article")
    .order("updated_at", { ascending: false })

  if (error) return []

  return ((data ?? []) as Pick<
    ContentItemRow,
    | "id"
    | "title"
    | "body_html"
    | "status"
    | "visibility"
    | "published_at"
    | "like_count"
    | "share_count"
    | "updated_at"
    | "settings"
  >[]).map((row) => {
    const settings = (row.settings ?? {}) as ContentItemSettings
    return {
      id: row.id,
      title: row.title,
      excerpt: plainTextExcerpt(row.body_html),
      disciplina: settings.disciplina?.trim() || null,
      coverUrl: settings.coverUrl?.trim() || null,
      coverVideoUrl: settings.coverVideoUrl?.trim() || null,
      status: row.status,
      visibility: row.visibility,
      published_at: row.published_at,
      like_count: row.like_count,
      share_count: row.share_count,
      updated_at: row.updated_at,
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

  const { data: existing } = await supabase
    .from("content_items")
    .select("published_at, status")
    .eq("id", input.id)
    .eq("author_id", p.user.id)
    .maybeSingle()

  const publishedAt =
    existing?.status === "published" && existing.published_at
      ? existing.published_at
      : new Date().toISOString()

  const { error: upErr } = await supabase
    .from("content_items")
    .update({
      title,
      body_html: bodyHtml || null,
      status: "published",
      visibility: input.visibility,
      published_at: publishedAt,
      settings,
    })
    .eq("id", input.id)
    .eq("author_id", p.user.id)

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

export type FeedArticle = ContentItemRow & {
  author: { full_name: string | null; avatar_url: string | null }
}

export async function getFeedArticlesForCurrentUser(limit = 20): Promise<FeedArticle[]> {
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
    .filter((a) => a.type === "article")
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
