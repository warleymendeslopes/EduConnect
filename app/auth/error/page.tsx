import Link from "next/link"
import { Button } from "@/components/ui/button"
import { GraduationCap, AlertCircle, ArrowLeft } from "lucide-react"

export default async function AuthErrorPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; error_description?: string }>
}) {
  const params = await searchParams
  const error = params.error || "unknown_error"
  const errorDescription = params.error_description || "Ocorreu um erro durante a autenticacao"

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="max-w-md w-full text-center">
        {/* Logo */}
        <Link href="/" className="inline-flex items-center gap-2 mb-8">
          <div className="h-10 w-10 rounded-lg bg-gradient-to-br from-[#1D4ED8] to-[#1E3A8A] flex items-center justify-center">
            <GraduationCap className="h-5 w-5 text-white" />
          </div>
          <span className="font-display text-2xl font-bold text-gray-900">EduConnect</span>
        </Link>

        {/* Error Icon */}
        <div className="h-20 w-20 rounded-full bg-red-100 flex items-center justify-center mx-auto mb-6">
          <AlertCircle className="h-10 w-10 text-red-500" />
        </div>

        {/* Error Message */}
        <h1 className="font-display text-2xl font-bold text-gray-900 mb-2">
          Erro de autenticacao
        </h1>
        <p className="text-gray-600 mb-2">
          {errorDescription}
        </p>
        <p className="text-sm text-gray-500 mb-8">
          Codigo do erro: {error}
        </p>

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <Button asChild variant="outline" className="h-12">
            <Link href="/" className="flex items-center gap-2">
              <ArrowLeft className="h-4 w-4" />
              Voltar ao inicio
            </Link>
          </Button>
          <Button asChild className="h-12 bg-[#1D4ED8] hover:bg-[#1E3A8A]">
            <Link href="/login">
              Tentar novamente
            </Link>
          </Button>
        </div>
      </div>
    </div>
  )
}
