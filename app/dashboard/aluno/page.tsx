import {
  getFeedArticlesForCurrentUser,
  getMyLikesForContentIds,
  getMySavesForContentIds,
} from "@/app/actions/content-items"
import { AlunoFeedClient } from "@/components/dashboard/aluno-feed-client"

export default async function AlunoFeedPage() {
  const articles = (await getFeedArticlesForCurrentUser(20)) ?? []
  const ids = articles.map((a) => a.id)
  const [liked, saved] = await Promise.all([
    getMyLikesForContentIds(ids),
    getMySavesForContentIds(ids),
  ])

  return (
    <AlunoFeedClient
      initialArticles={articles}
      initialLikedIds={[...liked]}
      initialSavedIds={[...saved]}
    />
  )
}
