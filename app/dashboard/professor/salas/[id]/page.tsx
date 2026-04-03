import { notFound } from "next/navigation"
import {
  getClassroomForProfessor,
  listMembersForClassroom,
} from "@/app/actions/classrooms"
import { listActivitiesForClassroomAsProfessor } from "@/app/actions/classroom-activities"
import { listMaterialsForClassroomAsProfessor } from "@/app/actions/classroom-materials"
import { ProfessorSalaDetail } from "./professor-sala-detail"

export default async function ProfessorSalaDetalhesPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const result = await getClassroomForProfessor(id)
  if (!result.row) notFound()

  const [{ members }, { rows: activities }, { rows: materials }] =
    await Promise.all([
      listMembersForClassroom(id),
      listActivitiesForClassroomAsProfessor(id),
      listMaterialsForClassroomAsProfessor(id),
    ])

  return (
    <ProfessorSalaDetail
      classroom={result.row}
      members={members}
      activities={activities}
      materials={materials}
    />
  )
}
