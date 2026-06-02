import pg from "pg"
import bcrypt from "bcryptjs"
import fs from "fs"
import path from "path"

function loadDatabaseUrl() {
  if (process.env.DATABASE_URL) return process.env.DATABASE_URL
  const p = path.resolve(process.cwd(), ".env.development.local")
  const txt = fs.readFileSync(p, "utf8")
  for (const line of txt.split(/\r?\n/)) {
    const s = line.trim()
    if (!s || s.startsWith("#")) continue
    const i = s.indexOf("=")
    if (i <= 0) continue
    if (s.slice(0, i).trim() === "DATABASE_URL")
      return s.slice(i + 1).trim().replace(/^['"]|['"]$/g, "")
  }
  return null
}

const users = [
  { email: "prof.teste@edu.local", type: "professor", name: "Prof Teste" },
  { email: "aluno.teste@edu.local", type: "aluno", name: "Aluno Teste" },
]
const PASSWORD = "senha123"

const client = new pg.Client({ connectionString: loadDatabaseUrl(), ssl: undefined })
await client.connect()
try {
  const hash = await bcrypt.hash(PASSWORD, 10)
  for (const u of users) {
    const { rows } = await client.query(
      `insert into public.users (email, password_hash) values ($1, $2)
       on conflict (email) do update set password_hash = excluded.password_hash
       returning id`,
      [u.email, hash]
    )
    const id = rows[0].id
    await client.query(
      `insert into public.profiles (id, full_name, user_type) values ($1, $2, $3)
       on conflict (id) do update set user_type = excluded.user_type, full_name = excluded.full_name`,
      [id, u.name, u.type]
    )
    console.log(`seeded ${u.type}: ${u.email} / ${PASSWORD}`)
  }
} finally {
  await client.end()
}
