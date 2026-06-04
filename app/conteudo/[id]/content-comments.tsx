"use client"

import {
  createContentComment,
  deleteContentComment,
  updateContentComment,
  type ContentComment,
} from "@/app/actions/content-items"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Edit3, Loader2, MessageCircle, Reply, Trash2, X } from "lucide-react"
import Link from "next/link"
import { useMemo, useState } from "react"
import { toast } from "sonner"

const COMMENT_MAX_LENGTH = 1000

type Props = {
  contentItemId: string
  initialComments: ContentComment[]
  initialCommentCount: number
  viewerUserId: string | null
}

function initials(name: string | null): string {
  if (!name?.trim()) return "?"
  const parts = name.trim().split(/\s+/)
  if (parts.length >= 2) {
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
  }
  return parts[0].slice(0, 2).toUpperCase()
}

function formatDate(value: string): string {
  return new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value))
}

export function ContentComments({
  contentItemId,
  initialComments,
  initialCommentCount,
  viewerUserId,
}: Props) {
  const [comments, setComments] = useState(initialComments)
  const [commentCount, setCommentCount] = useState(initialCommentCount)
  const [body, setBody] = useState("")
  const [submitting, setSubmitting] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editingBody, setEditingBody] = useState("")
  const [replyingId, setReplyingId] = useState<string | null>(null)
  const [replyBody, setReplyBody] = useState("")
  const [replySubmittingId, setReplySubmittingId] = useState<string | null>(null)
  const [busyId, setBusyId] = useState<string | null>(null)

  const remaining = useMemo(() => COMMENT_MAX_LENGTH - body.length, [body])

  async function submitComment() {
    const text = body.trim()
    if (!text) {
      toast.message("Escreva um comentario")
      return
    }
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

    setComments((prev) => [...prev, res.comment])
    setCommentCount(res.commentCount)
    setBody("")
  }

  async function submitReply(parentId: string) {
    const text = replyBody.trim()
    if (!text) {
      toast.message("Escreva uma resposta")
      return
    }
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
      prev.map((item) =>
        item.id === parentId
          ? { ...item, replies: [...(item.replies ?? []), res.comment] }
          : item
      )
    )
    setCommentCount(res.commentCount)
    setReplyingId(null)
    setReplyBody("")
  }

  function startEdit(comment: ContentComment) {
    setEditingId(comment.id)
    setEditingBody(comment.body)
  }

  async function saveEdit(commentId: string) {
    const text = editingBody.trim()
    if (!text) {
      toast.message("Escreva um comentario")
      return
    }
    if (text.length > COMMENT_MAX_LENGTH) {
      toast.error(`Comentario muito longo (max ${COMMENT_MAX_LENGTH} caracteres)`)
      return
    }

    setBusyId(commentId)
    const res = await updateContentComment(commentId, text)
    setBusyId(null)

    if (!res.ok) {
      toast.error(res.error)
      return
    }

    setComments((prev) =>
      prev.map((item) => {
        if (item.id === commentId) {
          return { ...res.comment, replies: item.replies ?? [] }
        }
        return {
          ...item,
          replies: (item.replies ?? []).map((reply) =>
            reply.id === commentId ? res.comment : reply
          ),
        }
      })
    )
    setEditingId(null)
    setEditingBody("")
  }

  async function removeComment(commentId: string) {
    setBusyId(commentId)
    const res = await deleteContentComment(commentId)
    setBusyId(null)

    if (!res.ok) {
      toast.error(res.error)
      return
    }

    setComments((prev) =>
      prev
        .filter((item) => item.id !== res.commentId)
        .map((item) => ({
          ...item,
          replies: (item.replies ?? []).filter((reply) => reply.id !== res.commentId),
        }))
    )
    setCommentCount(res.commentCount)
  }

  return (
    <section className="border-t border-gray-100 px-6 py-6">
      <div className="mb-5 flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <MessageCircle className="h-5 w-5 text-[#1D4ED8]" />
          <h2 className="font-display text-lg font-semibold text-gray-900">Comentarios</h2>
        </div>
        <span className="text-sm text-gray-500">{commentCount}</span>
      </div>

      {viewerUserId ? (
        <div className="mb-6 space-y-2">
          <Textarea
            value={body}
            maxLength={COMMENT_MAX_LENGTH}
            rows={3}
            placeholder="Escreva um comentario"
            onChange={(event) => setBody(event.target.value)}
          />
          <div className="flex items-center justify-between gap-3">
            <span className={`text-xs ${remaining < 80 ? "text-amber-600" : "text-gray-500"}`}>
              {remaining} caracteres restantes
            </span>
            <Button
              type="button"
              size="sm"
              className="bg-[#1D4ED8] hover:bg-[#1E3A8A]"
              disabled={submitting}
              onClick={() => void submitComment()}
            >
              {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
              Comentar
            </Button>
          </div>
        </div>
      ) : (
        <div className="mb-6 rounded-lg border border-dashed border-gray-200 bg-gray-50 p-4 text-sm text-gray-600">
          <Link href="/login" className="font-medium text-[#1D4ED8] hover:underline">
            Entre na conta
          </Link>{" "}
          para comentar.
        </div>
      )}

      {comments.length === 0 ? (
        <div className="rounded-lg border border-dashed border-gray-200 bg-gray-50 px-4 py-8 text-center">
          <MessageCircle className="mx-auto mb-3 h-8 w-8 text-gray-300" />
          <p className="text-sm font-medium text-gray-700">Nenhum comentario ainda</p>
          <p className="mt-1 text-sm text-gray-500">Seja a primeira pessoa a participar.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {comments.map((comment) => {
            const replies = comment.replies ?? []
            return (
              <div key={comment.id} className="space-y-3">
                <CommentRow
                  comment={comment}
                  viewerUserId={viewerUserId}
                  editingId={editingId}
                  editingBody={editingBody}
                  busyId={busyId}
                  canReply={!!viewerUserId}
                  onEdit={startEdit}
                  onEditingBodyChange={setEditingBody}
                  onCancelEdit={() => {
                    setEditingId(null)
                    setEditingBody("")
                  }}
                  onSaveEdit={saveEdit}
                  onDelete={removeComment}
                  onReply={() => {
                    setReplyingId(comment.id)
                    setReplyBody("")
                  }}
                />

                {replyingId === comment.id ? (
                  <div className="ml-12 space-y-2 border-l border-gray-100 pl-4">
                    <Textarea
                      value={replyBody}
                      maxLength={COMMENT_MAX_LENGTH}
                      rows={2}
                      placeholder="Responder comentario"
                      onChange={(event) => setReplyBody(event.target.value)}
                    />
                    <div className="flex justify-end gap-2">
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        disabled={replySubmittingId === comment.id}
                        onClick={() => {
                          setReplyingId(null)
                          setReplyBody("")
                        }}
                      >
                        <X className="h-4 w-4" />
                        Cancelar
                      </Button>
                      <Button
                        type="button"
                        size="sm"
                        disabled={replySubmittingId === comment.id}
                        onClick={() => void submitReply(comment.id)}
                      >
                        {replySubmittingId === comment.id ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : null}
                        Responder
                      </Button>
                    </div>
                  </div>
                ) : null}

                {replies.length > 0 ? (
                  <div className="ml-12 space-y-3 border-l border-gray-100 pl-4">
                    {replies.map((reply) => (
                      <CommentRow
                        key={reply.id}
                        comment={reply}
                        viewerUserId={viewerUserId}
                        editingId={editingId}
                        editingBody={editingBody}
                        busyId={busyId}
                        canReply={false}
                        onEdit={startEdit}
                        onEditingBodyChange={setEditingBody}
                        onCancelEdit={() => {
                          setEditingId(null)
                          setEditingBody("")
                        }}
                        onSaveEdit={saveEdit}
                        onDelete={removeComment}
                        onReply={() => undefined}
                      />
                    ))}
                  </div>
                ) : null}
              </div>
            )
          })}
        </div>
      )}
    </section>
  )
}

type CommentRowProps = {
  comment: ContentComment
  viewerUserId: string | null
  editingId: string | null
  editingBody: string
  busyId: string | null
  canReply: boolean
  onEdit: (comment: ContentComment) => void
  onEditingBodyChange: (value: string) => void
  onCancelEdit: () => void
  onSaveEdit: (commentId: string) => Promise<void>
  onDelete: (commentId: string) => Promise<void>
  onReply: () => void
}

function CommentRow({
  comment,
  viewerUserId,
  editingId,
  editingBody,
  busyId,
  canReply,
  onEdit,
  onEditingBodyChange,
  onCancelEdit,
  onSaveEdit,
  onDelete,
  onReply,
}: CommentRowProps) {
  const isOwner = viewerUserId === comment.user_id
  const isEditing = editingId === comment.id
  const isBusy = busyId === comment.id
  const authorName = comment.author.full_name ?? "Usuario"

  return (
    <article className="flex gap-3">
      <Avatar className="h-9 w-9">
        {comment.author.avatar_url ? (
          <AvatarImage src={comment.author.avatar_url} alt="" />
        ) : null}
        <AvatarFallback className="bg-[#1E3A8A] text-xs text-white">
          {initials(authorName)}
        </AvatarFallback>
      </Avatar>
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
          <p className="font-medium text-gray-900">{authorName}</p>
          <time className="text-xs text-gray-500" dateTime={comment.created_at}>
            {formatDate(comment.created_at)}
          </time>
        </div>

        {isEditing ? (
          <div className="mt-2 space-y-2">
            <Textarea
              value={editingBody}
              maxLength={COMMENT_MAX_LENGTH}
              rows={3}
              onChange={(event) => onEditingBodyChange(event.target.value)}
            />
            <div className="flex justify-end gap-2">
              <Button
                type="button"
                size="sm"
                variant="outline"
                disabled={isBusy}
                onClick={onCancelEdit}
              >
                <X className="h-4 w-4" />
                Cancelar
              </Button>
              <Button
                type="button"
                size="sm"
                disabled={isBusy}
                onClick={() => void onSaveEdit(comment.id)}
              >
                {isBusy ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                Salvar
              </Button>
            </div>
          </div>
        ) : (
          <p className="mt-1 whitespace-pre-wrap break-words text-sm leading-6 text-gray-700">
            {comment.body}
          </p>
        )}

        {!isEditing ? (
          <div className="mt-2 flex flex-wrap gap-2">
            {canReply ? (
              <Button
                type="button"
                size="sm"
                variant="ghost"
                className="h-8 px-2 text-gray-500"
                disabled={isBusy}
                onClick={onReply}
              >
                <Reply className="h-4 w-4" />
                Responder
              </Button>
            ) : null}
            {isOwner ? (
              <>
                <Button
                  type="button"
                  size="sm"
                  variant="ghost"
                  className="h-8 px-2 text-gray-500"
                  disabled={isBusy}
                  onClick={() => onEdit(comment)}
                >
                  <Edit3 className="h-4 w-4" />
                  Editar
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant="ghost"
                  className="h-8 px-2 text-red-600 hover:text-red-700"
                  disabled={isBusy}
                  onClick={() => void onDelete(comment.id)}
                >
                  {isBusy ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Trash2 className="h-4 w-4" />
                  )}
                  Excluir
                </Button>
              </>
            ) : null}
          </div>
        ) : null}
      </div>
    </article>
  )
}
