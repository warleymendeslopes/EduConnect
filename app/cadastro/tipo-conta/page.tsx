import { redirect } from "next/navigation"
import Link from "next/link"
import { GraduationCap } from "lucide-react"
import { auth } from "@/auth"
import { profileRedirectPath } from "@/lib/auth/redirect"
import { queryOne } from "@/lib/db/query"
import { TipoContaForm } from "./tipo-conta-form"

export const runtime = "nodejs"

type ProfileRow = {
  user_type: string | null
  professor_verification_status: string | null
}

export default async function TipoContaPage() {
  const session = await auth()
  const userId = (session?.user as any)?.id as string | undefined

  if (!userId) {
    redirect("/login")
  }

  const profile = await queryOne<ProfileRow>(
    "select user_type, professor_verification_status from public.profiles where id = $1",
    [userId],
  )

  if (profile?.user_type === "aluno") {
    redirect(profileRedirectPath(profile))
  }

  if (
    profile?.user_type === "professor" &&
    (profile.professor_verification_status === "pending" ||
      profile.professor_verification_status === "approved")
  ) {
    redirect(
      profile.professor_verification_status === "pending"
        ? "/dashboard/professor?status=pendente"
        : "/dashboard/professor",
    )
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
            <h1 className="font-display text-3xl font-bold text-gray-900">Complete seu perfil</h1>
            <p className="mt-2 text-gray-600">
              Escolha como voce quer usar o EduConnect para liberarmos o dashboard correto.
            </p>
          </div>

          <TipoContaForm initialUserType={profile?.user_type === "professor" ? "professor" : null} />
        </div>
      </div>

      <div className="hidden lg:flex lg:flex-1 bg-gradient-to-br from-[#1E3A8A] to-[#1D4ED8] items-center justify-center p-12">
        <div className="max-w-lg text-white text-center">
          <div className="mb-8">
            <div className="h-20 w-20 rounded-2xl bg-white/10 flex items-center justify-center mx-auto">
              <GraduationCap className="h-10 w-10 text-white" />
            </div>
          </div>
          <h2 className="font-display text-3xl font-bold mb-4">
            Uma conta, dois caminhos de aprendizado
          </h2>
          <p className="text-blue-100 leading-relaxed">
            Alunos encontram conteudos e professores organizam salas, materiais e atividades.
          </p>
        </div>
      </div>
    </div>
  )
}
