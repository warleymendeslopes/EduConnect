import Link from "next/link"
import { notFound } from "next/navigation"
import { ArrowLeft, BookOpen, User } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { getClassroomForStudent } from "@/app/actions/classrooms"
import { LeaveClassroomButton } from "./leave-classroom-button"

export default async function AlunoSalaDetalhePage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const result = await getClassroomForStudent(id)
  if (!result.row) notFound()

  const { row: sala } = result

  return (
    <div className="max-w-6xl mx-auto pb-20 lg:pb-0">
      <Link
        href="/dashboard/aluno/salas"
        className="text-gray-500 hover:text-gray-900 flex items-center gap-2 mb-6 transition-colors text-sm"
      >
        <ArrowLeft className="h-4 w-4" />
        Voltar para Minhas Salas
      </Link>

      <div className="bg-white rounded-xl border border-gray-100 p-6 sm:p-8">
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4 mb-6">
          <div>
            <div className="flex items-center gap-3 flex-wrap mb-2">
              <h1 className="font-display text-2xl sm:text-3xl font-bold text-gray-900">
                {sala.name}
              </h1>
              <Badge
                variant="outline"
                className="border-gray-200 text-gray-600 bg-gray-50"
              >
                {sala.education_level}
              </Badge>
              <Badge
                variant={sala.status === "ativa" ? "default" : "secondary"}
                className={
                  sala.status === "ativa"
                    ? "bg-green-100 text-green-800"
                    : "bg-gray-100 text-gray-800"
                }
              >
                {sala.status === "ativa" ? "Ativa" : "Encerrada"}
              </Badge>
            </div>
            <div className="flex flex-wrap gap-4 text-sm text-gray-600">
              <span className="flex items-center gap-1.5">
                <BookOpen className="h-4 w-4 text-gray-400" />
                {sala.subject}
              </span>
              <span className="flex items-center gap-1.5">
                <User className="h-4 w-4 text-gray-400" />
                Prof. {sala.professor_name ?? "—"}
              </span>
            </div>
          </div>
          <LeaveClassroomButton classroomId={sala.id} />
        </div>

        {sala.description?.trim() ? (
          <p className="text-gray-700 border-t border-gray-100 pt-6">
            {sala.description}
          </p>
        ) : (
          <p className="text-gray-500 border-t border-gray-100 pt-6 text-sm">
            Nenhuma descricao adicionada pelo professor.
          </p>
        )}

        <div className="mt-8 rounded-lg bg-gray-50 border border-gray-100 p-4 text-sm text-gray-600">
          <p className="font-medium text-gray-900 mb-1">Em breve</p>
          Atividades, material extra e mural desta sala serao adicionados nas proximas
          versoes.
        </div>
      </div>
    </div>
  )
}
