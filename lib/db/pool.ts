import { Pool } from "pg"

declare global {
  // eslint-disable-next-line no-var
  var __dbPool: Pool | undefined
}

function requireEnv(name: string): string {
  const v = process.env[name]
  if (!v) throw new Error(`Missing env var: ${name}`)
  return v
}

export function dbPool(): Pool {
  if (globalThis.__dbPool) return globalThis.__dbPool

  const pool = new Pool({
    connectionString: requireEnv("DATABASE_URL"),
    // Many managed Postgres providers require TLS; allow opting out for local.
    ssl: process.env.DATABASE_SSL === "false" ? undefined : { rejectUnauthorized: false },
    max: Number(process.env.DATABASE_POOL_MAX ?? "10"),
  })

  globalThis.__dbPool = pool
  return pool
}

