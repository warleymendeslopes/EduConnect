import NextAuth from "next-auth"
import Credentials from "next-auth/providers/credentials"
import Google from "next-auth/providers/google"
import bcrypt from "bcryptjs"
import { z } from "zod"
import { queryOne } from "@/lib/db/query"
import { ensureSocialUser } from "@/lib/auth/social-user"

const credentialsSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
})

type DbUser = {
  id: string
  email: string
  password_hash: string | null
}

const providers = [
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
      if (!user?.password_hash) return null

      const ok = await bcrypt.compare(password, user.password_hash)
      if (!ok) return null

      return { id: user.id, email: user.email }
    },
  }),
]

if (process.env.AUTH_GOOGLE_ID && process.env.AUTH_GOOGLE_SECRET) {
  providers.push(
    Google({
      clientId: process.env.AUTH_GOOGLE_ID,
      clientSecret: process.env.AUTH_GOOGLE_SECRET,
    }) as any,
  )
}

export const { handlers, auth, signIn, signOut } = NextAuth({
  session: { strategy: "jwt" },
  providers,
  callbacks: {
    signIn: async ({ user, account, profile }) => {
      if (account?.provider !== "google") {
        return true
      }

      const email = user.email || (profile as any)?.email
      const providerAccountId = account.providerAccountId

      if (!email || !providerAccountId) {
        return "/login?error=OAuthEmailMissing"
      }

      const dbUser = await ensureSocialUser({
        provider: "google",
        providerAccountId,
        email,
        emailVerified: Boolean((profile as any)?.email_verified),
        name: user.name ?? (profile as any)?.name ?? null,
        avatarUrl: user.image ?? (profile as any)?.picture ?? null,
      })

      if (!dbUser) {
        return "/login?error=OAuthCreateAccount"
      }

      user.id = dbUser.id
      user.email = dbUser.email
      return true
    },
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
