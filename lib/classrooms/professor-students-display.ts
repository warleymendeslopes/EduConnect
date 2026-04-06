import type { ProfessorStudentRow } from "@/lib/classrooms/types"

export function displayProfessorStudentName(
  fullName: string | null,
  studentId: string
): string {
  const t = fullName?.trim()
  if (t) return t
  return `Aluno ${studentId.slice(0, 8)}…`
}

export function labelProfessorStudentRow(row: ProfessorStudentRow): string {
  return displayProfessorStudentName(row.fullName, row.studentId)
}
