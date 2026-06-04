import {
  getFeedArticlesForCurrentUser,
  getMyLikesForContentIds,
  listContentCommentPreviews,
} from "@/app/actions/content-items"
import { getAuthedUser } from "@/lib/auth/user"
import { AlunoFeedClient } from "@/components/dashboard/aluno-feed-client"

export default async function AlunoFeedPage() {
  const articles = (await getFeedArticlesForCurrentUser(20)) ?? []
  const ids = articles.map((a) => a.id)

  const [liked, commentPreviews, user] = await Promise.all([
    getMyLikesForContentIds(ids),
    listContentCommentPreviews(ids, 2),
    getAuthedUser(),
  ])

  return (
    <AlunoFeedClient
      initialArticles={articles}
      initialLikedIds={[...liked]}
      initialCommentPreviews={commentPreviews}
      viewerUserId={user?.id ?? null}
    />
  )
}
