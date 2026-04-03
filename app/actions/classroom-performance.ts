"use server"

import { createClient } from "@/lib/supabase/server"
import { parseExamFromSettings } from "@/lib/activities/exam"
import type { ClassroomActivityRow } from "@/lib/activities/types"
import type {
  ActivityPerformanceSummary,
  ClassroomPerformanceForProfessor,
  SelfActivityPerformance,
  StudentAverageHistogramBin,
  StudentPerformanceRow,
  StudentSelfPerformance,
} from "@/lib/classrooms/performance"

const DEFAULT_STUDENTS_PAGE = 1
const DEFAULT_STUDENTS_PAGE_SIZE = 25
const MAX_STUDENTS_PAGE_SIZE = 100

function buildStudentAverageHistogram(
  rows: StudentPerformanceRow[]
): StudentAverageHistogramBin[] {
  const avgs = rows
    .map((s) => s.averageScore)
    .filter((x): x is number => x != null && !Number.isNaN(x))
  if (avgs.length === 0) return []

  const min = Math.min(...avgs)
  const max = Math.max(...avgs)
  const n = avgs.length
  const binCount = n >= 10 ? 10 : Math.max(3, n)

  if (Math.abs(max - min) < 1e-9) {
    return [{ label: min.toFixed(1), count: avgs.length }]
  }

  const step = (max - min) / binCount
  const bins: StudentAverageHistogramBin[] = []
  for (let i = 0; i < binCount; i++) {
    const lo = min + i * step
    const hi = i === binCount - 1 ? max : min + (i + 1) * step
    const label =
      i === binCount - 1
        ? `${lo.toFixed(1)}–${hi.toFixed(1)}`
        : `${lo.toFixed(1)}–${(min + (i + 1) * step).toFixed(1)}`
    const count = avgs.filter((a) => {
      if (i === binCount - 1) return a >= lo && a <= hi + 1e-9
      return a >= lo && a < hi
    }).length
    bins.push({ label, count })
  }
  return bins
}

async function assertProfessorOwnsClassroom(
  supabase: Awaited<ReturnType<typeof createClient>>,
  classroomId: string,
  userId: string
): Promise<boolean> {
  const { data } = await supabase
    .from("classrooms")
    .select("id")
    .eq("id", classroomId)
    .eq("professor_id", userId)
    .maybeSingle()
  return !!data
}

async function assertStudentMember(
  supabase: Awaited<ReturnType<typeof createClient>>,
  classroomId: string,
  userId: string
): Promise<boolean> {
  const { data } = await supabase
    .from("classroom_members")
    .select("id")
    .eq("classroom_id", classroomId)
    .eq("student_id", userId)
    .maybeSingle()
  return !!data
}

function isScoredSubmission(
  row: { status: string; score_total: unknown }
): row is { status: "enviado"; score_total: number } {
  return (
    row.status === "enviado" &&
    row.score_total !== null &&
    row.score_total !== undefined &&
    !Number.isNaN(Number(row.score_total))
  )
}

function mean(nums: number[]): number | null {
  if (nums.length === 0) return null
  return nums.reduce((a, b) => a + b, 0) / nums.length
}

function scoreToPercent(score: number, maxScore: number | null): number | null {
  if (maxScore == null || maxScore <= 0) return null
  return (score / maxScore) * 100
}

function filterEvaluativeActivities(rows: ClassroomActivityRow[]): ClassroomActivityRow[] {
  return rows.filter(
    (a) =>
      a.status !== "rascunho" && parseExamFromSettings(a.settings) != null
  )
}

export async function getClassroomPerformanceForProfessor(
  classroomId: string,
  opts?: { studentsPage?: number; studentsPageSize?: number }
): Promise<ClassroomPerformanceForProfessor> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  const emptyProf = (
    err: string | null
  ): ClassroomPerformanceForProfessor => ({
    evaluativeActivityCount: 0,
    memberCount: 0,
    classAverageFromStudentAverages: null,
    globalAverageScore: null,
    deliveryRate: null,
    activities: [],
    students: [],
    studentsTotal: 0,
    studentsPage: DEFAULT_STUDENTS_PAGE,
    studentsPageSize: DEFAULT_STUDENTS_PAGE_SIZE,
    studentAverageHistogram: [],
    error: err,
  })

  if (!user) {
    return emptyProf("Nao autenticado")
  }

  const ok = await assertProfessorOwnsClassroom(supabase, classroomId, user.id)
  if (!ok) {
    return emptyProf("Sala nao encontrada")
  }

  const { data: actRows, error: actErr } = await supabase
    .from("classroom_activities")
    .select("*")
    .eq("classroom_id", classroomId)
    .order("due_at", { ascending: true, nullsFirst: false })

  if (actErr || !actRows) {
    return emptyProf(actErr?.message ?? "Erro ao carregar atividades")
  }

  const activities = filterEvaluativeActivities(actRows as ClassroomActivityRow[])
  const evalIds = activities.map((a) => a.id)
  const evalCount = activities.length

  const { data: memberRows, error: memErr } = await supabase
    .from("classroom_members")
    .select("student_id, joined_at")
    .eq("classroom_id", classroomId)
    .order("joined_at", { ascending: true })

  if (memErr) {
    return {
      ...emptyProf(memErr.message),
      evaluativeActivityCount: evalCount,
    }
  }

  const members = memberRows ?? []
  const memberCount = members.length

  const studentIds = members.map((m) => m.student_id as string)
  let nameById = new Map<string, string | null>()
  if (studentIds.length > 0) {
    const { data: profs } = await supabase
      .from("profiles")
      .select("id, full_name")
      .in("id", studentIds)
    nameById = new Map(
      (profs ?? []).map((p) => [p.id as string, p.full_name as string | null])
    )
  }

  if (evalIds.length === 0) {
    const fullRows: StudentPerformanceRow[] = studentIds.map((id) => ({
      studentId: id,
      studentName: nameById.get(id) ?? null,
      averageScore: null,
      averagePercent: null,
      gradedCount: 0,
      evaluativeActivityCount: 0,
      lastSubmittedAt: null,
    }))
    fullRows.sort((a, b) =>
      (a.studentName ?? "").localeCompare(b.studentName ?? "")
    )
    const pageSize = Math.min(
      MAX_STUDENTS_PAGE_SIZE,
      Math.max(1, opts?.studentsPageSize ?? DEFAULT_STUDENTS_PAGE_SIZE)
    )
    const total = fullRows.length
    const maxPage = Math.max(1, Math.ceil(total / pageSize) || 1)
    const studentsPage = Math.min(
      Math.max(1, opts?.studentsPage ?? DEFAULT_STUDENTS_PAGE),
      maxPage
    )
    const start = (studentsPage - 1) * pageSize
    return {
      evaluativeActivityCount: 0,
      memberCount,
      classAverageFromStudentAverages: null,
      globalAverageScore: null,
      deliveryRate: null,
      activities: [],
      students: fullRows.slice(start, start + pageSize),
      studentsTotal: total,
      studentsPage,
      studentsPageSize: pageSize,
      studentAverageHistogram: [],
      error: null,
    }
  }

  const { data: subRows, error: subErr } = await supabase
    .from("classroom_activity_submissions")
    .select(
      "activity_id, student_id, status, score_total, submitted_at"
    )
    .in("activity_id", evalIds)

  if (subErr) {
    return {
      ...emptyProf(subErr.message),
      evaluativeActivityCount: evalCount,
      memberCount,
    }
  }

  const subs = subRows ?? []
  const allScores: number[] = []
  for (const s of subs) {
    if (isScoredSubmission(s)) {
      allScores.push(Number(s.score_total))
    }
  }
  const globalAverageScore = mean(allScores)

  const activitySummaries: ActivityPerformanceSummary[] = []
  for (const act of activities) {
    const maxScore =
      act.max_score != null && act.max_score > 0 ? act.max_score : null
    const forAct = subs.filter((s) => s.activity_id === act.id)
    const scored = forAct.filter(isScoredSubmission)
    const scores = scored.map((s) => Number(s.score_total))
    const avgScore = mean(scores)
    const percents = scores
      .map((sc) => scoreToPercent(sc, maxScore))
      .filter((p): p is number => p != null)
    const avgPercent = mean(percents)

    activitySummaries.push({
      activityId: act.id,
      title: act.title,
      maxScore,
      memberCount,
      submittedScoredCount: scored.length,
      averageScore: avgScore,
      averagePercent: avgPercent,
    })
  }

  const studentRows: StudentPerformanceRow[] = []
  const studentAverages: number[] = []

  for (const sid of studentIds) {
    const grades: number[] = []
    const percents: number[] = []
    let lastIso: string | null = null

    for (const act of activities) {
      const maxScore =
        act.max_score != null && act.max_score > 0 ? act.max_score : null
      const row = subs.find(
        (s) =>
          s.student_id === sid &&
          s.activity_id === act.id &&
          isScoredSubmission(s)
      )
      if (row && isScoredSubmission(row)) {
        const sc = Number(row.score_total)
        grades.push(sc)
        const p = scoreToPercent(sc, maxScore)
        if (p != null) percents.push(p)
        const subAt = row.submitted_at
        if (typeof subAt === "string") {
          if (!lastIso || subAt > lastIso) lastIso = subAt
        }
      }
    }

    const averageScore = mean(grades)
    const averagePercent = mean(percents)
    if (averageScore != null) studentAverages.push(averageScore)

    studentRows.push({
      studentId: sid,
      studentName: nameById.get(sid) ?? null,
      averageScore,
      averagePercent,
      gradedCount: grades.length,
      evaluativeActivityCount: evalCount,
      lastSubmittedAt: lastIso,
    })
  }

  studentRows.sort((a, b) => {
    const av = b.averageScore ?? -1
    const au = a.averageScore ?? -1
    if (av !== au) return av - au
    return (a.studentName ?? "").localeCompare(b.studentName ?? "")
  })

  const classAverageFromStudentAverages = mean(studentAverages)

  const totalSlots = memberCount * evalCount
  const scoredSlots = subs.filter(isScoredSubmission).length
  const deliveryRate =
    totalSlots > 0 ? scoredSlots / totalSlots : null

  const histogram = buildStudentAverageHistogram(studentRows)
  const pageSize = Math.min(
    MAX_STUDENTS_PAGE_SIZE,
    Math.max(1, opts?.studentsPageSize ?? DEFAULT_STUDENTS_PAGE_SIZE)
  )
  const total = studentRows.length
  const maxPage = Math.max(1, Math.ceil(total / pageSize) || 1)
  const studentsPage = Math.min(
    Math.max(1, opts?.studentsPage ?? DEFAULT_STUDENTS_PAGE),
    maxPage
  )
  const start = (studentsPage - 1) * pageSize
  const students = studentRows.slice(start, start + pageSize)

  return {
    evaluativeActivityCount: evalCount,
    memberCount,
    classAverageFromStudentAverages,
    globalAverageScore,
    deliveryRate,
    activities: activitySummaries,
    students,
    studentsTotal: total,
    studentsPage,
    studentsPageSize: pageSize,
    studentAverageHistogram: histogram,
    error: null,
  }
}

type RpcStatRow = { activity_id: string; avg_score: number; score_count: number }

export async function getMyPerformanceInClassroom(
  classroomId: string
): Promise<StudentSelfPerformance> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) {
    return {
      evaluativeActivityCount: 0,
      myOverallAverage: null,
      myOverallPercent: null,
      classOverallAverage: null,
      activities: [],
      error: "Nao autenticado",
    }
  }

  const member = await assertStudentMember(supabase, classroomId, user.id)
  if (!member) {
    return {
      evaluativeActivityCount: 0,
      myOverallAverage: null,
      myOverallPercent: null,
      classOverallAverage: null,
      activities: [],
      error: "Voce nao participa desta sala",
    }
  }

  const { data: actRows, error: actErr } = await supabase
    .from("classroom_activities")
    .select("*")
    .eq("classroom_id", classroomId)
    .order("due_at", { ascending: true, nullsFirst: false })

  if (actErr || !actRows) {
    return {
      evaluativeActivityCount: 0,
      myOverallAverage: null,
      myOverallPercent: null,
      classOverallAverage: null,
      activities: [],
      error: actErr?.message ?? "Erro ao carregar atividades",
    }
  }

  const activities = filterEvaluativeActivities(actRows as ClassroomActivityRow[])
  const evalIds = activities.map((a) => a.id)

  if (evalIds.length === 0) {
    return {
      evaluativeActivityCount: 0,
      myOverallAverage: null,
      myOverallPercent: null,
      classOverallAverage: null,
      activities: [],
      error: null,
    }
  }

  const { data: mySubs, error: myErr } = await supabase
    .from("classroom_activity_submissions")
    .select("activity_id, status, score_total, submitted_at")
    .eq("student_id", user.id)
    .in("activity_id", evalIds)

  if (myErr) {
    return {
      evaluativeActivityCount: evalIds.length,
      myOverallAverage: null,
      myOverallPercent: null,
      classOverallAverage: null,
      activities: [],
      error: myErr.message,
    }
  }

  const { data: rpcRows, error: rpcErr } = await supabase.rpc(
    "class_activity_score_stats",
    { p_classroom_id: classroomId }
  )

  const statsByActivity = new Map<string, { avg: number; count: number }>()
  if (!rpcErr && Array.isArray(rpcRows)) {
    for (const row of rpcRows as RpcStatRow[]) {
      if (row.activity_id && row.avg_score != null) {
        statsByActivity.set(row.activity_id, {
          avg: Number(row.avg_score),
          count: Number(row.score_count ?? 0),
        })
      }
    }
  }

  const myScores: number[] = []
  const myPercents: number[] = []
  const classAvgs: number[] = []

  const selfActivities: SelfActivityPerformance[] = []

  for (const act of activities) {
    const maxScore =
      act.max_score != null && act.max_score > 0 ? act.max_score : null
    const row = (mySubs ?? []).find((s) => s.activity_id === act.id)
    const myScore =
      row && isScoredSubmission(row) ? Number(row.score_total) : null
    const myPercent =
      myScore != null && maxScore != null
        ? scoreToPercent(myScore, maxScore)
        : null
    if (myScore != null) myScores.push(myScore)
    if (myPercent != null) myPercents.push(myPercent)

    const stat = statsByActivity.get(act.id)
    const classAverageScore = stat?.avg ?? null
    let classAveragePercent: number | null = null
    if (classAverageScore != null && maxScore != null && maxScore > 0) {
      classAveragePercent = scoreToPercent(classAverageScore, maxScore)
    }
    if (classAverageScore != null) classAvgs.push(classAverageScore)

    let comparison: SelfActivityPerformance["comparison"] = null
    if (myScore != null && classAverageScore != null) {
      const eps = 0.01
      if (myScore > classAverageScore + eps) comparison = "above"
      else if (myScore < classAverageScore - eps) comparison = "below"
      else comparison = "equal"
    }

    const submittedAt =
      row && typeof row.submitted_at === "string" ? row.submitted_at : null

    selfActivities.push({
      activityId: act.id,
      title: act.title,
      maxScore,
      myScore,
      myPercent,
      classAverageScore,
      classAveragePercent,
      comparison,
      submittedAt,
    })
  }

  const myOverallAverage = mean(myScores)
  const myOverallPercent = mean(myPercents)
  const classOverallAverage = mean(classAvgs.filter((x) => !Number.isNaN(x)))

  return {
    evaluativeActivityCount: evalIds.length,
    myOverallAverage,
    myOverallPercent,
    classOverallAverage: classAvgs.length > 0 ? classOverallAverage : null,
    activities: selfActivities,
    error: rpcErr
      ? `Medias da turma indisponiveis (aplique scripts/007 ou verifique RPC): ${rpcErr.message}`
      : null,
  }
}
