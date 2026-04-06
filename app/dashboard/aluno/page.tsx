import {
  getFeedArticlesForCurrentUser,
  getMyLikesForContentIds,
} from "@/app/actions/content-items"
import { AlunoFeedClient } from "@/components/dashboard/aluno-feed-client"

export default async function AlunoFeedPage() {
  const articles = (await getFeedArticlesForCurrentUser(20)) ?? []
  const ids = articles.map((a) => a.id)
  const liked = await getMyLikesForContentIds(ids)

  return (
    <AlunoFeedClient initialArticles={articles} initialLikedIds={[...liked]} />
  )
}
