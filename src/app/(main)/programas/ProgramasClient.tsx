'use client'

import { useState } from 'react'
import { List, Calendar, CheckCircle2, AlertTriangle, Clock, CalendarClock, Wrench, ChevronRight } from 'lucide-react'
import { ScheduleCalendar } from '@/features/schedules/components/ScheduleCalendar'
import { cn } from '@/lib/utils'
import Link from 'next/link'
import type { ScheduleRow } from './page'

const subsystemLabels: Record<string, string> = {
  engine: 'Motor',
  transmission: 'Transmisión',
  hydraulics: 'Hidráulicos',
  filters: 'Filtros',
  tires: 'Llantas',
  electrical: 'Eléctrico',
  general: 'General',
}

const subsystemColors: Record<string, string> = {
  engine: 'bg-red-50 text-red-700 border-red-200 dark:bg-red-950/40 dark:text-red-400 dark:border-red-800/40',
  transmission: 'bg-purple-50 text-purple-700 border-purple-200 dark:bg-purple-950/40 dark:text-purple-400 dark:border-purple-800/40',
  hydraulics: 'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/40 dark:text-blue-400 dark:border-blue-800/40',
  filters: 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/40 dark:text-amber-400 dark:border-amber-800/40',
  tires: 'bg-slate-50 text-slate-700 border-slate-200 dark:bg-slate-950/40 dark:text-slate-400 dark:border-slate-800/40',
  electrical: 'bg-yellow-50 text-yellow-700 border-yellow-200 dark:bg-yellow-950/40 dark:text-yellow-400 dark:border-yellow-800/40',
  general: 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-400 dark:border-emerald-800/40',
}

function SectionHeader({
  icon: Icon, title, count, color,
}: {
  icon: React.ComponentType<{ className?: string }>
  title: string
  count: number
  color: string
}) {
  return (
    <div className="flex items-center gap-2">
      <Icon className={`h-4 w-4 ${color}`} />
      <h2 className="text-sm font-semibold text-foreground">{title}</h2>
      {count > 0 && (
        <span className={cn(
          'rounded-full border px-2 py-0.5 text-[11px] font-bold',
          color.includes('red') ? 'bg-red-100 text-red-700 border-red-200 dark:bg-red-950/40 dark:text-red-400 dark:border-red-800/40' :
          color.includes('amber') ? 'bg-amber-100 text-amber-700 border-amber-200 dark:bg-amber-950/40 dark:text-amber-400 dark:border-amber-800/40' :
          'bg-emerald-100 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-400 dark:border-emerald-800/40'
        )}>
          {count}
        </span>
      )}
    </div>
  )
}

function ScheduleCard({ s }: { s: ScheduleRow }) {
  const subsystemColor = subsystemColors[s.subsystem] ?? subsystemColors.general
  const isOverdue = s.status === 'overdue'
  const isSoon = s.status === 'soon'

  return (
    <div className={cn(
      'flex items-center gap-4 rounded-xl border bg-card px-4 py-4 transition-all hover:shadow-sm',
      isOverdue ? 'border-l-4 border-l-red-500 border-border' :
      isSoon ? 'border-l-4 border-l-amber-400 border-border' :
      'border-border'
    )}>
      <div className={cn(
        'flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-lg',
        isOverdue ? 'bg-red-50 dark:bg-red-950/40' :
        isSoon ? 'bg-amber-50 dark:bg-amber-950/40' :
        'bg-emerald-50 dark:bg-emerald-950/40'
      )}>
        <Clock className={cn(
          'h-4 w-4',
          isOverdue ? 'text-red-600 dark:text-red-400' :
          isSoon ? 'text-amber-600 dark:text-amber-400' :
          'text-emerald-600 dark:text-emerald-400'
        )} />
      </div>

      <div className="flex-1 min-w-0 space-y-1">
        <div className="flex items-center gap-2 flex-wrap">
          <p className="text-sm font-semibold text-foreground leading-tight">{s.title}</p>
          <span className={`rounded-full border px-2 py-0.5 text-[10px] font-bold ${subsystemColor}`}>
            {subsystemLabels[s.subsystem] ?? s.subsystem}
          </span>
        </div>
        <p className="text-xs text-muted-foreground">{s.asset_name}</p>
        <div className="flex items-center gap-3 text-[11px] text-muted-foreground flex-wrap">
          {s.hours_interval && <span>Cada {s.hours_interval}h</span>}
          {s.calendar_interval_days && <span>Cada {s.calendar_interval_days} días</span>}
          {s.next_due_hours && s.current_hours != null && (
            <span>Activo: {s.current_hours}h / Próximo: {s.next_due_hours}h</span>
          )}
        </div>
      </div>

      <div className="text-right flex-shrink-0 space-y-0.5">
        {s.daysLeft !== null && (
          <p className={cn(
            'text-sm font-bold',
            isOverdue ? 'text-red-600 dark:text-red-400' :
            isSoon ? 'text-amber-600 dark:text-amber-400' :
            'text-emerald-700 dark:text-emerald-400'
          )}>
            {isOverdue ? `Vencido ${Math.abs(s.daysLeft)}d` : s.daysLeft === 0 ? 'Hoy' : `${s.daysLeft} días`}
          </p>
        )}
        {s.hoursLeft !== null && s.daysLeft === null && (
          <p className={cn(
            'text-sm font-bold',
            isOverdue ? 'text-red-600 dark:text-red-400' :
            isSoon ? 'text-amber-600 dark:text-amber-400' :
            'text-emerald-700 dark:text-emerald-400'
          )}>
            {isOverdue ? `Vencido ${Math.abs(s.hoursLeft)}h` : `${s.hoursLeft}h`}
          </p>
        )}
      </div>

      <Link
        href={`/maintenance/log/${s.asset_id}`}
        className="flex-shrink-0 flex items-center gap-1 rounded-lg bg-emerald-600 px-3 py-1.5 text-[11px] font-semibold text-white hover:bg-emerald-700 transition-colors"
      >
        <Wrench className="h-3 w-3" />
        Registrar
      </Link>
    </div>
  )
}

interface Props {
  overdue: ScheduleRow[]
  soon: ScheduleRow[]
  upcoming: ScheduleRow[]
  all: ScheduleRow[]
  total: number
}

export function ProgramasClient({ overdue, soon, upcoming, all, total }: Props) {
  const [view, setView] = useState<'lista' | 'calendario'>('lista')

  if (total === 0) {
    return (
      <div className="rounded-xl border border-border bg-card py-16 text-center text-sm text-muted-foreground">
        <CalendarClock className="h-10 w-10 mx-auto mb-3 opacity-30" />
        <p className="font-medium">Sin programas de mantenimiento activos</p>
        <p className="mt-1 text-xs">Usa el asistente IA para programar servicios preventivos</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Toggle */}
      <div className="flex items-center gap-1 rounded-lg border border-border bg-card p-1 w-fit">
        <button
          onClick={() => setView('lista')}
          className={cn(
            'flex items-center gap-2 rounded-md px-3 py-1.5 text-sm font-medium transition-all cursor-pointer',
            view === 'lista'
              ? 'bg-foreground text-background shadow-sm'
              : 'text-muted-foreground hover:text-foreground'
          )}
        >
          <List className="h-4 w-4" />
          Lista
        </button>
        <button
          onClick={() => setView('calendario')}
          className={cn(
            'flex items-center gap-2 rounded-md px-3 py-1.5 text-sm font-medium transition-all cursor-pointer',
            view === 'calendario'
              ? 'bg-foreground text-background shadow-sm'
              : 'text-muted-foreground hover:text-foreground'
          )}
        >
          <Calendar className="h-4 w-4" />
          Calendario
        </button>
      </div>

      {/* Lista view */}
      {view === 'lista' && (
        <div className="space-y-8">
          {overdue.length > 0 && (
            <section className="space-y-3">
              <SectionHeader icon={AlertTriangle} title="Vencidos" count={overdue.length} color="text-red-600 dark:text-red-400" />
              <div className="space-y-2">
                {overdue.map(s => <ScheduleCard key={s.id} s={s} />)}
              </div>
            </section>
          )}

          {soon.length > 0 && (
            <section className="space-y-3">
              <SectionHeader icon={Clock} title="Próximos 7 días" count={soon.length} color="text-amber-600 dark:text-amber-400" />
              <div className="space-y-2">
                {soon.map(s => <ScheduleCard key={s.id} s={s} />)}
              </div>
            </section>
          )}

          {upcoming.length > 0 && (
            <section className="space-y-3">
              <SectionHeader icon={CheckCircle2} title="Programados" count={upcoming.length} color="text-emerald-600 dark:text-emerald-400" />
              <div className="space-y-2">
                {upcoming.map(s => <ScheduleCard key={s.id} s={s} />)}
              </div>
            </section>
          )}

          <div className="flex items-center gap-2 rounded-xl border border-border bg-card/50 px-4 py-3 text-xs text-muted-foreground">
            <span>→</span>
            Para agregar nuevos programas, usa el asistente IA o entra al detalle de un activo.
          </div>
        </div>
      )}

      {/* Calendario view */}
      {view === 'calendario' && (
        <ScheduleCalendar
          schedules={all.filter(s => s.next_due_date !== null).map(s => ({
            id: s.id,
            title: s.title,
            subsystem: s.subsystem,
            asset_id: s.asset_id,
            asset_name: s.asset_name,
            next_due_date: s.next_due_date,
            status: s.status,
          }))}
        />
      )}
    </div>
  )
}
