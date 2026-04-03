"use client"

import { useMemo, useState, useTransition } from "react"
import {
  getMySubmission,
  saveSubmissionDraft,
  submitExam,
} from "@/app/actions/activity-submissions"
import type { ActivityExamPublic } from "@/lib/activities/exam"
import type { StudentExamAnswers } from "@/lib/activities/exam"
import type { ActivitySubmissionRow } from "@/app/actions/activity-submissions"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { CheckCircle2, XCircle } from "lucide-react"
import { toast } from "sonner"
import { useRouter } from "next/navigation"

type Props = {
  classroomId: string
  activityId: string
  exam: ActivityExamPublic
  initialSubmission: ActivitySubmissionRow | null
  activityClosed: boolean
  maxScore: number | null
  /** Após envio: questionId -> índice da opção correta (só vem do servidor nesse estado). */
  mcqSolutionsAfterSubmit?: Record<string, number>
}

function McqFeedbackBlock({
  options,
  points,
  correctIndex,
  choiceIndex,
}: {
  options: string[]
  points: number
  correctIndex: number
  choiceIndex: number
}) {
  const hit = choiceIndex === correctIndex
  return (
    <div className="space-y-2 ml-0 sm:ml-4">
      <p className="text-xs font-medium text-gray-700 flex items-center gap-1.5 flex-wrap">
        {hit ? (
          <>
            <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
            <span className="text-emerald-900">
              Correto (+{points} pts nesta questão)
            </span>
          </>
        ) : (
          <>
            <XCircle className="h-4 w-4 text-red-600 shrink-0" />
            <span className="text-red-900">
              Incorreto (0 pts na parte objetiva desta questão)
            </span>
          </>
        )}
      </p>
      {options.map((opt, oi) => {
        const isCorrect = oi === correctIndex
        const isChosen = oi === choiceIndex
        const wrongChoice = isChosen && !isCorrect
        return (
          <div
            key={oi}
            className={cn(
              "flex flex-wrap items-center gap-2 rounded-md border px-3 py-2.5 text-sm",
              isCorrect &&
                "border-emerald-500 bg-emerald-50 text-emerald-950 shadow-sm",
              wrongChoice && "border-red-400 bg-red-50 text-red-900",
              !isCorrect &&
                !wrongChoice &&
                "border-gray-100 bg-gray-50/80 text-gray-500"
            )}
          >
            <span className="font-mono text-[10px] text-gray-400 w-5 shrink-0">
              {String.fromCharCode(65 + oi)}
            </span>
            <span className="flex-1 min-w-0">{opt}</span>
            {isCorrect ? (
              <span className="text-[10px] font-bold uppercase tracking-wide text-emerald-700 shrink-0">
                Resposta correta
              </span>
            ) : null}
            {wrongChoice ? (
              <span className="text-[10px] font-bold uppercase tracking-wide text-red-700 shrink-0">
                Sua resposta
              </span>
            ) : null}
          </div>
        )
      })}
    </div>
  )
}

function OpenQuestionGrade({
  questionId,
  maxPoints,
  openScores,
}: {
  questionId: string
  maxPoints: number
  openScores: Record<string, number>
}) {
  const v = openScores[questionId]
  if (v === undefined) {
    return (
      <p className="text-xs text-amber-800 bg-amber-50 border border-amber-100 rounded-md px-3 py-2">
        Aguardando correção do professor (até {maxPoints} pts).
      </p>
    )
  }
  return (
    <p className="text-xs text-green-900 bg-green-50 border border-green-100 rounded-md px-3 py-2">
      Nota nesta questão: <strong>{v}</strong> / {maxPoints} pts
    </p>
  )
}

function buildInitialAnswers(
  exam: ActivityExamPublic,
  submission: ActivitySubmissionRow | null
): StudentExamAnswers {
  const from = submission?.answers ?? {}
  const out: StudentExamAnswers = {}
  for (const q of exam.questions) {
    const a = from[q.id]
    if (q.type === "mcq") {
      out[q.id] =
        a?.type === "mcq"
          ? { type: "mcq", choiceIndex: a.choiceIndex }
          : { type: "mcq", choiceIndex: 0 }
    } else {
      out[q.id] =
        a?.type === "open"
          ? { type: "open", text: a.text }
          : { type: "open", text: "" }
    }
  }
  return out
}

export function StudentActivityExam({
  classroomId,
  activityId,
  exam,
  initialSubmission,
  activityClosed,
  maxScore,
  mcqSolutionsAfterSubmit,
}: Props) {
  const router = useRouter()
  const [pending, startTransition] = useTransition()
  const [submission, setSubmission] = useState<ActivitySubmissionRow | null>(
    initialSubmission
  )
  const [answers, setAnswers] = useState<StudentExamAnswers>(() =>
    buildInitialAnswers(exam, initialSubmission)
  )

  const submitted = submission?.status === "enviado"
  const readOnly = submitted || activityClosed

  const hasOpen = useMemo(
    () => exam.questions.some((q) => q.type === "open"),
    [exam.questions]
  )

  const hasMcqSolutions =
    mcqSolutionsAfterSubmit != null &&
    Object.keys(mcqSolutionsAfterSubmit).length > 0

  const refreshSubmission = () => {
    startTransition(async () => {
      const { submission: s } = await getMySubmission(classroomId, activityId)
      if (s) {
        setSubmission(s)
        setAnswers(buildInitialAnswers(exam, s))
      }
      router.refresh()
    })
  }

  const setAnswer = (id: string, next: StudentExamAnswers[string]) => {
    setAnswers((prev) => ({ ...prev, [id]: next }))
  }

  const handleSaveDraft = () => {
    startTransition(async () => {
      const res = await saveSubmissionDraft(classroomId, activityId, answers)
      if (!res.ok) {
        toast.error(res.error)
        return
      }
      toast.success("Rascunho salvo")
      refreshSubmission()
    })
  }

  const handleSubmit = () => {
    if (!confirm("Enviar a prova? Apos o envio nao sera possivel alterar.")) {
      return
    }
    startTransition(async () => {
      const res = await submitExam(classroomId, activityId, answers)
      if (!res.ok) {
        toast.error(res.error)
        return
      }
      toast.success("Prova enviada")
      refreshSubmission()
    })
  }

  return (
    <div className="mt-8 border-t border-gray-100 pt-6 space-y-6">
      <h2 className="text-sm font-semibold text-gray-900">Questoes</h2>

      {submitted && hasMcqSolutions ? (
        <p className="text-xs text-gray-600 -mt-2 mb-2">
          Abaixo, as alternativas corretas aparecem destacadas em verde. Se você
          errou, sua marcação aparece em vermelho; se acertou, só a opção correta
          fica em destaque.
        </p>
      ) : null}

      {submitted ? (
        <div className="rounded-lg bg-green-50 border border-green-100 px-4 py-3 text-sm text-green-900">
          <p>
            Prova enviada
            {submission?.submitted_at
              ? ` em ${new Date(submission.submitted_at).toLocaleString("pt-BR")}`
              : ""}
            .
          </p>
          {submission?.score_total != null ? (
            <p className="mt-2 font-semibold text-base text-green-950 tabular-nums">
              Nota: {submission.score_total}
              {maxScore != null ? (
                <span className="font-semibold text-green-800">
                  {" "}
                  / {maxScore}
                </span>
              ) : null}
            </p>
          ) : null}
          {hasOpen ? (
            <p className="mt-1 text-xs text-green-800">
              A parte objetiva e corrigida automaticamente; as dissertativas
              recebem nota quando o professor corrigir.
            </p>
          ) : null}
        </div>
      ) : activityClosed ? (
        <p className="text-sm text-amber-800 bg-amber-50 border border-amber-100 rounded-lg px-4 py-3">
          Esta atividade esta encerrada; nao e possivel enviar respostas.
        </p>
      ) : null}

      <ol className="space-y-8 list-decimal list-inside">
        {exam.questions.map((q, i) => (
          <li key={q.id} className="pl-1">
            <div className="inline-block w-full max-w-full align-top">
              <p className="text-sm font-medium text-gray-900 mb-2">
                {i + 1}. {q.prompt}{" "}
                <span className="text-gray-500 font-normal">
                  ({q.points} pts)
                </span>
              </p>
              {q.type === "mcq" ? (
                submitted &&
                hasMcqSolutions &&
                mcqSolutionsAfterSubmit![q.id] !== undefined ? (
                  <McqFeedbackBlock
                    options={q.options}
                    points={q.points}
                    correctIndex={mcqSolutionsAfterSubmit[q.id]!}
                    choiceIndex={
                      (answers[q.id] as { choiceIndex?: number })?.choiceIndex ??
                      0
                    }
                  />
                ) : (
                  <div className="space-y-2 ml-0 sm:ml-4">
                    {q.options.map((opt, oi) => (
                      <label
                        key={oi}
                        className="flex items-start gap-2 cursor-pointer"
                      >
                        <input
                          type="radio"
                          name={q.id}
                          className="mt-1 shrink-0"
                          checked={
                            (answers[q.id] as { choiceIndex?: number })
                              ?.choiceIndex === oi
                          }
                          disabled={readOnly}
                          onChange={() =>
                            setAnswer(q.id, { type: "mcq", choiceIndex: oi })
                          }
                        />
                        <span className="text-sm text-gray-700">{opt}</span>
                      </label>
                    ))}
                  </div>
                )
              ) : (
                <div className="ml-0 sm:ml-4 space-y-2">
                  <textarea
                    className="w-full min-h-[120px] rounded-md border border-input bg-background px-3 py-2 text-sm disabled:opacity-60"
                    value={
                      (answers[q.id] as { text?: string } | undefined)?.text ??
                      ""
                    }
                    disabled={readOnly}
                    onChange={(e) =>
                      setAnswer(q.id, {
                        type: "open",
                        text: e.target.value,
                      })
                    }
                    placeholder="Digite sua resposta..."
                  />
                  {submitted && submission ? (
                    <OpenQuestionGrade
                      questionId={q.id}
                      maxPoints={q.points}
                      openScores={submission.open_scores}
                    />
                  ) : null}
                </div>
              )}
            </div>
          </li>
        ))}
      </ol>

      {!readOnly ? (
        <div className="flex flex-wrap gap-3 pt-2">
          <Button
            type="button"
            variant="outline"
            disabled={pending}
            onClick={handleSaveDraft}
          >
            Salvar rascunho
          </Button>
          <Button
            type="button"
            className="bg-[#1D4ED8] hover:bg-[#1E3A8A]"
            disabled={pending}
            onClick={handleSubmit}
          >
            Enviar prova
          </Button>
        </div>
      ) : null}
    </div>
  )
}
