export type ClassroomActivityType =
  | "trabalho"
  | "prova_objetiva"
  | "lista_exercicios"
  | "simulado"

export type ClassroomActivityStatus = "rascunho" | "aberta" | "encerrada"

export type ClassroomActivityRow = {
  id: string
  classroom_id: string
  type: ClassroomActivityType
  title: string
  /** HTML gerado pelo editor Trix (professor); exibir com sanitização (ex.: RichTextContent). */
  description: string | null
  starts_at: string | null
  due_at: string | null
  max_score: number | null
  status: ClassroomActivityStatus
  /** `attachments`, `exam` (questoes MCQ + abertas — ver `lib/activities/exam.ts`), etc. */
  settings: Record<string, unknown>
  created_at: string
  updated_at: string
}

export const ACTIVITY_TYPE_LABELS: Record<ClassroomActivityType, string> = {
  trabalho: "Trabalho",
  prova_objetiva: "Prova objetiva",
  lista_exercicios: "Lista de exercicios",
  simulado: "Simulado",
}
