import { notFound } from "next/navigation"
import { getClassroomForStudent } from "@/app/actions/classrooms"
import { listActivitiesForClassroomAsStudent } from "@/app/actions/classroom-activities"
import { listMaterialsForClassroomAsStudent } from "@/app/actions/classroom-materials"
import { AlunoSalaTabs } from "@/components/dashboard/aluno-sala-tabs"

export default async function AlunoSalaDetalhePage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const result = await getClassroomForStudent(id)
  if (!result.row) notFound()

  const { row: sala } = result
  const [
    { rows: activities, error: activitiesError },
    { rows: materials, error: materialsError },
  ] = await Promise.all([
    listActivitiesForClassroomAsStudent(id),
    listMaterialsForClassroomAsStudent(id),
  ])

  return (
    <AlunoSalaTabs
      sala={sala}
      activities={activities}
      activitiesError={activitiesError}
      materials={materials}
      materialsError={materialsError}
    />
  )
}
