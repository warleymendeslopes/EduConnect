import { CriarConteudoClient } from "./criar-conteudo-client"
import { requireAuthedUser } from "@/lib/auth/user"
import { getProfileAccess, isApprovedProfessor } from "@/lib/auth/profile"
import { redirect } from "next/navigation"

export default async function CriarConteudoPage({
  searchParams,
}: {
  searchParams: Promise<{ edit?: string }>
}) {
  const user = await requireAuthedUser().catch(() => null)
  if (!user) redirect("/login")

  const profile = await getProfileAccess(user.id)
  if (!isApprovedProfessor(profile)) redirect("/dashboard/professor?status=pendente")

  const { edit } = await searchParams
  return <CriarConteudoClient initialEditId={edit ?? null} />
}
