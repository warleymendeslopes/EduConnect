import type { QueryResultRow } from "pg"
import { dbPool } from "@/lib/db/pool"

export async function query<Row extends QueryResultRow = QueryResultRow>(
  text: string,
  params?: unknown[]
): Promise<Row[]> {
  const pool = dbPool()
  const res = await pool.query<Row>(text, params)
  return res.rows
}

export async function queryOne<Row extends QueryResultRow = QueryResultRow>(
  text: string,
  params?: unknown[]
): Promise<Row | null> {
  const rows = await query<Row>(text, params)
  return rows[0] ?? null
}

