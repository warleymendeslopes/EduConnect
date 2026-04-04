/** Fuso usado para definir "dia" do streak (produto BR). */
export const STREAK_TIMEZONE = "America/Sao_Paulo"

/**
 * Converte um instante ISO (UTC) para data civil YYYY-MM-DD no fuso dado.
 */
export function toLocalDateIso(isoUtc: string, timeZone: string): string {
  const d = new Date(isoUtc)
  if (Number.isNaN(d.getTime())) return "1970-01-01"
  const s = new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(d)
  return s
}

/** Data civil de hoje no fuso indicado. */
export function nowLocalDateIso(timeZone: string): string {
  return toLocalDateIso(new Date().toISOString(), timeZone)
}

/** Dia civil anterior a YYYY-MM-DD (sem depender do TZ do servidor). */
export function prevIsoDate(iso: string): string {
  const [y, m, d] = iso.split("-").map(Number)
  const base = new Date(Date.UTC(y, m - 1, d))
  base.setUTCDate(base.getUTCDate() - 1)
  const yy = base.getUTCFullYear()
  const mm = String(base.getUTCMonth() + 1).padStart(2, "0")
  const dd = String(base.getUTCDate()).padStart(2, "0")
  return `${yy}-${mm}-${dd}`
}

/**
 * Dias consecutivos com atividade, terminando em hoje ou ontem (se hoje ainda vazio).
 */
export function computeCurrentStreak(
  activeLocalDates: Set<string>,
  todayLocalIso: string
): number {
  let anchor: string | null = null
  if (activeLocalDates.has(todayLocalIso)) {
    anchor = todayLocalIso
  } else {
    const y = prevIsoDate(todayLocalIso)
    if (activeLocalDates.has(y)) anchor = y
  }
  if (anchor == null) return 0

  let count = 0
  let d = anchor
  while (activeLocalDates.has(d)) {
    count += 1
    d = prevIsoDate(d)
  }
  return count
}
