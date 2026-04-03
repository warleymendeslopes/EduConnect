import { get } from "@vercel/blob"
import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"

export const runtime = "nodejs"

const ALLOWED_PREFIXES = [
  /^classroom-activities\/([^/]+)\//,
  /^classroom-materials\/([^/]+)\//,
  /^classroom-mural\/([^/]+)\//,
]

function extractClassroomId(pathname: string): string | null {
  for (const re of ALLOWED_PREFIXES) {
    const m = pathname.match(re)
    if (m?.[1]) return m[1]
  }
  return null
}

function sanitizeDownloadFilename(name: string): string {
  return name.replace(/[/\\?%*:|"<>]/g, "_").slice(0, 200) || "download"
}

export async function GET(request: NextRequest) {
  const pathname = request.nextUrl.searchParams.get("pathname")
  const filenameParam = request.nextUrl.searchParams.get("filename")

  if (!pathname) {
    return NextResponse.json({ error: "Invalid pathname" }, { status: 400 })
  }

  const classroomId = extractClassroomId(pathname)
  if (!classroomId) {
    return NextResponse.json({ error: "Invalid pathname" }, { status: 400 })
  }

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const { data: room } = await supabase
    .from("classrooms")
    .select("professor_id")
    .eq("id", classroomId)
    .maybeSingle()

  if (!room) {
    return NextResponse.json({ error: "Not found" }, { status: 404 })
  }

  const isProfessor = room.professor_id === user.id
  if (!isProfessor) {
    const { data: member } = await supabase
      .from("classroom_members")
      .select("id")
      .eq("classroom_id", classroomId)
      .eq("student_id", user.id)
      .maybeSingle()
    if (!member) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }
  }

  const token = process.env.BLOB_READ_WRITE_TOKEN
  if (!token) {
    return NextResponse.json({ error: "Server misconfiguration" }, { status: 500 })
  }

  let result: Awaited<ReturnType<typeof get>> = null
  try {
    result = await get(pathname, { access: "private", token })
  } catch {
    result = null
  }
  if (!result?.stream) {
    try {
      result = await get(pathname, { access: "public", token })
    } catch {
      result = null
    }
  }
  if (!result?.stream) {
    return NextResponse.json({ error: "Not found" }, { status: 404 })
  }

  const outHeaders = new globalThis.Headers()
  result.headers.forEach((value, key) => {
    outHeaders.append(key, value)
  })
  const friendly = filenameParam
    ? sanitizeDownloadFilename(filenameParam)
    : pathname.split("/").pop() ?? "file"
  if (!outHeaders.has("content-disposition")) {
    outHeaders.set(
      "content-disposition",
      `inline; filename*=UTF-8''${encodeURIComponent(friendly)}`
    )
  }

  return new NextResponse(result.stream, {
    status: 200,
    headers: outHeaders,
  })
}
