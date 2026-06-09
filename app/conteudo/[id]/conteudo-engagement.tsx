"use client"

import { recordContentShare, toggleContentLike } from "@/app/actions/content-items"
import { Button } from "@/components/ui/button"
import { Heart, MessageCircle, Share2 } from "lucide-react"
import { useState } from "react"
import { toast } from "sonner"

type Props = {
  contentItemId: string
  initialLikeCount: number
  initialShareCount: number
  initialCommentCount: number
  initialLiked?: boolean
}

export function ConteudoEngagement({
  contentItemId,
  initialLikeCount,
  initialShareCount,
  initialCommentCount,
  initialLiked = false,
}: Props) {
  const [likes, setLikes] = useState(initialLikeCount)
  const [shares, setShares] = useState(initialShareCount)
  const [liked, setLiked] = useState(initialLiked)
  const [busy, setBusy] = useState(false)

  const onLike = async () => {
    setBusy(true)
    const res = await toggleContentLike(contentItemId)
    setBusy(false)
    if (!res.ok) {
      if (res.error === "Nao autenticado") {
        toast.message("Entre na conta para curtir")
      } else {
        toast.error(res.error)
      }
      return
    }
    setLiked(res.liked)
    setLikes(res.likeCount)
  }

  const onShare = async () => {
    const url = typeof window !== "undefined" ? window.location.href : ""
    try {
      if (navigator.share) {
        await navigator.share({ title: document.title, url })
        const r = await recordContentShare(contentItemId, "native_share")
        if (r.ok) setShares(r.shareCount)
      } else {
        await navigator.clipboard.writeText(url)
        toast.success("Link copiado")
        const r = await recordContentShare(contentItemId, "copy_link")
        if (r.ok) setShares(r.shareCount)
      }
    } catch {
      try {
        await navigator.clipboard.writeText(url)
        toast.success("Link copiado")
        const r = await recordContentShare(contentItemId, "copy_link")
        if (r.ok) setShares(r.shareCount)
      } catch {
        toast.error("Nao foi possivel copiar")
      }
    }
  }

  return (
    <div className="flex flex-wrap items-center gap-3 pt-4 border-t border-gray-100">
      <Button
        type="button"
        variant="outline"
        size="sm"
        className="gap-2"
        disabled={busy}
        onClick={() => void onLike()}
      >
        <Heart
          className={`h-4 w-4 shrink-0 ${liked ? "fill-red-500 stroke-red-500 text-red-500" : ""}`}
        />
        {likes}
      </Button>
      <Button type="button" variant="outline" size="sm" className="gap-2" onClick={() => void onShare()}>
        <Share2 className="h-4 w-4" />
        Partilhar ({shares})
      </Button>
      <Button type="button" variant="outline" size="sm" className="gap-2" asChild>
        <a href="#comentarios">
          <MessageCircle className="h-4 w-4" />
          {initialCommentCount}
        </a>
      </Button>
    </div>
  )
}
