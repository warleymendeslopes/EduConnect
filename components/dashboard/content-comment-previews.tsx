import type { ContentComment } from "@/app/actions/content-items"
import Link from "next/link"

type Props = {
  contentItemId: string
  commentCount: number
  comments: ContentComment[]
}

export function ContentCommentPreviews({
  contentItemId,
  commentCount,
  comments,
}: Props) {
  if (commentCount <= 0 || comments.length === 0) return null

  return (
    <div className="border-t border-gray-100 px-4 pb-3 pt-3">
      {commentCount > comments.length ? (
        <Link
          href={`/conteudo/${contentItemId}#comentarios`}
          className="mb-2 block text-sm text-gray-500 hover:text-[#1D4ED8]"
        >
          Ver todos os {commentCount} comentarios
        </Link>
      ) : null}
      <div className="space-y-1.5">
        {comments.map((comment) => (
          <p
            key={comment.id}
            className="line-clamp-2 break-words text-sm leading-5 text-gray-700"
          >
            <span className="font-medium text-gray-900">
              {comment.author.full_name ?? "Usuario"}
            </span>{" "}
            {comment.body}
          </p>
        ))}
      </div>
    </div>
  )
}
