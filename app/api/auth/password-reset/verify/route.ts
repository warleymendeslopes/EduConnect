import { NextResponse } from "next/server"
import bcrypt from "bcryptjs"
import { z } from "zod"
import { dbPool } from "@/lib/db/pool"

export const runtime = "nodejs"

const schema = z.object({
  email: z.string().email(),
  code: z.string().regex(/^\d{6}$/),
})

type ResetCodeRow = {
  id: string
  code_hash: string
  expires_at: Date
  attempts: number
  max_attempts: number
}

export async function POST(request: Request) {
  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ ok: false, error: "Corpo invalido" }, { status: 400 })
  }

  const parsed = schema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ ok: false, error: "Codigo invalido" }, { status: 400 })
  }

  const email = parsed.data.email.toLowerCase().trim()
  const { code } = parsed.data
  const pool = dbPool()

  const codeRes = await pool.query<ResetCodeRow>(
    `select prc.id, prc.code_hash, prc.expires_at, prc.attempts, prc.max_attempts
       from public.password_reset_codes prc
       join public.users u on u.id = prc.user_id
      where u.email = $1 and prc.used_at is null
      order by prc.created_at desc
      limit 1`,
    [email],
  )
  const resetCode = codeRes.rows[0]

  if (!resetCode) {
    return NextResponse.json({ ok: false, error: "Solicite um novo codigo" }, { status: 404 })
  }

  if (new Date(resetCode.expires_at).getTime() <= Date.now()) {
    return NextResponse.json({ ok: false, error: "Codigo expirado. Solicite um novo envio" }, { status: 410 })
  }

  if (resetCode.attempts >= resetCode.max_attempts) {
    return NextResponse.json({ ok: false, error: "Muitas tentativas. Solicite um novo codigo" }, { status: 429 })
  }

  const ok = await bcrypt.compare(code, resetCode.code_hash)
  if (!ok) {
    await pool.query(
      "update public.password_reset_codes set attempts = attempts + 1 where id = $1",
      [resetCode.id],
    )
    return NextResponse.json({ ok: false, error: "Codigo incorreto" }, { status: 400 })
  }

  return NextResponse.json({ ok: true })
}
