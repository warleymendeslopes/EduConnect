"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Progress } from "@/components/ui/progress"
import { Badge } from "@/components/ui/badge"
import { 
  Calendar,
  Clock,
  CheckCircle2,
  Play,
  ChevronLeft,
  ChevronRight,
  Flame,
  Target,
  Settings2,
  BookOpen,
  FileText,
  Video
} from "lucide-react"

const diasSemana = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sab"]

const planoDiario = {
  "Seg": [
    { id: 1, materia: "Matematica", tema: "Funcoes Quadraticas", tipo: "video", duracao: "30 min", status: "concluido" },
    { id: 2, materia: "Historia", tema: "Revolucao Francesa", tipo: "artigo", duracao: "20 min", status: "concluido" },
    { id: 3, materia: "Fisica", tema: "Leis de Newton", tipo: "exercicio", duracao: "45 min", status: "em_andamento" },
  ],
  "Ter": [
    { id: 4, materia: "Portugues", tema: "Interpretacao de Texto", tipo: "exercicio", duracao: "30 min", status: "pendente" },
    { id: 5, materia: "Quimica", tema: "Tabela Periodica", tipo: "video", duracao: "25 min", status: "pendente" },
    { id: 6, materia: "Matematica", tema: "Funcoes Exponenciais", tipo: "artigo", duracao: "20 min", status: "pendente" },
  ],
  "Qua": [
    { id: 7, materia: "Biologia", tema: "Celula Eucarionte", tipo: "video", duracao: "35 min", status: "pendente" },
    { id: 8, materia: "Geografia", tema: "Climatologia", tipo: "artigo", duracao: "25 min", status: "pendente" },
  ],
  "Qui": [
    { id: 9, materia: "Fisica", tema: "Cinematica", tipo: "exercicio", duracao: "40 min", status: "pendente" },
    { id: 10, materia: "Historia", tema: "Era Vargas", tipo: "video", duracao: "30 min", status: "pendente" },
  ],
  "Sex": [
    { id: 11, materia: "Matematica", tema: "Revisao Geral", tipo: "exercicio", duracao: "60 min", status: "pendente" },
  ],
  "Sab": [],
  "Dom": [],
}

const progressoDisciplinas = [
  { nome: "Matematica", progresso: 65, cor: "#1D4ED8" },
  { nome: "Fisica", progresso: 45, cor: "#10B981" },
  { nome: "Historia", progresso: 80, cor: "#F59E0B" },
  { nome: "Quimica", progresso: 30, cor: "#EF4444" },
  { nome: "Portugues", progresso: 55, cor: "#8B5CF6" },
]

export default function PlanoEstudosPage() {
  const [diaSelecionado, setDiaSelecionado] = useState("Seg")
  const tarefasDoDia = planoDiario[diaSelecionado as keyof typeof planoDiario] || []

  const getIconByTipo = (tipo: string) => {
    switch (tipo) {
      case "video": return Video
      case "artigo": return BookOpen
      case "exercicio": return FileText
      default: return BookOpen
    }
  }

  return (
    <div className="max-w-6xl mx-auto pb-20 lg:pb-0">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <div>
          <h1 className="font-display text-2xl font-bold text-gray-900">Plano de Estudos</h1>
          <p className="text-gray-600">Seu plano personalizado para esta semana</p>
        </div>
        <Button variant="outline" className="gap-2">
          <Settings2 className="h-4 w-4" />
          Ajustar Plano
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <div className="bg-white rounded-xl p-4 border border-gray-100">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg bg-orange-100 flex items-center justify-center">
              <Flame className="h-5 w-5 text-orange-500" />
            </div>
            <div>
              <div className="text-2xl font-bold font-display text-gray-900">7</div>
              <div className="text-xs text-gray-500">Dias de sequencia</div>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl p-4 border border-gray-100">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg bg-green-100 flex items-center justify-center">
              <CheckCircle2 className="h-5 w-5 text-[#10B981]" />
            </div>
            <div>
              <div className="text-2xl font-bold font-display text-gray-900">12</div>
              <div className="text-xs text-gray-500">Tarefas concluidas</div>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl p-4 border border-gray-100">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg bg-blue-100 flex items-center justify-center">
              <Clock className="h-5 w-5 text-[#1D4ED8]" />
            </div>
            <div>
              <div className="text-2xl font-bold font-display text-gray-900">8h</div>
              <div className="text-xs text-gray-500">Estudado esta semana</div>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl p-4 border border-gray-100">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg bg-purple-100 flex items-center justify-center">
              <Target className="h-5 w-5 text-purple-500" />
            </div>
            <div>
              <div className="text-2xl font-bold font-display text-gray-900">68%</div>
              <div className="text-xs text-gray-500">Meta semanal</div>
            </div>
          </div>
        </div>
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Calendar View */}
        <div className="lg:col-span-2 space-y-6">
          {/* Week Navigation */}
          <div className="bg-white rounded-xl p-4 border border-gray-100">
            <div className="flex items-center justify-between mb-4">
              <Button variant="ghost" size="icon">
                <ChevronLeft className="h-5 w-5" />
              </Button>
              <div className="flex items-center gap-2">
                <Calendar className="h-5 w-5 text-gray-400" />
                <span className="font-medium text-gray-900">Semana de 25 - 31 Mar</span>
              </div>
              <Button variant="ghost" size="icon">
                <ChevronRight className="h-5 w-5" />
              </Button>
            </div>

            {/* Days of Week */}
            <div className="grid grid-cols-7 gap-2">
              {diasSemana.map((dia) => {
                const isSelected = dia === diaSelecionado
                const tarefas = planoDiario[dia as keyof typeof planoDiario] || []
                const concluidas = tarefas.filter(t => t.status === "concluido").length
                const total = tarefas.length

                return (
                  <button
                    key={dia}
                    onClick={() => setDiaSelecionado(dia)}
                    className={`p-3 rounded-xl text-center transition-all ${
                      isSelected 
                        ? "bg-[#10B981] text-white" 
                        : "bg-gray-50 text-gray-600 hover:bg-gray-100"
                    }`}
                  >
                    <div className="text-xs font-medium mb-1">{dia}</div>
                    <div className={`text-lg font-bold ${isSelected ? "text-white" : "text-gray-900"}`}>
                      {25 + diasSemana.indexOf(dia)}
                    </div>
                    {total > 0 && (
                      <div className={`text-xs mt-1 ${isSelected ? "text-green-100" : "text-gray-500"}`}>
                        {concluidas}/{total}
                      </div>
                    )}
                  </button>
                )
              })}
            </div>
          </div>

          {/* Day Tasks */}
          <div className="bg-white rounded-xl p-4 border border-gray-100">
            <h3 className="font-display font-semibold text-gray-900 mb-4">
              Tarefas de {diaSelecionado === "Seg" ? "Segunda" : diaSelecionado === "Ter" ? "Terca" : diaSelecionado === "Qua" ? "Quarta" : diaSelecionado === "Qui" ? "Quinta" : diaSelecionado === "Sex" ? "Sexta" : diaSelecionado === "Sab" ? "Sabado" : "Domingo"}
            </h3>

            {tarefasDoDia.length === 0 ? (
              <div className="text-center py-12 text-gray-500">
                <Calendar className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                <p>Nenhuma tarefa programada para este dia.</p>
                <p className="text-sm">Aproveite para descansar!</p>
              </div>
            ) : (
              <div className="space-y-3">
                {tarefasDoDia.map((tarefa) => {
                  const Icon = getIconByTipo(tarefa.tipo)
                  return (
                    <div 
                      key={tarefa.id}
                      className={`flex items-center gap-4 p-4 rounded-xl border transition-all ${
                        tarefa.status === "concluido" 
                          ? "bg-green-50 border-green-200" 
                          : tarefa.status === "em_andamento"
                          ? "bg-blue-50 border-blue-200"
                          : "bg-gray-50 border-gray-200"
                      }`}
                    >
                      <div className={`h-12 w-12 rounded-xl flex items-center justify-center ${
                        tarefa.status === "concluido" 
                          ? "bg-[#10B981]" 
                          : tarefa.status === "em_andamento"
                          ? "bg-[#1D4ED8]"
                          : "bg-gray-200"
                      }`}>
                        {tarefa.status === "concluido" ? (
                          <CheckCircle2 className="h-6 w-6 text-white" />
                        ) : tarefa.status === "em_andamento" ? (
                          <Play className="h-6 w-6 text-white" />
                        ) : (
                          <Icon className="h-6 w-6 text-gray-500" />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="font-medium text-gray-900">{tarefa.tema}</span>
                          <Badge variant="secondary" className="text-xs">{tarefa.materia}</Badge>
                        </div>
                        <div className="flex items-center gap-3 text-sm text-gray-500">
                          <span className="capitalize">{tarefa.tipo}</span>
                          <span className="flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            {tarefa.duracao}
                          </span>
                        </div>
                      </div>
                      <Button
                        variant={tarefa.status === "concluido" ? "ghost" : "default"}
                        size="sm"
                        className={tarefa.status === "concluido" ? "" : "bg-[#10B981] hover:bg-[#059669]"}
                        disabled={tarefa.status === "concluido"}
                      >
                        {tarefa.status === "concluido" ? "Concluido" : tarefa.status === "em_andamento" ? "Continuar" : "Iniciar"}
                      </Button>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Progress by Subject */}
          <div className="bg-white rounded-xl p-4 border border-gray-100">
            <h3 className="font-display font-semibold text-gray-900 mb-4">Progresso por Disciplina</h3>
            <div className="space-y-4">
              {progressoDisciplinas.map((disc) => (
                <div key={disc.nome}>
                  <div className="flex items-center justify-between text-sm mb-2">
                    <span className="text-gray-600">{disc.nome}</span>
                    <span className="font-medium" style={{ color: disc.cor }}>{disc.progresso}%</span>
                  </div>
                  <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                    <div 
                      className="h-full rounded-full transition-all"
                      style={{ width: `${disc.progresso}%`, backgroundColor: disc.cor }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Weekly Goals */}
          <div className="bg-white rounded-xl p-4 border border-gray-100">
            <h3 className="font-display font-semibold text-gray-900 mb-4">Metas da Semana</h3>
            <div className="space-y-3">
              <div className="flex items-start gap-3">
                <div className="h-5 w-5 rounded border-2 border-[#10B981] bg-[#10B981] flex items-center justify-center mt-0.5">
                  <CheckCircle2 className="h-3 w-3 text-white" />
                </div>
                <div>
                  <span className="text-sm text-gray-600 line-through">Completar 3 exercicios de Matematica</span>
                  <div className="text-xs text-[#10B981] mt-1">Concluido!</div>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <div className="h-5 w-5 rounded border-2 border-gray-300 mt-0.5" />
                <div>
                  <span className="text-sm text-gray-600">Assistir 2 videos de Historia</span>
                  <div className="text-xs text-gray-400 mt-1">1/2 concluido</div>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <div className="h-5 w-5 rounded border-2 border-gray-300 mt-0.5" />
                <div>
                  <span className="text-sm text-gray-600">Ler 1 artigo de Fisica</span>
                  <div className="text-xs text-gray-400 mt-1">0/1 concluido</div>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <div className="h-5 w-5 rounded border-2 border-gray-300 mt-0.5" />
                <div>
                  <span className="text-sm text-gray-600">Manter sequencia de 7 dias</span>
                  <div className="text-xs text-orange-500 mt-1 flex items-center gap-1">
                    <Flame className="h-3 w-3" />
                    7 dias ativos!
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* AI Suggestion */}
          <div className="bg-gradient-to-br from-[#1D4ED8] to-[#1E3A8A] rounded-xl p-4 text-white">
            <h3 className="font-semibold mb-2">Sugestao da IA</h3>
            <p className="text-sm text-blue-100 mb-4">
              Percebi que voce tem mais dificuldade em Fisica. Que tal dedicar mais 15 minutos por dia a essa materia?
            </p>
            <Button size="sm" variant="secondary" className="w-full">
              Ajustar meu plano
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}
