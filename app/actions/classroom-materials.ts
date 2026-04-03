"use server"

import { del, put } from "@vercel/blob"
import { randomUUID } from "crypto"
import { revalidatePath } from "next/cache"
import { createClient } from "@/lib/supabase/server"
import type { ActivityAttachment } from "@/lib/activities/attachments"
import {
  ACTIVITY_ATTACHMENT_MAX_BYTES,
  ACTIVITY_ATTACHMENT_MAX_PER_ACTIVITY,
  assertBlobAttachmentsForClassroom,
  effectiveContentType,
  isAllowedActivityAttachmentType,
  parseActivityAttachments,
  safeUploadFilename,
} from "@/lib/activities/attachments"
import type {
  ClassroomMaterialRow,
  CreateMaterialInput,
  UpdateMaterialInput,
} from "@/lib/materials/types"

async function assertProfessorOwnsClassroom(
  supabase: Awaited<ReturnType<typeof createClient>>,
  classroomId: string,
  userId: string
): Promise<boolean> {
  const { data } = await supabase
    .from("classrooms")
    .select("id")
    .eq("id", classroomId)
    .eq("professor_id", userId)
    .maybeSingle()
  return !!data
}

async function deleteAttachmentBlobs(urls: string[]) {
  await Promise.all(urls.map((url) => del(url).catch(() => {})))
}

function normalizeExternalUrl(raw: string | null | undefined): string | null {
  if (raw == null || !String(raw).trim()) return null
  let t = String(raw).trim()
  if (t.startsWith("http://")) t = `https://${t.slice(7)}`
  if (!/^https?:\/\//i.test(t)) t = `https://${t}`
  try {
    const u = new URL(t)
    if (u.protocol !== "https:") return null
    return u.toString()
  } catch {
    return null
  }
}

export async function uploadMaterialAttachmentFiles(
  classroomId: string,
  formData: FormData
): Promise<
  { ok: true; attachments: ActivityAttachment[] } | { ok: false; error: string }
> {
  const token = process.env.BLOB_READ_WRITE_TOKEN
  if (!token) {
    return { ok: false, error: "BLOB_READ_WRITE_TOKEN nao configurado" }
  }

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { ok: false, error: "Nao autenticado" }

  const ok = await assertProfessorOwnsClassroom(supabase, classroomId, user.id)
  if (!ok) return { ok: false, error: "Sala nao encontrada" }

  const raw = formData.getAll("files")
  const files = raw.filter((x): x is File => x instanceof File && x.size > 0)
  if (files.length === 0) {
    return { ok: false, error: "Nenhum arquivo selecionado" }
  }
  if (files.length > ACTIVITY_ATTACHMENT_MAX_PER_ACTIVITY) {
    return {
      ok: false,
      error: `No maximo ${ACTIVITY_ATTACHMENT_MAX_PER_ACTIVITY} arquivos por vez`,
    }
  }

  const uploaded: ActivityAttachment[] = []
  try {
    for (const file of files) {
      if (file.size > ACTIVITY_ATTACHMENT_MAX_BYTES) {
        throw new Error(
          `Arquivo muito grande (max ${Math.round(ACTIVITY_ATTACHMENT_MAX_BYTES / 1024 / 1024)} MB)`
        )
      }
      if (!isAllowedActivityAttachmentType(file.type, file.name)) {
        throw new Error(
          "Tipo nao permitido. Use PDF, Word (.doc/.docx) ou imagem (JPEG, PNG, GIF, WebP)"
        )
      }
      const safe = safeUploadFilename(file.name)
      const pathname = `classroom-materials/${classroomId}/${randomUUID()}-${safe}`
      const contentType = effectiveContentType(file)
      const blob = await put(pathname, file, {
        access: "private",
        token,
        contentType,
      })
      const now = new Date().toISOString()
      uploaded.push({
        url: blob.url,
        pathname: blob.pathname,
        filename: file.name,
        contentType,
        size: file.size,
        uploadedAt: now,
      })
    }
    return { ok: true, attachments: uploaded }
  } catch (e) {
    await deleteAttachmentBlobs(uploaded.map((a) => a.url))
    const msg = e instanceof Error ? e.message : "Falha no upload"
    return { ok: false, error: msg }
  }
}

export async function listMaterialsForClassroomAsProfessor(
  classroomId: string
): Promise<{ rows: ClassroomMaterialRow[]; error: string | null }> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { rows: [], error: "Nao autenticado" }

  const ok = await assertProfessorOwnsClassroom(supabase, classroomId, user.id)
  if (!ok) return { rows: [], error: "Sala nao encontrada" }

  const { data, error } = await supabase
    .from("classroom_materials")
    .select("*")
    .eq("classroom_id", classroomId)
    .order("created_at", { ascending: false })

  if (error) return { rows: [], error: error.message }
  return { rows: (data ?? []) as ClassroomMaterialRow[], error: null }
}

export async function listMaterialsForClassroomAsStudent(
  classroomId: string
): Promise<{ rows: ClassroomMaterialRow[]; error: string | null }> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { rows: [], error: "Nao autenticado" }

  const { data: member } = await supabase
    .from("classroom_members")
    .select("id")
    .eq("classroom_id", classroomId)
    .eq("student_id", user.id)
    .maybeSingle()

  if (!member) return { rows: [], error: "Voce nao participa desta sala" }

  const { data, error } = await supabase
    .from("classroom_materials")
    .select("*")
    .eq("classroom_id", classroomId)
    .eq("status", "publicado")
    .order("created_at", { ascending: false })

  if (error) return { rows: [], error: error.message }
  return { rows: (data ?? []) as ClassroomMaterialRow[], error: null }
}

export async function createMaterial(
  input: CreateMaterialInput
): Promise<{ ok: true; id: string } | { ok: false; error: string }> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { ok: false, error: "Nao autenticado" }

  const title = input.title.trim()
  if (!title) return { ok: false, error: "Titulo obrigatorio" }

  const ok = await assertProfessorOwnsClassroom(supabase, input.classroomId, user.id)
  if (!ok) return { ok: false, error: "Sala nao encontrada" }

  const externalUrl = normalizeExternalUrl(input.externalUrl)
  if (input.externalUrl?.trim() && !externalUrl) {
    return { ok: false, error: "Link externo invalido (use https)" }
  }

  const attachments = input.attachments ?? []
  if (attachments.length > ACTIVITY_ATTACHMENT_MAX_PER_ACTIVITY) {
    return { ok: false, error: "Numero de anexos acima do permitido" }
  }
  const attachErr = assertBlobAttachmentsForClassroom(
    attachments,
    input.classroomId,
    "material"
  )
  if (attachErr) return { ok: false, error: attachErr }

  const { data, error } = await supabase
    .from("classroom_materials")
    .insert({
      classroom_id: input.classroomId,
      title,
      description: input.description.trim() || null,
      external_url: externalUrl,
      status: input.status,
      settings: { attachments },
    })
    .select("id")
    .single()

  if (error || !data) {
    return { ok: false, error: error?.message ?? "Erro ao criar" }
  }
  revalidatePath(`/dashboard/professor/salas/${input.classroomId}`)
  revalidatePath(`/dashboard/aluno/salas/${input.classroomId}`)
  return { ok: true, id: data.id }
}

export async function updateMaterial(
  input: UpdateMaterialInput
): Promise<{ ok: true } | { ok: false; error: string }> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { ok: false, error: "Nao autenticado" }

  const ok = await assertProfessorOwnsClassroom(supabase, input.classroomId, user.id)
  if (!ok) return { ok: false, error: "Sala nao encontrada" }

  const patch: Record<string, unknown> = {}
  if (input.title !== undefined) {
    const t = input.title.trim()
    if (!t) return { ok: false, error: "Titulo obrigatorio" }
    patch.title = t
  }
  if (input.description !== undefined)
    patch.description = input.description.trim() || null
  if (input.externalUrl !== undefined) {
    const externalUrl = normalizeExternalUrl(input.externalUrl)
    if (input.externalUrl?.trim() && !externalUrl) {
      return { ok: false, error: "Link externo invalido (use https)" }
    }
    patch.external_url = externalUrl
  }
  if (input.status !== undefined) patch.status = input.status

  if (input.attachments !== undefined) {
    if (input.attachments.length > ACTIVITY_ATTACHMENT_MAX_PER_ACTIVITY) {
      return { ok: false, error: "Numero de anexos acima do permitido" }
    }
    const attachErr = assertBlobAttachmentsForClassroom(
      input.attachments,
      input.classroomId,
      "material"
    )
    if (attachErr) return { ok: false, error: attachErr }

    const { data: row } = await supabase
      .from("classroom_materials")
      .select("settings")
      .eq("id", input.id)
      .eq("classroom_id", input.classroomId)
      .maybeSingle()

    const old = parseActivityAttachments(
      row?.settings as Record<string, unknown> | undefined
    )
    const newUrls = new Set(input.attachments.map((a) => a.url))
    const removedUrls = old.filter((a) => !newUrls.has(a.url)).map((a) => a.url)
    await deleteAttachmentBlobs(removedUrls)

    const current = (row?.settings as Record<string, unknown>) ?? {}
    patch.settings = { ...current, attachments: input.attachments }
  }

  if (Object.keys(patch).length === 0) return { ok: true }

  const { error } = await supabase
    .from("classroom_materials")
    .update(patch)
    .eq("id", input.id)
    .eq("classroom_id", input.classroomId)

  if (error) return { ok: false, error: error.message }
  revalidatePath(`/dashboard/professor/salas/${input.classroomId}`)
  revalidatePath(`/dashboard/aluno/salas/${input.classroomId}`)
  return { ok: true }
}

export async function deleteMaterial(
  materialId: string,
  classroomId: string
): Promise<{ ok: true } | { ok: false; error: string }> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { ok: false, error: "Nao autenticado" }

  const ok = await assertProfessorOwnsClassroom(supabase, classroomId, user.id)
  if (!ok) return { ok: false, error: "Sala nao encontrada" }

  const { data: existing } = await supabase
    .from("classroom_materials")
    .select("settings")
    .eq("id", materialId)
    .eq("classroom_id", classroomId)
    .maybeSingle()

  const urls = parseActivityAttachments(
    existing?.settings as Record<string, unknown> | undefined
  ).map((a) => a.url)
  await deleteAttachmentBlobs(urls)

  const { error } = await supabase
    .from("classroom_materials")
    .delete()
    .eq("id", materialId)
    .eq("classroom_id", classroomId)

  if (error) return { ok: false, error: error.message }
  revalidatePath(`/dashboard/professor/salas/${classroomId}`)
  revalidatePath(`/dashboard/aluno/salas/${classroomId}`)
  return { ok: true }
}
