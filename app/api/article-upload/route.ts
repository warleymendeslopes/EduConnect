import {
  uploadArticleCoverImage,
  uploadArticleCoverVideo,
  uploadDicaImage,
  uploadTrixArticleImage,
} from "@/app/actions/content-items"
import { NextResponse } from "next/server"

export const runtime = "nodejs"

const KINDS = new Set(["trix", "cover-image", "cover-video", "dica-image"])

export async function POST(request: Request) {
  let formData: FormData
  try {
    formData = await request.formData()
  } catch {
    return NextResponse.json({ ok: false, error: "Corpo invalido" }, { status: 400 })
  }

  const kind = formData.get("kind")
  const contentItemId = formData.get("contentItemId")
  if (typeof kind !== "string" || !KINDS.has(kind)) {
    return NextResponse.json({ ok: false, error: "kind invalido" }, { status: 400 })
  }
  if (typeof contentItemId !== "string" || !contentItemId.trim()) {
    return NextResponse.json({ ok: false, error: "contentItemId obrigatorio" }, { status: 400 })
  }

  const file = formData.get("file")
  if (!(file instanceof File) || file.size === 0) {
    return NextResponse.json({ ok: false, error: "Nenhum arquivo" }, { status: 400 })
  }

  const uploadForm = new FormData()
  uploadForm.append("file", file)

  let result: Awaited<ReturnType<typeof uploadTrixArticleImage>>
  if (kind === "trix") {
    result = await uploadTrixArticleImage(contentItemId, uploadForm)
  } else if (kind === "cover-image") {
    result = await uploadArticleCoverImage(contentItemId, uploadForm)
  } else if (kind === "dica-image") {
    result = await uploadDicaImage(contentItemId, uploadForm)
  } else {
    result = await uploadArticleCoverVideo(contentItemId, uploadForm)
  }

  if (!result.ok) {
    return NextResponse.json(result, { status: 400 })
  }
  return NextResponse.json(result)
}
