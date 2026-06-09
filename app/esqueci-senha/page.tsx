"use client"

import { FormEvent, useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import {
  AlertCircle,
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  Eye,
  EyeOff,
  GraduationCap,
  KeyRound,
  Lock,
  Mail,
  RotateCcw,
  ShieldCheck,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  InputOTP,
  InputOTPGroup,
  InputOTPSlot,
} from "@/components/ui/input-otp"
import { Label } from "@/components/ui/label"

type Step = "email" | "code" | "password" | "success"

type ApiResponse = {
  ok: boolean
  error?: string
}

async function postJson(path: string, body: unknown): Promise<ApiResponse> {
  const response = await fetch(path, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  })
  const data = await response.json().catch(() => ({}))

  if (!response.ok || !data?.ok) {
    return {
      ok: false,
      error: data?.error || "Nao foi possivel concluir a acao",
    }
  }

  return { ok: true }
}

export default function ForgotPasswordPage() {
  const router = useRouter()
  const [step, setStep] = useState<Step>("email")
  const [email, setEmail] = useState("")
  const [code, setCode] = useState("")
  const [password, setPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [showPassword, setShowPassword] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [message, setMessage] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const normalizedEmail = email.toLowerCase().trim()

  async function handleRequestCode(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setIsLoading(true)
    setError(null)
    setMessage(null)

    const result = await postJson("/api/auth/password-reset/request", {
      email: normalizedEmail,
    })

    setIsLoading(false)
    if (!result.ok) {
      setError(result.error || "Nao foi possivel enviar o codigo")
      return
    }

    setCode("")
    setStep("code")
    setMessage("Se o e-mail estiver cadastrado, enviaremos um codigo de recuperacao.")
  }

  async function handleVerifyCode(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setIsLoading(true)
    setError(null)
    setMessage(null)

    const result = await postJson("/api/auth/password-reset/verify", {
      email: normalizedEmail,
      code,
    })

    setIsLoading(false)
    if (!result.ok) {
      setError(result.error || "Codigo invalido")
      return
    }

    setStep("password")
    setMessage("Codigo confirmado. Defina uma nova senha.")
  }

  async function handleConfirmPassword(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setIsLoading(true)
    setError(null)
    setMessage(null)

    if (password.length < 6) {
      setIsLoading(false)
      setError("A senha deve ter pelo menos 6 caracteres")
      return
    }

    if (password !== confirmPassword) {
      setIsLoading(false)
      setError("As senhas nao coincidem")
      return
    }

    const result = await postJson("/api/auth/password-reset/confirm", {
      email: normalizedEmail,
      code,
      password,
      confirmPassword,
    })

    setIsLoading(false)
    if (!result.ok) {
      setError(result.error || "Nao foi possivel alterar a senha")
      return
    }

    setStep("success")
    setPassword("")
    setConfirmPassword("")
    setMessage("Senha alterada com sucesso.")
  }

  async function handleResendCode() {
    setIsLoading(true)
    setError(null)
    setMessage(null)

    const result = await postJson("/api/auth/password-reset/request", {
      email: normalizedEmail,
    })

    setIsLoading(false)
    if (!result.ok) {
      setError(result.error || "Nao foi possivel reenviar o codigo")
      return
    }

    setCode("")
    setMessage("Se for possivel reenviar agora, enviaremos um novo codigo para o seu e-mail.")
  }

  return (
    <div className="min-h-screen flex">
      <div className="flex-1 flex items-center justify-center p-8">
        <div className="w-full max-w-md">
          <Link href="/" className="flex items-center gap-2 mb-8">
            <div className="h-10 w-10 rounded-lg bg-gradient-to-br from-[#1D4ED8] to-[#1E3A8A] flex items-center justify-center">
              <GraduationCap className="h-5 w-5 text-white" />
            </div>
            <span className="font-display text-2xl font-bold text-gray-900">EduConnect</span>
          </Link>

          <div className="mb-8">
            <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-lg bg-blue-50 text-[#1D4ED8]">
              {step === "success" ? (
                <CheckCircle2 className="h-6 w-6" />
              ) : step === "password" ? (
                <Lock className="h-6 w-6" />
              ) : step === "code" ? (
                <ShieldCheck className="h-6 w-6" />
              ) : (
                <KeyRound className="h-6 w-6" />
              )}
            </div>
            <h1 className="font-display text-3xl font-bold text-gray-900">
              {step === "success" ? "Senha alterada" : "Recuperar senha"}
            </h1>
            <p className="mt-2 text-gray-600">
              {step === "email" && "Informe seu e-mail para receber um codigo de recuperacao."}
              {step === "code" && `Digite o codigo de 6 digitos enviado para ${normalizedEmail}.`}
              {step === "password" && "Escolha uma nova senha para acessar sua conta."}
              {step === "success" && "Agora voce ja pode entrar usando sua nova senha."}
            </p>
          </div>

          {error && (
            <div className="mb-6 rounded-lg border border-red-200 bg-red-50 p-4 flex items-center gap-3">
              <AlertCircle className="h-5 w-5 text-red-500 flex-shrink-0" />
              <p className="text-sm text-red-700">{error}</p>
            </div>
          )}

          {message && (
            <div className="mb-6 rounded-lg border border-green-200 bg-green-50 p-4 flex items-center gap-3">
              <CheckCircle2 className="h-5 w-5 text-green-600 flex-shrink-0" />
              <p className="text-sm text-green-700">{message}</p>
            </div>
          )}

          {step === "email" && (
            <form onSubmit={handleRequestCode} className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="email">E-mail</Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                  <Input
                    id="email"
                    type="email"
                    placeholder="seu@email.com"
                    className="pl-10 h-12"
                    value={email}
                    onChange={(event) => setEmail(event.target.value)}
                    required
                  />
                </div>
              </div>

              <Button
                type="submit"
                className="w-full h-12 bg-[#1D4ED8] hover:bg-[#1E3A8A] text-base font-semibold"
                disabled={isLoading}
              >
                {isLoading ? "Enviando..." : (
                  <span className="flex items-center gap-2">
                    Enviar codigo
                    <ArrowRight className="h-5 w-5" />
                  </span>
                )}
              </Button>
            </form>
          )}

          {step === "code" && (
            <form onSubmit={handleVerifyCode} className="space-y-6">
              <div className="space-y-3">
                <Label htmlFor="code">Codigo de confirmacao</Label>
                <InputOTP
                  id="code"
                  maxLength={6}
                  value={code}
                  onChange={setCode}
                  containerClassName="justify-between"
                  inputMode="numeric"
                  pattern="[0-9]*"
                >
                  <InputOTPGroup className="gap-2">
                    {Array.from({ length: 6 }).map((_, index) => (
                      <InputOTPSlot
                        key={index}
                        index={index}
                        className="h-12 w-12 rounded-lg border text-base font-semibold"
                      />
                    ))}
                  </InputOTPGroup>
                </InputOTP>
                <p className="text-sm text-gray-500">
                  O codigo expira em 24 horas e pode ser usado apenas uma vez.
                </p>
              </div>

              <Button
                type="submit"
                className="w-full h-12 bg-[#1D4ED8] hover:bg-[#1E3A8A] text-base font-semibold"
                disabled={isLoading || code.length !== 6}
              >
                {isLoading ? "Verificando..." : "Confirmar codigo"}
              </Button>

              <div className="flex flex-col gap-3 sm:flex-row">
                <Button
                  type="button"
                  variant="outline"
                  className="h-11 flex-1"
                  onClick={() => {
                    setStep("email")
                    setError(null)
                    setMessage(null)
                  }}
                  disabled={isLoading}
                >
                  <ArrowLeft className="mr-2 h-4 w-4" />
                  Trocar e-mail
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  className="h-11 flex-1"
                  onClick={handleResendCode}
                  disabled={isLoading}
                >
                  <RotateCcw className="mr-2 h-4 w-4" />
                  Reenviar
                </Button>
              </div>
            </form>
          )}

          {step === "password" && (
            <form onSubmit={handleConfirmPassword} className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="password">Nova senha</Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                  <Input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    placeholder="Digite a nova senha"
                    className="pl-10 pr-10 h-12"
                    value={password}
                    onChange={(event) => setPassword(event.target.value)}
                    required
                    minLength={6}
                  />
                  <button
                    type="button"
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                    onClick={() => setShowPassword(!showPassword)}
                    aria-label={showPassword ? "Ocultar senha" : "Mostrar senha"}
                  >
                    {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                  </button>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="confirmPassword">Confirmar senha</Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                  <Input
                    id="confirmPassword"
                    type={showPassword ? "text" : "password"}
                    placeholder="Confirme a nova senha"
                    className="pl-10 h-12"
                    value={confirmPassword}
                    onChange={(event) => setConfirmPassword(event.target.value)}
                    required
                    minLength={6}
                  />
                </div>
              </div>

              <Button
                type="submit"
                className="w-full h-12 bg-[#1D4ED8] hover:bg-[#1E3A8A] text-base font-semibold"
                disabled={isLoading}
              >
                {isLoading ? "Alterando..." : "Alterar senha"}
              </Button>
            </form>
          )}

          {step === "success" && (
            <div className="space-y-4">
              <Button
                type="button"
                className="w-full h-12 bg-[#1D4ED8] hover:bg-[#1E3A8A] text-base font-semibold"
                onClick={() => router.push("/login")}
              >
                Ir para login
              </Button>
            </div>
          )}

          <p className="mt-8 text-center text-gray-600">
            Lembrou a senha?{" "}
            <Link href="/login" className="text-[#1D4ED8] font-semibold hover:underline">
              Entrar
            </Link>
          </p>
        </div>
      </div>

      <div className="hidden lg:flex lg:flex-1 bg-gradient-to-br from-[#1E3A8A] to-[#1D4ED8] items-center justify-center p-12">
        <div className="max-w-lg text-white text-center">
          <div className="mb-8">
            <div className="h-20 w-20 rounded-2xl bg-white/10 backdrop-blur-sm flex items-center justify-center mx-auto">
              <ShieldCheck className="h-10 w-10 text-white" />
            </div>
          </div>
          <h2 className="font-display text-3xl font-bold mb-4">
            Recupere o acesso com seguranca
          </h2>
          <p className="text-blue-100 leading-relaxed">
            Enviamos um codigo unico para confirmar sua identidade antes de permitir a troca da senha.
          </p>
        </div>
      </div>
    </div>
  )
}
