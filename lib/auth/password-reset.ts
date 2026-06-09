import { createHmac, randomInt } from "node:crypto"

export const PASSWORD_RESET_CODE_TTL_HOURS = 24
export const PASSWORD_RESET_COOLDOWN_SECONDS = 60
export const PASSWORD_RESET_DAILY_LIMIT = 5
export const PASSWORD_RESET_MAX_ATTEMPTS = 5

export type RequestLimitRow = {
  last_requested_at: Date | string
  window_started_at: Date | string
  request_count: number
}

export type ResetRequestAction = "issue_code" | "acknowledge_only"

export function normalizeResetEmail(email: string) {
  return email.toLowerCase().trim()
}

export function createResetCode() {
  return String(randomInt(0, 1_000_000)).padStart(6, "0")
}

export function fingerprintResetEmail(email: string) {
  const secret = process.env.AUTH_SECRET || process.env.NEXTAUTH_SECRET
  if (!secret) {
    throw new Error("Missing env var: AUTH_SECRET")
  }

  return createHmac("sha256", secret)
    .update(normalizeResetEmail(email))
    .digest("hex")
}

export function isResetRequestAllowed(
  row: RequestLimitRow | null,
  now = new Date(),
) {
  if (!row) {
    return true
  }

  const lastRequestedAt = new Date(row.last_requested_at)
  const windowStartedAt = new Date(row.window_started_at)
  const cooldownMs = PASSWORD_RESET_COOLDOWN_SECONDS * 1000
  const dailyWindowMs = 24 * 60 * 60 * 1000

  if (now.getTime() - lastRequestedAt.getTime() < cooldownMs) {
    return false
  }

  if (
    now.getTime() - windowStartedAt.getTime() < dailyWindowMs &&
    row.request_count >= PASSWORD_RESET_DAILY_LIMIT
  ) {
    return false
  }

  return true
}

export function resolveResetRequestAction({
  limit,
  userExists,
  now = new Date(),
}: {
  limit: RequestLimitRow | null
  userExists: boolean
  now?: Date
}): ResetRequestAction {
  if (!isResetRequestAllowed(limit, now)) {
    return "acknowledge_only"
  }

  return userExists ? "issue_code" : "acknowledge_only"
}
