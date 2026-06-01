import fs from "fs"
import path from "path"
import pg from "pg"

function parseDotenv(content) {
  const vars = {}
  for (const line of content.split(/\r?\n/)) {
    const s = line.trim()
    if (!s || s.startsWith("#")) continue
    const i = s.indexOf("=")
    if (i <= 0) continue
    const k = s.slice(0, i).trim()
    let v = s.slice(i + 1).trim()
    v = v.replace(/^'/, "").replace(/'$/, "")
    v = v.replace(/^\"/, "").replace(/\"$/, "")
    vars[k] = v
  }
  return vars
}

function loadDatabaseUrl() {
  if (process.env.DATABASE_URL) return process.env.DATABASE_URL
  const envPath = path.resolve(process.cwd(), ".env.development.local")
  if (!fs.existsSync(envPath)) return null
  const vars = parseDotenv(fs.readFileSync(envPath, "utf8"))
  return vars.DATABASE_URL || null
}

function splitSqlStatements(sql) {
  // Minimal splitter that respects $$...$$ blocks and single quotes.
  const out = []
  let cur = ""
  let inSingle = false
  let inDollar = false
  let dollarTag = "$$"

  for (let i = 0; i < sql.length; i++) {
    const ch = sql[i]
    const next2 = sql.slice(i, i + 2)

    if (!inSingle && !inDollar && ch === "$") {
      // Detect $tag$ ... $tag$
      const m = sql.slice(i).match(/^\$[a-zA-Z0-9_]*\$/)
      if (m) {
        inDollar = true
        dollarTag = m[0]
        cur += dollarTag
        i += dollarTag.length - 1
        continue
      }
    } else if (inDollar && sql.startsWith(dollarTag, i)) {
      inDollar = false
      cur += dollarTag
      i += dollarTag.length - 1
      continue
    }

    if (!inDollar && ch === "'") {
      // Toggle single quotes (ignore escaped '')
      const prev = sql[i - 1]
      if (prev !== "\\") {
        inSingle = !inSingle
      }
    }

    if (!inSingle && !inDollar && ch === ";") {
      const stmt = cur.trim()
      if (stmt) out.push(stmt)
      cur = ""
      continue
    }

    cur += ch
  }

  const tail = cur.trim()
  if (tail) out.push(tail)
  return out
}

async function run() {
  const files = process.argv.slice(2)
  if (files.length === 1 && files[0] === "--check") {
    const url = loadDatabaseUrl()
    if (!url) {
      console.error("Missing DATABASE_URL (set env var or .env.development.local)")
      process.exit(2)
    }
    const client = new pg.Client({
      connectionString: url,
      ssl: process.env.DATABASE_SSL === "false" ? undefined : { rejectUnauthorized: false },
    })
    await client.connect()
    try {
      const ext = await client.query(
        "select extname from pg_extension where extname in ('pgcrypto','uuid-ossp') order by extname"
      )
      console.log("Extensions:", ext.rows.map((r) => r.extname).join(",") || "none")
      const tbl = await client.query(
        "select to_regclass('public.users') as users, to_regclass('public.profiles') as profiles"
      )
      console.log("Tables:", tbl.rows[0])
    } finally {
      await client.end().catch(() => {})
    }
    return
  }
  if (files.length === 0) {
    console.error("Usage: node scripts/apply-sql.mjs <file1.sql> <file2.sql> ...")
    process.exit(2)
  }

  const url = loadDatabaseUrl()
  if (!url) {
    console.error("Missing DATABASE_URL (set env var or .env.development.local)")
    process.exit(2)
  }

  const client = new pg.Client({
    connectionString: url,
    ssl: process.env.DATABASE_SSL === "false" ? undefined : { rejectUnauthorized: false },
  })

  await client.connect()
  try {
    for (const f of files) {
      const abs = path.resolve(process.cwd(), f)
      const sql = fs.readFileSync(abs, "utf8")
      const statements = splitSqlStatements(sql)
      for (const stmt of statements) {
        await client.query(stmt)
      }
      console.log(`Applied: ${f}`)
    }
  } finally {
    await client.end().catch(() => {})
  }
}

run().catch((e) => {
  console.error(e?.message || String(e))
  process.exit(1)
})
