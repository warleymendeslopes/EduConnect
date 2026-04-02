"use client"

import { useState } from "react"
import Link from "next/link"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { 
  Search,
  Filter,
  Users,
  CheckCircle2,
  BookOpen,
  ChevronRight,
  TrendingUp,
  Star
} from "lucide-react"

// Mock dos professores para explorar
const mockProfessores = [
  {
    id: "maria-silva",
    slug: "maria-silva",
    nome: "Profa. Maria Silva",
    disciplinas: ["Matemática", "Física"],
    nivel: ["Ensino Fundamental II", "Ensino Médio"],
    seguidores: "2.3k",
    publicacoes: 45,
    verificado: true,
    bio: "Especialista em didática descomplicada. Mais de 10 anos preparando alunos para o ENEM com foco em exatas.",
    nota: 4.9,
    emAlta: true
  },
  {
    id: "joao-pereira",
    slug: "joao-pereira",
    nome: "Prof. João Pereira",
    disciplinas: ["História", "Geografia", "Sociologia"],
    nivel: ["Ensino Médio", "Pré-Vestibular"],
    seguidores: "8.5k",
    publicacoes: 120,
    verificado: true,
    bio: "História contada como se fosse série. Prof. de cursinho, autor e pesquisador.",
    nota: 4.8,
    emAlta: true
  },
  {
    id: "ana-clara",
    slug: "ana-clara-bio",
    nome: "Ana Clara Souza",
    disciplinas: ["Biologia"],
    nivel: ["Ensino Médio"],
    seguidores: "850",
    publicacoes: 12,
    verificado: false,
    bio: "Desvendando a Biologia celular e genética de forma visual. Estudante de medicina.",
    nota: 4.6,
    emAlta: false
  },
  {
    id: "carlos-mendes",
    slug: "carlos-mendes",
    nome: "Prof. Carlos Mendes",
    disciplinas: ["Química"],
    nivel: ["Ensino Médio", "Graduação"],
    seguidores: "5.1k",
    publicacoes: 88,
    verificado: true,
    bio: "Química orgânica não precisa ser um pesadelo. Vamos dominar as reações juntos!",
    nota: 4.9,
    emAlta: false
  },
  {
    id: "lucia-fernandes",
    slug: "lucia-fernandes",
    nome: "Lúcia Fernandes",
    disciplinas: ["Redação", "Português"],
    nivel: ["Ensino Fundamental", "Ensino Médio", "ENEM"],
    seguidores: "12k",
    publicacoes: 210,
    verificado: true,
    bio: "Guia completo para a nota 1000. Dicas semanais de repertório sociocultural.",
    nota: 5.0,
    emAlta: true
  }
]

export default function AlunoExplorarPage() {
  const [busca, setBusca] = useState("")
  
  // Fitro simples no cliente pelo nome ou disciplina
  const professoresFiltrados = mockProfessores.filter(prof => 
    prof.nome.toLowerCase().includes(busca.toLowerCase()) || 
    prof.disciplinas.some(d => d.toLowerCase().includes(busca.toLowerCase()))
  )

  return (
    <div className="max-w-6xl mx-auto pb-20 lg:pb-0">
      
      {/* Header */}
      <div className="mb-8">
        <h1 className="font-display text-2xl lg:text-3xl font-bold text-gray-900 mb-2">Explorar Professores</h1>
        <p className="text-gray-600">Encontre os melhores mentores para a sua jornada de aprendizado</p>
      </div>

      {/* Buscar e Filtros */}
      <div className="flex flex-col md:flex-row gap-4 mb-8">
        <div className="relative flex-1">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <Search className="h-5 w-5 text-gray-400" />
          </div>
          <input
            type="text"
            className="block w-full pl-10 pr-3 py-3 border border-gray-200 rounded-xl leading-5 bg-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#1D4ED8]/20 focus:border-[#1D4ED8] transition-colors"
            placeholder="Buscar por nome ou disciplina, ex: Matemática..."
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
          />
        </div>
        <Button variant="outline" className="gap-2 shrink-0 h-[50px] rounded-xl px-6">
          <Filter className="h-4 w-4" />
          Filtros
        </Button>
      </div>

      {/* Tags de Disciplina Sugeridas */}
      <div className="flex overflow-x-auto pb-4 mb-4 gap-2 no-scrollbar">
        {["Todos", "Matemática", "Física", "Química", "Biologia", "História", "Redação"].map((tag, i) => (
          <button 
            key={tag} 
            className={`whitespace-nowrap px-4 py-2 rounded-full text-sm font-medium transition-colors ${
              i === 0 ? "bg-[#1D4ED8] text-white" : "bg-white border border-gray-200 text-gray-600 hover:bg-gray-50"
            }`}
          >
            {tag}
          </button>
        ))}
      </div>

      {/* Título de Seção */}
      <div className="flex items-center gap-2 mb-6">
        <TrendingUp className="h-5 w-5 text-[#10B981]" />
        <h2 className="font-display font-semibold text-xl text-gray-900">Em Destaque</h2>
      </div>

      {/* Grid de Professores */}
      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
        {professoresFiltrados.map((prof) => (
          <Link key={prof.id} href={`/professor/${prof.slug}`} className="block group">
            <div className="bg-white rounded-xl border border-gray-100 p-5 hover:shadow-lg hover:border-[#1D4ED8]/30 transition-all h-full flex flex-col relative overflow-hidden">
              
              {/* Badge Em Alta */}
              {prof.emAlta && (
                <div className="absolute top-0 right-0 bg-[#F59E0B] text-white text-[10px] font-bold px-3 py-1 uppercase rounded-bl-lg tracking-wider">
                  Em Alta 🔥
                </div>
              )}
              
              <div className="flex items-start gap-4 mb-4">
                <div className="h-16 w-16 rounded-full bg-gradient-to-tr from-blue-100 to-indigo-50 text-[#1D4ED8] flex items-center justify-center font-display font-bold text-xl shrink-0 border border-blue-100 group-hover:scale-105 transition-transform">
                  {prof.nome.charAt(0)}
                  {prof.nome.includes(' ') ? prof.nome.split(' ')[1].charAt(0) : ''}
                </div>
                <div>
                  <h3 className="font-display font-semibold text-lg text-gray-900 flex items-center gap-1.5">
                    {prof.nome}
                    {prof.verificado && (
                      <CheckCircle2 className="h-4 w-4 text-[#10B981]" />
                    )}
                  </h3>
                  <div className="flex items-center gap-1 text-sm font-medium text-amber-500 mb-1">
                    <Star className="h-3.5 w-3.5 fill-current" />
                    <span>{prof.nota}</span>
                  </div>
                  <div className="flex flex-wrap gap-1 mt-1.5">
                    {prof.disciplinas.slice(0, 2).map(d => (
                      <Badge key={d} variant="secondary" className="bg-gray-100 text-gray-600 text-[10px] py-0">
                        {d}
                      </Badge>
                    ))}
                    {prof.disciplinas.length > 2 && (
                      <Badge variant="secondary" className="bg-gray-100 text-gray-600 text-[10px] py-0">
                        +{prof.disciplinas.length - 2}
                      </Badge>
                    )}
                  </div>
                </div>
              </div>
              
              <p className="text-gray-600 text-sm mb-6 line-clamp-2">
                {prof.bio}
              </p>
              
              <div className="mt-auto pt-4 border-t border-gray-100 flex items-center justify-between text-sm">
                <div className="flex items-center gap-4 text-gray-500">
                  <div className="flex items-center gap-1.5">
                    <Users className="h-4 w-4 text-gray-400" />
                    <span>{prof.seguidores}</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <BookOpen className="h-4 w-4 text-gray-400" />
                    <span>{prof.publicacoes} posts</span>
                  </div>
                </div>
                <div className="text-[#1D4ED8] font-medium flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity -translate-x-2 group-hover:translate-x-0">
                  Ver Perfil <ChevronRight className="h-4 w-4" />
                </div>
              </div>
            </div>
          </Link>
        ))}
      </div>

      {/* Empty State para Busca */}
      {professoresFiltrados.length === 0 && (
        <div className="text-center py-16 bg-white rounded-xl border border-dashed border-gray-200">
          <Users className="h-12 w-12 text-gray-300 mx-auto mb-4" />
          <h3 className="font-display font-semibold text-lg text-gray-900 mb-2">Nenhum professor encontrado</h3>
          <p className="text-gray-500">Tente buscar por termos diferentes ou remover os filtros aplicados.</p>
          <Button variant="outline" className="mt-6" onClick={() => setBusca("")}>
            Limpar Busca
          </Button>
        </div>
      )}

    </div>
  )
}
