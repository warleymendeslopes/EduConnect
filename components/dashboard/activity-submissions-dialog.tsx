"use client"

import { useEffect, useState, useTransition } from "react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  gradeOpenAnswers,
  listSubmissionsForActivity,
  type SubmissionListItem,
} from "@/app/actions/activity-submissions"
import type { ClassroomActivityRow } from "@/lib/activities/types"
import {
  parseExamFromSettings,
  type ActivityExamDefinition,
} from "@/lib/activities/exam"
import { toast } from "sonner"
import { useRouter } from "next/navigation"

type Props = {
  classroomId: string
  activity: ClassroomActivityRow | null
  open: boolean
  onOpenChange: (open: boolean) => void
}

function GradeBlock({
  classroomId,
  activityId,
  exam,
  submission,
  onSaved,
}: {
  classroomId: string
  activityId: string
  exam: ActivityExamDefinition
  submission: SubmissionListItem
  onSaved: () => void
}) {
  const router = useRouter()
  const [pending, startTransition] = useTransition()
  const opens = exam.questions.filter((q) => q.type === "open")

  const [scores, setScores] = useState<Record<string, string>>(() => {
    const o: Record<string, string> = {}
    for (const q of opens) {
      const v = submission.open_scores[q.id]
      o[q.id] = v !== undefined ? String(v) : ""
    }
    return o
  })

  if (opens.length === 0) {
    return (
      <p className="text-xs text-gray-500">
        So questoes objetivas — nota da parte objetiva: {submission.score_mcq}
      </p>
    )
  }

  const save = () => {
    const payload: Record<string, number> = {}
    for (const q of opens) {
      const raw = scores[q.id]?.trim()
      if (raw === "" || raw === undefined) continue
      const v = parseFloat(raw.replace(",", "."))
      if (Number.isNaN(v) || v < 0 || v > q.points) {
        toast.error(`Nota invalida na questao (max ${q.points})`)
        return
      }
      payload[q.id] = v
    }
    startTransition(async () => {
      const res = await gradeOpenAnswers(
        classroomId,
        activityId,
        submission.id,
        payload
      )
      if (!res.ok) {
        toast.error(res.error)
        return
      }
      toast.success("Notas salvas")
      onSaved()
      router.refresh()
    })
  }

  return (
    <div className="space-y-3 border-t border-gray-100 pt-3 mt-3">
      <p className="text-xs font-medium text-gray-700">Dissertativas</p>
      {opens.map((q) => {
        const ans = submission.answers[q.id]
        const text = ans?.type === "open" ? ans.text : "—"
        return (
          <div key={q.id} className="rounded-md bg-gray-50 p-3 space-y-2">
            <p className="text-xs text-gray-600">{q.prompt}</p>
            <p className="text-sm text-gray-900 whitespace-pre-wrap border border-gray-100 rounded bg-white p-2">
              {text}
            </p>
            <div className="flex flex-wrap items-end gap-2">
              <div className="grid gap-1">
                <Label className="text-xs">Nota (max {q.points})</Label>
                <Input
                  type="number"
                  min={0}
                  max={q.points}
                  step={0.5}
                  className="h-9 w-24"
                  value={scores[q.id] ?? ""}
                  onChange={(e) =>
                    setScores((s) => ({ ...s, [q.id]: e.target.value }))
                  }
                />
              </div>
            </div>
          </div>
        )
      })}
      <Button
        type="button"
        size="sm"
        className="bg-[#1D4ED8] hover:bg-[#1E3A8A]"
        disabled={pending}
        onClick={save}
      >
        Salvar notas dissertativas
      </Button>
    </div>
  )
}

export function ActivitySubmissionsDialog({
  classroomId,
  activity,
  open,
  onOpenChange,
}: Props) {
  const [rows, setRows] = useState<SubmissionListItem[]>([])
  const [loading, setLoading] = useState(false)

  const exam = activity
    ? parseExamFromSettings(activity.settings)
    : null

  const load = () => {
    if (!activity) return
    setLoading(true)
    void listSubmissionsForActivity(classroomId, activity.id).then(
      ({ rows: r, error }) => {
        setLoading(false)
        if (error) {
          toast.error(error)
          return
        }
        setRows(r)
      }
    )
  }

  useEffect(() => {
    if (open && activity) load()
  }, [open, activity?.id, classroomId])

  if (!activity || !exam) return null

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="font-display">Entregas — {activity.title}</DialogTitle>
          <DialogDescription>
            Provas enviadas e correcao das dissertativas. Objetivas ja entram na
            nota automaticamente.
          </DialogDescription>
        </DialogHeader>
        {loading ? (
          <p className="text-sm text-gray-500 py-6">Carregando...</p>
        ) : rows.length === 0 ? (
          <p className="text-sm text-gray-500 py-6">Nenhuma entrega ainda.</p>
        ) : (
          <ul className="space-y-6">
            {rows.map((sub) => (
              <li
                key={sub.id}
                className="border border-gray-100 rounded-lg p-4 space-y-2"
              >
                <div className="flex flex-wrap justify-between gap-2">
                  <p className="font-medium text-gray-900">
                    {sub.student_name ?? "Aluno"}
                  </p>
                  <div className="text-sm text-gray-600">
                    {sub.status === "enviado" ? (
                      <>
                        Objetiva: {sub.score_mcq}
                        {sub.score_total != null && (
                          <span className="ml-2 font-semibold text-gray-900">
                            Total: {sub.score_total}
                          </span>
                        )}
                      </>
                    ) : (
                      <span className="text-amber-700">Rascunho</span>
                    )}
                  </div>
                </div>
                {sub.status === "enviado" ? (
                  <GradeBlock
                    classroomId={classroomId}
                    activityId={activity.id}
                    exam={exam}
                    submission={sub}
                    onSaved={load}
                  />
                ) : null}
              </li>
            ))}
          </ul>
        )}
      </DialogContent>
    </Dialog>
  )
}
