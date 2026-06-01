import pg from "pg"

const url = process.env.DATABASE_URL
if (!url) {
  console.error("Missing DATABASE_URL")
  process.exit(2)
}

const client = new pg.Client({
  connectionString: url,
  ssl: process.env.DATABASE_SSL === "false" ? undefined : { rejectUnauthorized: false },
})

try {
  await client.connect()
  const res = await client.query(
    "select 1 as ok, current_database() as db, current_user as usr, inet_server_addr() as server_ip"
  )
  console.log(res.rows[0])
  await client.end()
} catch (e) {
  console.error(e?.message || String(e))
  try {
    await client.end()
  } catch {}
  process.exit(1)
}

