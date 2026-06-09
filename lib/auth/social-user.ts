import type { PoolClient, QueryResultRow } from "pg"
import { dbPool } from "@/lib/db/pool"
import { upsertProfile } from "@/lib/auth/profile"

export type SocialProvider = "google"

type EnsureSocialUserInput = {
  provider: SocialProvider
  providerAccountId: string
  email: string
  emailVerified?: boolean
  name?: string | null
  avatarUrl?: string | null
}

type UserRow = QueryResultRow & {
  id: string
  email: string
  auth_provider: string | null
}

export async function ensureSocialUser(input: EnsureSocialUserInput) {
  const email = input.email.toLowerCase().trim()
  if (!email || !input.providerAccountId) {
    return null
  }

  const pool = dbPool()
  const client = await pool.connect()

  try {
    await client.query("begin")

    let user = await findUserByProvider(client, input.provider, input.providerAccountId)

    if (!user) {
      user = await findUserByEmail(client, email)
    }

    if (user) {
      if (user.auth_provider !== input.provider && !input.emailVerified) {
        await client.query("rollback")
        return null
      }

      await client.query(
        `update public.users
            set auth_provider = coalesce(auth_provider, $1),
                auth_provider_account_id = coalesce(auth_provider_account_id, $2),
                email_verified_at = case
                  when $3::boolean and email_verified_at is null then timezone('utc'::text, now())
                  else email_verified_at
                end
          where id = $4`,
        [input.provider, input.providerAccountId, Boolean(input.emailVerified), user.id],
      )
    } else {
      const created = await client.query<UserRow>(
        `insert into public.users
          (email, password_hash, auth_provider, auth_provider_account_id, email_verified_at)
         values ($1, null, $2, $3, case when $4::boolean then timezone('utc'::text, now()) else null end)
         returning id, email, auth_provider`,
        [email, input.provider, input.providerAccountId, Boolean(input.emailVerified)],
      )
      user = created.rows[0]
    }

    await upsertProfile(client, {
      id: user.id,
      fullName: input.name || null,
      userType: null,
      avatarUrl: input.avatarUrl || null,
    })

    await client.query("commit")
    return user
  } catch (error) {
    await client.query("rollback").catch(() => {})
    throw error
  } finally {
    client.release()
  }
}

async function findUserByProvider(
  client: PoolClient,
  provider: SocialProvider,
  providerAccountId: string,
) {
  const result = await client.query<UserRow>(
    `select id, email, auth_provider
       from public.users
      where auth_provider = $1 and auth_provider_account_id = $2
      limit 1`,
    [provider, providerAccountId],
  )

  return result.rows[0] ?? null
}

async function findUserByEmail(
  client: PoolClient,
  email: string,
) {
  const result = await client.query<UserRow>(
    "select id, email, auth_provider from public.users where email = $1 limit 1",
    [email],
  )

  return result.rows[0] ?? null
}
