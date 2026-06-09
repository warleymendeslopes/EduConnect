import test from "node:test"
import assert from "node:assert/strict"
import {
  PASSWORD_RESET_DAILY_LIMIT,
  fingerprintResetEmail,
  isResetRequestAllowed,
  normalizeResetEmail,
  resolveResetRequestAction,
} from "../lib/auth/password-reset.ts"

test("normalizes password reset emails", () => {
  assert.equal(normalizeResetEmail("  USER@Example.COM  "), "user@example.com")
})

test("creates a stable fingerprint without exposing the email", () => {
  process.env.AUTH_SECRET = "test-secret"

  const first = fingerprintResetEmail("User@Example.com")
  const second = fingerprintResetEmail(" user@example.com ")

  assert.equal(first, second)
  assert.notEqual(first, "user@example.com")
})

test("allows the first reset request", () => {
  assert.equal(isResetRequestAllowed(null, new Date("2026-06-03T12:00:00Z")), true)
})

test("blocks requests inside the cooldown window", () => {
  const now = new Date("2026-06-03T12:00:30Z")

  assert.equal(
    isResetRequestAllowed(
      {
        last_requested_at: "2026-06-03T12:00:00Z",
        window_started_at: "2026-06-03T12:00:00Z",
        request_count: 1,
      },
      now,
    ),
    false,
  )
})

test("blocks requests after reaching the daily limit", () => {
  const now = new Date("2026-06-03T13:00:00Z")

  assert.equal(
    isResetRequestAllowed(
      {
        last_requested_at: "2026-06-03T12:00:00Z",
        window_started_at: "2026-06-03T00:00:00Z",
        request_count: PASSWORD_RESET_DAILY_LIMIT,
      },
      now,
    ),
    false,
  )
})

test("acknowledges nonexistent users without issuing a code", () => {
  const action = resolveResetRequestAction({
    limit: null,
    userExists: false,
    now: new Date("2026-06-03T12:00:00Z"),
  })

  assert.equal(action, "acknowledge_only")
})

test("issues a code for existing users when limits allow it", () => {
  const action = resolveResetRequestAction({
    limit: null,
    userExists: true,
    now: new Date("2026-06-03T12:00:00Z"),
  })

  assert.equal(action, "issue_code")
})
