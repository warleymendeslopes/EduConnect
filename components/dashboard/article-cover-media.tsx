"use client"

type Props = {
  imageUrl?: string | null
  videoUrl?: string | null
  /** Classes no elemento media (img ou video) */
  className?: string
}

/** Capa de artigo: um video OU uma imagem (video tem prioridade se ambos existirem). */
export function ArticleCoverMedia({ imageUrl, videoUrl, className }: Props) {
  const v = videoUrl?.trim() || null
  const i = imageUrl?.trim() || null
  if (v) {
    return (
      <video
        src={v}
        className={className}
        controls
        playsInline
        preload="metadata"
      />
    )
  }
  if (i) {
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={i} alt="" className={className} />
  }
  return null
}
