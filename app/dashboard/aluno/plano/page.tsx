import { getPlannerWeek } from "@/app/actions/student-planner"
import { PlanoEstudosClient } from "./plano-estudos-client"

type PageProps = {
  searchParams: Promise<{ semana?: string }>
}

export default async function PlanoEstudosPage({ searchParams }: PageProps) {
  const sp = await searchParams
  const payload = await getPlannerWeek(sp.semana)

  return <PlanoEstudosClient payload={payload} />
}
