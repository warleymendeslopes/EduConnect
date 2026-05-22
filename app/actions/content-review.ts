"use server"

import { revalidatePath } from "next/cache"
import { createClient } from "@/lib/supabase/server"
import type {
  ContentItemStatus,
  ContentItemType,
  ContentReviewFinding,
  ContentReviewResult,
  ContentReviewSeal,
} from "@/lib/content/types"

export type ReviewedContentItem = {
  id: string
  title: string
  type: ContentItemType
  status: ContentItemStatus
  score: number
  seal: ContentReviewSeal
  findings: ContentReviewFinding[]
  warningReason: string | null
  reviewedAt: string
}

export async function listMyReviewedContent(): Promise<ReviewedContentItem[]> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return []

  const { data } = await supabase
    .from("content_items")
    .select(
      "id, title, type, status, content_review_results(score, seal, findings, warning_reason, reviewed_at)"
    )
    .eq("author_id", user.id)
    .not("content_review_results", "is", null)
    .order("updated_at", { ascending: false })

  if (!data) return []

  type Row = {
    id: string
    title: string
    type: string
    status: string
    content_review_results: Array<{
      score: number
      seal: string
      findings: unknown
      warning_reason: string | null
      reviewed_at: string
    }> | null
  }

  const items: ReviewedContentItem[] = []
  for (const row of data as Row[]) {
    const rev = Array.isArray(row.content_review_results)
      ? row.content_review_results[0] ?? null
      : null
    if (!rev) continue
    items.push({
      id: row.id,
      title: row.title,
      type: row.type as ContentItemType,
      status: row.status as ContentItemStatus,
      score: rev.score,
      seal: rev.seal as ContentReviewSeal,
      findings: Array.isArray(rev.findings) ? (rev.findings as ContentReviewFinding[]) : [],
      warningReason: rev.warning_reason,
      reviewedAt: rev.reviewed_at,
    })
  }

  return items.sort((a, b) => b.reviewedAt.localeCompare(a.reviewedAt))
}

/** Professor busca o resultado da revisão do agente para um artigo seu. */
export async function getMyContentReview(
  contentItemId: string
): Promise<ContentReviewResult | null> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return null

  const { data } = await supabase
    .from("content_review_results")
    .select(
      "id, content_item_id, score, seal, findings, warning_reason, reviewed_at"
    )
    .eq("content_item_id", contentItemId)
    .maybeSingle()

  if (!data) return null

  return {
    id: data.id,
    contentItemId: data.content_item_id,
    score: data.score,
    seal: data.seal,
    findings: Array.isArray(data.findings) ? data.findings : [],
    warningReason: data.warning_reason ?? null,
    reviewedAt: data.reviewed_at,
  }
}

/**
 * Professor decide o que fazer após revisão com score 50–80 (status aguardando_decisao).
 * - "publish": publica mesmo assim (com aviso no resultado)
 * - "revise": volta para rascunho para editar e reenviar
 */
export async function professorDecideAfterReview(
  contentItemId: string,
  decision: "publish" | "revise"
): Promise<{ ok: true } | { ok: false; error: string }> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { ok: false, error: "Nao autenticado" }

  const { data: item } = await supabase
    .from("content_items")
    .select("id, author_id, status, published_at")
    .eq("id", contentItemId)
    .eq("author_id", user.id)
    .eq("status", "aguardando_decisao")
    .maybeSingle()

  if (!item) {
    return { ok: false, error: "Artigo nao encontrado ou nao aguarda decisao" }
  }

  if (decision === "publish") {
    const publishedAt = item.published_at ?? new Date().toISOString()
    const { error } = await supabase
      .from("content_items")
      .update({ status: "published", published_at: publishedAt })
      .eq("id", contentItemId)
      .eq("author_id", user.id)

    if (error) return { ok: false, error: error.message }
  } else {
    const { error } = await supabase
      .from("content_items")
      .update({ status: "draft" })
      .eq("id", contentItemId)
      .eq("author_id", user.id)

    if (error) return { ok: false, error: error.message }
  }

  revalidatePath("/dashboard/professor")
  revalidatePath("/dashboard/professor/conteudos")
  revalidatePath(`/conteudo/${contentItemId}`)
  return { ok: true }
}
