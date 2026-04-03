import Link from "next/link"
import { notFound } from "next/navigation"
import { format } from "date-fns"
import { ptBR } from "date-fns/locale"
import { ArrowLeft } from "lucide-react"
import { getActivityForStudent } from "@/app/actions/classroom-activities"
import { getClassroomForStudent } from "@/app/actions/classrooms"
import { ActivityAttachmentsList } from "@/components/dashboard/activity-attachments-list"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { RichTextContent } from "@/components/rich-text-content"
import { parseActivityAttachments } from "@/lib/activities/attachments"
import { ACTIVITY_TYPE_LABELS } from "@/lib/activities/types"

function formatDue(iso: string | null): string {
  if (!iso) return "Sem prazo definido"
  try {
    return format(new Date(iso), "dd/MM/yyyy HH:mm", { locale: ptBR })
  } catch {
    return "Sem prazo definido"
  }
}

export default async function AlunoAtividadeDetalhePage({
  params,
}: {
  params: Promise<{ id: string; activityId: string }>
}) {
  const { id: classroomId, activityId } = await params

  const [{ row: activity }, { row: sala }] = await Promise.all([
    getActivityForStudent(classroomId, activityId),
    getClassroomForStudent(classroomId),
  ])

  if (!activity || !sala) notFound()

  const attachments = parseActivityAttachments(activity.settings)
  const backHref = `/dashboard/aluno/salas/${classroomId}?tab=atividades`

  return (
    <div className="max-w-3xl mx-auto pb-20 lg:pb-0">
      <Link
        href={backHref}
        className="text-gray-500 hover:text-gray-900 flex items-center gap-2 mb-6 transition-colors text-sm"
      >
        <ArrowLeft className="h-4 w-4" />
        Voltar às atividades
      </Link>

      <div className="bg-white rounded-xl border border-gray-100 p-6 sm:p-8">
        <div className="flex flex-wrap items-center gap-2 mb-3">
          <span className="text-xs font-semibold px-2 py-0.5 rounded bg-blue-50 text-[#1D4ED8] uppercase tracking-wider">
            {ACTIVITY_TYPE_LABELS[activity.type]}
          </span>
          <Badge
            variant="secondary"
            className={
              activity.status === "encerrada"
                ? "bg-gray-100 text-gray-700"
                : "bg-green-100 text-green-800"
            }
          >
            {activity.status === "encerrada" ? "Encerrada" : "Aberta"}
          </Badge>
        </div>

        <h1 className="font-display text-2xl sm:text-3xl font-bold text-gray-900">
          {activity.title}
        </h1>

        <p className="text-sm text-gray-600 mt-3">
          Sala: <span className="text-gray-900">{sala.name}</span>
        </p>
        <p className="text-sm text-gray-600 mt-1">
          Prazo: <span className="text-gray-900">{formatDue(activity.due_at)}</span>
          {activity.max_score != null && (
            <span className="ml-2">
              · Nota máx. {activity.max_score}
            </span>
          )}
        </p>

        <div className="mt-8 border-t border-gray-100 pt-6">
          <h2 className="text-sm font-semibold text-gray-900 mb-3">
            Descrição
          </h2>
          {activity.description?.trim() ? (
            <RichTextContent html={activity.description} className="text-base" />
          ) : (
            <p className="text-sm text-gray-500">
              O professor não adicionou descrição para esta atividade.
            </p>
          )}
        </div>

        <div className="mt-8">
          <h2 className="text-sm font-semibold text-gray-900 mb-2">Anexos</h2>
          {attachments.length === 0 ? (
            <p className="text-sm text-gray-500">Nenhum anexo.</p>
          ) : (
            <ActivityAttachmentsList attachments={attachments} />
          )}
        </div>

        <div className="mt-10 flex flex-wrap gap-3">
          <Button type="button" variant="outline" asChild>
            <Link href={backHref}>Voltar</Link>
          </Button>
        </div>
      </div>
    </div>
  )
}
