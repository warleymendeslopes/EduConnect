"use client"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  EXAM_MAX_QUESTIONS,
  EXAM_MCQ_MAX_OPTIONS,
  EXAM_MCQ_MIN_OPTIONS,
  type ActivityExamDefinition,
  type ExamQuestion,
  type ExamQuestionMcq,
  type ExamQuestionOpen,
  newQuestionId,
} from "@/lib/activities/exam"
import { GripVertical, Plus, Trash2 } from "lucide-react"

type Props = {
  value: ActivityExamDefinition | null
  onChange: (exam: ActivityExamDefinition | null) => void
}

function emptyMcq(order: number): ExamQuestionMcq {
  return {
    id: newQuestionId(),
    order,
    type: "mcq",
    prompt: "",
    options: ["", ""],
    correctIndex: 0,
    points: 1,
  }
}

function emptyOpen(order: number): ExamQuestionOpen {
  return {
    id: newQuestionId(),
    order,
    type: "open",
    prompt: "",
    points: 1,
  }
}

function normalizeOrders(questions: ExamQuestion[]): ExamQuestion[] {
  return questions.map((q, i) => ({ ...q, order: i + 1 }))
}

export function ActivityExamEditor({ value, onChange }: Props) {
  const questions = value?.questions ?? []

  const setQuestions = (next: ExamQuestion[]) => {
    if (next.length === 0) {
      onChange(null)
      return
    }
    onChange({
      version: 1,
      questions: normalizeOrders(next),
    })
  }

  const addMcq = () => {
    if (questions.length >= EXAM_MAX_QUESTIONS) return
    setQuestions([...questions, emptyMcq(questions.length + 1)])
  }

  const addOpen = () => {
    if (questions.length >= EXAM_MAX_QUESTIONS) return
    setQuestions([...questions, emptyOpen(questions.length + 1)])
  }

  const remove = (id: string) => {
    setQuestions(questions.filter((q) => q.id !== id))
  }

  const move = (index: number, dir: -1 | 1) => {
    const j = index + dir
    if (j < 0 || j >= questions.length) return
    const copy = [...questions]
    const t = copy[index]!
    copy[index] = copy[j]!
    copy[j] = t
    setQuestions(copy)
  }

  const updateQuestion = (id: string, patch: Partial<ExamQuestion>) => {
    setQuestions(
      questions.map((q) => (q.id === id ? ({ ...q, ...patch } as ExamQuestion) : q))
    )
  }

  const updateMcqOption = (q: ExamQuestionMcq, optIndex: number, text: string) => {
    const options = [...q.options]
    options[optIndex] = text
    updateQuestion(q.id, { options })
  }

  const addMcqOption = (q: ExamQuestionMcq) => {
    if (q.options.length >= EXAM_MCQ_MAX_OPTIONS) return
    updateQuestion(q.id, { options: [...q.options, ""] })
  }

  const removeMcqOption = (q: ExamQuestionMcq, optIndex: number) => {
    if (q.options.length <= EXAM_MCQ_MIN_OPTIONS) return
    const options = q.options.filter((_, i) => i !== optIndex)
    let correctIndex = q.correctIndex
    if (optIndex === correctIndex) correctIndex = 0
    else if (optIndex < correctIndex) correctIndex--
    correctIndex = Math.min(correctIndex, options.length - 1)
    updateQuestion(q.id, { options, correctIndex })
  }

  return (
    <div className="space-y-4 border border-dashed border-gray-200 rounded-lg p-4 bg-gray-50/50">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
        <div>
          <p className="text-sm font-medium text-gray-900">Questoes da prova</p>
          <p className="text-xs text-muted-foreground">
            Multipla escolha (correcao automatica) e dissertativas (correcao manual).
            A nota maxima sera a soma dos pontos.
          </p>
        </div>
        <div className="flex gap-2 shrink-0">
          <Button type="button" variant="outline" size="sm" onClick={addMcq}>
            <Plus className="h-4 w-4 mr-1" />
            Multipla escolha
          </Button>
          <Button type="button" variant="outline" size="sm" onClick={addOpen}>
            <Plus className="h-4 w-4 mr-1" />
            Dissertativa
          </Button>
        </div>
      </div>

      {questions.length === 0 ? (
        <p className="text-sm text-gray-500 text-center py-6">
          Nenhuma questao. Adicione pelo menos uma para publicar uma prova estruturada.
        </p>
      ) : (
        <ul className="space-y-6">
          {questions.map((q, index) => (
            <li
              key={q.id}
              className="border border-gray-100 rounded-lg p-4 bg-white space-y-3"
            >
              <div className="flex items-start justify-between gap-2">
                <span className="text-xs font-semibold text-[#1D4ED8]">
                  Questao {index + 1}{" "}
                  {q.type === "mcq" ? "(multipla escolha)" : "(dissertativa)"}
                </span>
                <div className="flex items-center gap-1 shrink-0">
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8"
                    onClick={() => move(index, -1)}
                    disabled={index === 0}
                    aria-label="Mover para cima"
                  >
                    <GripVertical className="h-4 w-4 rotate-90" />
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8"
                    onClick={() => move(index, 1)}
                    disabled={index === questions.length - 1}
                    aria-label="Mover para baixo"
                  >
                    <GripVertical className="h-4 w-4 -rotate-90" />
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-red-600"
                    onClick={() => remove(q.id)}
                    aria-label="Remover questao"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>

              <div className="grid gap-2">
                <Label>Enunciado</Label>
                <textarea
                  className="w-full min-h-[72px] rounded-md border border-input bg-background px-3 py-2 text-sm"
                  value={q.prompt}
                  onChange={(e) =>
                    updateQuestion(q.id, { prompt: e.target.value })
                  }
                  placeholder="Digite o enunciado..."
                />
              </div>

              <div className="grid sm:grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <Label>Pontos</Label>
                  <Input
                    type="number"
                    min={0.5}
                    step={0.5}
                    value={q.points}
                    onChange={(e) => {
                      const v = parseFloat(e.target.value)
                      updateQuestion(q.id, {
                        points: !Number.isNaN(v) && v > 0 ? v : 1,
                      })
                    }}
                  />
                </div>
              </div>

              {q.type === "mcq" ? (
                <div className="space-y-2">
                  <Label>Opcoes (marque a correta)</Label>
                  <div className="space-y-2">
                    {q.options.map((opt, oi) => (
                      <div key={oi} className="flex gap-2 items-center">
                        <input
                          type="radio"
                          name={`correct-${q.id}`}
                          checked={q.correctIndex === oi}
                          onChange={() =>
                            updateQuestion(q.id, { correctIndex: oi })
                          }
                          className="shrink-0"
                        />
                        <Input
                          value={opt}
                          onChange={(e) =>
                            updateMcqOption(q, oi, e.target.value)
                          }
                          placeholder={`Opcao ${oi + 1}`}
                          className="flex-1"
                        />
                        {q.options.length > EXAM_MCQ_MIN_OPTIONS ? (
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            className="shrink-0 h-9 w-9"
                            onClick={() => removeMcqOption(q, oi)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        ) : (
                          <span className="w-9 shrink-0" />
                        )}
                      </div>
                    ))}
                  </div>
                  {q.options.length < EXAM_MCQ_MAX_OPTIONS ? (
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => addMcqOption(q)}
                    >
                      Adicionar opcao
                    </Button>
                  ) : null}
                </div>
              ) : null}
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
