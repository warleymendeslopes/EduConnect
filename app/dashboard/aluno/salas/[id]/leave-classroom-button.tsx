"use client"

import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { leaveClassroom } from "@/app/actions/classrooms"
import { toast } from "sonner"

export function LeaveClassroomButton({ classroomId }: { classroomId: string }) {
  const router = useRouter()

  const handleLeave = async () => {
    if (!confirm("Tem certeza que deseja sair desta sala?")) return
    const res = await leaveClassroom(classroomId)
    if (res.ok) {
      toast.success("Voce saiu da sala")
      router.push("/dashboard/aluno/salas")
      router.refresh()
      return
    }
    toast.error(res.error)
  }

  return (
    <Button
      type="button"
      variant="outline"
      size="sm"
      className="text-red-600 border-red-200 hover:bg-red-50"
      onClick={handleLeave}
    >
      Sair da sala
    </Button>
  )
}
