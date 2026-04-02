"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import { 
  FileText, 
  Video, 
  ListChecks, 
  ClipboardList,
  BarChart,
  Lightbulb,
  ArrowLeft,
  Upload,
  Bot,
  CheckCircle2,
  AlertTriangle,
  X,
  Plus
} from "lucide-react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"

const tiposConteudo = [
  { id: "artigo", label: "Artigo", icon: FileText, description: "Texto rico com formatacao, imagens e links" },
  { id: "video", label: "Video", icon: Video, description: "Upload ou link do YouTube" },
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

export default function CriarConteudoPage() {
  const router = useRouter()
  const [step, setStep] = useState<"tipo" | "editor" | "revisao">("tipo")
  const [tipoSelecionado, setTipoSelecionado] = useState<string | null>(null)
  const [isReviewing, setIsReviewing] = useState(false)
  const [showReviewDialog, setShowReviewDialog] = useState(false)
  const [tags, setTags] = useState<string[]>([])
  const [tagInput, setTagInput] = useState("")
  
  const [formData, setFormData] = useState({
    titulo: "",
    disciplina: "",
    nivel: "",
    conteudo: "",
    publicoFeed: true,
  })

  const [aiReview, setAiReview] = useState<AIReview | null>(null)

  const handleTipoSelect = (tipo: string) => {
    setTipoSelecionado(tipo)
    setStep("editor")
  }

  const addTag = () => {
    if (tagInput.trim() && !tags.includes(tagInput.trim())) {
      setTags([...tags, tagInput.trim()])
      setTagInput("")
    }
  }

  const removeTag = (tag: string) => {
    setTags(tags.filter(t => t !== tag))
  }

  const handleRevisao = async () => {
    setIsReviewing(true)
    
    // Simulate AI review
    setTimeout(() => {
      setAiReview({
        originalidade: { 
          score: 95, 
          status: "ok", 
          message: "Nenhum plagio detectado" 
        },
        precisao: { 
          score: 88, 
          status: "warning", 
          message: "Possivel imprecisao no trecho sobre formula de Bhaskara - verifique os sinais" 
        },
        qualidade: { 
          score: 92, 
          status: "ok", 
          message: "Conteudo bem estruturado e claro" 
        },
        sugestoes: [
          "Adicione mais exemplos praticos para facilitar o entendimento",
          "Considere incluir uma imagem ilustrativa da parabola",
          "O ultimo paragrafo poderia ter uma conclusao mais clara"
        ],
        statusFinal: "APROVADO_COM_RESSALVAS"
      })
      setIsReviewing(false)
      setShowReviewDialog(true)
    }, 3000)
  }

  const handlePublish = () => {
    router.push("/dashboard/professor?published=true")
  }

  return (
    <div className="max-w-4xl mx-auto pb-20 lg:pb-0">
      {/* Header */}
      <div className="flex items-center gap-4 mb-6">
        <Button 
          variant="ghost" 
          size="icon"
          onClick={() => step === "editor" ? setStep("tipo") : router.back()}
        >
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div>
          <h1 className="font-display text-2xl font-bold text-gray-900">
            {step === "tipo" ? "Criar Conteudo" : `Novo ${tiposConteudo.find(t => t.id === tipoSelecionado)?.label}`}
          </h1>
          <p className="text-gray-600">
            {step === "tipo" ? "Escolha o tipo de conteudo que deseja criar" : "Preencha os detalhes do seu conteudo"}
          </p>
        </div>
      </div>

      {/* Step: Tipo */}
      {step === "tipo" && (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {tiposConteudo.map((tipo) => (
            <button
              key={tipo.id}
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

      {/* Step: Editor */}
      {step === "editor" && (
        <div className="bg-white rounded-xl border border-gray-100 p-6">
          <form className="space-y-6">
            {/* Titulo */}
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

            {/* Disciplina e Nivel */}
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
                  {disciplinas.map(d => (
                    <option key={d} value={d}>{d}</option>
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
                  {niveis.map(n => (
                    <option key={n} value={n}>{n}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* Tags */}
            <div className="space-y-2">
              <Label>Tags</Label>
              <div className="flex flex-wrap gap-2 mb-2">
                {tags.map(tag => (
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
                  onKeyPress={(e) => e.key === "Enter" && (e.preventDefault(), addTag())}
                />
                <Button type="button" variant="outline" onClick={addTag}>
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
            </div>

            {/* Conteudo */}
            {tipoSelecionado === "artigo" && (
              <div className="space-y-2">
                <Label htmlFor="conteudo">Conteudo</Label>
                <Textarea
                  id="conteudo"
                  placeholder="Escreva seu artigo aqui... (Suporta markdown)"
                  className="min-h-[300px] font-mono text-sm"
                  value={formData.conteudo}
                  onChange={(e) => setFormData({ ...formData, conteudo: e.target.value })}
                />
                <p className="text-xs text-gray-500">
                  Voce pode usar markdown para formatar: **negrito**, *italico*, # titulo, - lista
                </p>
              </div>
            )}

            {tipoSelecionado === "video" && (
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label>Upload de Video</Label>
                  <div className="border-2 border-dashed border-gray-200 rounded-xl p-8 text-center">
                    <Upload className="h-10 w-10 text-gray-300 mx-auto mb-3" />
                    <p className="text-gray-600">Arraste um video ou clique para enviar</p>
                    <p className="text-sm text-gray-400 mt-1">MP4, MOV ate 500MB</p>
                  </div>
                </div>
                <div className="text-center text-gray-500">ou</div>
                <div className="space-y-2">
                  <Label htmlFor="youtube">Link do YouTube</Label>
                  <Input
                    id="youtube"
                    placeholder="https://youtube.com/watch?v=..."
                    className="h-12"
                  />
                </div>
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

            {/* Thumbnail */}
            <div className="space-y-2">
              <Label>Imagem de Capa (opcional)</Label>
              <div className="border-2 border-dashed border-gray-200 rounded-xl p-6 text-center">
                <Upload className="h-8 w-8 text-gray-300 mx-auto mb-2" />
                <p className="text-sm text-gray-600">Arraste uma imagem ou clique para enviar</p>
              </div>
            </div>

            {/* Publicacao */}
            <div className="flex items-center gap-3 p-4 bg-gray-50 rounded-lg">
              <input
                type="checkbox"
                id="publicoFeed"
                checked={formData.publicoFeed}
                onChange={(e) => setFormData({ ...formData, publicoFeed: e.target.checked })}
                className="h-4 w-4 rounded border-gray-300 text-[#1D4ED8] focus:ring-[#1D4ED8]"
              />
              <Label htmlFor="publicoFeed" className="cursor-pointer">
                Publicar no feed publico (ou apenas nas minhas salas)
              </Label>
            </div>

            {/* Actions */}
            <div className="flex gap-4 pt-4">
              <Button 
                type="button" 
                variant="outline" 
                className="flex-1"
                onClick={() => setStep("tipo")}
              >
                Cancelar
              </Button>
              <Button 
                type="button" 
                className="flex-1 bg-[#1D4ED8] hover:bg-[#1E3A8A] gap-2"
                onClick={handleRevisao}
                disabled={!formData.titulo || !formData.disciplina}
              >
                <Bot className="h-4 w-4" />
                Enviar para Revisao da IA
              </Button>
            </div>
          </form>
        </div>
      )}

      {/* Loading Dialog */}
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
            <p className="text-sm text-gray-600">
              Verificando originalidade, precisao e qualidade
            </p>
          </div>
        </DialogContent>
      </Dialog>

      {/* Review Dialog */}
      <Dialog open={showReviewDialog} onOpenChange={setShowReviewDialog}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="font-display">Relatorio de Revisao da IA</DialogTitle>
            <DialogDescription>
              Veja o resultado da analise do seu conteudo
            </DialogDescription>
          </DialogHeader>

          {aiReview && (
            <div className="space-y-6">
              {/* Status Final */}
              <div className={`p-4 rounded-lg ${
                aiReview.statusFinal === "APROVADO" ? "bg-green-50 border border-green-200" :
                aiReview.statusFinal === "APROVADO_COM_RESSALVAS" ? "bg-amber-50 border border-amber-200" :
                "bg-red-50 border border-red-200"
              }`}>
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
                      {aiReview.statusFinal === "APROVADO" ? "Aprovado" :
                       aiReview.statusFinal === "APROVADO_COM_RESSALVAS" ? "Aprovado com Ressalvas" :
                       "Reprovado"}
                    </div>
                    <div className="text-sm text-gray-600">
                      {aiReview.statusFinal === "APROVADO" ? "Seu conteudo esta pronto para publicar!" :
                       aiReview.statusFinal === "APROVADO_COM_RESSALVAS" ? "Revise os pontos abaixo antes de publicar" :
                       "Corrija os problemas encontrados"}
                    </div>
                  </div>
                </div>
              </div>

              {/* Scores */}
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
                        <span className={`text-sm font-semibold ${
                          item.data.status === "ok" ? "text-[#10B981]" :
                          item.data.status === "warning" ? "text-amber-500" : "text-red-500"
                        }`}>{item.data.score}%</span>
                      </div>
                      <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                        <div 
                          className={`h-full rounded-full ${
                            item.data.status === "ok" ? "bg-[#10B981]" :
                            item.data.status === "warning" ? "bg-amber-500" : "bg-red-500"
                          }`}
                          style={{ width: `${item.data.score}%` }}
                        />
                      </div>
                      <p className="text-xs text-gray-500 mt-1">{item.data.message}</p>
                    </div>
                  </div>
                ))}
              </div>

              {/* Sugestoes */}
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

              {/* Actions */}
              <div className="flex gap-3 pt-4">
                <Button variant="outline" className="flex-1" onClick={() => setShowReviewDialog(false)}>
                  Editar e Reenviar
                </Button>
                <Button 
                  className="flex-1 bg-[#10B981] hover:bg-[#059669]"
                  onClick={handlePublish}
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
