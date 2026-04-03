"use client"

import { uploadTrixActivityImage } from "@/app/actions/classroom-activities"
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
  classroomId: string
  initialHtml: string
  onHtmlChange: (html: string) => void
}

export function TrixActivityDescription({
  classroomId,
  initialHtml,
  onHtmlChange,
}: Props) {
  const rawId = useId().replace(/:/g, "")
  const inputId = `trix-desc-${rawId}`
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
      const fd = new FormData()
      fd.append("file", attachment.file)
      const res = await uploadTrixActivityImage(classroomId, fd)
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
  }, [ready, classroomId, inputId, onHtmlChange])

  if (!ready) {
    return (
      <div className="min-h-[200px] rounded-md border border-input bg-muted/30 animate-pulse" />
    )
  }

  return (
    <div className="trix-wrapper rounded-md border border-input overflow-hidden focus-within:ring-[3px] focus-within:ring-ring/50">
      <input type="hidden" id={inputId} />
      {React.createElement("trix-editor", {
        ref: editorRef,
        input: inputId,
        className:
          "trix-editor min-h-[200px] max-h-[320px] overflow-y-auto px-3 py-2 text-sm",
      })}
    </div>
  )
}
