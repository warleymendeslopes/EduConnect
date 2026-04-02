import Link from "next/link"
import { BookOpen, Users, Calendar, ArrowRight } from "lucide-react"
import { listClassroomsForStudent } from "@/app/actions/classrooms"
import { JoinByCodeForm } from "./join-by-code-form"
import { format } from "date-fns"
import { ptBR } from "date-fns/locale"
import { Badge } from "@/components/ui/badge"

export default async function AlunoSalasPage() {
  const { rows, error } = await listClassroomsForStudent()

  return (
    <div className="max-w-6xl mx-auto pb-20 lg:pb-0">
      <div className="mb-8">
        <h1 className="font-display text-2xl font-bold text-gray-900">
          Minhas Salas
        </h1>
        <p className="text-gray-600">
          Turmas em que voce esta matriculado
        </p>
      </div>

      {error && (
        <div className="mb-6 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          {error}. Se ainda nao aplicou o SQL das salas, execute{" "}
          <code className="font-mono text-xs">scripts/002_classrooms.sql</code> no
          Supabase.
        </div>
      )}

      <JoinByCodeForm />

      {rows.length === 0 && !error && (
        <div className="bg-white border border-dashed border-gray-300 rounded-xl p-12 text-center">
          <div className="w-16 h-16 bg-green-50 rounded-full flex items-center justify-center mx-auto mb-4">
            <BookOpen className="h-8 w-8 text-[#10B981]" />
          </div>
          <h3 className="font-display font-semibold text-xl text-gray-900 mb-2">
            Nenhuma sala ainda
          </h3>
          <p className="text-gray-500 mb-6 max-w-md mx-auto">
            Use o codigo ou o link que seu professor enviou para entrar em uma sala
            de aula.
          </p>
        </div>
      )}

      {rows.length > 0 && (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {rows.map((sala) => (
            <Link
              key={sala.id}
              href={`/dashboard/aluno/salas/${sala.id}`}
              className="bg-white rounded-xl border border-gray-100 hover:shadow-md transition-shadow flex flex-col h-full group"
            >
              <div className="p-5 border-b border-gray-100 flex-1">
                <div className="flex justify-between items-start mb-3">
                  <Badge
                    variant={
                      sala.status === "ativa" ? "default" : "secondary"
                    }
                    className={
                      sala.status === "ativa"
                        ? "bg-green-100 text-green-800"
                        : "bg-gray-100 text-gray-800"
                    }
                  >
                    {sala.status === "ativa" ? "Ativa" : "Encerrada"}
                  </Badge>
                </div>
                <h3 className="font-display font-semibold text-lg text-gray-900 mb-1 group-hover:text-[#10B981] transition-colors">
                  {sala.name}
                </h3>
                <p className="text-sm text-gray-500 mb-4">{sala.education_level}</p>
                <div className="flex items-center gap-4 text-sm text-gray-600">
                  <div className="flex items-center gap-1.5">
                    <BookOpen className="h-4 w-4 text-gray-400" />
                    <span>{sala.subject}</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <Users className="h-4 w-4 text-gray-400" />
                    <span>{sala.professor_name ?? "Professor"}</span>
                  </div>
                </div>
              </div>
              <div className="bg-gray-50 p-4 rounded-b-xl flex items-center justify-between">
                <div className="flex items-center gap-1.5 text-xs text-gray-500">
                  <Calendar className="h-3.5 w-3.5" />
                  <span>
                    Desde{" "}
                    {format(new Date(sala.created_at), "dd/MM/yyyy", {
                      locale: ptBR,
                    })}
                  </span>
                </div>
                <span className="text-[#10B981] flex items-center gap-1 text-sm font-medium">
                  Abrir
                  <ArrowRight className="h-4 w-4" />
                </span>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}
