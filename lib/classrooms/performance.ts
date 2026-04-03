/** DTOs para relatórios de desempenho (turma e aluno). */

export type ActivityPerformanceSummary = {
  activityId: string
  title: string
  maxScore: number | null
  memberCount: number
  submittedScoredCount: number
  averageScore: number | null
  averagePercent: number | null
}

export type StudentPerformanceRow = {
  studentId: string
  studentName: string | null
  averageScore: number | null
  averagePercent: number | null
  gradedCount: number
  evaluativeActivityCount: number
  lastSubmittedAt: string | null
}

/** Histograma da distribuição das médias dos alunos (tamanho fixo; não cresce com N). */
export type StudentAverageHistogramBin = {
  label: string
  count: number
}

export type ClassroomPerformanceForProfessor = {
  evaluativeActivityCount: number
  memberCount: number
  /** Média das médias individuais (só alunos com pelo menos uma nota). */
  classAverageFromStudentAverages: number | null
  /** Média de todas as notas (cada entrega conta uma vez). */
  globalAverageScore: number | null
  /** Entregas com nota / (membros × atividades avaliativas), 0–1. */
  deliveryRate: number | null
  activities: ActivityPerformanceSummary[]
  /** Página atual da tabela de alunos (slice). */
  students: StudentPerformanceRow[]
  studentsTotal: number
  studentsPage: number
  studentsPageSize: number
  /** Distribuição agregada para o gráfico (independente da paginação). */
  studentAverageHistogram: StudentAverageHistogramBin[]
  error: string | null
}

export type SelfActivityPerformance = {
  activityId: string
  title: string
  maxScore: number | null
  myScore: number | null
  myPercent: number | null
  classAverageScore: number | null
  classAveragePercent: number | null
  comparison: "above" | "equal" | "below" | null
  submittedAt: string | null
}

export type StudentSelfPerformance = {
  evaluativeActivityCount: number
  myOverallAverage: number | null
  myOverallPercent: number | null
  classOverallAverage: number | null
  activities: SelfActivityPerformance[]
  error: string | null
}
