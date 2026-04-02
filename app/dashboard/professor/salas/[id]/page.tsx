import { notFound } from "next/navigation"
import {
  getClassroomForProfessor,
  listMembersForClassroom,
} from "@/app/actions/classrooms"
import { ProfessorSalaDetail } from "./professor-sala-detail"

export default async function ProfessorSalaDetalhesPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const result = await getClassroomForProfessor(id)
  if (!result.row) notFound()

  const { members } = await listMembersForClassroom(id)

  return (
    <ProfessorSalaDetail classroom={result.row} members={members} />
  )
}
