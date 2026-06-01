import { listMyContentItemsForProfessor } from "@/app/actions/content-items"
import { ProfessorContentFeed } from "@/components/dashboard/professor-content-feed"
import { ProfessorFeedSidebar } from "@/components/dashboard/professor-feed-sidebar"
import { requireAuthedUser } from "@/lib/auth/user"
import { queryOne } from "@/lib/db/query"
import { ArrowLeft } from "lucide-react"
import Link from "next/link"
import { redirect } from "next/navigation"

export default async function ProfessorMeuFeedPage() {
  const user = await requireAuthedUser().catch(() => null)
  if (!user) redirect("/login")

  const profile = await queryOne<{ full_name: string | null; avatar_url: string | null; user_type: string }>(
    "select full_name, avatar_url, user_type from public.profiles where id = $1",
    [user.id]
  )

  if (profile?.user_type !== "professor") {
    redirect("/dashboard/aluno")
  }

  const items = await listMyContentItemsForProfessor()
  const publishedCount = items.filter((i) => i.status === "published").length
  const draftCount = items.filter((i) => i.status === "draft").length
  const reviewCount = items.filter((i) =>
    i.status === "verificando" || i.status === "revisao" || i.status === "aguardando_decisao"
  ).length

  return (
    <div className="max-w-4xl mx-auto pb-20 lg:pb-0 px-4">
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="font-display text-2xl font-bold text-gray-900">Meu feed</h1>
          <p className="text-gray-600">O mesmo layout que o aluno vê no início</p>
        </div>
        <Link
          href="/dashboard/professor/criar"
          className="inline-flex items-center gap-2 text-sm font-medium text-[#1D4ED8] hover:underline shrink-0"
        >
          <ArrowLeft className="h-4 w-4" />
          Criar conteúdo
        </Link>
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <ProfessorContentFeed
            authorName={profile?.full_name ?? null}
            authorAvatarUrl={profile?.avatar_url ?? null}
            initialItems={items}
          />
        </div>

        <ProfessorFeedSidebar
          totalPosts={items.length}
          publishedCount={publishedCount}
          draftCount={draftCount}
          reviewCount={reviewCount}
        />
      </div>
    </div>
  )
}
