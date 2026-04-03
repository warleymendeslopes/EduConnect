import { notFound } from "next/navigation"
import { getClassroomForStudent } from "@/app/actions/classrooms"
import { listActivitiesForClassroomAsStudent } from "@/app/actions/classroom-activities"
import { listMaterialsForClassroomAsStudent } from "@/app/actions/classroom-materials"
import { getMySubmissionGradesForClassroom } from "@/app/actions/activity-submissions"
import { AlunoSalaTabs } from "@/components/dashboard/aluno-sala-tabs"

const VALID_TABS = new Set(["visao", "atividades", "materiais"])

export default async function AlunoSalaDetalhePage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>
  searchParams: Promise<{ tab?: string }>
}) {
  const { id } = await params
  const { tab } = await searchParams
  const defaultTab =
    tab && VALID_TABS.has(tab)
      ? (tab as "visao" | "atividades" | "materiais")
      : "visao"

  const result = await getClassroomForStudent(id)
  if (!result.row) notFound()

  const { row: sala } = result
  const [
    { rows: activities, error: activitiesError },
    { rows: materials, error: materialsError },
    { byActivity: submissionGradesByActivity },
  ] = await Promise.all([
    listActivitiesForClassroomAsStudent(id),
    listMaterialsForClassroomAsStudent(id),
    getMySubmissionGradesForClassroom(id),
  ])

  return (
    <AlunoSalaTabs
      sala={sala}
      activities={activities}
      activitiesError={activitiesError}
      materials={materials}
      materialsError={materialsError}
      defaultTab={defaultTab}
      submissionGradesByActivity={submissionGradesByActivity}
    />
  )
}
