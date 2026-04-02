"use client"

import { useState } from "react"
import Link from "next/link"
import { useParams } from "next/navigation"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { 
  CheckCircle2, 
  MapPin, 
  Link as LinkIcon, 
  Users, 
  BookOpen, 
  PlayCircle,
  FileText,
  Star,
  Share2,
  ChevronLeft,
  GraduationCap
} from "lucide-react"

// Mock Profile
const mockProfile = {
  nome: "Profa. Maria Silva",
  slug: "maria-silva",
  avatar: null,
  verificado: true,
  disciplinas: ["Matemática", "Física"],
  niveis: ["Fundamental II", "Ensino Médio", "ENEM"],
  local: "São Paulo, SP",
  site: "mariasilva.edu.br",
  nota: 4.9,
  seguidores: "2.3k",
  alunos: "150+",
  bio: "Especialista em didática descomplicada. Professora há 12 anos em escolas públicas e particulares, focada em tornar a matemática acessível para todos, independentemente da dificuldade inicial. Acredito que o erro constrói o acerto.",
  publicacoes: [
    {
      id: 1,
      titulo: "Equações do Segundo Grau: Guia Completo e Definitivo",
      tipo: "Artigo",
      data: "Há 2 dias",
      likes: 89,
      views: "1.2k"
    },
    {
      id: 2,
      titulo: "Resolução do ENEM 2025 - Matemática",
      tipo: "Vídeo",
      data: "Há 1 semana",
      likes: 450,
      views: "3.5k"
    },
    {
      id: 3,
      titulo: "Lista de Exercícios: Trigonometria",
      tipo: "Exercício",
      data: "Há 2 semanas",
      likes: 34,
      views: "800"
    }
  ]
}

export default function PerfilProfessorPublico() {
  const params = useParams()
  // const slug = params?.slug
  const [activeTab, setActiveTab] = useState("publicacoes")
  const [isFollowing, setIsFollowing] = useState(false)

  // Em um cenário real, faríamos fetch(slug)
  const prof = mockProfile

  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      {/* Top Banner Cover */}
      <div className="h-48 md:h-64 bg-gradient-to-r from-[#1E3A8A] to-[#1D4ED8]" />
      
      <div className="max-w-4xl mx-auto px-4 sm:px-6 -mt-20">
        
        {/* Profile Card Principal */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 sm:p-8 mb-8 relative">
          
          <div className="flex flex-col sm:flex-row gap-6">
            
            {/* Avatar Central */}
            <div className="relative -mt-16 sm:-mt-20 mx-auto sm:mx-0 shrink-0">
              <div className="h-32 w-32 md:h-40 md:w-40 bg-white rounded-full p-2 rounded-full border border-gray-100 shadow-md">
                <div className="w-full h-full rounded-full bg-gradient-to-tr from-blue-100 to-indigo-50 flex items-center justify-center text-[#1D4ED8] font-display font-bold text-4xl overflow-hidden">
                  {prof.avatar ? (
                    <img src={prof.avatar} alt={prof.nome} className="w-full h-full object-cover" />
                  ) : (
                    prof.nome.charAt(0)
                  )}
                </div>
              </div>
            </div>

            {/* Informações Primárias */}
            <div className="flex-1 text-center sm:text-left mt-2 sm:mt-0">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-2">
                <div>
                  <h1 className="font-display text-2xl sm:text-3xl font-bold text-gray-900 flex items-center justify-center sm:justify-start gap-2">
                    {prof.nome}
                    {prof.verificado && <CheckCircle2 className="h-5 w-5 text-[#10B981] mt-1" />}
                  </h1>
                  <p className="text-gray-500 font-medium">{prof.disciplinas.join(" & ")}</p>
                </div>
                
                <div className="flex items-center gap-2 justify-center sm:justify-start">
                  <Button variant="outline" size="icon" className="shrink-0 text-gray-500 hover:text-gray-900">
                    <Share2 className="h-4 w-4" />
                  </Button>
                  <Button 
                    className={`px-8 ${isFollowing ? 'bg-gray-100 text-gray-800 hover:bg-gray-200' : 'bg-[#1D4ED8] text-white hover:bg-[#1E3A8A]'}`}
                    onClick={() => setIsFollowing(!isFollowing)}
                  >
                    {isFollowing ? 'Seguindo' : 'Seguir'}
                  </Button>
                </div>
              </div>

              {/* Informações Secundárias */}
              <div className="flex flex-wrap items-center justify-center sm:justify-start gap-4 text-sm text-gray-600 mb-6">
                <div className="flex items-center gap-1">
                  <Star className="h-4 w-4 text-amber-500 fill-current" />
                  <span className="font-medium text-gray-900">{prof.nota}</span>
                  <span>avaliação</span>
                </div>
                <div className="flex items-center gap-1">
                  <MapPin className="h-4 w-4 text-gray-400" />
                  <span>{prof.local}</span>
                </div>
                <div className="flex items-center gap-1 text-[#1D4ED8] hover:underline cursor-pointer">
                  <LinkIcon className="h-4 w-4" />
                  <span>{prof.site}</span>
                </div>
              </div>

              {/* Métricas e Tags */}
              <div className="flex flex-col sm:flex-row gap-6 pt-4 border-t border-gray-100">
                <div className="flex items-center justify-center sm:justify-start gap-6">
                  <div>
                    <div className="font-display font-bold text-xl text-gray-900">{prof.seguidores}</div>
                    <div className="text-xs text-gray-500 flex items-center gap-1"><Users className="h-3 w-3" /> Seguidores</div>
                  </div>
                  <div>
                    <div className="font-display font-bold text-xl text-gray-900">{prof.alunos}</div>
                    <div className="text-xs text-gray-500 flex items-center gap-1"><GraduationCap className="h-3 w-3" /> Alunos</div>
                  </div>
                  <div>
                    <div className="font-display font-bold text-xl text-gray-900">{prof.publicacoes.length}</div>
                    <div className="text-xs text-gray-500 flex items-center gap-1"><BookOpen className="h-3 w-3" /> Publicações</div>
                  </div>
                </div>
              </div>

            </div>
          </div>
        </div>

        {/* Content Layout */}
        <div className="grid md:grid-cols-3 gap-8">
          
          {/* Sidebar */}
          <div className="md:col-span-1 space-y-6">
            <div className="bg-white rounded-xl border border-gray-100 p-6">
              <h3 className="font-display font-semibold text-gray-900 mb-4">Sobre mim</h3>
              <p className="text-sm text-gray-600 leading-relaxed">
                {prof.bio}
              </p>
            </div>

            <div className="bg-white rounded-xl border border-gray-100 p-6">
              <h3 className="font-display font-semibold text-gray-900 mb-4">Níveis de Ensino</h3>
              <div className="flex flex-wrap gap-2">
                {prof.niveis.map(n => (
                  <Badge key={n} variant="secondary" className="bg-gray-100 text-gray-700 hover:bg-gray-200">
                    {n}
                  </Badge>
                ))}
              </div>
            </div>
            
            <div className="bg-blue-50 bg-opacity-50 rounded-xl border border-blue-100 p-6 text-center">
              <h3 className="font-display font-semibold text-gray-900 mb-2">Quer estudar comigo?</h3>
              <p className="text-sm text-gray-600 mb-4">Entre em uma das minhas turmas virtuais para ter acesso a mais conteúdo e acompanhamento.</p>
              <Button className="w-full bg-[#1D4ED8] hover:bg-[#1E3A8A]">
                Ver Turmas Disponíveis
              </Button>
            </div>
          </div>

          {/* Main Feed / Content */}
          <div className="md:col-span-2">
            
            {/* Tabs */}
            <div className="flex gap-6 border-b border-gray-200 mb-6 px-2">
              <button
                className={`pb-3 font-medium text-sm transition-colors relative ${activeTab === 'publicacoes' ? 'text-[#1D4ED8]' : 'text-gray-500 hover:text-gray-900'}`}
                onClick={() => setActiveTab('publicacoes')}
              >
                Publicações recentes
                {activeTab === 'publicacoes' && <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#1D4ED8] rounded-t-full" />}
              </button>
              <button
                className={`pb-3 font-medium text-sm transition-colors relative ${activeTab === 'sobre' ? 'text-[#1D4ED8]' : 'text-gray-500 hover:text-gray-900'}`}
                onClick={() => setActiveTab('sobre')}
              >
                Avaliações
                {activeTab === 'sobre' && <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#1D4ED8] rounded-t-full" />}
              </button>
            </div>

            {/* Panel: Publicações */}
            {activeTab === 'publicacoes' && (
              <div className="space-y-4">
                {prof.publicacoes.map(pub => (
                  <div key={pub.id} className="bg-white rounded-xl border border-gray-100 p-5 hover:border-[#1D4ED8]/30 hover:shadow-md cursor-pointer transition-all">
                    <div className="flex items-start gap-4">
                      
                      <div className={`h-12 w-12 rounded-lg flex items-center justify-center shrink-0 ${
                        pub.tipo === 'Vídeo' ? 'bg-red-50 text-red-500' :
                        pub.tipo === 'Artigo' ? 'bg-blue-50 text-blue-500' :
                        'bg-amber-50 text-amber-500'
                      }`}>
                        {pub.tipo === 'Vídeo' ? <PlayCircle className="h-6 w-6" /> :
                         pub.tipo === 'Artigo' ? <FileText className="h-6 w-6" /> :
                         <BookOpen className="h-6 w-6" />}
                      </div>
                      
                      <div className="flex-1">
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">{pub.tipo}</span>
                          <span className="text-xs text-gray-400">{pub.data}</span>
                        </div>
                        <h3 className="font-medium text-gray-900 text-lg mb-2 leading-tight">{pub.titulo}</h3>
                        
                        <div className="flex items-center gap-4 text-xs text-gray-500">
                          <span className="flex items-center gap-1"><BookOpen className="h-3.5 w-3.5" /> {pub.views} visualizações</span>
                          <span className="flex items-center gap-1">❤️ {pub.likes} curtidas</span>
                        </div>
                      </div>

                    </div>
                  </div>
                ))}
              </div>
            )}

            {activeTab === 'sobre' && (
              <div className="bg-white rounded-xl border border-gray-100 p-12 text-center text-gray-500">
                O sistema de avaliações ficará disponível em breve.
              </div>
            )}

          </div>

        </div>
      </div>
    </div>
  )
}
