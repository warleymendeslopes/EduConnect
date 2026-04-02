"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Share2, Check } from "lucide-react"
import { getInvitePathForCode } from "@/lib/public-url"
import { toast } from "sonner"

type Props = {
  inviteCode: string
  variant?: "default" | "outline"
  size?: "default" | "sm"
}

export function ShareInviteButton({
  inviteCode,
  variant = "outline",
  size = "sm",
}: Props) {
  const [copied, setCopied] = useState(false)

  const copy = async () => {
    const path = getInvitePathForCode(inviteCode)
    const absolute =
      typeof window !== "undefined"
        ? `${window.location.origin}${path}`
        : path
    try {
      await navigator.clipboard.writeText(absolute)
      setCopied(true)
      toast.success("Link copiado!")
      setTimeout(() => setCopied(false), 2000)
    } catch {
      toast.error("Nao foi possivel copiar")
    }
  }

  return (
    <Button
      type="button"
      variant={variant}
      size={size}
      className="gap-2"
      onClick={copy}
    >
      {copied ? (
        <Check className="h-4 w-4 text-green-600" />
      ) : (
        <Share2 className="h-4 w-4" />
      )}
      {copied ? "Copiado" : "Compartilhar link"}
    </Button>
  )
}
