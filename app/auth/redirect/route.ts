import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/auth"
import { profileRedirectPath, safeInternalPath } from "@/lib/auth/redirect"
import { queryOne } from "@/lib/db/query"

export const runtime = "nodejs"

type ProfileRow = {
  user_type: string | null
  professor_verification_status: string | null
}

export async function GET(request: NextRequest) {
  const session = await auth()
  const userId = (session?.user as any)?.id as string | undefined

  if (!userId) {
    return NextResponse.redirect(new URL("/login", request.url))
  }

  const profile = await queryOne<ProfileRow>(
    "select user_type, professor_verification_status from public.profiles where id = $1",
    [userId],
  )

  if (!profile?.user_type) {
    return NextResponse.redirect(new URL("/cadastro/tipo-conta", request.url))
  }

  const destination = profileRedirectPath(profile)
  const next =
    destination === "/dashboard/aluno" || destination === "/dashboard/professor"
      ? safeInternalPath(request.nextUrl.searchParams.get("next"))
      : null

  return NextResponse.redirect(new URL(next ?? destination, request.url))
}
