import test from "node:test"
import assert from "node:assert/strict"
import {
  authRedirectPath,
  dashboardPathForUserType,
  profileRedirectPath,
  safeInternalPath,
} from "../lib/auth/redirect.ts"

test("redirects alunos to the student dashboard", () => {
  assert.equal(dashboardPathForUserType("aluno"), "/dashboard/aluno")
  assert.equal(authRedirectPath("aluno"), "/dashboard/aluno")
})

test("redirects professores to the professor dashboard", () => {
  assert.equal(dashboardPathForUserType("professor"), "/dashboard/professor")
  assert.equal(authRedirectPath("professor"), "/dashboard/professor")
})

test("redirects missing user type to profile completion", () => {
  assert.equal(authRedirectPath(null), "/cadastro/tipo-conta")
  assert.equal(authRedirectPath(undefined), "/cadastro/tipo-conta")
  assert.equal(authRedirectPath(""), "/cadastro/tipo-conta")
})

test("redirects professor by verification status", () => {
  assert.equal(
    profileRedirectPath({ user_type: "professor", professor_verification_status: "approved" }),
    "/dashboard/professor",
  )
  assert.equal(
    profileRedirectPath({ user_type: "professor", professor_verification_status: "pending" }),
    "/dashboard/professor?status=pendente",
  )
  assert.equal(
    profileRedirectPath({ user_type: "professor", professor_verification_status: "none" }),
    "/cadastro/tipo-conta",
  )
  assert.equal(
    profileRedirectPath({ user_type: "professor", professor_verification_status: "rejected" }),
    "/cadastro/tipo-conta",
  )
})

test("accepts only internal next paths", () => {
  assert.equal(safeInternalPath("/dashboard/aluno"), "/dashboard/aluno")
  assert.equal(safeInternalPath("https://example.com"), null)
  assert.equal(safeInternalPath("//example.com/path"), null)
  assert.equal(safeInternalPath(null), null)
})
