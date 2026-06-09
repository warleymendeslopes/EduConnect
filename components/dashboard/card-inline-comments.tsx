"use client"

import {
  createContentComment,
  listContentComments,
  type ContentComment,
} from "@/app/actions/content-items"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Loader2, Send } from "lucide-react"
import { useState } from "react"
import { toast } from "sonner"

const COMMENT_MAX_LENGTH = 1000

function initials(name: string | null): string {
  if (!name?.trim()) return "?"
  const parts = name.trim().split(/\s+/)
  if (parts.length >= 2) return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
  return parts[0].slice(0, 2).toUpperCase()
}

type Props = {
  contentItemId: string
  initialComments: ContentComment[]
  initialCommentCount: number
  viewerUserId: string | null
  onCountChange?: (count: number) => void
}

export function CardInlineComments({
  contentItemId,
  initialComments,
  initialCommentCount,
  viewerUserId,
  onCountChange,
}: Props) {
  const [comments, setComments] = useState<ContentComment[]>(initialComments)
  const [commentCount, setCommentCount] = useState(initialCommentCount)
  const [allLoaded, setAllLoaded] = useState(false)
  const [loadingAll, setLoadingAll] = useState(false)
  const [body, setBody] = useState("")
  const [submitting, setSubmitting] = useState(false)
  const [replyingId, setReplyingId] = useState<string | null>(null)
  const [replyBody, setReplyBody] = useState("")
  const [replySubmittingId, setReplySubmittingId] = useState<string | null>(null)

  const hasMore = !allLoaded && commentCount > comments.length

  async function loadAll() {
    setLoadingAll(true)
    const res = await listContentComments(contentItemId)
    setLoadingAll(false)
    if (!res.ok) {
      toast.error(res.error)
      return
    }
    setComments(res.comments)
    setAllLoaded(true)
    // Sincroniza contagem real (raízes + respostas) com o estado do pai
    const total = res.comments.reduce(
      (n, c) => n + 1 + (c.replies?.length ?? 0),
      0
    )
    setCommentCount(total)
    onCountChange?.(total)
  }

  async function submitComment() {
    const text = body.trim()
    if (!text) return
    if (text.length > COMMENT_MAX_LENGTH) {
      toast.error(`Comentario muito longo (max ${COMMENT_MAX_LENGTH} caracteres)`)
      return
    }
    setSubmitting(true)
    const res = await createContentComment(contentItemId, text)
    setSubmitting(false)
    if (!res.ok) {
      toast.error(res.error)
      return
    }
    setComments((prev) => [...prev, { ...res.comment, replies: [] }])
    setCommentCount(res.commentCount)
    onCountChange?.(res.commentCount)
    setBody("")
  }

  async function submitReply(parentId: string) {
    const text = replyBody.trim()
    if (!text) return
    if (text.length > COMMENT_MAX_LENGTH) {
      toast.error(`Resposta muito longa (max ${COMMENT_MAX_LENGTH} caracteres)`)
      return
    }
    setReplySubmittingId(parentId)
    const res = await createContentComment(contentItemId, text, parentId)
    setReplySubmittingId(null)
    if (!res.ok) {
      toast.error(res.error)
      return
    }
    setComments((prev) =>
      prev.map((c) =>
        c.id === parentId
          ? { ...c, replies: [...(c.replies ?? []), res.comment] }
          : c
      )
    )
    setCommentCount(res.commentCount)
    onCountChange?.(res.commentCount)
    setReplyingId(null)
    setReplyBody("")
  }

  return (
    <div className="border-t border-gray-100 px-4 pt-3 pb-3 space-y-3">
      {/* "Ver todos" */}
      {hasMore ? (
        <button
          type="button"
          disabled={loadingAll}
          className="flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700 disabled:opacity-60"
          onClick={() => void loadAll()}
        >
          {loadingAll ? (
            <><Loader2 className="h-3 w-3 animate-spin" /> Carregando...</>
          ) : (
            `Ver todos os ${commentCount} comentarios`
          )}
        </button>
      ) : null}

      {/* Lista de comentários */}
      {comments.length > 0 ? (
        <div className="space-y-2.5">
          {comments.map((comment) => {
            const replies = comment.replies ?? []
            return (
              <div key={comment.id} className="space-y-1.5">
                {/* Comentário raiz */}
                <div className="flex gap-2 items-start">
                  <Avatar className="h-6 w-6 shrink-0 mt-0.5">
                    {comment.author.avatar_url ? (
                      <AvatarImage src={comment.author.avatar_url} alt="" />
                    ) : null}
                    <AvatarFallback className="bg-[#1E3A8A] text-[10px] text-white">
                      {initials(comment.author.full_name)}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-gray-700 break-words leading-5">
                      <span className="font-semibold text-gray-900 mr-1">
                        {comment.author.full_name ?? "Usuario"}
                      </span>
                      {comment.body}
                    </p>
                    {viewerUserId ? (
                      <button
                        type="button"
                        className="text-xs text-gray-400 hover:text-gray-600 mt-0.5 font-medium"
                        onClick={() => {
                          setReplyingId(replyingId === comment.id ? null : comment.id)
                          setReplyBody("")
                        }}
                      >
                        Responder
                      </button>
                    ) : null}
                  </div>
                </div>

                {/* Respostas */}
                {replies.length > 0 ? (
                  <div className="ml-8 pl-3 border-l-2 border-gray-100 space-y-2">
                    {replies.map((reply) => (
                      <div key={reply.id} className="flex gap-2 items-start">
                        <Avatar className="h-5 w-5 shrink-0 mt-0.5">
                          {reply.author.avatar_url ? (
                            <AvatarImage src={reply.author.avatar_url} alt="" />
                          ) : null}
                          <AvatarFallback className="bg-[#1E3A8A] text-[9px] text-white">
                            {initials(reply.author.full_name)}
                          </AvatarFallback>
                        </Avatar>
                        <p className="text-sm text-gray-700 break-words flex-1 leading-5">
                          <span className="font-semibold text-gray-900 mr-1">
                            {reply.author.full_name ?? "Usuario"}
                          </span>
                          {reply.body}
                        </p>
                      </div>
                    ))}
                  </div>
                ) : null}

                {/* Campo de resposta */}
                {replyingId === comment.id ? (
                  <div className="ml-8 flex items-center gap-2">
                    <input
                      autoFocus
                      className="flex-1 text-sm bg-gray-50 border border-gray-200 rounded-full px-3 py-1 focus:outline-none focus:ring-1 focus:ring-[#1D4ED8] placeholder:text-gray-400"
                      placeholder={`Responder ${comment.author.full_name ?? "Usuario"}…`}
                      value={replyBody}
                      maxLength={COMMENT_MAX_LENGTH}
                      onChange={(e) => setReplyBody(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" && !e.shiftKey) {
                          e.preventDefault()
                          void submitReply(comment.id)
                        }
                        if (e.key === "Escape") {
                          setReplyingId(null)
                          setReplyBody("")
                        }
                      }}
                    />
                    <button
                      type="button"
                      disabled={replySubmittingId === comment.id || !replyBody.trim()}
                      onClick={() => void submitReply(comment.id)}
                      className="text-[#1D4ED8] disabled:opacity-40 shrink-0"
                    >
                      {replySubmittingId === comment.id ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Send className="h-4 w-4" />
                      )}
                    </button>
                  </div>
                ) : null}
              </div>
            )
          })}
        </div>
      ) : commentCount === 0 ? (
        <p className="text-sm text-gray-400">Seja o primeiro a comentar.</p>
      ) : null}

      {/* Campo de novo comentário */}
      {viewerUserId ? (
        <div className="flex items-center gap-2 pt-1">
          <input
            id={`comment-input-${contentItemId}`}
            className="flex-1 text-sm bg-gray-50 border border-gray-200 rounded-full px-3 py-1.5 focus:outline-none focus:ring-1 focus:ring-[#1D4ED8] placeholder:text-gray-400"
            placeholder="Adicionar comentario…"
            value={body}
            maxLength={COMMENT_MAX_LENGTH}
            onChange={(e) => setBody(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault()
                void submitComment()
              }
            }}
          />
          <button
            type="button"
            disabled={submitting || !body.trim()}
            onClick={() => void submitComment()}
            className="text-sm font-semibold text-[#1D4ED8] disabled:opacity-40 shrink-0"
          >
            {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : "Publicar"}
          </button>
        </div>
      ) : null}
    </div>
  )
}
