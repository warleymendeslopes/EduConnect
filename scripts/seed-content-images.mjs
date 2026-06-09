import { put } from "@vercel/blob"
import pg from "pg"
import { randomUUID } from "node:crypto"
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

const TOKEN = loadEnv("BLOB_READ_WRITE_TOKEN")
const DBURL = loadEnv("DATABASE_URL")

// Paleta por disciplina (gradiente)
const COLORS = {
  "Matemática": ["#2563EB", "#1E3A8A"],
  "Física": ["#6366F1", "#312E81"],
  "Geografia": ["#0D9488", "#065F46"],
  "Português": ["#E11D48", "#881337"],
  "História": ["#D97706", "#7C2D12"],
  "Biologia": ["#10B981", "#065F46"],
  "Química": ["#7C3AED", "#4C1D95"],
  "Multidisciplinar": ["#475569", "#0F172A"],
  "Inglês": ["#0891B2", "#155E75"],
  "Estudos": ["#EA580C", "#7C2D12"],
}
const ICONS = {
  "Matemática": "➗", "Física": "⚛", "Geografia": "🌎", "Português": "✍",
  "História": "📜", "Biologia": "🧬", "Química": "⚗", "Multidisciplinar": "🎯",
  "Inglês": "🗣", "Estudos": "📚",
}
const TYPE_LABEL = { exercise: "Exercícios", assessment: "Avaliação", simulado: "Simulado", dica: "Dica rápida" }

const esc = (s) =>
  s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;")

function wrap(text, max) {
  const words = text.split(/\s+/)
  const lines = []
  let cur = ""
  for (const w of words) {
    if ((cur + " " + w).trim().length > max) {
      if (cur) lines.push(cur.trim())
      cur = w
    } else cur = (cur + " " + w).trim()
  }
  if (cur) lines.push(cur.trim())
  return lines
}

function makeSvg({ title, subject, kind, square }) {
  const w = square ? 600 : 800
  const h = square ? 600 : 450
  const [c1, c2] = COLORS[subject] || COLORS["Multidisciplinar"]
  const icon = ICONS[subject] || "🎓"
  const titleLines = wrap(title, square ? 18 : 22).slice(0, 3)
  const titleStartY = square ? 250 : 190
  const fontSize = square ? 40 : 44
  const titleSvg = titleLines
    .map(
      (ln, i) =>
        `<text x="48" y="${titleStartY + i * (fontSize + 8)}" font-family="Arial, Helvetica, sans-serif" font-size="${fontSize}" font-weight="700" fill="#ffffff">${esc(ln)}</text>`
    )
    .join("")
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}">
  <defs>
    <linearGradient id="g" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="${c1}"/>
      <stop offset="1" stop-color="${c2}"/>
    </linearGradient>
  </defs>
  <rect width="${w}" height="${h}" fill="url(#g)"/>
  <circle cx="${w - 80}" cy="${h - 70}" r="120" fill="#ffffff" opacity="0.08"/>
  <circle cx="${w - 160}" cy="60" r="70" fill="#ffffff" opacity="0.06"/>
  <text x="48" y="84" font-family="Arial, Helvetica, sans-serif" font-size="30" fill="#ffffff" opacity="0.9">${icon}  ${esc(subject)}</text>
  <text x="48" y="120" font-family="Arial, Helvetica, sans-serif" font-size="20" fill="#ffffff" opacity="0.7">${esc(TYPE_LABEL[kind] || "")}</text>
  ${titleSvg}
  <text x="48" y="${h - 36}" font-family="Arial, Helvetica, sans-serif" font-size="22" font-weight="700" fill="#ffffff" opacity="0.85">EduConnect</text>
</svg>`
}

async function uploadSvg(itemId, folder, svg) {
  const pathname = `articles/${itemId}/${folder}/${randomUUID()}-capa.svg`
  const blob = await put(pathname, svg, {
    access: "private",
    token: TOKEN,
    contentType: "image/svg+xml",
  })
  return `/api/article-attachment?pathname=${encodeURIComponent(blob.pathname)}&filename=${encodeURIComponent("capa.svg")}`
}

const client = new pg.Client({ connectionString: DBURL, ssl: undefined })
await client.connect()
try {
  const { rows } = await client.query(
    `select ci.id, ci.type, ci.title, ci.settings
       from public.content_items ci
      where ci.settings->>'seed' = 'true'
      order by ci.type, ci.created_at`
  )

  let covers = 0
  let dicaImgs = 0
  let dicaSeen = 0

  for (const row of rows) {
    const s = row.settings || {}
    const subject = s.disciplina || "Multidisciplinar"

    if (row.type === "dica") {
      // imagem em ~metade das dicas (idempotente: pula se ja tem)
      const already = Array.isArray(s.dicaImageUrls) && s.dicaImageUrls.length > 0
      const takeThis = dicaSeen % 2 === 0
      dicaSeen++
      if (already || !takeThis) continue
      const url = await uploadSvg(row.id, "dica", makeSvg({ title: row.title, subject, kind: "dica", square: true }))
      const next = { ...s, dicaImageUrls: [url], dicaVideoUrl: null }
      await client.query("update public.content_items set settings = $1::jsonb, updated_at = now() where id = $2", [JSON.stringify(next), row.id])
      dicaImgs++
    } else {
      // capa para exercise / assessment / simulado (idempotente)
      if (s.coverUrl) continue
      const url = await uploadSvg(row.id, "cover", makeSvg({ title: row.title, subject, kind: row.type, square: false }))
      const next = { ...s, coverUrl: url }
      await client.query("update public.content_items set settings = $1::jsonb, updated_at = now() where id = $2", [JSON.stringify(next), row.id])
      covers++
    }
  }

  console.log(`Capas geradas: ${covers}`)
  console.log(`Imagens de dica geradas: ${dicaImgs}`)
} finally {
  await client.end()
}
