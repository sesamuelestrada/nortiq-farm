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
  emerald: { bg: 'bg-emerald-50 dark:bg-emerald-950/30', icon: 'text-emerald-600 dark:text-emerald-400', border: 'border-l-emerald-500', value: 'text-emerald-700 dark:text-emerald-400' },
  blue: { bg: 'bg-blue-50 dark:bg-blue-950/30', icon: 'text-blue-600 dark:text-blue-400', border: 'border-l-blue-500', value: 'text-blue-700 dark:text-blue-400' },
  amber: { bg: 'bg-amber-50 dark:bg-amber-950/30', icon: 'text-amber-600 dark:text-amber-400', border: 'border-l-amber-500', value: 'text-amber-700 dark:text-amber-400' },
  red: { bg: 'bg-red-50 dark:bg-red-950/30', icon: 'text-red-600 dark:text-red-400', border: 'border-l-red-500', value: 'text-red-700 dark:text-red-400' },
  slate: { bg: 'bg-slate-100 dark:bg-slate-800/40', icon: 'text-slate-600 dark:text-slate-400', border: 'border-l-slate-400', value: 'text-slate-700 dark:text-slate-300' },
}

export function KpiCard({ title, value, subtitle, icon, trend, accent = 'emerald' }: Props) {
  const a = accentMap[accent]
  return (
    <div className={`rounded-2xl bg-card border border-border border-l-4 ${a.border} p-5 shadow-sm hover:shadow-md transition-shadow duration-200`}>
      <div className="flex items-start justify-between mb-4">
        <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide leading-tight">{title}</span>
        <div className={`flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-xl ${a.bg}`}>
          <span className={a.icon}>{icon}</span>
        </div>
      </div>
      <p className={`text-4xl font-bold tabular-nums leading-none mb-2 ${a.value}`}>{value}</p>
      {subtitle && <p className="text-xs text-muted-foreground">{subtitle}</p>}
      {trend && (
        <p className={`text-xs font-semibold mt-1 ${trend.positive ? 'text-emerald-600' : 'text-red-600'}`}>
          {trend.positive ? '↑' : '↓'} {trend.value}
        </p>
      )}
    </div>
  )
}
