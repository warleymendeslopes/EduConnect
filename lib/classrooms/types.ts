export type ClassroomStatus = "ativa" | "encerrada"

export type ClassroomRow = {
  id: string
  professor_id: string
  name: string
  subject: string
  education_level: string
  description: string | null
  invite_code: string
  max_students: number | null
  status: ClassroomStatus
  created_at: string
}

export type ClassroomPreview = {
  id: string
  name: string
  subject: string
  education_level: string
  professor_name: string
  status: string
}

export type JoinClassroomResult =
  | { ok: true; classroomId: string }
  | { ok: false; error: string }
