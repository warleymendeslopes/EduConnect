"use client"

import type { StudentSelfPerformance } from "@/lib/classrooms/performance"
import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts"
import { AlertCircle, ArrowDown, ArrowUp, Minus, TrendingUp } from "lucide-react"

function fmtNum(n: number | null, d = 1): string {
  if (n == null || Number.isNaN(n)) return "—"
  return n.toFixed(d)
}

type Props = {
  data: StudentSelfPerformance
}

export function AlunoPerformancePanel({ data }: Props) {
  if (data.error && data.activities.length === 0) {
    return (
      <div className="p-6 text-sm text-red-600 flex items-start gap-2">
        <AlertCircle className="h-5 w-5 shrink-0 mt-0.5" />
        {data.error}
      </div>
    )
  }

  if (data.evaluativeActivityCount === 0) {
    return (
      <div className="p-8 text-center text-gray-500 text-sm max-w-md mx-auto">
        <p className="mb-2 text-gray-700 font-medium">
          Nenhuma avaliacao com nota nesta sala
        </p>
        <p>
          Quando o professor publicar provas e as notas forem fechadas, veras
          aqui as tuas medias e a comparacao agregada com a turma.
        </p>
      </div>
    )
  }

  const lineData = data.activities
    .filter((a) => a.myScore != null && a.submittedAt)
    .sort(
      (a, b) =>
        new Date(a.submittedAt!).getTime() - new Date(b.submittedAt!).getTime()
    )
    .map((a) => ({
      key: a.activityId,
      label: a.title.length > 16 ? `${a.title.slice(0, 16)}…` : a.title,
      nota: a.myScore ?? 0,
    }))

  return (
    <div className="space-y-6">
      {data.error ? (
        <p className="text-xs text-amber-700 bg-amber-50 border border-amber-100 rounded-lg px-3 py-2">
          {data.error}
        </p>
      ) : null}

      <p className="text-xs text-gray-500">
        Comparacao com a turma usa medias agregadas (sem mostrar notas de
        colegas). Aplica o script SQL <code className="text-[11px]">007</code>{" "}
        no Supabase para ativar medias da turma.
      </p>

      <div className="grid gap-4 sm:grid-cols-3">
        <div className="rounded-xl border border-gray-100 bg-white p-4 shadow-sm">
          <div className="flex items-center gap-2 text-gray-500 text-sm mb-1">
            <TrendingUp className="h-4 w-4" />
            Tua media
          </div>
          <p className="font-display text-2xl font-bold text-[#1D4ED8] tabular-nums">
            {fmtNum(data.myOverallAverage)}
          </p>
          <p className="text-xs text-gray-400 mt-1">Nas atividades com nota</p>
        </div>
        <div className="rounded-xl border border-gray-100 bg-white p-4 shadow-sm">
          <div className="text-gray-500 text-sm mb-1">Tua media % do maximo</div>
          <p className="font-display text-2xl font-bold text-gray-900 tabular-nums">
            {data.myOverallPercent != null
              ? `${fmtNum(data.myOverallPercent)}%`
              : "—"}
          </p>
        </div>
        <div className="rounded-xl border border-gray-100 bg-white p-4 shadow-sm">
          <div className="text-gray-500 text-sm mb-1">Media turma (aprox.)</div>
          <p className="font-display text-2xl font-bold text-gray-700 tabular-nums">
            {fmtNum(data.classOverallAverage)}
          </p>
          <p className="text-xs text-gray-400 mt-1">Media das medias por atividade</p>
        </div>
      </div>

      {lineData.length > 0 ? (
        <div className="rounded-xl border border-gray-100 bg-white p-4">
          <h3 className="font-display font-semibold text-gray-900 mb-4 text-sm">
            Evolucao das tuas notas (por data de envio)
          </h3>
          <div className="h-[240px] w-full min-w-0">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={lineData} margin={{ bottom: 8 }}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-gray-100" />
                <XAxis dataKey="label" tick={{ fontSize: 10 }} interval={0} angle={-15} textAnchor="end" height={56} />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip formatter={(v: number) => [fmtNum(v), "Nota"]} />
                <Line
                  type="monotone"
                  dataKey="nota"
                  stroke="#1D4ED8"
                  strokeWidth={2}
                  dot={{ r: 4 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      ) : null}

      <div className="rounded-xl border border-gray-100 bg-white overflow-hidden">
        <h3 className="font-display font-semibold text-gray-900 px-4 py-3 border-b border-gray-100 text-sm">
          Por atividade
        </h3>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 text-left text-gray-600">
                <th className="px-4 py-2 font-medium">Atividade</th>
                <th className="px-4 py-2 font-medium tabular-nums">Tua nota</th>
                <th className="px-4 py-2 font-medium tabular-nums">% max</th>
                <th className="px-4 py-2 font-medium tabular-nums">Media turma</th>
                <th className="px-4 py-2 font-medium">Vs turma</th>
              </tr>
            </thead>
            <tbody>
              {data.activities.map((a) => (
                <tr
                  key={a.activityId}
                  className="border-t border-gray-100 hover:bg-gray-50/80"
                >
                  <td className="px-4 py-2.5 text-gray-900 max-w-[200px]">
                    {a.title}
                  </td>
                  <td className="px-4 py-2.5 tabular-nums">{fmtNum(a.myScore)}</td>
                  <td className="px-4 py-2.5 tabular-nums text-gray-600">
                    {fmtNum(a.myPercent)}
                    {a.myPercent != null ? "%" : ""}
                  </td>
                  <td className="px-4 py-2.5 tabular-nums text-gray-600">
                    {fmtNum(a.classAverageScore)}
                  </td>
                  <td className="px-4 py-2.5">
                    <ComparisonBadge c={a.comparison} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}

function ComparisonBadge({
  c,
}: {
  c: "above" | "equal" | "below" | null
}) {
  if (c === "above") {
    return (
      <span className="inline-flex items-center gap-1 text-green-700 text-xs font-medium">
        <ArrowUp className="h-3.5 w-3.5" /> Acima
      </span>
    )
  }
  if (c === "below") {
    return (
      <span className="inline-flex items-center gap-1 text-amber-700 text-xs font-medium">
        <ArrowDown className="h-3.5 w-3.5" /> Abaixo
      </span>
    )
  }
  if (c === "equal") {
    return (
      <span className="inline-flex items-center gap-1 text-gray-600 text-xs font-medium">
        <Minus className="h-3.5 w-3.5" /> Na media
      </span>
    )
  }
  return <span className="text-gray-400 text-xs">—</span>
}
