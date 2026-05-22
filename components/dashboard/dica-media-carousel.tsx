"use client"

import { ArticleCoverMedia } from "@/components/dashboard/article-cover-media"
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  type CarouselApi,
} from "@/components/ui/carousel"
import { cn } from "@/lib/utils"
import { useEffect, useState } from "react"

type Props = {
  videoUrl: string | null
  imageUrls: string[]
  className?: string
  /** Container da area de midia (ex. aspect-[4/5]) */
  aspectClassName?: string
}

/** Video unico, uma imagem, ou carrossel com indicadores estilo Instagram. */
export function DicaMediaCarousel({
  videoUrl,
  imageUrls,
  className,
  aspectClassName = "aspect-[4/5]",
}: Props) {
  const [api, setApi] = useState<CarouselApi>()
  const [current, setCurrent] = useState(0)

  useEffect(() => {
    if (!api) return
    const onSelect = () => setCurrent(api.selectedScrollSnap())
    onSelect()
    api.on("select", onSelect)
    return () => {
      api.off("select", onSelect)
    }
  }, [api])

  const v = videoUrl?.trim() || null
  if (v) {
    return (
      <div
        className={cn(
          "relative w-full overflow-hidden rounded-lg bg-black",
          aspectClassName,
          className
        )}
      >
        <ArticleCoverMedia
          imageUrl={null}
          videoUrl={v}
          className="h-full w-full object-cover"
        />
      </div>
    )
  }

  const urls = imageUrls.filter((x) => x?.trim())
  if (urls.length === 0) {
    return (
      <div
        className={cn(
          "flex items-center justify-center rounded-lg bg-muted text-muted-foreground text-sm",
          aspectClassName,
          className
        )}
      >
        Sem midia
      </div>
    )
  }

  if (urls.length === 1) {
    return (
      <div
        className={cn(
          "relative w-full overflow-hidden rounded-lg bg-black",
          aspectClassName,
          className
        )}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={urls[0]} alt="" className="h-full w-full object-cover" />
      </div>
    )
  }

  return (
    <div className={cn("relative w-full", className)}>
      <Carousel setApi={setApi} className="w-full" opts={{ loop: true }}>
        <div className={cn("relative overflow-hidden rounded-lg bg-black", aspectClassName)}>
          <CarouselContent className="-ml-0">
            {urls.map((url, idx) => (
              <CarouselItem key={`${url}-${idx}`} className="pl-0 basis-full">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={url}
                  alt=""
                  className={cn("w-full object-cover", aspectClassName)}
                />
              </CarouselItem>
            ))}
          </CarouselContent>
        </div>
      </Carousel>
      <div className="pointer-events-none absolute bottom-3 left-0 right-0 flex justify-center gap-1.5">
        {urls.map((_, i) => (
          <button
            key={i}
            type="button"
            aria-label={`Foto ${i + 1} de ${urls.length}`}
            className={cn(
              "pointer-events-auto h-1.5 rounded-full transition-all",
              current === i ? "w-6 bg-white" : "w-1.5 bg-white/55 hover:bg-white/80"
            )}
            onClick={() => api?.scrollTo(i)}
          />
        ))}
      </div>
    </div>
  )
}
