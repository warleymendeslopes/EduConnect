import { Star, Quote } from "lucide-react"

const testimonials = [
  {
    name: "Prof. Maria Santos",
    role: "Professora de Matemática",
    avatar: "MS",
    content: "A revisão por IA me ajuda a manter a qualidade do conteúdo. Economizo horas revisando e tenho mais tempo para interagir com meus alunos.",
    rating: 5
  },
  {
    name: "Lucas Ferreira",
    role: "Aluno de Ensino Médio",
    avatar: "LF",
    content: "O Tutor Edu é incrível! Ele não me dá as respostas, mas me faz pensar de um jeito que eu realmente aprendo. Melhorei muito em física.",
    rating: 5
  },
  {
    name: "Prof. Carlos Oliveira",
    role: "Professor de História",
    avatar: "CO",
    content: "Criar salas de aula e acompanhar o desempenho dos alunos ficou muito mais fácil. A plataforma é intuitiva e os alunos adoram.",
    rating: 5
  },
  {
    name: "Ana Beatriz",
    role: "Aluna de Graduação",
    avatar: "AB",
    content: "O plano de estudos personalizado mudou minha rotina. Agora sei exatamente o que estudar e quando, sem me sentir sobrecarregada.",
    rating: 5
  },
  {
    name: "Prof. Roberto Lima",
    role: "Professor de Química",
    avatar: "RL",
    content: "A análise de desempenho me mostra quais alunos precisam de mais atenção. Consigo intervir antes que eles fiquem para trás.",
    rating: 5
  },
  {
    name: "Julia Costa",
    role: "Aluna de Concurso",
    avatar: "JC",
    content: "Uso o EduConnect para me preparar para concursos. O feed me traz conteúdo relevante e o tutor me ajuda nas questões difíceis.",
    rating: 5
  }
]

export function TestimonialsSection() {
  return (
    <section className="py-20 lg:py-32 bg-white">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <div className="text-center max-w-3xl mx-auto mb-16">
          <h2 className="font-display text-3xl sm:text-4xl font-bold text-gray-900">
            O que dizem sobre o EduConnect
          </h2>
          <p className="mt-4 text-lg text-gray-600">
            Milhares de professores e alunos já transformaram sua forma de ensinar e aprender
          </p>
        </div>

        {/* Testimonials Grid */}
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {testimonials.map((testimonial) => (
            <div 
              key={testimonial.name}
              className="rounded-xl border border-gray-200 bg-white p-6 transition-all hover:shadow-lg"
            >
              {/* Quote Icon */}
              <Quote className="h-8 w-8 text-[#1D4ED8]/20 mb-4" />
              
              {/* Content */}
              <p className="text-gray-700 leading-relaxed mb-6">
                {`"${testimonial.content}"`}
              </p>
              
              {/* Rating */}
              <div className="flex gap-1 mb-4">
                {Array.from({ length: testimonial.rating }).map((_, i) => (
                  <Star key={i} className="h-4 w-4 fill-[#F59E0B] text-[#F59E0B]" />
                ))}
              </div>
              
              {/* Author */}
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-full bg-gradient-to-br from-[#1D4ED8] to-[#10B981] flex items-center justify-center text-white font-semibold text-sm">
                  {testimonial.avatar}
                </div>
                <div>
                  <div className="font-semibold text-gray-900">{testimonial.name}</div>
                  <div className="text-sm text-gray-500">{testimonial.role}</div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
