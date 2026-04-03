import type { ActivityAttachment } from "@/lib/activities/attachments"

export type ClassroomMaterialStatus = "rascunho" | "publicado"

export type ClassroomMaterialRow = {
  id: string
  classroom_id: string
  title: string
  description: string | null
  external_url: string | null
  status: ClassroomMaterialStatus
  settings: Record<string, unknown>
  created_at: string
  updated_at: string
}

export type CreateMaterialInput = {
  classroomId: string
  title: string
  description: string
  externalUrl: string | null
  status: ClassroomMaterialStatus
  attachments?: ActivityAttachment[]
}

export type UpdateMaterialInput = {
  id: string
  classroomId: string
  title?: string
  description?: string
  externalUrl?: string | null
  status?: ClassroomMaterialStatus
  attachments?: ActivityAttachment[]
}

export const MATERIAL_STATUS_LABELS: Record<ClassroomMaterialStatus, string> = {
  rascunho: "Rascunho",
  publicado: "Publicado",
}
