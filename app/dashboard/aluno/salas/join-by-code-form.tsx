"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { joinClassroomByInvite } from "@/app/actions/classrooms"
import { toast } from "sonner"

export function JoinByCodeForm() {
  const router = useRouter()
  const [code, setCode] = useState("")
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    const res = await joinClassroomByInvite(code)
    setLoading(false)
    if (res.ok) {
      toast.success("Voce entrou na sala!")
      setCode("")
      router.push(`/dashboard/aluno/salas/${res.classroomId}`)
      router.refresh()
      return
    }
    toast.error(res.error)
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="bg-white rounded-xl border border-gray-100 p-4 sm:p-5 mb-8 flex flex-col sm:flex-row gap-4 sm:items-end"
    >
      <div className="flex-1 space-y-2">
        <Label htmlFor="codigo-sala">Entrar com codigo de convite</Label>
        <Input
          id="codigo-sala"
          placeholder="Ex.: EDU-A1B2"
          value={code}
          onChange={(e) => setCode(e.target.value.toUpperCase())}
          className="font-mono uppercase max-w-md"
        />
      </div>
      <Button
        type="submit"
        className="bg-[#10B981] hover:bg-[#059669] shrink-0"
        disabled={loading || !code.trim()}
      >
        {loading ? "Entrando..." : "Entrar na sala"}
      </Button>
    </form>
  )
}
