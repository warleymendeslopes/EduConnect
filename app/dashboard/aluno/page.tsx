import { redirect } from "next/navigation"
import {
  getFeedArticlesForCurrentUser,
  getMyLikesForContentIds,
} from "@/app/actions/content-items"
import { getOnboardingStatus } from "@/app/actions/student-planner"
import { AlunoFeedClient } from "@/components/dashboard/aluno-feed-client"

export default async function AlunoFeedPage() {
  const { completed } = await getOnboardingStatus()
  if (!completed) redirect("/cadastro/onboarding")

  const articles = (await getFeedArticlesForCurrentUser(20)) ?? []
  const ids = articles.map((a) => a.id)
  const liked = await getMyLikesForContentIds(ids)

  return (
    <AlunoFeedClient initialArticles={articles} initialLikedIds={[...liked]} />
  )
}
