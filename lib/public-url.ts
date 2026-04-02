/** URL absoluta do convite; usa NEXT_PUBLIC_APP_URL ou string vazia (use origin no cliente). */
export function getInvitePathForCode(code: string): string {
  return `/entrar/${encodeURIComponent(code)}`
}

export function getInviteAbsoluteUrl(code: string): string {
  const base = process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, "") ?? ""
  const path = getInvitePathForCode(code)
  if (!base) return path
  return `${base}${path}`
}
