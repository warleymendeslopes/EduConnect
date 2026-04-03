"use server"

import { del, put } from "@vercel/blob"
import { randomUUID } from "crypto"
import { revalidatePath } from "next/cache"
import { createClient } from "@/lib/supabase/server"
import type {
  ActivityAttachment,
} from "@/lib/activities/attachments"
import {
  ACTIVITY_ATTACHMENT_MAX_BYTES,
  ACTIVITY_ATTACHMENT_MAX_PER_ACTIVITY,
  assertAttachmentsBelongToClassroom,
  effectiveContentType,
  isAllowedActivityAttachmentType,
  parseActivityAttachments,
  safeUploadFilename,
} from "@/lib/activities/attachments"
import { sanitizeActivityHtml } from "@/lib/sanitize-activity-html"
import {
  mergeActivitySettings,
  totalExamPoints,
  validateExamDefinition,
  type ActivityExamDefinition,
} from "@/lib/activities/exam"
import type {
  ClassroomActivityRow,
  ClassroomActivityStatus,
  ClassroomActivityType,
} from "@/lib/activities/types"

const TRIX_IMAGE_MAX_BYTES = 5 * 1024 * 1024

export type CreateActivityInput = {
  classroomId: string
  type: ClassroomActivityType
  title: string
  description: string
  startsAt: string | null
  dueAt: string | null
  maxScore: number | null
  status: ClassroomActivityStatus
  attachments?: ActivityAttachment[]
  /** Questoes da prova (settings.exam); null ou vazio = sem prova estruturada */
  exam?: ActivityExamDefinition | null
}

export type UpdateActivityInput = {
  id: string
  classroomId: string
  type?: ClassroomActivityType
  title?: string
  description?: string
  startsAt?: string | null
  dueAt?: string | null
  maxScore?: number | null
  status?: ClassroomActivityStatus
  attachments?: ActivityAttachment[]
  exam?: ActivityExamDefinition | null
}

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

export async function uploadActivityAttachmentFiles(
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
      if (
        !isAllowedActivityAttachmentType(
          file.type,
          file.name
        )
      ) {
        throw new Error(
          "Tipo nao permitido. Use PDF, Word (.doc/.docx) ou imagem (JPEG, PNG, GIF, WebP)"
        )
      }
      const safe = safeUploadFilename(file.name)
      const pathname = `classroom-activities/${classroomId}/${randomUUID()}-${safe}`
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
    const msg =
      e instanceof Error ? e.message : "Falha no upload"
    return { ok: false, error: msg }
  }
}

export async function listActivitiesForClassroomAsProfessor(
  classroomId: string
): Promise<{ rows: ClassroomActivityRow[]; error: string | null }> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { rows: [], error: "Nao autenticado" }

  const ok = await assertProfessorOwnsClassroom(supabase, classroomId, user.id)
  if (!ok) return { rows: [], error: "Sala nao encontrada" }

  const { data, error } = await supabase
    .from("classroom_activities")
    .select("*")
    .eq("classroom_id", classroomId)
    .order("due_at", { ascending: true, nullsFirst: false })

  if (error) return { rows: [], error: error.message }
  return { rows: (data ?? []) as ClassroomActivityRow[], error: null }
}

export async function listActivitiesForClassroomAsStudent(
  classroomId: string
): Promise<{ rows: ClassroomActivityRow[]; error: string | null }> {
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
    .from("classroom_activities")
    .select("*")
    .eq("classroom_id", classroomId)
    .order("due_at", { ascending: true, nullsFirst: false })

  if (error) return { rows: [], error: error.message }
  return { rows: (data ?? []) as ClassroomActivityRow[], error: null }
}

export async function getActivityForStudent(
  classroomId: string,
  activityId: string
): Promise<{ row: ClassroomActivityRow | null; error: string | null }> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { row: null, error: "Nao autenticado" }

  const { data: member } = await supabase
    .from("classroom_members")
    .select("id")
    .eq("classroom_id", classroomId)
    .eq("student_id", user.id)
    .maybeSingle()

  if (!member) return { row: null, error: "Voce nao participa desta sala" }

  const { data, error } = await supabase
    .from("classroom_activities")
    .select("*")
    .eq("id", activityId)
    .eq("classroom_id", classroomId)
    .maybeSingle()

  if (error) return { row: null, error: error.message }
  if (!data) return { row: null, error: null }
  const row = data as ClassroomActivityRow
  if (row.status === "rascunho") return { row: null, error: null }
  return { row, error: null }
}

/** Imagem embutida no Trix (path sob classroom-activities/.../trix/). */
export async function uploadTrixActivityImage(
  classroomId: string,
  formData: FormData
): Promise<
  | { ok: true; displayUrl: string; pathname: string }
  | { ok: false; error: string }
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

  const file = formData.get("file")
  if (!(file instanceof File) || file.size === 0) {
    return { ok: false, error: "Nenhum arquivo" }
  }
  if (file.size > TRIX_IMAGE_MAX_BYTES) {
    return {
      ok: false,
      error: `Imagem muito grande (max ${TRIX_IMAGE_MAX_BYTES / 1024 / 1024} MB)`,
    }
  }
  const isImage =
    /^image\/(jpeg|png|gif|webp)$/i.test(file.type) ||
    (!file.type?.trim() &&
      /\.(jpe?g|png|gif|webp)$/i.test(file.name))
  if (!isImage) {
    return { ok: false, error: "Apenas imagens JPEG, PNG, GIF ou WebP" }
  }

  const safe = safeUploadFilename(file.name)
  const pathname = `classroom-activities/${classroomId}/trix/${randomUUID()}-${safe}`
  const contentType = effectiveContentType(file)
  try {
    const blob = await put(pathname, file, {
      access: "private",
      token,
      contentType,
    })
    const displayUrl = `/api/activity-attachment?pathname=${encodeURIComponent(blob.pathname)}&filename=${encodeURIComponent(file.name)}`
    return { ok: true, displayUrl, pathname: blob.pathname }
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Falha no upload"
    return { ok: false, error: msg }
  }
}

export async function createActivity(
  input: CreateActivityInput
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

  const attachments = input.attachments ?? []
  if (attachments.length > ACTIVITY_ATTACHMENT_MAX_PER_ACTIVITY) {
    return { ok: false, error: "Numero de anexos acima do permitido" }
  }
  const attachErr = assertAttachmentsBelongToClassroom(
    attachments,
    input.classroomId
  )
  if (attachErr) return { ok: false, error: attachErr }

  if (input.exam != null) {
    const exErr = validateExamDefinition(input.exam)
    if (exErr) return { ok: false, error: exErr }
  }

  const descriptionHtml = sanitizeActivityHtml(input.description.trim() || "")

  const settings = mergeActivitySettings(
    {},
    {
      attachments,
      exam: input.exam ?? null,
    }
  )

  let maxScore = input.maxScore
  if (input.exam && input.exam.questions.length > 0) {
    maxScore = totalExamPoints(input.exam)
  }

  const { data, error } = await supabase
    .from("classroom_activities")
    .insert({
      classroom_id: input.classroomId,
      type: input.type,
      title,
      description: descriptionHtml || null,
      starts_at: input.startsAt || null,
      due_at: input.dueAt || null,
      max_score: maxScore,
      status: input.status,
      settings,
    })
    .select("id")
    .single()

  if (error || !data) return { ok: false, error: error?.message ?? "Erro ao criar" }
  revalidatePath(`/dashboard/professor/salas/${input.classroomId}`)
  revalidatePath(`/dashboard/aluno/salas/${input.classroomId}`)
  revalidatePath(
    `/dashboard/aluno/salas/${input.classroomId}/atividades/${data.id}`
  )
  return { ok: true, id: data.id }
}

export async function updateActivity(
  input: UpdateActivityInput
): Promise<{ ok: true } | { ok: false; error: string }> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { ok: false, error: "Nao autenticado" }

  const ok = await assertProfessorOwnsClassroom(supabase, input.classroomId, user.id)
  if (!ok) return { ok: false, error: "Sala nao encontrada" }

  const patch: Record<string, unknown> = {}
  if (input.type !== undefined) patch.type = input.type
  if (input.title !== undefined) {
    const t = input.title.trim()
    if (!t) return { ok: false, error: "Titulo obrigatorio" }
    patch.title = t
  }
  if (input.description !== undefined) {
    patch.description =
      sanitizeActivityHtml(input.description.trim() || "") || null
  }
  if (input.startsAt !== undefined) patch.starts_at = input.startsAt || null
  if (input.dueAt !== undefined) patch.due_at = input.dueAt || null
  if (input.maxScore !== undefined) patch.max_score = input.maxScore
  if (input.status !== undefined) patch.status = input.status

  if (input.exam != null) {
    const exErr = validateExamDefinition(input.exam)
    if (exErr) return { ok: false, error: exErr }
  }

  if (input.attachments !== undefined || input.exam !== undefined) {
    if (input.attachments !== undefined) {
      if (input.attachments.length > ACTIVITY_ATTACHMENT_MAX_PER_ACTIVITY) {
        return { ok: false, error: "Numero de anexos acima do permitido" }
      }
      const attachErr = assertAttachmentsBelongToClassroom(
        input.attachments,
        input.classroomId
      )
      if (attachErr) return { ok: false, error: attachErr }
    }

    const { data: row } = await supabase
      .from("classroom_activities")
      .select("settings")
      .eq("id", input.id)
      .eq("classroom_id", input.classroomId)
      .maybeSingle()

    const old = parseActivityAttachments(
      row?.settings as Record<string, unknown> | undefined
    )
    if (input.attachments !== undefined) {
      const newUrls = new Set(input.attachments.map((a) => a.url))
      const removedUrls = old.filter((a) => !newUrls.has(a.url)).map((a) => a.url)
      await deleteAttachmentBlobs(removedUrls)
    }

    const current = (row?.settings as Record<string, unknown>) ?? {}
    const settingsPatch: {
      attachments?: ActivityAttachment[]
      exam?: ActivityExamDefinition | null
    } = {}
    if (input.attachments !== undefined) {
      settingsPatch.attachments = input.attachments
    }
    if (input.exam !== undefined) {
      settingsPatch.exam = input.exam
    }
    patch.settings = mergeActivitySettings(current, settingsPatch)

    if (input.exam !== undefined) {
      if (input.exam && input.exam.questions.length > 0) {
        patch.max_score = totalExamPoints(input.exam)
      } else if (input.maxScore !== undefined) {
        patch.max_score = input.maxScore
      }
    }
  }

  if (Object.keys(patch).length === 0) return { ok: true }

  const { error } = await supabase
    .from("classroom_activities")
    .update(patch)
    .eq("id", input.id)
    .eq("classroom_id", input.classroomId)

  if (error) return { ok: false, error: error.message }
  revalidatePath(`/dashboard/professor/salas/${input.classroomId}`)
  revalidatePath(`/dashboard/aluno/salas/${input.classroomId}`)
  revalidatePath(
    `/dashboard/aluno/salas/${input.classroomId}/atividades/${input.id}`
  )
  return { ok: true }
}

export async function deleteActivity(
  activityId: string,
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
    .from("classroom_activities")
    .select("settings")
    .eq("id", activityId)
    .eq("classroom_id", classroomId)
    .maybeSingle()

  const urls = parseActivityAttachments(
    existing?.settings as Record<string, unknown> | undefined
  ).map((a) => a.url)
  await deleteAttachmentBlobs(urls)

  const { error } = await supabase
    .from("classroom_activities")
    .delete()
    .eq("id", activityId)
    .eq("classroom_id", classroomId)

  if (error) return { ok: false, error: error.message }
  revalidatePath(`/dashboard/professor/salas/${classroomId}`)
  revalidatePath(`/dashboard/aluno/salas/${classroomId}`)
  return { ok: true }
}
