"use client"

import type { FeedArticle } from "@/app/actions/content-items"
import { recordContentShare, toggleContentLike } from "@/app/actions/content-items"
import { ArticleCoverMedia } from "@/components/dashboard/article-cover-media"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Progress } from "@/components/ui/progress"
import {
  BookOpen,
  Bookmark,
  CheckCircle2,
  ChevronRight,
  Clock,
  FileText,
  Flame,
  Heart,
  MessageCircle,
  Play,
  Share2,
  Sparkles,
} from "lucide-react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { useState } from "react"
import { toast } from "sonner"

const stories = [
  { id: 1, name: "Prof. Maria", avatar: "MS", color: "from-pink-500 to-purple-500", hasNew: true },
  { id: 2, name: "Prof. Carlos", avatar: "CO", color: "from-blue-500 to-cyan-500", hasNew: true },
  { id: 3, name: "Prof. Ana", avatar: "AP", color: "from-green-500 to-teal-500", hasNew: false },
  { id: 4, name: "Prof. Roberto", avatar: "RL", color: "from-orange-500 to-red-500", hasNew: true },
  { id: 5, name: "Prof. Julia", avatar: "JC", color: "from-indigo-500 to-purple-500", hasNew: false },
]

const feedItemsMock = [
  {
    id: "mock-2",
    type: "video" as const,
    professor: { name: "Prof. Carlos Oliveira", avatar: "CO", verified: true },
    title: "A Revolucao Francesa em 15 minutos",
    disciplina: "Historia",
    thumbnail: null,
    duracao: "15:42",
    recommendation: "Baseado no seu plano de estudos desta semana",
    likes: 567,
    comments: 89,
    saved: false,
  },
  {
    id: "mock-3",
    type: "exercicio" as const,
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

const todayTasks = [
  { id: 1, materia: "Matematica", tema: "Funcoes Quadraticas", tipo: "Exercicios", duracao: "30 min", status: "concluido" as const },
  { id: 2, materia: "Historia", tema: "Revolucao Francesa", tipo: "Video", duracao: "20 min", status: "em_andamento" as const },
  { id: 3, materia: "Fisica", tema: "Cinematica", tipo: "Artigo", duracao: "15 min", status: "pendente" as const },
]

function initials(name: string | null | undefined): string {
  if (!name?.trim()) return "?"
  const parts = name.trim().split(/\s+/)
  if (parts.length >= 2) return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
  return parts[0].slice(0, 2).toUpperCase()
}

type Props = {
  initialArticles?: FeedArticle[]
  initialLikedIds?: string[]
}

export function AlunoFeedClient({
  initialArticles = [],
  initialLikedIds = [],
}: Props) {
  const router = useRouter()
  const [savedItems, setSavedItems] = useState<string[]>([])
  const [likedMap, setLikedMap] = useState<Record<string, boolean>>(() => {
    const o: Record<string, boolean> = {}
    for (const id of initialLikedIds) o[id] = true
    return o
  })
  const [counts, setCounts] = useState<Record<string, { likes: number; shares: number }>>(() => {
    const o: Record<string, { likes: number; shares: number }> = {}
    for (const a of initialArticles) {
      o[a.id] = { likes: a.like_count, shares: a.share_count }
    }
    return o
  })

  const toggleSave = (id: string) => {
    setSavedItems((prev) => (prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]))
  }

  const onLike = async (articleId: string) => {
    const res = await toggleContentLike(articleId)
    if (!res.ok) {
      if (res.error === "Nao autenticado") {
        toast.message("Entre na conta para curtir")
      } else {
        toast.error(res.error)
      }
      return
    }
    setLikedMap((prev) => ({ ...prev, [articleId]: res.liked }))
    setCounts((prev) => ({
      ...prev,
      [articleId]: { ...prev[articleId], likes: res.likeCount },
    }))
  }

  const onShare = async (articleId: string) => {
    const url = `${typeof window !== "undefined" ? window.location.origin : ""}/conteudo/${articleId}`
    try {
      if (navigator.share) {
        await navigator.share({ url })
        const r = await recordContentShare(articleId, "native_share")
        if (r.ok) {
          setCounts((prev) => ({
            ...prev,
            [articleId]: { ...prev[articleId], shares: r.shareCount },
          }))
        }
      } else {
        await navigator.clipboard.writeText(url)
        toast.success("Link copiado")
        const r = await recordContentShare(articleId, "copy_link")
        if (r.ok) {
          setCounts((prev) => ({
            ...prev,
            [articleId]: { ...prev[articleId], shares: r.shareCount },
          }))
        }
      }
    } catch {
      try {
        await navigator.clipboard.writeText(url)
        toast.success("Link copiado")
        const r = await recordContentShare(articleId, "copy_link")
        if (r.ok) {
          setCounts((prev) => ({
            ...prev,
            [articleId]: { ...prev[articleId], shares: r.shareCount },
          }))
        }
      } catch {
        toast.error("Nao foi possivel copiar")
      }
    }
  }

  return (
    <div className="max-w-4xl mx-auto pb-20 lg:pb-0">
      <div className="mb-6">
        <h1 className="font-display text-2xl font-bold text-gray-900">Ola!</h1>
        <p className="text-gray-600">Pronto para mais um dia de aprendizado?</p>
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-white rounded-xl p-4 border border-gray-100">
            <div className="flex gap-4 overflow-x-auto pb-2 scrollbar-hide">
              {stories.map((story) => (
                <button key={story.id} type="button" className="flex flex-col items-center gap-2 flex-shrink-0">
                  <div
                    className={`p-0.5 rounded-full bg-gradient-to-br ${story.color} ${story.hasNew ? "" : "opacity-50"}`}
                  >
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

          <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
            <Button size="sm" className="bg-[#10B981] hover:bg-[#059669]">
              Todos
            </Button>
            <Button size="sm" variant="outline">
              Artigos
            </Button>
            <Button size="sm" variant="outline">
              Videos
            </Button>
            <Button size="sm" variant="outline">
              Exercicios
            </Button>
          </div>

          <div className="space-y-4">
            {initialArticles.map((item) => {
              const c = counts[item.id] ?? { likes: item.like_count, shares: item.share_count }
              const liked = !!likedMap[item.id]
              const disciplina = item.settings?.disciplina ?? "Artigo"
              const cover = item.settings?.coverUrl?.trim() || null
              const coverVideo = item.settings?.coverVideoUrl?.trim() || null
              return (
                <div key={item.id} className="bg-white rounded-xl border border-gray-100 overflow-hidden">
                  <div className="p-4 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <Avatar className="h-10 w-10">
                        {item.author.avatar_url ? (
                          <AvatarImage src={item.author.avatar_url} alt="" />
                        ) : null}
                        <AvatarFallback className="bg-[#1D4ED8] text-white text-sm">
                          {initials(item.author.full_name)}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <span className="font-medium text-gray-900">{item.author.full_name ?? "Professor"}</span>
                        <Badge variant="secondary" className="text-xs ml-2">
                          {disciplina}
                        </Badge>
                      </div>
                    </div>
                  </div>

                  <div className="px-4 pb-3">
                    <h3 className="font-display font-semibold text-lg text-gray-900 mb-2">{item.title}</h3>
                    <div className="flex items-center gap-2 text-sm text-[#10B981] mb-3">
                      <Sparkles className="h-4 w-4" />
                      <span>Artigo publicado na plataforma</span>
                    </div>
                    <div className="bg-gray-100 rounded-lg aspect-video flex items-center justify-center mb-3 overflow-hidden">
                      {coverVideo || cover ? (
                        <ArticleCoverMedia
                          imageUrl={cover}
                          videoUrl={coverVideo}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="flex flex-col items-center gap-2 text-gray-400">
                          <BookOpen className="h-12 w-12" />
                          <span className="text-sm flex items-center gap-1">
                            <Clock className="h-4 w-4" />
                            Leitura
                          </span>
                        </div>
                      )}
                    </div>

                    <div className="flex items-center justify-between pt-3 border-t border-gray-100">
                      <div className="flex items-center gap-4">
                        <button
                          type="button"
                          className={`flex items-center gap-1 transition-colors ${liked ? "text-red-500" : "text-gray-600 hover:text-red-500"}`}
                          onClick={() => void onLike(item.id)}
                        >
                          <Heart
                            className={`h-5 w-5 shrink-0 ${liked ? "fill-red-500 stroke-red-500 text-red-500" : ""}`}
                          />
                          <span className="text-sm">{c.likes}</span>
                        </button>
                        <span className="flex items-center gap-1 text-gray-400 text-sm">
                          <MessageCircle className="h-5 w-5" />
                          <span>0</span>
                        </span>
                        <button
                          type="button"
                          className="text-gray-600 hover:text-[#1D4ED8] transition-colors"
                          onClick={() => void onShare(item.id)}
                        >
                          <Share2 className="h-5 w-5" />
                        </button>
                      </div>
                      <button
                        type="button"
                        onClick={() => toggleSave(item.id)}
                        className={`transition-colors ${savedItems.includes(item.id) ? "text-[#F59E0B]" : "text-gray-600 hover:text-[#F59E0B]"}`}
                      >
                        <span className="sr-only">Salvar</span>
                        <Bookmark className={`h-5 w-5 ${savedItems.includes(item.id) ? "fill-current" : ""}`} />
                      </button>
                    </div>
                  </div>

                  <div className="px-4 pb-4">
                    <Button
                      className="w-full bg-[#1D4ED8] hover:bg-[#1E3A8A]"
                      onClick={() => router.push(`/conteudo/${item.id}`)}
                    >
                      Ler agora
                    </Button>
                  </div>
                </div>
              )
            })}

            {feedItemsMock.map((item) => (
              <div key={item.id} className="bg-white rounded-xl border border-gray-100 overflow-hidden">
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
                      <Badge variant="secondary" className="text-xs">
                        {item.disciplina}
                      </Badge>
                    </div>
                  </div>
                </div>

                <div className="px-4 pb-3">
                  <h3 className="font-display font-semibold text-lg text-gray-900 mb-2">{item.title}</h3>
                  <div className="flex items-center gap-2 text-sm text-[#10B981] mb-3">
                    <Sparkles className="h-4 w-4" />
                    <span>{item.recommendation}</span>
                  </div>
                  <div className="bg-gray-100 rounded-lg aspect-video flex items-center justify-center mb-3">
                    {item.type === "video" ? (
                      <div className="flex flex-col items-center gap-2 text-gray-400">
                        <div className="h-16 w-16 rounded-full bg-white/80 flex items-center justify-center">
                          <Play className="h-8 w-8 text-[#1D4ED8] ml-1" />
                        </div>
                        <span className="text-sm">{item.duracao}</span>
                      </div>
                    ) : (
                      <div className="flex flex-col items-center gap-2 text-gray-400">
                        <FileText className="h-12 w-12" />
                        <span className="text-sm">{item.questoes} questoes</span>
                      </div>
                    )}
                  </div>

                  <div className="flex items-center justify-between pt-3 border-t border-gray-100">
                    <div className="flex items-center gap-4 text-gray-600">
                      <span className="flex items-center gap-1 text-sm">
                        <Heart className="h-5 w-5" />
                        {item.likes}
                      </span>
                      <span className="flex items-center gap-1 text-sm">
                        <MessageCircle className="h-5 w-5" />
                        {item.comments}
                      </span>
                      <Share2 className="h-5 w-5" />
                    </div>
                  </div>
                </div>

                <div className="px-4 pb-4">
                  <Button className="w-full bg-[#1D4ED8] hover:bg-[#1E3A8A]">
                    {item.type === "video" ? "Assistir agora" : "Praticar"}
                  </Button>
                </div>
              </div>
            ))}

          </div>
        </div>

        <div className="space-y-6">
          <div className="bg-gradient-to-br from-orange-500 to-red-500 rounded-xl p-4 text-white">
            <div className="flex items-center justify-between mb-2">
              <span className="font-medium">Sequencia de estudos</span>
              <Flame className="h-6 w-6" />
            </div>
            <div className="text-4xl font-bold font-display">7 dias</div>
            <p className="text-sm text-orange-100 mt-1">Continue assim! Voce esta indo muito bem.</p>
          </div>

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
                  <div
                    className={`h-8 w-8 rounded-lg flex items-center justify-center ${
                      task.status === "concluido"
                        ? "bg-green-100"
                        : task.status === "em_andamento"
                          ? "bg-blue-100"
                          : "bg-gray-100"
                    }`}
                  >
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
                    <div className="text-xs text-gray-500">
                      {task.materia} - {task.duracao}
                    </div>
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
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
