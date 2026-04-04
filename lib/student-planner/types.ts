import type { ClassroomActivityType } from "@/lib/activities/types"

export type ClassroomPlannerItem = {
  kind: "classroom"
  activityId: string
  classroomId: string
  classroomName: string
  subject: string
  activityTitle: string
  activityType: ClassroomActivityType
  dueAt: string | null
  startsAt: string | null
  href: string
  /** Estado da entrega se existir prova / submission */
  submissionStatus: "rascunho" | "enviado" | null
  /** Prova estruturada (`settings.exam`) — alinhado a desempenho / atividades avaliativas */
  isEvaluative: boolean
}

export type PersonalPlannerTask = {
  kind: "personal"
  id: string
  title: string
  notes: string | null
  scheduledOn: string
  isDone: boolean
  doneAt: string | null
}

export type PlannerDayColumn = {
  /** ISO date YYYY-MM-DD */
  dateIso: string
  /** Seg, Ter, ... */
  weekdayShort: string
  dayOfMonth: number
  classroomItems: ClassroomPlannerItem[]
  personalItems: PersonalPlannerTask[]
}

export type PlannerWeekPayload = {
  weekStartIso: string
  weekEndIso: string
  days: PlannerDayColumn[]
  /** Atividades de sala sem due_at nem starts_at */
  undatedClassroomItems: ClassroomPlannerItem[]
  /** Atividades avaliativas (com prova) nesta semana + avaliativas sem data — lembrete na sidebar */
  evaluativeWeekItems: ClassroomPlannerItem[]
  /** Totais na semana (para stats) */
  stats: {
    personalDone: number
    personalTotal: number
    classroomActivitiesInWeek: number
    classroomSubmitted: number
    /** Dias seguidos (tarefa pessoal concluída ou entrega enviada), fuso America/Sao_Paulo */
    streakDays: number
  }
  error: string | null
}
