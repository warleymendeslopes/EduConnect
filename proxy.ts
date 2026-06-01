import { auth } from "@/auth"
import { NextResponse, type NextRequest } from "next/server"

export async function proxy(request: NextRequest) {
  const session = await auth()

  if (request.nextUrl.pathname.startsWith("/dashboard") && !session?.user) {
    const url = request.nextUrl.clone()
    url.pathname = "/login"
    url.searchParams.set("next", request.nextUrl.pathname)
    return NextResponse.redirect(url)
  }

  if ((request.nextUrl.pathname === "/login" || request.nextUrl.pathname === "/cadastro") && session?.user) {
    // Default redirect: if profile-driven routing is needed, we'll read it server-side on the page.
    const url = request.nextUrl.clone()
    url.pathname = "/dashboard/aluno"
    return NextResponse.redirect(url)
  }

  return NextResponse.next()
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
