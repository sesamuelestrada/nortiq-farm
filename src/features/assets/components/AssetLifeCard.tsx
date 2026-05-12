'use client'

import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts'
import { DollarSign, Clock, TrendingUp, AlertTriangle } from 'lucide-react'
import { format, subMonths, startOfMonth, endOfMonth } from 'date-fns'
import { es } from 'date-fns/locale'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import type { MaintenanceFinding } from '../types'

interface MaintenanceLog {
  id: string
  created_at: string | null
  cost_estimate: number | null
}

interface Props {
  currentHours: number | null
  logs: MaintenanceLog[]
  openFindings: MaintenanceFinding[]
}

function buildMonthlyData(logs: MaintenanceLog[]) {
  const months: { month: string; costo: number }[] = []
  for (let i = 5; i >= 0; i--) {
    const d = subMonths(new Date(), i)
    const start = startOfMonth(d)
    const end = endOfMonth(d)
    const monthLogs = logs.filter(l => {
      if (!l.created_at) return false
      const date = new Date(l.created_at)
      return date >= start && date <= end
    })
    const total = monthLogs.reduce((sum, l) => sum + (l.cost_estimate ?? 0), 0)
    months.push({
      month: format(d, 'MMM', { locale: es }),
      costo: total,
    })
  }
  return months
}

const severityConfig = {
  critical: { label: 'Crítico', bg: 'bg-red-50', text: 'text-red-700', border: 'border-red-200', dot: 'bg-red-500' },
  high: { label: 'Alto', bg: 'bg-orange-50', text: 'text-orange-700', border: 'border-orange-200', dot: 'bg-orange-500' },
  medium: { label: 'Medio', bg: 'bg-amber-50', text: 'text-amber-700', border: 'border-amber-200', dot: 'bg-amber-500' },
  low: { label: 'Bajo', bg: 'bg-blue-50', text: 'text-blue-700', border: 'border-blue-200', dot: 'bg-blue-400' },
}

export function AssetLifeCard({ currentHours, logs, openFindings }: Props) {
  const totalCost = logs.reduce((sum, l) => sum + (l.cost_estimate ?? 0), 0)
  const costPerHour = currentHours && currentHours > 0 ? totalCost / currentHours : null
  const monthlyData = buildMonthlyData(logs)

  return (
    <div className="space-y-4">
      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card>
          <CardContent className="pt-5 pb-4">
            <div className="flex items-start gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-50">
                <DollarSign className="h-4.5 w-4.5 text-emerald-600" />
              </div>
              <div>
                <p className="text-xs text-gray-500 font-medium">Costo total</p>
                <p className="text-xl font-bold text-gray-900 mt-0.5">
                  ${totalCost.toLocaleString('es-MX', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
                </p>
                <p className="text-xs text-gray-400 mt-0.5">{logs.length} registros</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-5 pb-4">
            <div className="flex items-start gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-blue-50">
                <Clock className="h-4.5 w-4.5 text-blue-600" />
              </div>
              <div>
                <p className="text-xs text-gray-500 font-medium">Costo / hora</p>
                <p className="text-xl font-bold text-gray-900 mt-0.5">
                  {costPerHour != null
                    ? `$${costPerHour.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
                    : '—'}
                </p>
                <p className="text-xs text-gray-400 mt-0.5">
                  {currentHours != null ? `${currentHours.toLocaleString('es-MX')} hrs totales` : 'Sin horas registradas'}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-5 pb-4">
            <div className="flex items-start gap-3">
              <div className={`flex h-9 w-9 items-center justify-center rounded-xl ${openFindings.length > 0 ? 'bg-red-50' : 'bg-emerald-50'}`}>
                <AlertTriangle className={`h-4.5 w-4.5 ${openFindings.length > 0 ? 'text-red-600' : 'text-emerald-600'}`} />
              </div>
              <div>
                <p className="text-xs text-gray-500 font-medium">Hallazgos abiertos</p>
                <p className={`text-xl font-bold mt-0.5 ${openFindings.length > 0 ? 'text-red-600' : 'text-emerald-600'}`}>
                  {openFindings.length}
                </p>
                <p className="text-xs text-gray-400 mt-0.5">
                  {openFindings.length === 0 ? 'Sin problemas abiertos' : 'requieren atención'}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Monthly Cost Chart */}
      <Card>
        <CardHeader className="pb-2">
          <div className="flex items-center gap-2">
            <TrendingUp className="h-4 w-4 text-gray-400" />
            <CardTitle className="text-sm font-medium text-gray-500">Costo por mes (últimos 6 meses)</CardTitle>
          </div>
        </CardHeader>
        <CardContent>
          {totalCost === 0 ? (
            <p className="text-sm text-gray-400 text-center py-6">Sin registros de costo en los últimos 6 meses</p>
          ) : (
            <ResponsiveContainer width="100%" height={160}>
              <BarChart data={monthlyData} margin={{ top: 4, right: 4, bottom: 0, left: 0 }}>
                <XAxis dataKey="month" tick={{ fontSize: 11, fill: '#9ca3af' }} axisLine={false} tickLine={false} />
                <YAxis hide />
                <Tooltip
                  formatter={(value: unknown) => [`$${Number(value).toLocaleString('es-MX')}`, 'Costo']}
                  contentStyle={{ fontSize: 12, borderRadius: 8, border: '1px solid #e5e7eb' }}
                />
                <Bar dataKey="costo" fill="#10b981" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </CardContent>
      </Card>

      {/* Open Findings */}
      {openFindings.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-500">Hallazgos abiertos</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {openFindings.map(finding => {
              const config = severityConfig[finding.severity] ?? severityConfig.medium
              return (
                <div key={finding.id} className={`flex items-start gap-3 rounded-lg border px-3 py-2.5 ${config.bg} ${config.border}`}>
                  <span className={`mt-1.5 h-2 w-2 flex-shrink-0 rounded-full ${config.dot}`} />
                  <div className="flex-1 min-w-0">
                    <p className={`text-sm font-medium ${config.text}`}>{finding.description}</p>
                    {finding.follow_up_date && (
                      <p className="text-xs text-gray-400 mt-0.5">
                        Seguimiento: {format(new Date(finding.follow_up_date), "d 'de' MMMM", { locale: es })}
                      </p>
                    )}
                  </div>
                  <span className={`flex-shrink-0 rounded-full border px-2 py-0.5 text-[10px] font-semibold ${config.bg} ${config.text} ${config.border}`}>
                    {config.label}
                  </span>
                </div>
              )
            })}
          </CardContent>
        </Card>
      )}
    </div>
  )
}
