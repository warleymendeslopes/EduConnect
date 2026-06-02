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
  user_type: string | null
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
          `select u.id, u.email, u.password_hash, p.user_type
             from public.users u
             left join public.profiles p on p.id = u.id
            where u.email = $1`,
          [email.toLowerCase()]
        )
        if (!user) return null

        const ok = await bcrypt.compare(password, user.password_hash)
        if (!ok) return null

        return { id: user.id, email: user.email, userType: user.user_type ?? null }
      },
    }),
  ],
  callbacks: {
    jwt: async ({ token, user }) => {
      if (user?.id) token.sub = String(user.id)
      if (user?.email) token.email = user.email
      // Persiste o tipo de usuario no token (apenas no login, quando `user` existe).
      if (user) (token as any).userType = (user as any).userType ?? null
      return token
    },
    session: async ({ session, token }) => {
      if (session.user && token.sub) {
        // next-auth types keep id optional; attach for server usage.
        ;(session.user as any).id = token.sub
        ;(session.user as any).userType = (token as any).userType ?? null
      }
      return session
    },
  },
})

