"use client"

import { useEffect, useRef } from "react"
import { useRouter } from "next/navigation"
import { processPendingInviteIfAny } from "@/app/actions/classrooms"
import { toast } from "sonner"

/** Processa metadata pending_invite_code apos login/cadastro confirmado. */
export function PendingInviteHandler() {
  const router = useRouter()
  const ran = useRef(false)

  useEffect(() => {
    if (ran.current) return
    ran.current = true
    processPendingInviteIfAny().then((res) => {
      if (res?.ok) {
        toast.success("Voce entrou na sala com sucesso!")
        router.push(`/dashboard/aluno/salas/${res.classroomId}`)
        router.refresh()
      } else if (res && !res.ok) {
        toast.error(res.error)
      }
    })
  }, [router])

  return null
}
