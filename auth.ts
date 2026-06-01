import NextAuth from "next-auth"
import Credentials from "next-auth/providers/credentials"
import bcrypt from "bcryptjs"
import { z } from "zod"
import { queryOne } from "@/lib/db/query"

const credentialsSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
})

type DbUser = {
  id: string
  email: string
  password_hash: string
}

export const { handlers, auth, signIn, signOut } = NextAuth({
  session: { strategy: "jwt" },
  providers: [
    Credentials({
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      authorize: async (raw) => {
        const parsed = credentialsSchema.safeParse(raw)
        if (!parsed.success) return null

        const { email, password } = parsed.data
        const user = await queryOne<DbUser>(
          "select id, email, password_hash from public.users where email = $1",
          [email.toLowerCase()]
        )
        if (!user) return null

        const ok = await bcrypt.compare(password, user.password_hash)
        if (!ok) return null

        return { id: user.id, email: user.email }
      },
    }),
  ],
  callbacks: {
    jwt: async ({ token, user }) => {
      if (user?.id) token.sub = String(user.id)
      if (user?.email) token.email = user.email
      return token
    },
    session: async ({ session, token }) => {
      if (session.user && token.sub) {
        // next-auth types keep id optional; attach for server usage.
        ;(session.user as any).id = token.sub
      }
      return session
    },
  },
})

