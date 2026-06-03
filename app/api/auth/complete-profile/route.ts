import { NextResponse } from "next/server"
import { z } from "zod"
import { auth } from "@/auth"
import { dashboardPathForUserType } from "@/lib/auth/redirect"
import { upsertProfile } from "@/lib/auth/profile"
import { dbPool } from "@/lib/db/pool"

export const runtime = "nodejs"

const schema = z.object({
  userType: z.enum(["aluno", "professor"]),
})

export async function POST(request: Request) {
  const session = await auth()
  const userId = (session?.user as any)?.id as string | undefined

  if (!userId) {
    return NextResponse.json({ ok: false, error: "Nao autenticado" }, { status: 401 })
  }

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ ok: false, error: "Corpo invalido" }, { status: 400 })
  }

  const parsed = schema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ ok: false, error: "Tipo de conta invalido" }, { status: 400 })
  }

  const client = await dbPool().connect()
  try {
    await upsertProfile(client, {
      id: userId,
      userType: parsed.data.userType,
    })
  } finally {
    client.release()
  }

  return NextResponse.json({
    ok: true,
    redirectTo: dashboardPathForUserType(parsed.data.userType),
  })
}
