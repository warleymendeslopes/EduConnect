"use client"

import { useRouter } from "next/navigation"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { joinClassroomByInvite } from "@/app/actions/classrooms"
import { getInvitePathForCode } from "@/lib/public-url"
import { toast } from "sonner"

type Props = {
  inviteCode: string
  classroomName: string
  isLoggedIn: boolean
  userType: "aluno" | "professor" | null
}

export function EntrarActions({
  inviteCode,
  classroomName,
  isLoggedIn,
  userType,
}: Props) {
  const router = useRouter()
  const path = getInvitePathForCode(inviteCode)
  const nextParam = encodeURIComponent(path)

  const handleJoin = async () => {
    const res = await joinClassroomByInvite(inviteCode)
    if (res.ok) {
      toast.success(`Voce entrou em ${classroomName}`)
      router.push(`/dashboard/aluno/salas/${res.classroomId}`)
      router.refresh()
      return
    }
    toast.error(res.error)
  }

  if (!isLoggedIn) {
    return (
      <div className="flex flex-col sm:flex-row gap-3 justify-center">
        <Button asChild className="bg-[#1D4ED8] hover:bg-[#1E3A8A]">
          <Link
            href={`/cadastro?tipo=aluno&codigo=${encodeURIComponent(inviteCode)}`}
          >
            Criar conta de aluno
          </Link>
        </Button>
        <Button asChild variant="outline">
          <Link href={`/login?next=${nextParam}`}>Ja tenho conta</Link>
        </Button>
      </div>
    )
  }

  if (userType === "professor") {
    return (
      <p className="text-center text-amber-800 bg-amber-50 border border-amber-200 rounded-lg px-4 py-3 text-sm">
        Contas de professor nao podem entrar em salas como aluno. Use uma conta de
        aluno para aceitar este convite.
      </p>
    )
  }

  return (
    <div className="flex justify-center">
      <Button
        type="button"
        className="bg-[#1D4ED8] hover:bg-[#1E3A8A] px-8"
        onClick={handleJoin}
      >
        Entrar na sala
      </Button>
    </div>
  )
}
