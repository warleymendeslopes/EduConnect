"use server"

import { put, del } from "@vercel/blob"
import { randomUUID } from "crypto"
import { revalidatePath } from "next/cache"
import { z } from "zod"
import { requireAuthedUser } from "@/lib/auth/user"
import { query, queryOne } from "@/lib/db/query"
import {
  inferMimeFromFilename,
  safeUploadFilename,
} from "@/lib/activities/attachments"
import { BIO_MAX_CHARS } from "@/lib/profile/constants"

export type ProfileVisibility = "public" | "private"
export type DashboardProfile = {
  id: string
  full_name: string | null
  user_type: "aluno" | "professor"
  avatar_url: string | null
  cover_url: string | null
  bio: string | null
  interests: string[]
  profile_visibility: ProfileVisibility
}

const PROFILE_IMAGE_MAX_BYTES = 5 * 1024 * 1024
const PROFILE_IMAGE_TYPES = new Set(["image/jpeg", "image/png", "image/webp"])

/** Confere a assinatura (magic bytes) do arquivo; ignora o Content-Type declarado. */
function sniffImageMime(buf: Buffer): string | null {
  if (buf.length >= 8 && buf[0] === 0x89 && buf[1] === 0x50 && buf[2] === 0x4e && buf[3] === 0x47) {
    return "image/png"
  }
  if (buf.length >= 3 && buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff) {
    return "image/jpeg"
  }
  if (buf.length >= 12 && buf.toString("ascii", 0, 4) === "RIFF" && buf.toString("ascii", 8, 12) === "WEBP") {
    return "image/webp"
  }
  return null
}

const updateProfileSchema = z.object({
  fullName: z.string().trim().min(2, "Informe seu nome").max(120, "Nome muito longo"),
  bio: z.string().trim().max(BIO_MAX_CHARS, `Descricao deve ter ate ${BIO_MAX_CHARS} caracteres`).optional(),
  interests: z.array(z.string().trim().min(1).max(40)).max(16).default([]),
  profileVisibility: z.enum(["public", "private"]),
})

function isProfileImageType(mime: string, filename: string): boolean {
  if (mime && PROFILE_IMAGE_TYPES.has(mime)) return true
  const inferred = inferMimeFromFilename(filename)
  return inferred != null && PROFILE_IMAGE_TYPES.has(inferred)
}

/**
 * Extrai a referencia do blob a partir do valor salvo na coluna, para remocao.
 * Aceita a URL de servicao atual (/api/profile-image?pathname=...) e tambem
 * URLs diretas do Blob (dados legados). Retorna null se nao houver o que apagar.
 */
function blobRefFromStoredUrl(stored: string | null): string | null {
  if (!stored) return null
  if (stored.startsWith("/api/")) {
    const marker = "pathname="
    const at = stored.indexOf(marker)
    if (at === -1) return null
    const rest = stored.slice(at + marker.length)
    const end = rest.indexOf("&")
    return decodeURIComponent(end === -1 ? rest : rest.slice(0, end)) || null
  }
  return /^https?:\/\//.test(stored) ? stored : null
}

function revalidateProfilePaths(userType?: string | null) {
  revalidatePath("/dashboard/aluno/perfil")
  revalidatePath("/dashboard/professor/perfil")
  if (userType === "aluno") revalidatePath("/dashboard/aluno")
  if (userType === "professor") revalidatePath("/dashboard/professor")
}

export async function getCurrentDashboardProfile(): Promise<DashboardProfile | null> {
  const user = await requireAuthedUser().catch(() => null)
  if (!user) return null

  return queryOne<DashboardProfile>(
    `select id, full_name, user_type, avatar_url, cover_url, bio,
            coalesce(interests, array[]::text[]) as interests,
            coalesce(profile_visibility, 'private') as profile_visibility
       from public.profiles
      where id = $1`,
    [user.id]
  )
}

export async function updateDashboardProfile(input: unknown): Promise<
  | { ok: true; profile: DashboardProfile }
  | { ok: false; error: string }
> {
  const user = await requireAuthedUser().catch(() => null)
  if (!user) return { ok: false, error: "Nao autenticado" }

  const parsed = updateProfileSchema.safeParse(input)
  if (!parsed.success) {
    return { ok: false, error: parsed.error.errors[0]?.message ?? "Dados invalidos" }
  }

  const interests = [...new Set(parsed.data.interests.map((item) => item.trim()).filter(Boolean))]

  try {
    const profile = await queryOne<DashboardProfile>(
      `update public.profiles
          set full_name = $1,
              bio = $2,
              interests = $3,
              profile_visibility = $4
        where id = $5
        returning id, full_name, user_type, avatar_url, cover_url, bio,
                  coalesce(interests, array[]::text[]) as interests,
                  coalesce(profile_visibility, 'private') as profile_visibility`,
      [
        parsed.data.fullName,
        parsed.data.bio?.trim() || null,
        interests,
        parsed.data.profileVisibility,
        user.id,
      ]
    )
    if (!profile) return { ok: false, error: "Perfil nao encontrado" }
    revalidateProfilePaths(profile.user_type)
    return { ok: true, profile }
  } catch (e: any) {
    return { ok: false, error: e?.message ?? "Erro ao salvar perfil" }
  }
}

export async function uploadProfileImage(
  kind: "avatar" | "cover",
  formData: FormData
): Promise<{ ok: true; url: string } | { ok: false; error: string }> {
  const token = process.env.BLOB_READ_WRITE_TOKEN
  if (!token) return { ok: false, error: "BLOB_READ_WRITE_TOKEN nao configurado" }

  const user = await requireAuthedUser().catch(() => null)
  if (!user) return { ok: false, error: "Nao autenticado" }

  const raw = formData.get("file")
  if (!(raw instanceof File) || raw.size === 0) {
    return { ok: false, error: "Selecione uma imagem" }
  }
  if (raw.size > PROFILE_IMAGE_MAX_BYTES) {
    return { ok: false, error: "Imagem muito grande (max 5 MB)" }
  }
  if (!isProfileImageType(raw.type, raw.name)) {
    return { ok: false, error: "Use JPEG, PNG ou WebP" }
  }

  // Valida o conteudo real do arquivo (magic bytes), nao apenas o Content-Type.
  const bytes = Buffer.from(await raw.arrayBuffer())
  const sniffed = sniffImageMime(bytes)
  if (!sniffed || !PROFILE_IMAGE_TYPES.has(sniffed)) {
    return { ok: false, error: "Arquivo invalido: envie uma imagem JPEG, PNG ou WebP" }
  }

  const column = kind === "avatar" ? "avatar_url" : "cover_url"

  // Le a imagem atual ANTES de enviar a nova, para remove-la depois (evita
  // acumulo de blobs orfaos no store a cada troca de avatar/capa).
  const prev = await queryOne<{ url: string | null; user_type: string }>(
    `select ${column} as url, user_type from public.profiles where id = $1`,
    [user.id]
  )
  if (!prev) return { ok: false, error: "Perfil nao encontrado" }

  const safe = safeUploadFilename(raw.name)
  const pathname = `profiles/${user.id}/${kind}-${randomUUID()}-${safe}`

  let blob: Awaited<ReturnType<typeof put>>
  try {
    blob = await put(pathname, bytes, {
      access: "private",
      token,
      contentType: sniffed,
    })
  } catch (e: any) {
    return { ok: false, error: e?.message ?? "Falha no upload" }
  }

  // Store privado: a imagem e servida via rota com token, nao pela URL direta do Blob.
  const servingUrl = `/api/profile-image?pathname=${encodeURIComponent(blob.pathname)}`

  try {
    await query(
      `update public.profiles set ${column} = $1 where id = $2`,
      [servingUrl, user.id]
    )
  } catch (e: any) {
    // Falha ao salvar: remove o blob recem-enviado para nao deixar orfao.
    await del(blob.url, { token }).catch(() => {})
    return { ok: false, error: e?.message ?? "Erro ao salvar imagem" }
  }

  // Best-effort: remove a imagem anterior do store (nao bloqueia o sucesso).
  const oldRef = blobRefFromStoredUrl(prev.url)
  if (oldRef) {
    await del(oldRef, { token }).catch((e) =>
      console.error("[profile] blob anterior nao removido:", e?.message ?? e)
    )
  }

  revalidateProfilePaths(prev.user_type)
  return { ok: true, url: servingUrl }
}
