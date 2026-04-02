"use client"

import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { 
  Eye, 
  Heart, 
  MessageCircle, 
  Bookmark,
  Users,
  FileText,
  TrendingUp,
  Clock,
  CheckCircle2,
  AlertCircle,
  ChevronRight,
  Plus
} from "lucide-react"

// Mock stats
const stats = [
  { label: "Visualizacoes", value: "12.4k", change: "+12%", icon: Eye },
  { label: "Seguidores", value: "2.3k", change: "+8%", icon: Users },
  { label: "Publicacoes", value: "45", change: "+3", icon: FileText },
  { label: "Engajamento", value: "24%", change: "+5%", icon: TrendingUp },
]

// Mock recent posts
const recentPosts = [
  {
    id: 1,
    title: "Equacoes do Segundo Grau: Guia Completo",
    tipo: "Artigo",
    status: "publicado",
    views: 1234,
    likes: 89,
    comments: 23,
    data: "Ha 2 dias",
  },
  {
    id: 2,
    title: "Lista de Exercicios: Funcoes",
    tipo: "Exercicio",
    status: "em_revisao",
    views: 0,
    likes: 0,
    comments: 0,
    data: "Ha 5 horas",
  },
  {
    id: 3,
    title: "Video: Resolucao de Problemas",
    tipo: "Video",
    status: "publicado",
    views: 567,
    likes: 45,
    comments: 12,
    data: "Ha 1 semana",
  },
]

// Mock pending activities
const pendingActivities = [
  { id: 1, sala: "Matematica 3A", atividade: "Prova Bimestral", entregas: 15, total: 28 },
  { id: 2, sala: "Matematica 2B", atividade: "Lista de Exercicios", entregas: 22, total: 30 },
]

// Mock notifications
const notifications = [
  { id: 1, text: "Seu artigo 'Equacoes do Segundo Grau' foi aprovado pela IA", type: "success", time: "Ha 2 horas" },
  { id: 2, text: "15 alunos entregaram a 'Prova Bimestral' - corrija agora", type: "warning", time: "Ha 3 horas" },
  { id: 3, text: "Seu perfil ganhou 45 novos seguidores esta semana", type: "info", time: "Ha 1 dia" },
]

export default function ProfessorFeedPage() {
  return (
    <div className="max-w-6xl mx-auto pb-20 lg:pb-0">
      {/* Welcome Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <div>
          <h1 className="font-display text-2xl font-bold text-gray-900">Ola, Professora Maria!</h1>
          <p className="text-gray-600">Veja como seus conteudos estao performando</p>
        </div>
        <Button asChild className="bg-[#1D4ED8] hover:bg-[#1E3A8A] gap-2">
          <Link href="/dashboard/professor/criar">
            <Plus className="h-4 w-4" />
            Criar Conteudo
          </Link>
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {stats.map((stat) => (
          <div key={stat.label} className="bg-white rounded-xl p-4 border border-gray-100">
            <div className="flex items-center justify-between mb-2">
              <stat.icon className="h-5 w-5 text-gray-400" />
              <span className="text-xs text-[#10B981] font-medium">{stat.change}</span>
            </div>
            <div className="text-2xl font-bold font-display text-gray-900">{stat.value}</div>
            <div className="text-xs text-gray-500">{stat.label}</div>
          </div>
        ))}
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-6">
          {/* Recent Posts */}
          <div className="bg-white rounded-xl border border-gray-100">
            <div className="p-4 border-b border-gray-100 flex items-center justify-between">
              <h2 className="font-display font-semibold text-gray-900">Minhas Publicacoes</h2>
              <Link href="/dashboard/professor/conteudos" className="text-sm text-[#1D4ED8] hover:underline flex items-center gap-1">
                Ver todas <ChevronRight className="h-4 w-4" />
              </Link>
            </div>
            <div className="divide-y divide-gray-100">
              {recentPosts.map((post) => (
                <div key={post.id} className="p-4 hover:bg-gray-50 transition-colors">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="font-medium text-gray-900 truncate">{post.title}</h3>
                        <Badge 
                          variant={post.status === "publicado" ? "default" : "secondary"}
                          className={post.status === "publicado" ? "bg-[#10B981]" : "bg-amber-100 text-amber-800"}
                        >
                          {post.status === "publicado" ? (
                            <span className="flex items-center gap-1">
                              <CheckCircle2 className="h-3 w-3" />
                              Publicado
                            </span>
                          ) : (
                            <span className="flex items-center gap-1">
                              <Clock className="h-3 w-3" />
                              Em revisao
                            </span>
                          )}
                        </Badge>
                      </div>
                      <div className="flex items-center gap-4 text-sm text-gray-500">
                        <span>{post.tipo}</span>
                        <span>{post.data}</span>
                      </div>
                    </div>
                    {post.status === "publicado" && (
                      <div className="flex items-center gap-4 text-sm text-gray-500">
                        <span className="flex items-center gap-1">
                          <Eye className="h-4 w-4" />
                          {post.views}
                        </span>
                        <span className="flex items-center gap-1">
                          <Heart className="h-4 w-4" />
                          {post.likes}
                        </span>
                        <span className="flex items-center gap-1">
                          <MessageCircle className="h-4 w-4" />
                          {post.comments}
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Pending Activities */}
          <div className="bg-white rounded-xl border border-gray-100">
            <div className="p-4 border-b border-gray-100 flex items-center justify-between">
              <h2 className="font-display font-semibold text-gray-900">Atividades Pendentes</h2>
              <Link href="/dashboard/professor/salas" className="text-sm text-[#1D4ED8] hover:underline flex items-center gap-1">
                Ver salas <ChevronRight className="h-4 w-4" />
              </Link>
            </div>
            <div className="divide-y divide-gray-100">
              {pendingActivities.map((activity) => (
                <div key={activity.id} className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="font-medium text-gray-900">{activity.atividade}</h3>
                      <p className="text-sm text-gray-500">{activity.sala}</p>
                    </div>
                    <div className="text-right">
                      <div className="text-lg font-semibold text-[#1D4ED8]">
                        {activity.entregas}/{activity.total}
                      </div>
                      <p className="text-xs text-gray-500">entregas</p>
                    </div>
                  </div>
                  <div className="mt-3 flex gap-2">
                    <Button size="sm" variant="outline" className="flex-1">
                      Ver entregas
                    </Button>
                    <Button size="sm" className="flex-1 bg-[#1D4ED8] hover:bg-[#1E3A8A]">
                      Corrigir
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Notifications */}
          <div className="bg-white rounded-xl border border-gray-100">
            <div className="p-4 border-b border-gray-100">
              <h2 className="font-display font-semibold text-gray-900">Notificacoes</h2>
            </div>
            <div className="divide-y divide-gray-100">
              {notifications.map((notif) => (
                <div key={notif.id} className="p-4">
                  <div className="flex items-start gap-3">
                    <div className={`h-8 w-8 rounded-full flex items-center justify-center flex-shrink-0 ${
                      notif.type === "success" ? "bg-green-100" :
                      notif.type === "warning" ? "bg-amber-100" : "bg-blue-100"
                    }`}>
                      {notif.type === "success" ? (
                        <CheckCircle2 className="h-4 w-4 text-[#10B981]" />
                      ) : notif.type === "warning" ? (
                        <AlertCircle className="h-4 w-4 text-amber-500" />
                      ) : (
                        <Users className="h-4 w-4 text-[#1D4ED8]" />
                      )}
                    </div>
                    <div>
                      <p className="text-sm text-gray-700">{notif.text}</p>
                      <p className="text-xs text-gray-400 mt-1">{notif.time}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Quick Stats */}
          <div className="bg-gradient-to-br from-[#1D4ED8] to-[#1E3A8A] rounded-xl p-4 text-white">
            <h3 className="font-semibold mb-4">Destaques da Semana</h3>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-blue-100">Artigo mais visto</span>
                <span className="font-medium">1.2k views</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-blue-100">Novos seguidores</span>
                <span className="font-medium">+45</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-blue-100">Taxa de conclusao</span>
                <span className="font-medium">78%</span>
              </div>
            </div>
          </div>

          {/* Top Content */}
          <div className="bg-white rounded-xl border border-gray-100 p-4">
            <h3 className="font-display font-semibold text-gray-900 mb-4">Conteudo mais Popular</h3>
            <div className="flex items-center gap-3">
              <div className="h-12 w-12 rounded-lg bg-blue-100 flex items-center justify-center">
                <FileText className="h-6 w-6 text-[#1D4ED8]" />
              </div>
              <div className="flex-1 min-w-0">
                <h4 className="font-medium text-gray-900 truncate">Equacoes do 2o Grau</h4>
                <p className="text-sm text-gray-500">1.2k views esta semana</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
