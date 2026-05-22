"use client"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import {
  AlertTriangle,
  Bot,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  ExternalLink,
  Loader2,
  Star,
  XCircle,
} from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { professorDecideAfterReview, type ReviewedContentItem } from "@/app/actions/content-review"
import type { ContentReviewFinding } from "@/lib/content/types"

const TYPE_LABEL: Record<string, string> = {
  article: "Artigo",
  exercise: "Exercício",
  assessment: "Avaliação",
  simulado: "Simulado",
  dica: "Dica",
}

const CATEGORY_LABEL: Record<string, string> = {
  fact_check: "Verificação de Fatos",
  plagiarism: "Originalidade / Plágio",
  illegal_content: "Conteúdo Adequado",
  quality: "Qualidade Educacional",
}

function ScoreBar({ score }: { score: number }) {
  const color =
    score > 80 ? "bg-green-500" : score >= 50 ? "bg-amber-400" : "bg-red-500"
  const textColor =
    score > 80 ? "text-green-600" : score >= 50 ? "text-amber-500" : "text-red-600"
  return (
    <div className="flex items-center gap-3">
      <div className="flex-1 h-2 bg-gray-100 rounded-full overflow-hidden">
        <div className={`h-full rounded-full ${color}`} style={{ width: `${score}%` }} />
      </div>
      <span className={`text-sm font-bold w-12 text-right tabular-nums ${textColor}`}>
        {score}/100
      </span>
    </div>
  )
}

function FindingRow({ f }: { f: ContentReviewFinding }) {
  return (
    <div className="flex items-start gap-2 text-sm">
      {f.severity === "ok" ? (
        <CheckCircle2 className="h-4 w-4 text-green-500 mt-0.5 shrink-0" />
      ) : f.severity === "warning" ? (
        <AlertTriangle className="h-4 w-4 text-amber-500 mt-0.5 shrink-0" />
      ) : (
        <XCircle className="h-4 w-4 text-red-500 mt-0.5 shrink-0" />
      )}
      <span>
        <span className="font-medium text-gray-700">
          {CATEGORY_LABEL[f.category] ?? f.category}:{" "}
        </span>
        <span className="text-gray-600">{f.description}</span>
      </span>
    </div>
  )
}

function ReviewCard({ item }: { item: ReviewedContentItem }) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [isPending, startTransition] = useTransition()

  const statusBadge =
    item.status === "published"
      ? { label: "Publicado", cls: "bg-green-100 text-green-700" }
      : item.status === "aguardando_decisao"
        ? { label: "Aguarda decisão", cls: "bg-amber-100 text-amber-700" }
        : item.status === "revisao"
          ? { label: "Revisão necessária", cls: "bg-red-100 text-red-700" }
          : item.status === "verificando"
            ? { label: "Em análise", cls: "bg-blue-100 text-blue-700" }
            : { label: "Rascunho", cls: "bg-gray-100 text-gray-600" }

  function handleDecide(decision: "publish" | "revise") {
    startTransition(async () => {
      const res = await professorDecideAfterReview(item.id, decision)
      if (!res.ok) { toast.error(res.error); return }
      toast.success(decision === "publish" ? "Artigo publicado!" : "Devolvido para rascunho")
      router.refresh()
    })
  }

  return (
    <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
      {/* Header */}
      <div className="p-4 flex items-start gap-3">
        <div
          className={`mt-0.5 h-9 w-9 rounded-lg flex items-center justify-center shrink-0 ${
            item.score > 80
              ? "bg-green-50"
              : item.score >= 50
                ? "bg-amber-50"
                : "bg-red-50"
          }`}
        >
          {item.score > 80 ? (
            <Star className="h-5 w-5 text-green-600 fill-green-500" />
          ) : item.score >= 50 ? (
            <AlertTriangle className="h-5 w-5 text-amber-500" />
          ) : (
            <XCircle className="h-5 w-5 text-red-500" />
          )}
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap mb-1">
            <span className="font-semibold text-gray-900 truncate">{item.title}</span>
            <Badge variant="secondary" className="text-xs shrink-0">
              {TYPE_LABEL[item.type] ?? item.type}
            </Badge>
            <span className={`text-xs font-medium px-2 py-0.5 rounded-full shrink-0 ${statusBadge.cls}`}>
              {statusBadge.label}
            </span>
            {item.seal === "excellence" && (
              <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-green-100 text-green-700 flex items-center gap-1 shrink-0">
                <Star className="h-3 w-3 fill-green-500" /> Excelência
              </span>
            )}
          </div>

          <ScoreBar score={item.score} />

          <p className="text-xs text-gray-400 mt-1">
            Revisado em {new Date(item.reviewedAt).toLocaleString("pt-BR")}
          </p>
        </div>

        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          className="shrink-0 text-gray-400 hover:text-gray-600 mt-0.5"
          aria-label={open ? "Fechar detalhes" : "Ver detalhes"}
        >
          {open ? <ChevronUp className="h-5 w-5" /> : <ChevronDown className="h-5 w-5" />}
        </button>
      </div>

      {/* Expanded details */}
      {open && (
        <div className="border-t border-gray-100 px-4 py-4 space-y-4">
          {item.warningReason && (
            <div className="bg-gray-50 rounded-lg p-3 border border-gray-200">
              <p className="text-xs font-semibold text-gray-700 mb-1">Resumo dos problemas:</p>
              <p className="text-sm text-gray-600">{item.warningReason}</p>
            </div>
          )}

          {item.findings.length > 0 && (
            <div className="space-y-2">
              <p className="text-xs font-semibold text-gray-700">Detalhes por critério:</p>
              {item.findings.map((f, i) => (
                <FindingRow key={i} f={f} />
              ))}
            </div>
          )}

          <div className="flex items-center gap-2 pt-1">
            <Button
              variant="outline"
              size="sm"
              className="gap-1.5"
              asChild
            >
              <a href={`/dashboard/professor/criar?edit=${item.id}`}>
                <ExternalLink className="h-3.5 w-3.5" />
                Abrir artigo
              </a>
            </Button>

            {item.status === "aguardando_decisao" && (
              <>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => handleDecide("revise")}
                  disabled={isPending}
                >
                  {isPending && <Loader2 className="h-3.5 w-3.5 animate-spin mr-1" />}
                  Revisar
                </Button>
                <Button
                  size="sm"
                  className="bg-[#10B981] hover:bg-[#059669]"
                  onClick={() => handleDecide("publish")}
                  disabled={isPending}
                >
                  {isPending && <Loader2 className="h-3.5 w-3.5 animate-spin mr-1" />}
                  Publicar assim mesmo
                </Button>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

export function ProfessorAnaliseClient({
  items,
}: {
  items: ReviewedContentItem[]
}) {
  const total = items.length
  const excellent = items.filter((i) => i.score > 80).length
  const warning = items.filter((i) => i.score >= 50 && i.score <= 80).length
  const rejected = items.filter((i) => i.score < 50).length
  const avgScore =
    total > 0 ? Math.round(items.reduce((s, i) => s + i.score, 0) / total) : 0

  if (total === 0) {
    return (
      <div className="rounded-xl border border-dashed border-gray-200 bg-white p-14 text-center">
        <Bot className="h-12 w-12 text-gray-300 mx-auto mb-4" />
        <p className="font-semibold text-gray-900 mb-1">Nenhum conteúdo revisado ainda</p>
        <p className="text-sm text-gray-500">
          Assim que você publicar um artigo, o agente de IA vai analisar e o resultado aparece aqui.
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Resumo */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: "Total revisados", value: total, cls: "text-gray-900" },
          { label: "Score médio", value: `${avgScore}/100`, cls: avgScore > 80 ? "text-green-600" : avgScore >= 50 ? "text-amber-500" : "text-red-600" },
          { label: "Excelência (>80)", value: excellent, cls: "text-green-600" },
          { label: "Precisam revisão", value: rejected, cls: rejected > 0 ? "text-red-600" : "text-gray-400" },
        ].map((s) => (
          <div key={s.label} className="bg-white rounded-xl border border-gray-100 p-4 text-center">
            <div className={`text-2xl font-bold font-display ${s.cls}`}>{s.value}</div>
            <div className="text-xs text-gray-500 mt-0.5">{s.label}</div>
          </div>
        ))}
      </div>

      {/* Filtros rápidos (visual only por enquanto) */}
      {warning > 0 && (
        <div className="flex items-center gap-2 text-sm text-amber-700 bg-amber-50 border border-amber-100 rounded-lg px-4 py-2.5">
          <AlertTriangle className="h-4 w-4 shrink-0" />
          <span>
            <strong>{warning}</strong> conteúdo{warning > 1 ? "s" : ""} aguardando sua decisão de publicação.
          </span>
        </div>
      )}

      {/* Lista */}
      <div className="space-y-3">
        {items.map((item) => (
          <ReviewCard key={item.id} item={item} />
        ))}
      </div>
    </div>
  )
}
