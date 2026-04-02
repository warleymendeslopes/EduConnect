"use client"

import { useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  ArrowLeft,
  Users,
  FileText,
  MessageSquare,
  BarChart,
  FolderOpen,
  Plus,
  Trash2,
  Download,
  AlertCircle,
} from "lucide-react"
import type { ClassroomRow } from "@/lib/classrooms/types"
import { ShareInviteButton } from "@/components/dashboard/share-invite-button"
import { removeClassroomMember } from "@/app/actions/classrooms"
import { toast } from "sonner"

type Member = {
  student_id: string
  full_name: string | null
  joined_at: string
}

const TABS = [
  { id: "alunos", label: "Alunos", icon: Users },
  { id: "atividades", label: "Atividades", icon: FileText },
  { id: "materiais", label: "Material Extra", icon: FolderOpen },
  { id: "mural", label: "Mural", icon: MessageSquare },
  { id: "desempenho", label: "Desempenho", icon: BarChart },
]

type Props = {
  classroom: ClassroomRow & { member_count: number }
  members: Member[]
}

export function ProfessorSalaDetail({ classroom, members }: Props) {
  const router = useRouter()
  const [activeTab, setActiveTab] = useState("alunos")
  const [removing, setRemoving] = useState<string | null>(null)

  const handleRemove = async (studentId: string) => {
    if (!confirm("Remover este aluno da sala?")) return
    setRemoving(studentId)
    const res = await removeClassroomMember(classroom.id, studentId)
    setRemoving(null)
    if (!res.ok) {
      toast.error(res.error)
      return
    }
    toast.success("Aluno removido")
    router.refresh()
  }

  const mockedAtividades = [
    {
      id: 1,
      tipo: "Prova Objetiva",
      titulo: "Em breve: atividades reais",
      prazo: "--",
      entregas: 0,
      total: classroom.member_count,
      status: "aberta" as const,
    },
  ]

  return (
    <div className="max-w-6xl mx-auto pb-20 lg:pb-0">
      <div className="flex flex-col md:flex-row md:items-start justify-between gap-4 border-b border-gray-100 pb-6 mb-6">
        <div>
          <Link
            href="/dashboard/professor/salas"
            className="text-gray-500 hover:text-gray-900 flex items-center gap-2 mb-4 transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
            Voltar para Salas
          </Link>
          <div className="flex items-center gap-3 mb-2 flex-wrap">
            <h1 className="font-display text-3xl font-bold text-gray-900">
              {classroom.name}
            </h1>
            <Badge
              variant="outline"
              className="border-gray-200 text-gray-600 bg-gray-50"
            >
              {classroom.education_level}
            </Badge>
          </div>
          <p className="text-gray-600 max-w-xl">
            {classroom.description?.trim() || "Sem descricao."}
          </p>
        </div>

        <div className="bg-white rounded-lg border border-gray-100 p-4 shrink-0 shadow-sm space-y-3">
          <div>
            <p className="text-sm text-gray-500 mb-1">Codigo de convite</p>
            <div className="flex items-center gap-3 flex-wrap">
              <div className="font-mono text-xl font-bold text-[#1D4ED8] bg-blue-50 px-3 py-1 rounded">
                {classroom.invite_code}
              </div>
              <ShareInviteButton inviteCode={classroom.invite_code} />
            </div>
          </div>
          <p className="text-xs text-gray-500 max-w-xs">
            Os alunos entram pelo link ou digitando o codigo em Minhas Salas.
          </p>
        </div>
      </div>

      <div className="flex overflow-x-auto border-b border-gray-100 mb-6 pb-[1px] -mx-4 px-4 sm:mx-0 sm:px-0">
        {TABS.map((tab) => {
          const isActive = activeTab === tab.id
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-4 py-3 sm:py-4 border-b-2 whitespace-nowrap transition-colors ${
                isActive
                  ? "border-[#1D4ED8] text-[#1D4ED8] font-medium"
                  : "border-transparent text-gray-500 hover:text-gray-800 hover:border-gray-200"
              }`}
            >
              <tab.icon
                className={`h-4 w-4 ${isActive ? "text-[#1D4ED8]" : "text-gray-400"}`}
              />
              {tab.label}
            </button>
          )
        })}
      </div>

      <div className="bg-white rounded-xl border border-gray-100 min-h-[500px]">
        {activeTab === "alunos" && (
          <div>
            <div className="p-4 sm:p-6 border-b border-gray-100 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
              <div>
                <h2 className="font-display font-semibold text-lg text-gray-900">
                  Alunos matriculados
                </h2>
                <p className="text-sm text-gray-500">
                  Total de {members.length} aluno(s) nesta turma
                </p>
              </div>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-gray-50 border-b border-gray-100 text-sm text-gray-500">
                    <th className="p-4 sm:px-6 font-medium">Nome</th>
                    <th className="p-4 sm:px-6 font-medium">Entrada</th>
                    <th className="p-4 sm:px-6 font-medium text-right">Acoes</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {members.length === 0 ? (
                    <tr>
                      <td
                        colSpan={3}
                        className="p-8 text-center text-gray-500 text-sm"
                      >
                        Nenhum aluno ainda. Compartilhe o codigo{" "}
                        <span className="font-mono font-semibold text-[#1D4ED8]">
                          {classroom.invite_code}
                        </span>{" "}
                        ou o link de convite.
                      </td>
                    </tr>
                  ) : (
                    members.map((aluno) => (
                      <tr
                        key={aluno.student_id}
                        className="hover:bg-gray-50/50 transition-colors"
                      >
                        <td className="p-4 sm:px-6">
                          <div className="flex items-center gap-3">
                            <div className="h-8 w-8 rounded-full bg-blue-100 text-[#1D4ED8] flex items-center justify-center font-bold text-xs shrink-0">
                              {(aluno.full_name ?? "?").charAt(0)}
                            </div>
                            <span className="font-medium text-gray-900">
                              {aluno.full_name ?? "Aluno"}
                            </span>
                          </div>
                        </td>
                        <td className="p-4 sm:px-6 text-sm text-gray-500">
                          {new Date(aluno.joined_at).toLocaleDateString("pt-BR")}
                        </td>
                        <td className="p-4 sm:px-6 text-right">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="text-gray-400 hover:text-red-500"
                            disabled={removing === aluno.student_id}
                            onClick={() => handleRemove(aluno.student_id)}
                            aria-label="Remover aluno"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {activeTab === "atividades" && (
          <div>
            <div className="p-4 sm:p-6 border-b border-gray-100 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
              <div>
                <h2 className="font-display font-semibold text-lg text-gray-900">
                  Atividades
                </h2>
                <p className="text-sm text-gray-500">
                  Em breve: criacao de atividades por sala
                </p>
              </div>
              <Button
                className="bg-[#1D4ED8] hover:bg-[#1E3A8A] gap-2"
                disabled
              >
                <Plus className="h-4 w-4" />
                Nova Atividade
              </Button>
            </div>
            <div className="p-4 sm:p-6 grid gap-4">
              {mockedAtividades.map((ativ) => (
                <div
                  key={ativ.id}
                  className="border border-gray-100 rounded-xl p-4 flex flex-col md:flex-row md:items-center justify-between gap-4"
                >
                  <div>
                    <span className="text-xs font-semibold px-2 py-0.5 rounded bg-blue-50 text-[#1D4ED8] uppercase tracking-wider">
                      {ativ.tipo}
                    </span>
                    <h3 className="font-medium text-gray-900 text-lg mt-2">
                      {ativ.titulo}
                    </h3>
                    <p className="text-sm text-gray-500 mt-1">
                      Prazo: {ativ.prazo}
                    </p>
                  </div>
                  <div className="text-center md:text-right">
                    <p className="font-mono text-xl font-bold text-gray-900">
                      {ativ.entregas}/{ativ.total}
                    </p>
                    <p className="text-xs text-gray-500">entregas</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {activeTab === "materiais" && (
          <div className="p-8 text-center text-gray-500 text-sm">
            <FolderOpen className="h-10 w-10 mx-auto mb-2 text-gray-300" />
            Material extra em uma proxima versao.
          </div>
        )}

        {activeTab === "mural" && (
          <div className="p-8 text-center text-gray-500 text-sm">
            <MessageSquare className="h-10 w-10 mx-auto mb-2 text-gray-300" />
            Mural em uma proxima versao.
          </div>
        )}

        {activeTab === "desempenho" && (
          <div className="p-4 sm:p-6 h-[400px] flex flex-col items-center justify-center text-center">
            <div className="w-16 h-16 bg-blue-50 rounded-full flex items-center justify-center mb-4">
              <BarChart className="h-8 w-8 text-[#1D4ED8]" />
            </div>
            <h3 className="font-display font-semibold text-xl text-gray-900 mb-2">
              Relatorio de turma (em breve)
            </h3>
            <p className="text-gray-500 max-w-sm mb-6">
              Graficos de aproveitamento apos as primeiras avaliacoes.
            </p>
            <Button variant="outline" className="gap-2" disabled>
              <AlertCircle className="h-4 w-4" />
              Notifique-me quando disponivel
            </Button>
          </div>
        )}
      </div>
    </div>
  )
}
