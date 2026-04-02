"use client"

import { useState, useRef, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { 
  Send, 
  Bot, 
  Sparkles, 
  Lightbulb,
  BookOpen,
  Calculator,
  Atom,
  Globe,
  MessageSquarePlus
} from "lucide-react"

interface Message {
  id: number
  role: "user" | "assistant"
  content: string
  timestamp: Date
}

const sugestoesDuvidas = [
  { icon: Calculator, text: "Como resolver equacao do 2o grau?" },
  { icon: Atom, text: "O que e a Lei da Inercia?" },
  { icon: Globe, text: "Quais foram as causas da Revolucao Francesa?" },
  { icon: BookOpen, text: "Como analisar um texto literario?" },
]

const mensagensIniciais: Message[] = [
  {
    id: 1,
    role: "assistant",
    content: "Ola! Eu sou o Edu, seu tutor de estudos. Estou aqui para te ajudar a aprender, nao para dar respostas prontas. Vamos pensar juntos! Qual e a sua duvida hoje?",
    timestamp: new Date(),
  }
]

export default function TutorIAPage() {
  const [messages, setMessages] = useState<Message[]>(mensagensIniciais)
  const [input, setInput] = useState("")
  const [isTyping, setIsTyping] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  const handleSend = async () => {
    if (!input.trim()) return

    const userMessage: Message = {
      id: messages.length + 1,
      role: "user",
      content: input,
      timestamp: new Date(),
    }

    setMessages(prev => [...prev, userMessage])
    setInput("")
    setIsTyping(true)

    // Simulate AI response
    setTimeout(() => {
      const aiResponses: Record<string, string> = {
        "equacao": "Otima pergunta! Vamos pensar juntos sobre equacoes do segundo grau. Primeiro, me conta: voce sabe identificar os coeficientes a, b e c em uma equacao como ax2 + bx + c = 0? Por exemplo, na equacao x2 - 5x + 6 = 0, quais seriam esses valores?",
        "inercia": "A Lei da Inercia e fascinante! Antes de eu explicar, deixa eu te fazer uma pergunta: voce ja percebeu que quando um onibus freia de repente, seu corpo vai pra frente? Por que voce acha que isso acontece?",
        "revolucao": "A Revolucao Francesa e um tema muito rico! Vamos por partes: o que voce ja sabe sobre como era a vida na Franca antes de 1789? Quem eram os grupos sociais que existiam?",
        "texto": "Analisar textos literarios pode parecer dificil no comeco, mas fica mais facil com pratica! Me conta: quando voce le um texto, o que voce costuma observar primeiro? O titulo? Os personagens? O cenario?",
      }

      let response = "Interessante sua duvida! Vamos pensar juntos. Me conta o que voce ja sabe sobre esse assunto? Qual parte especificamente esta te confundindo?"

      for (const [key, value] of Object.entries(aiResponses)) {
        if (input.toLowerCase().includes(key)) {
          response = value
          break
        }
      }

      const aiMessage: Message = {
        id: messages.length + 2,
        role: "assistant",
        content: response,
        timestamp: new Date(),
      }

      setMessages(prev => [...prev, aiMessage])
      setIsTyping(false)
    }, 1500)
  }

  const handleSuggestionClick = (text: string) => {
    setInput(text)
  }

  const handleNewChat = () => {
    setMessages(mensagensIniciais)
  }

  return (
    <div className="max-w-4xl mx-auto h-[calc(100vh-8rem)] lg:h-[calc(100vh-6rem)] flex flex-col pb-20 lg:pb-0">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="h-12 w-12 rounded-xl bg-gradient-to-br from-[#1D4ED8] to-[#10B981] flex items-center justify-center">
            <Bot className="h-6 w-6 text-white" />
          </div>
          <div>
            <h1 className="font-display text-xl font-bold text-gray-900">Tutor Edu</h1>
            <p className="text-sm text-gray-500 flex items-center gap-1">
              <span className="h-2 w-2 rounded-full bg-green-500" />
              Online e pronto para ajudar
            </p>
          </div>
        </div>
        <Button variant="outline" onClick={handleNewChat} className="gap-2">
          <MessageSquarePlus className="h-4 w-4" />
          Nova conversa
        </Button>
      </div>

      {/* Chat Container */}
      <div className="flex-1 bg-white rounded-xl border border-gray-100 flex flex-col overflow-hidden">
        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {messages.map((message) => (
            <div
              key={message.id}
              className={`flex gap-3 ${message.role === "user" ? "flex-row-reverse" : ""}`}
            >
              {message.role === "assistant" ? (
                <Avatar className="h-8 w-8 flex-shrink-0">
                  <AvatarFallback className="bg-gradient-to-br from-[#1D4ED8] to-[#10B981] text-white text-xs">
                    <Bot className="h-4 w-4" />
                  </AvatarFallback>
                </Avatar>
              ) : (
                <Avatar className="h-8 w-8 flex-shrink-0">
                  <AvatarFallback className="bg-[#10B981] text-white text-xs">JM</AvatarFallback>
                </Avatar>
              )}
              <div
                className={`max-w-[80%] rounded-2xl px-4 py-3 ${
                  message.role === "user"
                    ? "bg-[#10B981] text-white rounded-tr-sm"
                    : "bg-gray-100 text-gray-900 rounded-tl-sm"
                }`}
              >
                <p className="text-sm leading-relaxed whitespace-pre-wrap">{message.content}</p>
              </div>
            </div>
          ))}

          {isTyping && (
            <div className="flex gap-3">
              <Avatar className="h-8 w-8 flex-shrink-0">
                <AvatarFallback className="bg-gradient-to-br from-[#1D4ED8] to-[#10B981] text-white text-xs">
                  <Bot className="h-4 w-4" />
                </AvatarFallback>
              </Avatar>
              <div className="bg-gray-100 rounded-2xl rounded-tl-sm px-4 py-3">
                <div className="flex items-center gap-1">
                  <div className="h-2 w-2 rounded-full bg-gray-400 animate-bounce" style={{ animationDelay: "0ms" }} />
                  <div className="h-2 w-2 rounded-full bg-gray-400 animate-bounce" style={{ animationDelay: "150ms" }} />
                  <div className="h-2 w-2 rounded-full bg-gray-400 animate-bounce" style={{ animationDelay: "300ms" }} />
                </div>
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Suggestions */}
        {messages.length <= 1 && (
          <div className="px-4 pb-4">
            <div className="flex items-center gap-2 mb-3">
              <Lightbulb className="h-4 w-4 text-amber-500" />
              <span className="text-sm text-gray-500">Sugestoes de duvidas:</span>
            </div>
            <div className="flex flex-wrap gap-2">
              {sugestoesDuvidas.map((sugestao, index) => (
                <button
                  key={index}
                  onClick={() => handleSuggestionClick(sugestao.text)}
                  className="flex items-center gap-2 px-3 py-2 rounded-full bg-gray-100 text-sm text-gray-700 hover:bg-gray-200 transition-colors"
                >
                  <sugestao.icon className="h-4 w-4 text-gray-500" />
                  {sugestao.text}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Input */}
        <div className="p-4 border-t border-gray-100">
          <form 
            onSubmit={(e) => { e.preventDefault(); handleSend(); }}
            className="flex gap-3"
          >
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Digite sua duvida..."
              className="flex-1 h-12 px-4 rounded-xl border border-gray-200 bg-gray-50 focus:outline-none focus:ring-2 focus:ring-[#10B981] focus:border-transparent"
            />
            <Button 
              type="submit" 
              size="icon" 
              className="h-12 w-12 bg-[#10B981] hover:bg-[#059669]"
              disabled={!input.trim() || isTyping}
            >
              <Send className="h-5 w-5" />
            </Button>
          </form>
          <p className="text-xs text-gray-400 mt-2 text-center">
            O Edu ensina atraves de perguntas, ajudando voce a pensar e aprender de verdade.
          </p>
        </div>
      </div>

      {/* AI Info Card */}
      <div className="mt-4 bg-gradient-to-r from-[#1D4ED8]/10 to-[#10B981]/10 rounded-xl p-4 border border-[#1D4ED8]/20">
        <div className="flex items-start gap-3">
          <Sparkles className="h-5 w-5 text-[#1D4ED8] flex-shrink-0 mt-0.5" />
          <div>
            <h3 className="font-medium text-gray-900 mb-1">Como o Tutor Edu funciona?</h3>
            <p className="text-sm text-gray-600">
              O Edu usa o metodo socratico: em vez de dar respostas prontas, ele faz perguntas que te guiam 
              para descobrir a solucao. Isso ajuda voce a aprender de verdade e fixar o conteudo!
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
