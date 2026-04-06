import { getContentItemById, getMyLikesForContentIds } from "@/app/actions/content-items"
import { ArticleCoverMedia } from "@/components/dashboard/article-cover-media"
import { RichTextContent } from "@/components/rich-text-content"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import type { Metadata } from "next"
import Link from "next/link"
import { notFound } from "next/navigation"
import { ConteudoEngagement } from "./conteudo-engagement"

type Props = { params: Promise<{ id: string }> }

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params
  const res = await getContentItemById(id)
  if (!res.ok) return { title: "Conteudo | EduConnect" }
  return {
    title: `${res.item.title} | EduConnect`,
    description: res.item.settings?.disciplina ?? "Artigo educacional",
  }
}

function initials(name: string | null): string {
  if (!name?.trim()) return "?"
  const parts = name.trim().split(/\s+/)
  if (parts.length >= 2) return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
  return parts[0].slice(0, 2).toUpperCase()
}

export default async function ConteudoPublicoPage({ params }: Props) {
  const { id } = await params
  const res = await getContentItemById(id)
  if (!res.ok || res.item.type !== "article") {
    notFound()
  }

  const likedSet = await getMyLikesForContentIds([id])
  const initialLiked = likedSet.has(id)

  const { item, author } = res
  const disciplina = item.settings?.disciplina
  const coverUrl = item.settings?.coverUrl?.trim() || null
  const coverVideoUrl = item.settings?.coverVideoUrl?.trim() || null

  return (
    <div className="min-h-screen bg-[#F3F4F6]">
      <header className="border-b border-gray-200 bg-white">
        <div className="max-w-3xl mx-auto px-4 py-4 flex items-center justify-between gap-4">
          <Link href="/" className="text-sm font-medium text-[#1D4ED8] hover:underline">
            EduConnect
          </Link>
          <Link
            href="/login"
            className="text-sm text-gray-600 hover:text-[#1D4ED8]"
          >
            Entrar
          </Link>
        </div>
      </header>

      <article className="max-w-3xl mx-auto px-4 py-8">
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
          {coverVideoUrl || coverUrl ? (
            <div className="w-full aspect-[21/9] max-h-72 bg-gray-100 border-b border-gray-100 overflow-hidden">
              <ArticleCoverMedia
                imageUrl={coverUrl}
                videoUrl={coverVideoUrl}
                className="w-full h-full object-cover"
              />
            </div>
          ) : null}
          <div className="p-6 border-b border-gray-100 flex items-start gap-4">
            <Avatar className="h-12 w-12">
              {author.avatar_url ? (
                <AvatarImage src={author.avatar_url} alt="" />
              ) : null}
              <AvatarFallback className="bg-[#1E3A8A] text-white text-sm">
                {initials(author.full_name)}
              </AvatarFallback>
            </Avatar>
            <div>
              <p className="font-medium text-gray-900">{author.full_name ?? "Professor"}</p>
              {disciplina ? (
                <Badge variant="secondary" className="mt-1">
                  {disciplina}
                </Badge>
              ) : null}
            </div>
          </div>

          <div className="p-6">
            <h1 className="font-display text-2xl font-bold text-gray-900 mb-6">{item.title}</h1>
            {item.body_html ? (
              <RichTextContent html={item.body_html} className="prose prose-sm max-w-none" />
            ) : (
              <p className="text-gray-500 text-sm">Sem conteudo.</p>
            )}
          </div>

          <div className="px-6 pb-6">
            <ConteudoEngagement
              contentItemId={item.id}
              initialLikeCount={item.like_count}
              initialShareCount={item.share_count}
              initialLiked={initialLiked}
            />
          </div>
        </div>
      </article>
    </div>
  )
}
