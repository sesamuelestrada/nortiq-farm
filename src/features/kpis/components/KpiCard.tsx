import type { ReactNode } from 'react'

interface Props {
  title: string
  value: string
  subtitle?: string
  icon: ReactNode
  trend?: { value: string; positive: boolean } | null
  accent?: 'emerald' | 'blue' | 'amber' | 'red' | 'slate'
}

const accentMap = {
  emerald: { bg: 'bg-emerald-50', icon: 'text-emerald-600', border: 'border-l-emerald-500', value: 'text-emerald-700' },
  blue: { bg: 'bg-blue-50', icon: 'text-blue-600', border: 'border-l-blue-500', value: 'text-blue-700' },
  amber: { bg: 'bg-amber-50', icon: 'text-amber-600', border: 'border-l-amber-500', value: 'text-amber-700' },
  red: { bg: 'bg-red-50', icon: 'text-red-600', border: 'border-l-red-500', value: 'text-red-700' },
  slate: { bg: 'bg-slate-100', icon: 'text-slate-600', border: 'border-l-slate-400', value: 'text-slate-700' },
}

export function KpiCard({ title, value, subtitle, icon, trend, accent = 'emerald' }: Props) {
  const a = accentMap[accent]
  return (
    <div className={`rounded-2xl bg-white border border-gray-100 border-l-4 ${a.border} p-5 shadow-sm hover:shadow-md transition-shadow duration-200`}>
      <div className="flex items-start justify-between mb-4">
        <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide leading-tight">{title}</span>
        <div className={`flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-xl ${a.bg}`}>
          <span className={a.icon}>{icon}</span>
        </div>
      </div>
      <p className={`text-4xl font-bold tabular-nums leading-none mb-2 ${a.value}`}>{value}</p>
      {subtitle && <p className="text-xs text-gray-400">{subtitle}</p>}
      {trend && (
        <p className={`text-xs font-semibold mt-1 ${trend.positive ? 'text-emerald-600' : 'text-red-600'}`}>
          {trend.positive ? '↑' : '↓'} {trend.value}
        </p>
      )}
    </div>
  )
}
