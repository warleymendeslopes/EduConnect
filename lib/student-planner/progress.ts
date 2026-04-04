import type { PlannerDayColumn } from "./types"

/** Progresso por disciplina (subject) na semana: atividades listadas vs enviadas. */
export function buildSubjectProgress(
  days: PlannerDayColumn[]
): { subject: string; done: number; total: number }[] {
  const map = new Map<string, { done: number; total: number }>()
  for (const col of days) {
    for (const it of col.classroomItems) {
      const key = it.subject || it.classroomName
      const cur = map.get(key) ?? { done: 0, total: 0 }
      cur.total += 1
      if (it.submissionStatus === "enviado") cur.done += 1
      map.set(key, cur)
    }
  }
  return [...map.entries()]
    .map(([subject, v]) => ({
      subject,
      done: v.done,
      total: v.total,
    }))
    .sort((a, b) => a.subject.localeCompare(b.subject))
}
