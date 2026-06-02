import { put, get, del } from "@vercel/blob"
import fs from "fs"
import path from "path"

function loadEnv(name) {
  if (process.env[name]) return process.env[name]
  const p = path.resolve(process.cwd(), ".env.development.local")
  for (const line of fs.readFileSync(p, "utf8").split(/\r?\n/)) {
    const s = line.trim()
    if (!s || s.startsWith("#")) continue
    const i = s.indexOf("=")
    if (i > 0 && s.slice(0, i).trim() === name)
      return s.slice(i + 1).trim().replace(/^['"]|['"]$/g, "")
  }
  return null
}

const token = loadEnv("BLOB_READ_WRITE_TOKEN")
const pathname = `profiles/00000000-0000-4000-8000-000000000000/avatar-smoke.txt`

const blob = await put(pathname, "hello-private", {
  access: "private",
  token,
  contentType: "text/plain",
})
console.log("PUT (private) OK ->", blob.pathname)

const r = await get(blob.pathname, { access: "private", token })
console.log("GET (private) OK -> stream?", !!r?.stream)

await del(blob.url, { token })
console.log("DEL OK (limpeza)")
