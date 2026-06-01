import { auth } from "@/auth"

export type AuthedUser = { id: string; email: string | null }

export async function getAuthedUser(): Promise<AuthedUser | null> {
  const session = await auth()
  const id = (session?.user as any)?.id as string | undefined
  if (!id) return null
  return { id, email: session?.user?.email ?? null }
}

export async function requireAuthedUser(): Promise<AuthedUser> {
  const user = await getAuthedUser()
  if (!user) throw new Error("Nao autenticado")
  return user
}

