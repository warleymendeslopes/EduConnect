"use server"

import { revalidatePath } from "next/cache"
import { createClient } from "@/lib/supabase/server"
import { buildInviteCode, normalizeInviteCodeInput } from "@/lib/classrooms/invite-code"
import type { ClassroomPreview, ClassroomRow, JoinClassroomResult } from "@/lib/classrooms/types"

const MAX_CREATE_ATTEMPTS = 8

export type CreateClassroomInput = {
  name: string
  subject: string
  educationLevel: string
  description: string
  maxStudents: number | null
}

export async function createClassroom(
  input: CreateClassroomInput
): Promise<{ ok: true; id: string; inviteCode: string } | { ok: false; error: string }> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { ok: false, error: "Nao autenticado" }

  const { data: profile } = await supabase
    .from("profiles")
    .select("user_type")
    .eq("id", user.id)
    .single()

  if (profile?.user_type !== "professor") {
    return { ok: false, error: "Apenas professores podem criar salas" }
  }

  const name = input.name.trim()
  const subject = input.subject.trim()
  const educationLevel = input.educationLevel.trim()
  if (!name || !subject || !educationLevel) {
    return { ok: false, error: "Preencha nome, disciplina e nivel de ensino" }
  }

  let lastError: string | null = null
  for (let attempt = 0; attempt < MAX_CREATE_ATTEMPTS; attempt++) {
    const inviteCode = buildInviteCode()
    const { data, error } = await supabase
      .from("classrooms")
      .insert({
        professor_id: user.id,
        name,
        subject,
        education_level: educationLevel,
        description: input.description.trim() || null,
        invite_code: inviteCode,
        max_students: input.maxStudents,
        status: "ativa",
      })
      .select("id, invite_code")
      .single()

    if (!error && data) {
      revalidatePath("/dashboard/professor/salas")
      return { ok: true, id: data.id, inviteCode: data.invite_code }
    }
    if (error?.code === "23505") {
      lastError = "Colisao de codigo, tentando novamente"
      continue
    }
    lastError = error?.message ?? "Erro ao criar sala"
    break
  }

  return { ok: false, error: lastError ?? "Erro ao criar sala" }
}

function mapJoinRpc(payload: unknown): JoinClassroomResult {
  if (!payload || typeof payload !== "object") {
    return { ok: false, error: "Resposta invalida" }
  }
  const o = payload as Record<string, unknown>
  if (o.ok === true && typeof o.classroom_id === "string") {
    return { ok: true, classroomId: o.classroom_id }
  }
  const err = typeof o.error === "string" ? o.error : "unknown"
  const messages: Record<string, string> = {
    not_authenticated: "Faca login para entrar na sala",
    only_students: "Apenas contas de aluno podem entrar em salas",
    invalid_or_closed: "Codigo invalido ou sala encerrada",
    full: "Esta sala atingiu o limite de alunos",
    unknown: "Nao foi possivel entrar na sala",
  }
  return { ok: false, error: messages[err] ?? messages.unknown }
}

export async function joinClassroomByInvite(
  rawCode: string
): Promise<JoinClassroomResult> {
  const code = normalizeInviteCodeInput(rawCode)
  if (!code) return { ok: false, error: "Informe o codigo de convite" }

  const supabase = await createClient()
  const { data, error } = await supabase.rpc("join_classroom_by_invite", {
    p_invite_code: code,
  })

  if (error) {
    return { ok: false, error: error.message }
  }
  const result = mapJoinRpc(data)
  if (result.ok) {
    revalidatePath("/dashboard/aluno/salas")
    revalidatePath("/dashboard/professor/salas")
    await clearPendingInviteMetadata(supabase)
  }
  return result
}

async function clearPendingInviteMetadata(supabase: Awaited<ReturnType<typeof createClient>>) {
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user?.user_metadata?.pending_invite_code) return
  await supabase.auth.updateUser({
    data: {
      ...user.user_metadata,
      pending_invite_code: null,
    },
  })
}

export async function listClassroomsForProfessor(): Promise<{
  rows: (ClassroomRow & { member_count: number })[]
  error: string | null
}> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { rows: [], error: "Nao autenticado" }

  const { data: rooms, error } = await supabase
    .from("classrooms")
    .select("*")
    .eq("professor_id", user.id)
    .order("created_at", { ascending: false })

  if (error || !rooms) return { rows: [], error: error?.message ?? "Erro ao carregar salas" }

  const ids = rooms.map((r) => r.id)
  if (ids.length === 0) return { rows: [], error: null }

  const { data: counts } = await supabase
    .from("classroom_members")
    .select("classroom_id")
    .in("classroom_id", ids)

  const countMap = new Map<string, number>()
  for (const row of counts ?? []) {
    const id = row.classroom_id as string
    countMap.set(id, (countMap.get(id) ?? 0) + 1)
  }

  const rows = rooms.map((r) => ({
    ...(r as ClassroomRow),
    member_count: countMap.get(r.id) ?? 0,
  }))

  return { rows, error: null }
}

export async function listClassroomsForStudent(): Promise<{
  rows: (ClassroomRow & { professor_name: string | null })[]
  error: string | null
}> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { rows: [], error: "Nao autenticado" }

  const { data: members, error: mErr } = await supabase
    .from("classroom_members")
    .select("classroom_id")
    .eq("student_id", user.id)

  if (mErr || !members?.length) {
    return { rows: [], error: mErr?.message ?? null }
  }

  const ids = members.map((m) => m.classroom_id)
  const { data: rooms, error } = await supabase
    .from("classrooms")
    .select("*")
    .in("id", ids)
    .order("created_at", { ascending: false })

  if (error || !rooms) return { rows: [], error: error?.message ?? "Erro ao carregar salas" }

  const profIds = [...new Set(rooms.map((r) => r.professor_id))]
  const { data: profs } = await supabase
    .from("profiles")
    .select("id, full_name")
    .in("id", profIds)

  const nameById = new Map((profs ?? []).map((p) => [p.id, p.full_name]))

  const rows = rooms.map((r) => ({
    ...(r as ClassroomRow),
    professor_name: nameById.get(r.professor_id) ?? null,
  }))

  return { rows, error: null }
}

export async function getClassroomForProfessor(
  classroomId: string
): Promise<{ row: ClassroomRow & { member_count: number }; error: string | null } | { row: null; error: string }> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { row: null, error: "Nao autenticado" }

  const { data: room, error } = await supabase
    .from("classrooms")
    .select("*")
    .eq("id", classroomId)
    .eq("professor_id", user.id)
    .maybeSingle()

  if (error || !room) return { row: null, error: error?.message ?? "Sala nao encontrada" }

  const { count } = await supabase
    .from("classroom_members")
    .select("*", { count: "exact", head: true })
    .eq("classroom_id", classroomId)

  return {
    row: { ...(room as ClassroomRow), member_count: count ?? 0 },
    error: null,
  }
}

export async function getClassroomForStudent(
  classroomId: string
): Promise<{ row: ClassroomRow & { professor_name: string | null }; error: string | null } | { row: null; error: string }> {
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

  const { data: room, error } = await supabase
    .from("classrooms")
    .select("*")
    .eq("id", classroomId)
    .maybeSingle()

  if (error || !room) return { row: null, error: error?.message ?? "Sala nao encontrada" }

  const { data: prof } = await supabase
    .from("profiles")
    .select("full_name")
    .eq("id", room.professor_id)
    .maybeSingle()

  return {
    row: {
      ...(room as ClassroomRow),
      professor_name: prof?.full_name ?? null,
    },
    error: null,
  }
}

export async function listMembersForClassroom(classroomId: string): Promise<{
  members: { student_id: string; full_name: string | null; joined_at: string }[]
  error: string | null
}> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { members: [], error: "Nao autenticado" }

  const { data: room } = await supabase
    .from("classrooms")
    .select("id")
    .eq("id", classroomId)
    .eq("professor_id", user.id)
    .maybeSingle()

  if (!room) return { members: [], error: "Sala nao encontrada" }

  const { data: rows, error } = await supabase
    .from("classroom_members")
    .select("student_id, joined_at")
    .eq("classroom_id", classroomId)
    .order("joined_at", { ascending: true })

  if (error || !rows) return { members: [], error: error?.message ?? "Erro ao listar alunos" }

  const studentIds = rows.map((r) => r.student_id)
  const { data: profiles } = await supabase
    .from("profiles")
    .select("id, full_name")
    .in("id", studentIds)

  const nameById = new Map((profiles ?? []).map((p) => [p.id, p.full_name]))

  const members = rows.map((r) => ({
    student_id: r.student_id,
    full_name: nameById.get(r.student_id) ?? null,
    joined_at: r.joined_at as string,
  }))

  return { members, error: null }
}

export async function getClassroomPreviewByInviteCode(rawCode: string): Promise<{
  preview: ClassroomPreview | null
  error: string | null
}> {
  const supabase = await createClient()
  const code = normalizeInviteCodeInput(rawCode)
  if (!code) return { preview: null, error: null }

  const { data, error } = await supabase.rpc("get_classroom_by_invite_code", {
    p_code: code,
  })

  if (error) return { preview: null, error: error.message }
  const row = Array.isArray(data) ? data[0] : data
  if (!row) return { preview: null, error: null }

  return {
    preview: {
      id: row.id as string,
      name: row.name as string,
      subject: row.subject as string,
      education_level: row.education_level as string,
      professor_name: row.professor_name as string,
      status: row.status as string,
    },
    error: null,
  }
}

/** Chamar no cliente apos login/cadastro quando metadata tiver pending_invite_code */
export async function processPendingInviteIfAny(): Promise<JoinClassroomResult | null> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return null
  const raw = user.user_metadata?.pending_invite_code
  if (!raw || typeof raw !== "string") return null
  return joinClassroomByInvite(raw)
}

export async function removeClassroomMember(
  classroomId: string,
  studentId: string
): Promise<{ ok: true } | { ok: false; error: string }> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { ok: false, error: "Nao autenticado" }

  const { error } = await supabase
    .from("classroom_members")
    .delete()
    .eq("classroom_id", classroomId)
    .eq("student_id", studentId)

  if (error) return { ok: false, error: error.message }
  revalidatePath(`/dashboard/professor/salas/${classroomId}`)
  revalidatePath("/dashboard/professor/salas")
  return { ok: true }
}

export async function leaveClassroom(classroomId: string): Promise<{ ok: true } | { ok: false; error: string }> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { ok: false, error: "Nao autenticado" }

  const { error } = await supabase
    .from("classroom_members")
    .delete()
    .eq("classroom_id", classroomId)
    .eq("student_id", user.id)

  if (error) return { ok: false, error: error.message }
  revalidatePath("/dashboard/aluno/salas")
  return { ok: true }
}
