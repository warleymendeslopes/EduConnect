"use client"

import { StudentActivityExam } from "@/components/dashboard/student-activity-exam"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import type { ActivityExamPublic } from "@/lib/activities/exam"
import type { ContentExerciseSubmissionRow } from "@/app/actions/content-exercise-submissions"
import Link from "next/link"

function ReadonlyExam({ exam }: { exam: ActivityExamPublic }) {
  return (
    <ol className="space-y-6 list-decimal list-inside mt-4">
      {exam.questions.map((q, i) => (
        <li key={q.id} className="pl-1">
          {q.disciplina ? (
            <Badge variant="secondary" className="mb-2">
              {q.disciplina}
            </Badge>
          ) : null}
          <p className="text-sm font-medium text-gray-900 mb-2 inline">
            {i + 1}. {q.prompt}{" "}
            <span className="text-gray-500 font-normal">({q.points} pts)</span>
          </p>
          {q.type === "mcq" ? (
            <ul className="mt-2 ml-4 space-y-1 list-none">
              {q.options.map((opt, oi) => (
                <li key={oi} className="text-sm text-gray-700 flex gap-2">
                  <span className="font-mono text-xs text-gray-400 w-5">{String.fromCharCode(65 + oi)}</span>
                  <span>{opt}</span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-xs text-gray-500 mt-2 ml-4">Questao aberta</p>
          )}
        </li>
      ))}
    </ol>
  )
}

type Props = {
  contentItemId: string
  editHref: string
  exam: ActivityExamPublic
  maxScore: number
  isAuthor: boolean
  viewerUserId: string | null
  initialSubmission: ContentExerciseSubmissionRow | null
  mcqSolutionsAfterSubmit: Record<string, number> | undefined
  contentKind?: "exercise" | "assessment" | "simulado"
  /** Aluno: fora da janela ou encerrada (nao mostra questoes ate envio). */
  assessmentBlockMessage?: string | null
}

export function ConteudoExercisePublic({
  contentItemId,
  editHref,
  exam,
  maxScore,
  isAuthor,
  viewerUserId,
  initialSubmission,
  mcqSolutionsAfterSubmit,
  contentKind = "exercise",
  assessmentBlockMessage = null,
}: Props) {
  if (isAuthor) {
    return (
      <div className="space-y-4">
        <div className="rounded-lg border border-blue-100 bg-blue-50/80 px-4 py-3 text-sm text-blue-950">
          <p className="font-medium">
            Voce e o autor deste{" "}
            {contentKind === "assessment"
              ? "avaliacao"
              : contentKind === "simulado"
                ? "simulado"
                : "exercicio"}
            .
          </p>
          <p className="text-blue-900/90 mt-1">
            Para editar ou ver entregas, use o painel do professor.
          </p>
          <Button type="button" variant="outline" size="sm" className="mt-3" asChild>
            <Link href={editHref}>Abrir no editor</Link>
          </Button>
        </div>
        <ReadonlyExam exam={exam} />
      </div>
    )
  }

  if (
    (contentKind === "assessment" || contentKind === "simulado") &&
    assessmentBlockMessage &&
    initialSubmission?.status !== "enviado"
  ) {
    return (
      <div className="rounded-lg border border-amber-100 bg-amber-50 px-4 py-3 text-sm text-amber-950">
        {assessmentBlockMessage}
      </div>
    )
  }

  if (!viewerUserId) {
    return (
      <div className="space-y-4">
        <ReadonlyExam exam={exam} />
        <div className="rounded-lg border border-gray-200 bg-gray-50 px-4 py-3 text-sm text-gray-800">
          <Link
            href={`/login?next=${encodeURIComponent(`/conteudo/${contentItemId}`)}`}
            className="font-medium text-[#1D4ED8] hover:underline"
          >
            Entre na sua conta
          </Link>{" "}
          {contentKind === "assessment"
            ? "para responder e enviar a avaliacao."
            : contentKind === "simulado"
              ? "para responder e enviar o simulado."
              : "para responder e enviar o exercicio."}
        </div>
      </div>
    )
  }

  return (
    <StudentActivityExam
      target="content"
      contentItemId={contentItemId}
      exam={exam}
      initialSubmission={initialSubmission}
      activityClosed={false}
      maxScore={maxScore}
      mcqSolutionsAfterSubmit={mcqSolutionsAfterSubmit}
    />
  )
}
