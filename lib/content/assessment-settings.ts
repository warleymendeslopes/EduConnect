/** Parse settings JSON for tipo `assessment` (prazos e encerramento). */

export type ParsedAssessmentSettings = {
  dueAt: string | null
  startsAt: string | null
  assessmentClosed: boolean
}

export function parseAssessmentSettings(
  settings: Record<string, unknown>
): ParsedAssessmentSettings {
  const dueAt =
    typeof settings.dueAt === "string" && settings.dueAt.trim()
      ? settings.dueAt.trim()
      : null
  const startsAt =
    typeof settings.startsAt === "string" && settings.startsAt.trim()
      ? settings.startsAt.trim()
      : null
  const assessmentClosed = settings.assessmentClosed === true
  return { dueAt, startsAt, assessmentClosed }
}

/** Mensagem quando o aluno nao deve ver nem responder as questoes (fora da janela / encerrada). */
export function computeAssessmentBlockMessageForStudent(
  settings: Record<string, unknown>,
  submission: { status: string } | null | undefined
): string | null {
  if (submission?.status === "enviado") return null
  const p = parseAssessmentSettings(settings)
  if (p.assessmentClosed) {
    return "Esta avaliacao foi encerrada pelo professor."
  }
  const now = Date.now()
  if (p.startsAt) {
    const t = new Date(p.startsAt).getTime()
    if (!Number.isNaN(t) && t > now) {
      return "A avaliacao ainda nao esta aberta."
    }
  }
  if (p.dueAt) {
    const t = new Date(p.dueAt).getTime()
    if (!Number.isNaN(t) && t < now) {
      return "O prazo de entrega encerrou."
    }
  }
  return null
}
