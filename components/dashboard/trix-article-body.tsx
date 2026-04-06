"use client"

import { uploadArticleBlobViaApi } from "@/lib/article-upload-client"
import React, { useEffect, useId, useRef, useState } from "react"
import { toast } from "sonner"
import "trix/dist/trix.css"

type TrixEditorEl = HTMLElement & {
  editor?: { loadHTML: (html: string) => void }
}

type TrixAttachment = {
  file?: File
  setAttributes: (attrs: Record<string, string>) => void
  remove: () => void
}

type Props = {
  /** Quando null, use ensureContentItemId antes de enviar anexos (rascunho criado sob demanda). */
  contentItemId: string | null
  initialHtml: string
  onHtmlChange: (html: string) => void
  /** Obrigatorio se contentItemId for null e o utilizador puder anexar imagens. */
  ensureContentItemId?: () => Promise<string>
}

export function TrixArticleBody({
  contentItemId,
  initialHtml,
  onHtmlChange,
  ensureContentItemId,
}: Props) {
  const rawId = useId().replace(/:/g, "")
  const inputId = `trix-article-${rawId}`
  const editorRef = useRef<TrixEditorEl | null>(null)
  const [ready, setReady] = useState(false)
  const initialApplied = useRef(false)

  useEffect(() => {
    let cancelled = false
    void import("trix").then(() => {
      if (!cancelled) setReady(true)
    })
    return () => {
      cancelled = true
    }
  }, [])

  useEffect(() => {
    if (!ready || !editorRef.current || initialApplied.current) return
    initialApplied.current = true
    editorRef.current.editor?.loadHTML(initialHtml || "")
  }, [ready, initialHtml])

  useEffect(() => {
    if (!ready || !editorRef.current) return
    const node = editorRef.current

    const onAttach = async (event: Event) => {
      const ce = event as CustomEvent<{ attachment?: TrixAttachment }>
      const attachment = ce.detail?.attachment
      if (!attachment?.file) return
      let cid = contentItemId
      if (!cid) {
        if (!ensureContentItemId) {
          toast.error("Nao foi possivel preparar o rascunho para o envio")
          attachment.remove()
          return
        }
        try {
          cid = await ensureContentItemId()
        } catch {
          attachment.remove()
          return
        }
      }
      const res = await uploadArticleBlobViaApi("trix", cid, attachment.file)
      if (res.ok) {
        attachment.setAttributes({
          url: res.displayUrl,
          href: res.displayUrl,
        })
      } else {
        toast.error(res.error)
        attachment.remove()
      }
    }

    const onChange = () => {
      const hidden = document.getElementById(inputId) as HTMLInputElement | null
      onHtmlChange(hidden?.value ?? "")
    }

    node.addEventListener("trix-attachment-add", onAttach as EventListener)
    node.addEventListener("trix-change", onChange)
    return () => {
      node.removeEventListener("trix-attachment-add", onAttach as EventListener)
      node.removeEventListener("trix-change", onChange)
    }
  }, [ready, contentItemId, ensureContentItemId, inputId, onHtmlChange])

  if (!ready) {
    return (
      <div className="min-h-[280px] rounded-md border border-input bg-muted/30 animate-pulse" />
    )
  }

  return (
    <div className="trix-wrapper rounded-md border border-input overflow-hidden focus-within:ring-[3px] focus-within:ring-ring/50">
      <input type="hidden" id={inputId} />
      {React.createElement("trix-editor", {
        ref: editorRef,
        input: inputId,
        className:
          "trix-editor min-h-[280px] max-h-[480px] overflow-y-auto px-3 py-2 text-sm",
      })}
    </div>
  )
}
