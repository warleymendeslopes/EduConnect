/** Upload de blobs de artigo via Route Handler (evita limite de 1 MB das Server Actions com multipart). */

export type ArticleUploadKind = "trix" | "cover-image" | "cover-video"

export type ArticleUploadResult =
  | { ok: true; displayUrl: string; pathname: string }
  | { ok: false; error: string }

export async function uploadArticleBlobViaApi(
  kind: ArticleUploadKind,
  contentItemId: string,
  file: File
): Promise<ArticleUploadResult> {
  const fd = new FormData()
  fd.append("kind", kind)
  fd.append("contentItemId", contentItemId)
  fd.append("file", file)
  const res = await fetch("/api/article-upload", {
    method: "POST",
    body: fd,
  })
  let data: unknown
  try {
    data = await res.json()
  } catch {
    return { ok: false, error: "Resposta invalida do servidor" }
  }
  const o = data as { ok?: boolean; error?: string; displayUrl?: string; pathname?: string }
  if (!o || typeof o !== "object") {
    return { ok: false, error: "Resposta invalida do servidor" }
  }
  if (!o.ok) {
    return { ok: false, error: typeof o.error === "string" ? o.error : "Erro no upload" }
  }
  if (typeof o.displayUrl !== "string") {
    return { ok: false, error: "Resposta invalida do servidor" }
  }
  return {
    ok: true,
    displayUrl: o.displayUrl,
    pathname: typeof o.pathname === "string" ? o.pathname : "",
  }
}
