"use client"

import { useMemo } from "react"
import DOMPurify from "isomorphic-dompurify"
import { cn } from "@/lib/utils"

type Props = {
  html: string | null | undefined
  className?: string
}

export function RichTextContent({ html, className }: Props) {
  const safe = useMemo(() => {
    if (!html?.trim()) return ""
    return DOMPurify.sanitize(html, {
      USE_PROFILES: { html: true },
      ADD_TAGS: ["figure", "figcaption"],
      ADD_ATTR: ["class", "language"],
    })
  }, [html])

  if (!safe) return null

  return (
    <div
      className={cn(
        "trix-content max-w-none text-gray-800 text-sm leading-relaxed [&_a]:text-[#1D4ED8] [&_a]:underline [&_ul]:list-disc [&_ul]:pl-6 [&_ol]:list-decimal [&_ol]:pl-6 [&_img]:max-w-full [&_img]:rounded-md [&_figure]:my-4 [&_blockquote]:border-l-4 [&_blockquote]:border-gray-200 [&_blockquote]:pl-4 [&_pre]:bg-gray-50 [&_pre]:p-3 [&_pre]:rounded-md",
        className
      )}
      dangerouslySetInnerHTML={{ __html: safe }}
    />
  )
}
