"use client"

import { useEffect, useRef } from "react"

/** Placeholder: pending invites via auth metadata were removed in Postgres-only mode. */
export function PendingInviteHandler() {
  const ran = useRef(false)

  useEffect(() => {
    if (ran.current) return
    ran.current = true
  }, [])

  return null
}
