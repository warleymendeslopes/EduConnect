export type UserType = "aluno" | "professor"

export function dashboardPathForUserType(userType: UserType) {
  return userType === "professor" ? "/dashboard/professor" : "/dashboard/aluno"
}

export function authRedirectPath(userType: string | null | undefined) {
  if (userType === "aluno" || userType === "professor") {
    return dashboardPathForUserType(userType)
  }

  return "/cadastro/tipo-conta"
}

export function profileRedirectPath(profile: {
  user_type: string | null | undefined
  professor_verification_status?: string | null
}) {
  if (profile.user_type === "aluno") {
    return "/dashboard/aluno"
  }

  if (profile.user_type === "professor") {
    if (profile.professor_verification_status === "approved") {
      return "/dashboard/professor"
    }

    if (profile.professor_verification_status === "pending") {
      return "/dashboard/professor?status=pendente"
    }

    return "/cadastro/tipo-conta"
  }

  return "/cadastro/tipo-conta"
}

export function safeInternalPath(next: string | null): string | null {
  if (!next || !next.startsWith("/") || next.startsWith("//")) {
    return null
  }

  return next
}
