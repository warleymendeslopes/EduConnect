import { auth } from "@/auth"
import { NextResponse, type NextRequest } from "next/server"

function homeFor(userType?: string | null): string {
  return userType === "professor" ? "/dashboard/professor" : "/dashboard/aluno"
}

export async function proxy(request: NextRequest) {
  const session = await auth()
  const { pathname } = request.nextUrl
  const userType = (session?.user as any)?.userType as "aluno" | "professor" | null | undefined

  const isDashboard = pathname.startsWith("/dashboard")
  const isAuthPage = pathname === "/login" || pathname === "/cadastro"

  // Nao autenticado tentando acessar o dashboard -> login
  if (isDashboard && !session?.user) {
    const url = request.nextUrl.clone()
    url.pathname = "/login"
    url.searchParams.set("next", pathname)
    return NextResponse.redirect(url)
  }

  // Ja autenticado em pagina de auth -> dashboard correto para o tipo
  if (isAuthPage && session?.user) {
    const url = request.nextUrl.clone()
    url.pathname = homeFor(userType)
    url.search = ""
    return NextResponse.redirect(url)
  }

  // Controle de area por tipo: professor nao acessa area de aluno e vice-versa.
  // So aplica quando o tipo e conhecido (evita loop em onboarding sem perfil).
  if (isDashboard && session?.user && userType) {
    const inWrongArea =
      (userType === "professor" && pathname.startsWith("/dashboard/aluno")) ||
      (userType === "aluno" && pathname.startsWith("/dashboard/professor"))
    if (inWrongArea) {
      const url = request.nextUrl.clone()
      url.pathname = homeFor(userType)
      url.search = ""
      return NextResponse.redirect(url)
    }
  }

  return NextResponse.next()
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
