import { NextResponse } from "next/server"
import { auth } from "@/auth"
import { queryOne } from "@/lib/db/query"

export const runtime = "nodejs"

type ProfileRow = { full_name: string | null; avatar_url: string | null; user_type: string }

export async function GET() {
  const session = await auth()
  const userId = (session?.user as any)?.id as string | undefined
  if (!userId) {
    return NextResponse.json({ ok: true, user: null, profile: null })
  }

  const profile = await queryOne<ProfileRow>(
    "select full_name, avatar_url, user_type from public.profiles where id = $1",
    [userId]
  )

  return NextResponse.json({
    ok: true,
    user: { id: userId, email: session?.user?.email ?? null },
    profile,
  })
}

