"use client"

import { useEffect, useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import {
  AlertTriangle,
  CheckCircle2,
  Loader2,
  Star,
  XCircle,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  getMyContentReview,
  professorDecideAfterReview,
} from "@/app/actions/content-review"
import type { ContentReviewResult } from "@/lib/content/types"

type Props = {
  contentItemId: string | null
  status: "revisao" | "aguardando_decisao" | null
  open: boolean
  onOpenChange: (open: boolean) => void
}

const CATEGORY_LABEL: Record<string, string> = {
  fact_check: "Verificação de Fatos",
  plagiarism: "Originalidade / Plágio",
  illegal_content: "Conteúdo Adequado",
  quality: "Qualidade Educacional",
}

export function ContentReviewDialog({
  contentItemId,
  status,
  open,
  onOpenChange,
}: Props) {
  const router = useRouter()
  const [review, setReview] = useState<ContentReviewResult | null>(null)
  const [loading, setLoading] = useState(false)
  const [isPending, startTransition] = useTransition()

  useEffect(() => {
    if (!open || !contentItemId) {
      setReview(null)
      return
    }
    setLoading(true)
    void getMyContentReview(contentItemId).then((r) => {
      setReview(r)
      setLoading(false)
    })
  }, [open, contentItemId])

  function handleDecide(decision: "publish" | "revise") {
    if (!contentItemId) return
    startTransition(async () => {
      const res = await professorDecideAfterReview(contentItemId, decision)
      if (!res.ok) {
        toast.error(res.error)
        return
      }
      toast.success(
        decision === "publish" ? "Artigo publicado!" : "Artigo devolvido para rascunho"
      )
      onOpenChange(false)
      router.refresh()
    })
  }

  const score = review?.score ?? 0
  const scoreCls =
    score > 80 ? "text-green-600" : score >= 50 ? "text-amber-500" : "text-red-600"
  const bannerCls =
    score > 80
      ? "bg-green-50 border-green-200"
      : score >= 50
        ? "bg-amber-50 border-amber-200"
        : "bg-red-50 border-red-200"

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="font-display">Resultado da Revisão</DialogTitle>
          <DialogDescription>
            Análise do agente IA sobre seu artigo
          </DialogDescription>
        </DialogHeader>

        {loading ? (
          <div className="flex items-center justify-center py-10">
            <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
          </div>
        ) : !review ? (
          <p className="text-sm text-gray-500 py-6 text-center">
            Resultado ainda não disponível.
          </p>
        ) : (
          <div className="space-y-5">
            {/* Score */}
            <div className={`p-4 rounded-lg border ${bannerCls}`}>
              <div className="flex items-center gap-3">
                {score > 80 ? (
                  <Star className="h-6 w-6 text-green-600 fill-green-500 shrink-0" />
                ) : score >= 50 ? (
                  <AlertTriangle className="h-6 w-6 text-amber-500 shrink-0" />
                ) : (
                  <XCircle className="h-6 w-6 text-red-600 shrink-0" />
                )}
                <div>
                  <div className={`text-2xl font-bold leading-none ${scoreCls}`}>
                    {review.score}
                    <span className="text-base font-normal text-gray-500">/100</span>
                  </div>
                  <p className="text-sm text-gray-600 mt-1">
                    {score > 80
                      ? "Excelente — publicado com Selo de Excelência"
                      : score >= 50
                        ? "Abaixo do ideal — você decide se publica"
                        : "Abaixo do mínimo (50) — revisão necessária"}
                  </p>
                </div>
              </div>
            </div>

            {/* Warning reason */}
            {review.warningReason && (
              <div className="text-sm bg-gray-50 rounded-lg p-3 border border-gray-200">
                <p className="font-medium text-gray-900 mb-1">Resumo dos problemas:</p>
                <p className="text-gray-700">{review.warningReason}</p>
              </div>
            )}

            {/* Findings */}
            {review.findings.length > 0 && (
              <div className="space-y-2">
                <p className="text-sm font-medium text-gray-900">Detalhes por critério:</p>
                {review.findings.map((f, i) => (
                  <div key={i} className="flex items-start gap-2 text-sm">
                    {f.severity === "ok" ? (
                      <CheckCircle2 className="h-4 w-4 text-green-500 mt-0.5 shrink-0" />
                    ) : f.severity === "warning" ? (
                      <AlertTriangle className="h-4 w-4 text-amber-500 mt-0.5 shrink-0" />
                    ) : (
                      <XCircle className="h-4 w-4 text-red-500 mt-0.5 shrink-0" />
                    )}
                    <div>
                      <span className="font-medium text-gray-700">
                        {CATEGORY_LABEL[f.category] ?? f.category}:{" "}
                      </span>
                      <span className="text-gray-600">{f.description}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Decision buttons — só para aguardando_decisao */}
            {status === "aguardando_decisao" && (
              <div className="flex gap-3 pt-2 border-t border-gray-100">
                <Button
                  variant="outline"
                  className="flex-1"
                  onClick={() => handleDecide("revise")}
                  disabled={isPending}
                >
                  {isPending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                  Revisar artigo
                </Button>
                <Button
                  className="flex-1 bg-[#10B981] hover:bg-[#059669]"
                  onClick={() => handleDecide("publish")}
                  disabled={isPending}
                >
                  {isPending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                  Publicar assim mesmo
                </Button>
              </div>
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
