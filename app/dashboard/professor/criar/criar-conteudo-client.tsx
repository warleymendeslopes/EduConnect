"use client"

import {
  createArticleDraft,
  getArticleForEdit,
  listMyClassroomsForArticle,
  publishArticle,
} from "@/app/actions/content-items"
import { uploadArticleBlobViaApi } from "@/lib/article-upload-client"
import { ArticleCoverMedia } from "@/components/dashboard/article-cover-media"
import { TrixArticleBody } from "@/components/dashboard/trix-article-body"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import type { ContentVisibility } from "@/lib/content/types"
import {
  AlertTriangle,
  ArrowLeft,
  BarChart,
  Bot,
  CheckCircle2,
  ClipboardList,
  FileText,
  LayoutGrid,
  Image as ImageIcon,
  Lightbulb,
  ListChecks,
  Loader2,
  Plus,
  Upload,
  Video,
  X,
} from "lucide-react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { useCallback, useEffect, useState } from "react"
import { toast } from "sonner"

const tiposConteudo = [
  { id: "artigo", label: "Artigo", icon: FileText, description: "Texto rico com formatacao, imagens e links" },
  { id: "exercicios", label: "Exercicios", icon: ListChecks, description: "Lista de questoes com alternativas" },
  { id: "avaliacao", label: "Avaliacao", icon: ClipboardList, description: "Prova com prazo e pontuacao" },
  { id: "simulado", label: "Simulado", icon: BarChart, description: "Questoes de multiplas disciplinas" },
  { id: "dica", label: "Dica Rapida", icon: Lightbulb, description: "Post curto educacional" },
]

const disciplinas = [
  "Matematica",
  "Portugues",
  "Historia",
  "Geografia",
  "Fisica",
  "Quimica",
  "Biologia",
  "Ingles",
]

const niveis = [
  "Fundamental I",
  "Fundamental II",
  "Ensino Medio",
  "Pre-vestibular",
  "Graduacao",
]

interface AIReview {
  originalidade: { score: number; status: "ok" | "warning" | "error"; message: string }
  precisao: { score: number; status: "ok" | "warning" | "error"; message: string }
  qualidade: { score: number; status: "ok" | "warning" | "error"; message: string }
  sugestoes: string[]
  statusFinal: "APROVADO" | "APROVADO_COM_RESSALVAS" | "REPROVADO"
}

type ClassroomOpt = { id: string; name: string; subject: string }

/** Dedupes createArticleDraft across React Strict Mode remounts (same tab). */
let articleDraftCreationPromise: Promise<string> | null = null

function resetArticleDraftCreation() {
  articleDraftCreationPromise = null
}

function getOrCreateArticleDraftId(): Promise<string> {
  if (!articleDraftCreationPromise) {
    articleDraftCreationPromise = createArticleDraft().then((res) => {
      if (!res.ok) {
        resetArticleDraftCreation()
        throw new Error(res.error)
      }
      return res.id
    })
  }
  return articleDraftCreationPromise
}

export function CriarConteudoClient({
  initialEditId,
}: {
  initialEditId: string | null
}) {
  const router = useRouter()
  const [step, setStep] = useState<"tipo" | "editor">(() =>
    initialEditId ? "editor" : "tipo"
  )
  const [tipoSelecionado, setTipoSelecionado] = useState<string | null>(() =>
    initialEditId ? "artigo" : null
  )
  const [isReviewing, setIsReviewing] = useState(false)
  const [showReviewDialog, setShowReviewDialog] = useState(false)
  const [tags, setTags] = useState<string[]>([])
  const [tagInput, setTagInput] = useState("")

  const [formData, setFormData] = useState({
    titulo: "",
    disciplina: "",
    nivel: "",
    conteudo: "",
  })

  const [aiReview, setAiReview] = useState<AIReview | null>(null)

  const [articleDraftId, setArticleDraftId] = useState<string | null>(null)
  const [articleBodyHtml, setArticleBodyHtml] = useState("")
  const [visibility, setVisibility] = useState<ContentVisibility>("public")
  const [classrooms, setClassrooms] = useState<ClassroomOpt[]>([])
  const [selectedClassroomIds, setSelectedClassroomIds] = useState<string[]>([])
  const [publishing, setPublishing] = useState(false)
  const [loadingEdit, setLoadingEdit] = useState(!!initialEditId)
  const [loadedArticleStatus, setLoadedArticleStatus] = useState<
    "draft" | "published" | null
  >(null)
  const [coverUrl, setCoverUrl] = useState<string | null>(null)
  const [coverVideoUrl, setCoverVideoUrl] = useState<string | null>(null)
  const [coverUploading, setCoverUploading] = useState(false)

  const ensureArticleDraftId = useCallback(async () => {
    if (articleDraftId) return articleDraftId
    const id = await getOrCreateArticleDraftId()
    setArticleDraftId(id)
    return id
  }, [articleDraftId])

  useEffect(() => {
    if (!initialEditId) {
      setLoadingEdit(false)
      return
    }
    let cancelled = false
    setLoadingEdit(true)
    void listMyClassroomsForArticle().then(setClassrooms)
    void getArticleForEdit(initialEditId).then((res) => {
      if (cancelled) return
      if (!res.ok) {
        toast.error(res.error)
        setLoadingEdit(false)
        router.replace("/dashboard/professor/criar")
        return
      }
      const a = res.article
      setArticleDraftId(a.id)
      setArticleBodyHtml(a.body_html ?? "")
      setFormData({
        titulo: a.title,
        disciplina: a.settings.disciplina ?? "",
        nivel: a.settings.nivel ?? "",
        conteudo: "",
      })
      setTags(a.settings.tags ?? [])
      setVisibility(a.visibility)
      setSelectedClassroomIds(a.classroomIds)
      setLoadedArticleStatus(a.status)
      setCoverUrl(a.settings.coverUrl ?? null)
      setCoverVideoUrl(a.settings.coverVideoUrl ?? null)
      setLoadingEdit(false)
    })
    return () => {
      cancelled = true
    }
  }, [initialEditId, router])

  const handleTipoSelect = (tipo: string) => {
    setTipoSelecionado(tipo)
    setStep("editor")
    if (tipo !== "artigo") {
      setArticleDraftId(null)
      setArticleBodyHtml("")
      setCoverUrl(null)
      setCoverVideoUrl(null)
      resetArticleDraftCreation()
    }
  }

  useEffect(() => {
    if (initialEditId) return
    if (step !== "editor" || tipoSelecionado !== "artigo") return
    void listMyClassroomsForArticle().then(setClassrooms)
  }, [step, tipoSelecionado, initialEditId])

  const addTag = () => {
    if (tagInput.trim() && !tags.includes(tagInput.trim())) {
      setTags([...tags, tagInput.trim()])
      setTagInput("")
    }
  }

  const removeTag = (tag: string) => {
    setTags(tags.filter((t) => t !== tag))
  }

  const toggleClassroom = (id: string) => {
    setSelectedClassroomIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    )
  }

  const handleRevisao = async () => {
    if (tipoSelecionado === "artigo" && !initialEditId) {
      try {
        await ensureArticleDraftId()
      } catch (err) {
        toast.error(
          err instanceof Error ? err.message : "Erro ao preparar rascunho para revisao"
        )
        return
      }
    }
    setIsReviewing(true)
    setTimeout(() => {
      setAiReview({
        originalidade: {
          score: 95,
          status: "ok",
          message: "Nenhum plagio detectado",
        },
        precisao: {
          score: 88,
          status: "warning",
          message:
            "Possivel imprecisao no trecho sobre formula de Bhaskara - verifique os sinais",
        },
        qualidade: {
          score: 92,
          status: "ok",
          message: "Conteudo bem estruturado e claro",
        },
        sugestoes: [
          "Adicione mais exemplos praticos para facilitar o entendimento",
          "Considere incluir uma imagem ilustrativa da parabola",
          "O ultimo paragrafo poderia ter uma conclusao mais clara",
        ],
        statusFinal: "APROVADO_COM_RESSALVAS",
      })
      setIsReviewing(false)
      setShowReviewDialog(true)
    }, 3000)
  }

  const handlePublishArticle = async () => {
    const title = formData.titulo.trim()
    if (!title) {
      toast.error("Informe o titulo")
      return
    }
    if (visibility === "classrooms" && selectedClassroomIds.length === 0) {
      toast.error("Selecione ao menos uma turma")
      return
    }
    let contentId = articleDraftId
    if (!contentId) {
      if (initialEditId) {
        toast.error("Aguarde o editor carregar")
        return
      }
      try {
        contentId = await getOrCreateArticleDraftId()
        setArticleDraftId(contentId)
      } catch (err) {
        toast.error(
          err instanceof Error ? err.message : "Erro ao criar rascunho para publicar"
        )
        return
      }
    }
    setPublishing(true)
    const res = await publishArticle({
      id: contentId,
      title,
      bodyHtml: articleBodyHtml,
      visibility,
      classroomIds: visibility === "classrooms" ? selectedClassroomIds : undefined,
      settings: {
        tags,
        disciplina: formData.disciplina.trim() || undefined,
        nivel: formData.nivel.trim() || undefined,
        coverUrl: coverUrl ?? null,
        coverVideoUrl: coverVideoUrl ?? null,
      },
    })
    setPublishing(false)
    if (!res.ok) {
      toast.error(res.error)
      return
    }
    resetArticleDraftCreation()
    if (loadedArticleStatus === "published") {
      toast.success("Alteracoes salvas")
      router.push("/dashboard/professor/conteudos")
    } else {
      toast.success("Artigo publicado")
      router.push(`/conteudo/${contentId}`)
    }
  }

  const goBackFromEditor = () => {
    if (initialEditId) {
      router.push("/dashboard/professor/conteudos")
      return
    }
    setStep("tipo")
    setTipoSelecionado(null)
    setArticleDraftId(null)
    setArticleBodyHtml("")
    setCoverUrl(null)
    setCoverVideoUrl(null)
    resetArticleDraftCreation()
  }

  const clearCoverMedia = () => {
    setCoverUrl(null)
    setCoverVideoUrl(null)
  }

  const handleCoverImageChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    e.target.value = ""
    if (!file) return
    setCoverUploading(true)
    try {
      let cid = articleDraftId
      if (!cid) {
        if (initialEditId) {
          toast.error("Aguarde o artigo carregar")
          return
        }
        cid = await getOrCreateArticleDraftId()
        setArticleDraftId(cid)
      }
      const res = await uploadArticleBlobViaApi("cover-image", cid, file)
      if (!res.ok) {
        toast.error(res.error)
        return
      }
      setCoverUrl(res.displayUrl)
      setCoverVideoUrl(null)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erro no upload da capa")
    } finally {
      setCoverUploading(false)
    }
  }

  const handleCoverVideoChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    e.target.value = ""
    if (!file) return
    setCoverUploading(true)
    try {
      let cid = articleDraftId
      if (!cid) {
        if (initialEditId) {
          toast.error("Aguarde o artigo carregar")
          return
        }
        cid = await getOrCreateArticleDraftId()
        setArticleDraftId(cid)
      }
      const res = await uploadArticleBlobViaApi("cover-video", cid, file)
      if (!res.ok) {
        toast.error(res.error)
        return
      }
      setCoverVideoUrl(res.displayUrl)
      setCoverUrl(null)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erro no upload do video")
    } finally {
      setCoverUploading(false)
    }
  }

  if (loadingEdit && initialEditId) {
    return (
      <div className="max-w-4xl mx-auto flex flex-col items-center justify-center min-h-[45vh] gap-3 pb-20">
        <Loader2 className="h-10 w-10 animate-spin text-[#1D4ED8]" />
        <p className="text-sm text-gray-600">Carregando artigo...</p>
      </div>
    )
  }

  return (
    <div className="max-w-4xl mx-auto pb-20 lg:pb-0">
      <div className="flex flex-col gap-3 mb-6 sm:flex-row sm:items-start sm:gap-4">
        <div className="flex items-start gap-4 flex-1 min-w-0">
          <Button
            variant="ghost"
            size="icon"
            className="shrink-0 mt-0.5"
            onClick={() => (step === "editor" ? goBackFromEditor() : router.back())}
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div className="flex-1 min-w-0">
            <h1 className="font-display text-2xl font-bold text-gray-900">
              {step === "tipo"
                ? "Criar Conteudo"
                : initialEditId && tipoSelecionado === "artigo"
                  ? "Editar artigo"
                  : `Novo ${tiposConteudo.find((t) => t.id === tipoSelecionado)?.label}`}
            </h1>
            <p className="text-gray-600">
              {step === "tipo"
                ? "Escolha o tipo de conteudo que deseja criar"
                : "Preencha os detalhes do seu conteudo"}
            </p>
          </div>
        </div>
        {step === "tipo" && (
          <Button
            asChild
            variant="outline"
            size="sm"
            className="w-full shrink-0 gap-2 border-[#1D4ED8] text-[#1D4ED8] hover:bg-blue-50 sm:w-auto sm:self-center"
          >
            <Link href="/dashboard/professor/conteudos">
              <LayoutGrid className="h-4 w-4" />
              Meu feed
            </Link>
          </Button>
        )}
      </div>

      {step === "tipo" && (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {tiposConteudo.map((tipo) => (
            <button
              key={tipo.id}
              type="button"
              onClick={() => handleTipoSelect(tipo.id)}
              className="p-6 rounded-xl border-2 border-gray-200 bg-white text-left transition-all hover:border-[#1D4ED8] hover:shadow-lg focus:outline-none focus:ring-2 focus:ring-[#1D4ED8] focus:ring-offset-2"
            >
              <div className="h-12 w-12 rounded-xl bg-blue-50 flex items-center justify-center mb-4">
                <tipo.icon className="h-6 w-6 text-[#1D4ED8]" />
              </div>
              <h3 className="font-display font-semibold text-gray-900 mb-1">{tipo.label}</h3>
              <p className="text-sm text-gray-600">{tipo.description}</p>
            </button>
          ))}
        </div>
      )}

      {step === "editor" && (
        <div className="bg-white rounded-xl border border-gray-100 p-6">
          <form className="space-y-6" onSubmit={(e) => e.preventDefault()}>
            <div className="space-y-2">
              <Label htmlFor="titulo">Titulo</Label>
              <Input
                id="titulo"
                placeholder="Digite o titulo do seu conteudo"
                className="h-12"
                value={formData.titulo}
                onChange={(e) => setFormData({ ...formData, titulo: e.target.value })}
              />
            </div>

            <div className="grid sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="disciplina">Disciplina</Label>
                <select
                  id="disciplina"
                  className="w-full h-12 px-3 rounded-md border border-input bg-background"
                  value={formData.disciplina}
                  onChange={(e) => setFormData({ ...formData, disciplina: e.target.value })}
                >
                  <option value="">Selecione</option>
                  {disciplinas.map((d) => (
                    <option key={d} value={d}>
                      {d}
                    </option>
                  ))}
                </select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="nivel">Nivel de Ensino</Label>
                <select
                  id="nivel"
                  className="w-full h-12 px-3 rounded-md border border-input bg-background"
                  value={formData.nivel}
                  onChange={(e) => setFormData({ ...formData, nivel: e.target.value })}
                >
                  <option value="">Selecione</option>
                  {niveis.map((n) => (
                    <option key={n} value={n}>
                      {n}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="space-y-2">
              <Label>Tags</Label>
              <div className="flex flex-wrap gap-2 mb-2">
                {tags.map((tag) => (
                  <Badge key={tag} variant="secondary" className="gap-1">
                    {tag}
                    <button type="button" onClick={() => removeTag(tag)}>
                      <X className="h-3 w-3" />
                    </button>
                  </Badge>
                ))}
              </div>
              <div className="flex gap-2">
                <Input
                  placeholder="Adicione uma tag"
                  value={tagInput}
                  onChange={(e) => setTagInput(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), addTag())}
                />
                <Button type="button" variant="outline" onClick={addTag}>
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
            </div>

            {tipoSelecionado === "artigo" && (
              <>
                <div className="space-y-2">
                  <Label>Capa do artigo (opcional)</Label>
                  <p className="text-xs text-muted-foreground">
                    Escolha uma imagem ou um video (nao os dois). Imagem: JPEG, PNG, GIF ou WebP ate 5
                    MB. Video: MP4, WebM ou MOV ate 80 MB. Aparece no feed e no topo do artigo
                    publico.
                  </p>
                  {coverUrl || coverVideoUrl ? (
                    <div className="relative rounded-lg border border-input overflow-hidden aspect-video max-h-52 bg-muted">
                      <ArticleCoverMedia
                        imageUrl={coverUrl}
                        videoUrl={coverVideoUrl}
                        className="w-full h-full object-cover"
                      />
                      <Button
                        type="button"
                        variant="secondary"
                        size="sm"
                        className="absolute top-2 right-2"
                        onClick={clearCoverMedia}
                      >
                        Remover
                      </Button>
                    </div>
                  ) : null}
                  <div className="flex items-center gap-2 flex-wrap">
                    <label className="inline-flex items-center justify-center rounded-md text-sm font-medium border border-input bg-background h-10 px-4 cursor-pointer hover:bg-muted/50 disabled:opacity-50">
                      <ImageIcon className="h-4 w-4 mr-2" />
                      {coverUploading ? "Enviando..." : "Imagem"}
                      <input
                        type="file"
                        accept="image/jpeg,image/png,image/gif,image/webp,.jpg,.jpeg,.png,.gif,.webp"
                        className="sr-only"
                        disabled={coverUploading || (!!initialEditId && !articleDraftId)}
                        onChange={(e) => void handleCoverImageChange(e)}
                      />
                    </label>
                    <label className="inline-flex items-center justify-center rounded-md text-sm font-medium border border-input bg-background h-10 px-4 cursor-pointer hover:bg-muted/50 disabled:opacity-50">
                      <Video className="h-4 w-4 mr-2" />
                      {coverUploading ? "Enviando..." : "Video"}
                      <input
                        type="file"
                        accept="video/mp4,video/webm,video/quicktime,.mp4,.webm,.mov,.m4v"
                        className="sr-only"
                        disabled={coverUploading || (!!initialEditId && !articleDraftId)}
                        onChange={(e) => void handleCoverVideoChange(e)}
                      />
                    </label>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Conteudo</Label>
                  <TrixArticleBody
                    key={initialEditId ?? "novo-artigo"}
                    contentItemId={articleDraftId}
                    initialHtml={articleBodyHtml}
                    onHtmlChange={setArticleBodyHtml}
                    ensureContentItemId={initialEditId ? undefined : ensureArticleDraftId}
                  />
                </div>

                <div className="space-y-3 rounded-lg border border-gray-100 p-4 bg-gray-50/80">
                  <Label className="text-base">Quem pode ver este artigo</Label>
                  <div className="space-y-2">
                    <label className="flex items-start gap-3 cursor-pointer">
                      <input
                        type="radio"
                        name="vis"
                        className="mt-1"
                        checked={visibility === "public"}
                        onChange={() => setVisibility("public")}
                      />
                      <span>
                        <span className="font-medium text-gray-900">Publico</span>
                        <span className="block text-sm text-gray-600">
                          Qualquer pessoa com o link ou no feed explorar
                        </span>
                      </span>
                    </label>
                    <label className="flex items-start gap-3 cursor-pointer">
                      <input
                        type="radio"
                        name="vis"
                        className="mt-1"
                        checked={visibility === "classrooms"}
                        onChange={() => setVisibility("classrooms")}
                      />
                      <span>
                        <span className="font-medium text-gray-900">Turmas selecionadas</span>
                        <span className="block text-sm text-gray-600">
                          Apenas alunos matriculados nas turmas que voce marcar
                        </span>
                      </span>
                    </label>
                    <label className="flex items-start gap-3 cursor-pointer">
                      <input
                        type="radio"
                        name="vis"
                        className="mt-1"
                        checked={visibility === "private"}
                        onChange={() => setVisibility("private")}
                      />
                      <span>
                        <span className="font-medium text-gray-900">Privado</span>
                        <span className="block text-sm text-gray-600">
                          Somente voce (rascunho visivel na sua conta)
                        </span>
                      </span>
                    </label>
                  </div>

                  {visibility === "classrooms" && (
                    <div className="pt-2 space-y-2 border-t border-gray-200 mt-2">
                      <p className="text-sm text-gray-600">Selecione as turmas</p>
                      {classrooms.length === 0 ? (
                        <p className="text-sm text-amber-700">
                          Voce ainda nao tem turmas ativas. Crie uma em Minhas Salas.
                        </p>
                      ) : (
                        <ul className="space-y-2 max-h-40 overflow-y-auto">
                          {classrooms.map((c) => (
                            <li key={c.id}>
                              <label className="flex items-center gap-2 text-sm cursor-pointer">
                                <input
                                  type="checkbox"
                                  checked={selectedClassroomIds.includes(c.id)}
                                  onChange={() => toggleClassroom(c.id)}
                                />
                                <span>
                                  {c.name}{" "}
                                  <span className="text-gray-500">({c.subject})</span>
                                </span>
                              </label>
                            </li>
                          ))}
                        </ul>
                      )}
                    </div>
                  )}
                </div>
              </>
            )}

            {tipoSelecionado !== "artigo" && tipoSelecionado !== undefined && (
                <div className="space-y-2">
                  <Label htmlFor="conteudo">Conteudo</Label>
                  <Textarea
                    id="conteudo"
                    placeholder="Escreva seu conteudo aqui..."
                    className="min-h-[300px] font-mono text-sm"
                    value={formData.conteudo}
                    onChange={(e) => setFormData({ ...formData, conteudo: e.target.value })}
                  />
                </div>
              )}

            {tipoSelecionado === "dica" && (
              <div className="space-y-2">
                <Label htmlFor="dica">Sua dica</Label>
                <Textarea
                  id="dica"
                  placeholder="Compartilhe uma dica rapida, formula ou insight..."
                  className="min-h-[150px]"
                  maxLength={280}
                />
                <p className="text-xs text-gray-500 text-right">0/280 caracteres</p>
              </div>
            )}

            {tipoSelecionado !== "artigo" && (
              <div className="space-y-2">
                <Label>Imagem de Capa (opcional)</Label>
                <div className="border-2 border-dashed border-gray-200 rounded-xl p-6 text-center">
                  <Upload className="h-8 w-8 text-gray-300 mx-auto mb-2" />
                  <p className="text-sm text-gray-600">Arraste uma imagem ou clique para enviar</p>
                </div>
              </div>
            )}

            <div className="flex gap-4 pt-4 flex-wrap">
              <Button type="button" variant="outline" className="flex-1 min-w-[120px]" onClick={goBackFromEditor}>
                Cancelar
              </Button>
              {tipoSelecionado === "artigo" ? (
                <>
                  <Button
                    type="button"
                    variant="outline"
                    className="flex-1 min-w-[120px] gap-2"
                    onClick={() => void handleRevisao()}
                    disabled={!formData.titulo.trim()}
                  >
                    <Bot className="h-4 w-4" />
                    Revisao IA (opcional)
                  </Button>
                  <Button
                    type="button"
                    className="flex-1 min-w-[140px] bg-[#1D4ED8] hover:bg-[#1E3A8A] gap-2"
                    onClick={() => void handlePublishArticle()}
                    disabled={
                      publishing ||
                      !formData.titulo.trim() ||
                      (visibility === "classrooms" && selectedClassroomIds.length === 0)
                    }
                  >
                    {publishing ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : null}
                    {loadedArticleStatus === "published" ? "Salvar alteracoes" : "Publicar"}
                  </Button>
                </>
              ) : (
                <Button
                  type="button"
                  className="flex-1 bg-[#1D4ED8] hover:bg-[#1E3A8A] gap-2"
                  onClick={handleRevisao}
                  disabled={!formData.titulo || !formData.disciplina}
                >
                  <Bot className="h-4 w-4" />
                  Enviar para Revisao da IA
                </Button>
              )}
            </div>
          </form>
        </div>
      )}

      <Dialog open={isReviewing} onOpenChange={() => {}}>
        <DialogContent className="sm:max-w-md">
          <div className="text-center py-8">
            <div className="h-16 w-16 rounded-full bg-blue-100 flex items-center justify-center mx-auto mb-4 relative">
              <Bot className="h-8 w-8 text-[#1D4ED8]" />
              <div className="absolute inset-0 rounded-full border-4 border-blue-200 border-t-[#1D4ED8] animate-spin" />
            </div>
            <h3 className="font-display text-lg font-semibold text-gray-900 mb-2">
              A IA esta analisando seu conteudo...
            </h3>
            <p className="text-sm text-gray-600">Verificando originalidade, precisao e qualidade</p>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={showReviewDialog} onOpenChange={setShowReviewDialog}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="font-display">Relatorio de Revisao da IA</DialogTitle>
            <DialogDescription>Veja o resultado da analise do seu conteudo</DialogDescription>
          </DialogHeader>

          {aiReview && (
            <div className="space-y-6">
              <div
                className={`p-4 rounded-lg ${
                  aiReview.statusFinal === "APROVADO"
                    ? "bg-green-50 border border-green-200"
                    : aiReview.statusFinal === "APROVADO_COM_RESSALVAS"
                      ? "bg-amber-50 border border-amber-200"
                      : "bg-red-50 border border-red-200"
                }`}
              >
                <div className="flex items-center gap-3">
                  {aiReview.statusFinal === "APROVADO" ? (
                    <CheckCircle2 className="h-6 w-6 text-[#10B981]" />
                  ) : aiReview.statusFinal === "APROVADO_COM_RESSALVAS" ? (
                    <AlertTriangle className="h-6 w-6 text-amber-500" />
                  ) : (
                    <X className="h-6 w-6 text-red-500" />
                  )}
                  <div>
                    <div className="font-semibold text-gray-900">
                      {aiReview.statusFinal === "APROVADO"
                        ? "Aprovado"
                        : aiReview.statusFinal === "APROVADO_COM_RESSALVAS"
                          ? "Aprovado com Ressalvas"
                          : "Reprovado"}
                    </div>
                    <div className="text-sm text-gray-600">
                      {aiReview.statusFinal === "APROVADO"
                        ? "Seu conteudo esta pronto para publicar!"
                        : aiReview.statusFinal === "APROVADO_COM_RESSALVAS"
                          ? "Revise os pontos abaixo antes de publicar"
                          : "Corrija os problemas encontrados"}
                    </div>
                  </div>
                </div>
              </div>

              <div className="space-y-3">
                {[
                  { label: "Originalidade", data: aiReview.originalidade },
                  { label: "Precisao Conceitual", data: aiReview.precisao },
                  { label: "Qualidade Geral", data: aiReview.qualidade },
                ].map((item) => (
                  <div key={item.label} className="flex items-center gap-3">
                    <div className="flex-1">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-sm font-medium text-gray-700">{item.label}</span>
                        <span
                          className={`text-sm font-semibold ${
                            item.data.status === "ok"
                              ? "text-[#10B981]"
                              : item.data.status === "warning"
                                ? "text-amber-500"
                                : "text-red-500"
                          }`}
                        >
                          {item.data.score}%
                        </span>
                      </div>
                      <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                        <div
                          className={`h-full rounded-full ${
                            item.data.status === "ok"
                              ? "bg-[#10B981]"
                              : item.data.status === "warning"
                                ? "bg-amber-500"
                                : "bg-red-500"
                          }`}
                          style={{ width: `${item.data.score}%` }}
                        />
                      </div>
                      <p className="text-xs text-gray-500 mt-1">{item.data.message}</p>
                    </div>
                  </div>
                ))}
              </div>

              <div>
                <h4 className="font-medium text-gray-900 mb-2">Sugestoes de Melhoria</h4>
                <ul className="space-y-2">
                  {aiReview.sugestoes.map((sugestao, i) => (
                    <li key={i} className="flex items-start gap-2 text-sm text-gray-600">
                      <Lightbulb className="h-4 w-4 text-amber-500 flex-shrink-0 mt-0.5" />
                      {sugestao}
                    </li>
                  ))}
                </ul>
              </div>

              <div className="flex gap-3 pt-4">
                <Button variant="outline" className="flex-1" onClick={() => setShowReviewDialog(false)}>
                  Editar e Reenviar
                </Button>
                <Button
                  className="flex-1 bg-[#10B981] hover:bg-[#059669]"
                  onClick={() => {
                    setShowReviewDialog(false)
                    if (tipoSelecionado === "artigo") void handlePublishArticle()
                    else router.push("/dashboard/professor?published=true")
                  }}
                >
                  Publicar Assim Mesmo
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
