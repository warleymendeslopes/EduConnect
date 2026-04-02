"use client"

import { useState } from "react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { 
  Heart, 
  MessageCircle, 
  Bookmark, 
  Share2, 
  Play, 
  Clock, 
  FileText,
  CheckCircle2,
  Sparkles,
  Flame,
  ChevronRight,
  BookOpen
} from "lucide-react"

// Mock stories data
const stories = [
  { id: 1, name: "Prof. Maria", avatar: "MS", color: "from-pink-500 to-purple-500", hasNew: true },
  { id: 2, name: "Prof. Carlos", avatar: "CO", color: "from-blue-500 to-cyan-500", hasNew: true },
  { id: 3, name: "Prof. Ana", avatar: "AP", color: "from-green-500 to-teal-500", hasNew: false },
  { id: 4, name: "Prof. Roberto", avatar: "RL", color: "from-orange-500 to-red-500", hasNew: true },
  { id: 5, name: "Prof. Julia", avatar: "JC", color: "from-indigo-500 to-purple-500", hasNew: false },
]

// Mock feed data
const feedItems = [
  {
    id: 1,
    type: "artigo",
    professor: { name: "Prof. Maria Santos", avatar: "MS", verified: true },
    title: "Equacoes do Segundo Grau: Guia Completo",
    disciplina: "Matematica",
    thumbnail: null,
    tempoLeitura: "8 min",
    recommendation: "Recomendado porque voce tem dificuldade em Funcoes Quadraticas",
    likes: 234,
    comments: 45,
    saved: false,
  },
  {
    id: 2,
    type: "video",
    professor: { name: "Prof. Carlos Oliveira", avatar: "CO", verified: true },
    title: "A Revolucao Francesa em 15 minutos",
    disciplina: "Historia",
    thumbnail: null,
    duracao: "15:42",
    recommendation: "Baseado no seu plano de estudos desta semana",
    likes: 567,
    comments: 89,
    saved: true,
  },
  {
    id: 3,
    type: "exercicio",
    professor: { name: "Prof. Ana Paula", avatar: "AP", verified: true },
    title: "Lista de Exercicios: Cinematica",
    disciplina: "Fisica",
    questoes: 15,
    recommendation: "Para reforcar o conteudo que voce estudou ontem",
    likes: 123,
    comments: 12,
    saved: false,
  },
]

// Mock study plan data
const todayTasks = [
  { id: 1, materia: "Matematica", tema: "Funcoes Quadraticas", tipo: "Exercicios", duracao: "30 min", status: "concluido" },
  { id: 2, materia: "Historia", tema: "Revolucao Francesa", tipo: "Video", duracao: "20 min", status: "em_andamento" },
  { id: 3, materia: "Fisica", tema: "Cinematica", tipo: "Artigo", duracao: "15 min", status: "pendente" },
]

export default function AlunoFeedPage() {
  const [savedItems, setSavedItems] = useState<number[]>([2])

  const toggleSave = (id: number) => {
    setSavedItems(prev => 
      prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
    )
  }

  return (
    <div className="max-w-4xl mx-auto pb-20 lg:pb-0">
      {/* Welcome Header */}
      <div className="mb-6">
        <h1 className="font-display text-2xl font-bold text-gray-900">Ola, Joao!</h1>
        <p className="text-gray-600">Pronto para mais um dia de aprendizado?</p>
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Main Feed */}
        <div className="lg:col-span-2 space-y-6">
          {/* Stories */}
          <div className="bg-white rounded-xl p-4 border border-gray-100">
            <div className="flex gap-4 overflow-x-auto pb-2 scrollbar-hide">
              {stories.map((story) => (
                <button key={story.id} className="flex flex-col items-center gap-2 flex-shrink-0">
                  <div className={`p-0.5 rounded-full bg-gradient-to-br ${story.color} ${story.hasNew ? "" : "opacity-50"}`}>
                    <div className="p-0.5 rounded-full bg-white">
                      <Avatar className="h-14 w-14">
                        <AvatarFallback className="bg-gray-100 text-gray-600 text-sm">{story.avatar}</AvatarFallback>
                      </Avatar>
                    </div>
                  </div>
                  <span className="text-xs text-gray-600 max-w-[60px] truncate">{story.name}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Filters */}
          <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
            <Button size="sm" className="bg-[#10B981] hover:bg-[#059669]">Todos</Button>
            <Button size="sm" variant="outline">Artigos</Button>
            <Button size="sm" variant="outline">Videos</Button>
            <Button size="sm" variant="outline">Exercicios</Button>
            <Button size="sm" variant="outline">Matematica</Button>
            <Button size="sm" variant="outline">Fisica</Button>
          </div>

          {/* Feed Items */}
          <div className="space-y-4">
            {feedItems.map((item) => (
              <div key={item.id} className="bg-white rounded-xl border border-gray-100 overflow-hidden">
                {/* Header */}
                <div className="p-4 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Avatar className="h-10 w-10">
                      <AvatarFallback className="bg-[#1D4ED8] text-white text-sm">{item.professor.avatar}</AvatarFallback>
                    </Avatar>
                    <div>
                      <div className="flex items-center gap-1">
                        <span className="font-medium text-gray-900">{item.professor.name}</span>
                        {item.professor.verified && (
                          <CheckCircle2 className="h-4 w-4 text-[#10B981]" />
                        )}
                      </div>
                      <Badge variant="secondary" className="text-xs">{item.disciplina}</Badge>
                    </div>
                  </div>
                </div>

                {/* Content */}
                <div className="px-4 pb-3">
                  <h3 className="font-display font-semibold text-lg text-gray-900 mb-2">
                    {item.title}
                  </h3>
                  
                  {/* Recommendation Badge */}
                  <div className="flex items-center gap-2 text-sm text-[#10B981] mb-3">
                    <Sparkles className="h-4 w-4" />
                    <span>{item.recommendation}</span>
                  </div>

                  {/* Thumbnail / Preview */}
                  <div className="bg-gray-100 rounded-lg aspect-video flex items-center justify-center mb-3">
                    {item.type === "video" ? (
                      <div className="flex flex-col items-center gap-2 text-gray-400">
                        <div className="h-16 w-16 rounded-full bg-white/80 flex items-center justify-center">
                          <Play className="h-8 w-8 text-[#1D4ED8] ml-1" />
                        </div>
                        <span className="text-sm">{item.duracao}</span>
                      </div>
                    ) : item.type === "exercicio" ? (
                      <div className="flex flex-col items-center gap-2 text-gray-400">
                        <FileText className="h-12 w-12" />
                        <span className="text-sm">{item.questoes} questoes</span>
                      </div>
                    ) : (
                      <div className="flex flex-col items-center gap-2 text-gray-400">
                        <BookOpen className="h-12 w-12" />
                        <span className="text-sm flex items-center gap-1">
                          <Clock className="h-4 w-4" />
                          {item.tempoLeitura}
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Actions */}
                  <div className="flex items-center justify-between pt-3 border-t border-gray-100">
                    <div className="flex items-center gap-4">
                      <button className="flex items-center gap-1 text-gray-600 hover:text-red-500 transition-colors">
                        <Heart className="h-5 w-5" />
                        <span className="text-sm">{item.likes}</span>
                      </button>
                      <button className="flex items-center gap-1 text-gray-600 hover:text-[#1D4ED8] transition-colors">
                        <MessageCircle className="h-5 w-5" />
                        <span className="text-sm">{item.comments}</span>
                      </button>
                      <button className="text-gray-600 hover:text-[#1D4ED8] transition-colors">
                        <Share2 className="h-5 w-5" />
                      </button>
                    </div>
                    <button 
                      onClick={() => toggleSave(item.id)}
                      className={`transition-colors ${savedItems.includes(item.id) ? "text-[#F59E0B]" : "text-gray-600 hover:text-[#F59E0B]"}`}
                    >
                      <Bookmark className={`h-5 w-5 ${savedItems.includes(item.id) ? "fill-current" : ""}`} />
                    </button>
                  </div>
                </div>

                {/* CTA */}
                <div className="px-4 pb-4">
                  <Button className="w-full bg-[#1D4ED8] hover:bg-[#1E3A8A]">
                    {item.type === "video" ? "Assistir agora" : item.type === "exercicio" ? "Praticar" : "Ler agora"}
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Right Sidebar */}
        <div className="space-y-6">
          {/* Study Streak */}
          <div className="bg-gradient-to-br from-orange-500 to-red-500 rounded-xl p-4 text-white">
            <div className="flex items-center justify-between mb-2">
              <span className="font-medium">Sequencia de estudos</span>
              <Flame className="h-6 w-6" />
            </div>
            <div className="text-4xl font-bold font-display">7 dias</div>
            <p className="text-sm text-orange-100 mt-1">Continue assim! Voce esta indo muito bem.</p>
          </div>

          {/* Today's Plan */}
          <div className="bg-white rounded-xl p-4 border border-gray-100">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-display font-semibold text-gray-900">Plano de Hoje</h3>
              <Link href="/dashboard/aluno/plano" className="text-sm text-[#10B981] hover:underline flex items-center gap-1">
                Ver tudo <ChevronRight className="h-4 w-4" />
              </Link>
            </div>
            <div className="space-y-3">
              {todayTasks.map((task) => (
                <div key={task.id} className="flex items-center gap-3">
                  <div className={`h-8 w-8 rounded-lg flex items-center justify-center ${
                    task.status === "concluido" ? "bg-green-100" :
                    task.status === "em_andamento" ? "bg-blue-100" : "bg-gray-100"
                  }`}>
                    {task.status === "concluido" ? (
                      <CheckCircle2 className="h-4 w-4 text-[#10B981]" />
                    ) : task.status === "em_andamento" ? (
                      <Play className="h-4 w-4 text-[#1D4ED8]" />
                    ) : (
                      <Clock className="h-4 w-4 text-gray-400" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium text-gray-900 truncate">{task.tema}</div>
                    <div className="text-xs text-gray-500">{task.materia} - {task.duracao}</div>
                  </div>
                </div>
              ))}
            </div>
            <div className="mt-4 pt-4 border-t border-gray-100">
              <div className="flex items-center justify-between text-sm mb-2">
                <span className="text-gray-600">Progresso de hoje</span>
                <span className="font-medium text-[#10B981]">33%</span>
              </div>
              <Progress value={33} className="h-2" />
            </div>
          </div>

          {/* Weekly Goals */}
          <div className="bg-white rounded-xl p-4 border border-gray-100">
            <h3 className="font-display font-semibold text-gray-900 mb-4">Metas da Semana</h3>
            <div className="space-y-3">
              <div className="flex items-center gap-3">
                <div className="h-5 w-5 rounded border-2 border-[#10B981] bg-[#10B981] flex items-center justify-center">
                  <CheckCircle2 className="h-3 w-3 text-white" />
                </div>
                <span className="text-sm text-gray-600 line-through">3 exercicios de Matematica</span>
              </div>
              <div className="flex items-center gap-3">
                <div className="h-5 w-5 rounded border-2 border-gray-300" />
                <span className="text-sm text-gray-600">Assistir 2 videos de Historia</span>
              </div>
              <div className="flex items-center gap-3">
                <div className="h-5 w-5 rounded border-2 border-gray-300" />
                <span className="text-sm text-gray-600">Ler 1 artigo de Fisica</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
