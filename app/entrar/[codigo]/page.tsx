import Link from "next/link"
import { GraduationCap } from "lucide-react"
import { notFound } from "next/navigation"
import { getClassroomPreviewByInviteCode } from "@/app/actions/classrooms"
import { createClient } from "@/lib/supabase/server"
import { EntrarActions } from "./entrar-actions"

export default async function EntrarConvitePage({
  params,
}: {
  params: Promise<{ codigo: string }>
}) {
  const { codigo: raw } = await params
  const codigo = decodeURIComponent(raw)
  const { preview, error } = await getClassroomPreviewByInviteCode(codigo)

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
        <p className="text-red-600 text-center">{error}</p>
      </div>
    )
  }

  if (!preview) {
    notFound()
  }

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  let userType: "aluno" | "professor" | null = null
  if (user) {
    const { data: profile } = await supabase
      .from("profiles")
      .select("user_type")
      .eq("id", user.id)
      .single()
    if (profile?.user_type === "aluno" || profile?.user_type === "professor") {
      userType = profile.user_type
    }
  }

  const encerrada = preview.status === "encerrada"

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <header className="bg-white border-b border-gray-100 px-4 py-4">
        <div className="max-w-lg mx-auto flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2">
            <div className="h-9 w-9 rounded-lg bg-gradient-to-br from-[#1D4ED8] to-[#1E3A8A] flex items-center justify-center">
              <GraduationCap className="h-5 w-5 text-white" />
            </div>
            <span className="font-display text-xl font-bold text-gray-900">
              EduConnect
            </span>
          </Link>
        </div>
      </header>

      <main className="flex-1 flex items-center justify-center px-4 py-12">
        <div className="w-full max-w-md bg-white rounded-2xl border border-gray-100 shadow-sm p-8 text-center">
          <p className="text-sm font-medium text-[#1D4ED8] mb-2">
            Convite para sala
          </p>
          <h1 className="font-display text-2xl font-bold text-gray-900 mb-2">
            {preview.name}
          </h1>
          <p className="text-gray-600 text-sm mb-1">
            {preview.subject} · {preview.education_level}
          </p>
          <p className="text-gray-500 text-sm mb-8">
            Prof. {preview.professor_name || "Professor"}
          </p>

          {encerrada ? (
            <p className="text-amber-800 bg-amber-50 border border-amber-200 rounded-lg px-4 py-3 text-sm">
              Esta sala esta encerrada e nao aceita novos alunos.
            </p>
          ) : (
            <EntrarActions
              inviteCode={codigo}
              classroomName={preview.name}
              isLoggedIn={!!user}
              userType={userType}
            />
          )}
        </div>
      </main>
    </div>
  )
}
