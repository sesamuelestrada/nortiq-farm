'use client'

import { useState } from 'react'
import { format, startOfMonth, endOfMonth, eachDayOfInterval, getDay, addMonths, subMonths, isSameDay, isToday } from 'date-fns'
import { es } from 'date-fns/locale'
import { ChevronLeft, ChevronRight, Clock, Wrench } from 'lucide-react'
import Link from 'next/link'
import { cn } from '@/lib/utils'

interface ScheduleItem {
  id: string
  title: string
  subsystem: string
  asset_id: string
  asset_name: string
  next_due_date: string | null
  status: 'overdue' | 'soon' | 'upcoming'
}

interface Props {
  schedules: ScheduleItem[]
}

const subsystemLabels: Record<string, string> = {
  engine: 'Motor', transmission: 'Transmisión', hydraulics: 'Hidráulicos',
  filters: 'Filtros', tires: 'Llantas', electrical: 'Eléctrico', general: 'General',
}

const DAY_LABELS = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb']

export function ScheduleCalendar({ schedules }: Props) {
  const [currentMonth, setCurrentMonth] = useState(new Date())
  const [selectedDay, setSelectedDay] = useState<Date | null>(null)

  const monthStart = startOfMonth(currentMonth)
  const monthEnd = endOfMonth(currentMonth)
  const days = eachDayOfInterval({ start: monthStart, end: monthEnd })

  // Pad start with empty cells for first day of month offset
  const startPad = getDay(monthStart)
  const paddedDays: (Date | null)[] = [...Array(startPad).fill(null), ...days]

  // Group schedules by date string
  const schedulesByDate: Record<string, ScheduleItem[]> = {}
  for (const s of schedules) {
    if (!s.next_due_date) continue
    const key = s.next_due_date
    if (!schedulesByDate[key]) schedulesByDate[key] = []
    schedulesByDate[key].push(s)
  }

  function dotColor(status: ScheduleItem['status']) {
    if (status === 'overdue') return 'bg-red-500'
    if (status === 'soon') return 'bg-amber-400'
    return 'bg-emerald-500'
  }

  const selectedSchedules = selectedDay
    ? schedulesByDate[format(selectedDay, 'yyyy-MM-dd')] ?? []
    : []

  return (
    <div className="space-y-4">
      {/* Month navigation */}
      <div className="flex items-center justify-between">
        <button
          onClick={() => { setCurrentMonth(m => subMonths(m, 1)); setSelectedDay(null) }}
          className="flex h-8 w-8 items-center justify-center rounded-lg border border-border bg-card hover:bg-muted/50 transition-colors cursor-pointer"
        >
          <ChevronLeft className="h-4 w-4 text-muted-foreground" />
        </button>
        <h3 className="text-sm font-semibold text-foreground capitalize">
          {format(currentMonth, 'MMMM yyyy', { locale: es })}
        </h3>
        <button
          onClick={() => { setCurrentMonth(m => addMonths(m, 1)); setSelectedDay(null) }}
          className="flex h-8 w-8 items-center justify-center rounded-lg border border-border bg-card hover:bg-muted/50 transition-colors cursor-pointer"
        >
          <ChevronRight className="h-4 w-4 text-muted-foreground" />
        </button>
      </div>

      {/* Calendar grid */}
      <div className="rounded-xl border border-border bg-card overflow-hidden">
        {/* Day headers */}
        <div className="grid grid-cols-7 border-b border-border">
          {DAY_LABELS.map(d => (
            <div key={d} className="py-2 text-center text-[11px] font-semibold text-muted-foreground">
              {d}
            </div>
          ))}
        </div>

        {/* Day cells */}
        <div className="grid grid-cols-7">
          {paddedDays.map((day, idx) => {
            if (!day) return <div key={`pad-${idx}`} className="h-16 border-b border-r border-border/50 last:border-r-0" />

            const dateKey = format(day, 'yyyy-MM-dd')
            const daySchedules = schedulesByDate[dateKey] ?? []
            const isSelected = selectedDay ? isSameDay(day, selectedDay) : false
            const today = isToday(day)

            // Determine most urgent color for the day
            const hasOverdue = daySchedules.some(s => s.status === 'overdue')
            const hasSoon = daySchedules.some(s => s.status === 'soon')

            return (
              <button
                key={dateKey}
                onClick={() => setSelectedDay(isSelected ? null : day)}
                className={cn(
                  'relative h-16 flex flex-col items-center pt-1.5 gap-1 border-b border-r border-border/50 last:border-r-0 transition-colors cursor-pointer',
                  isSelected
                    ? 'bg-emerald-50 dark:bg-emerald-950/30'
                    : 'hover:bg-muted/40',
                  daySchedules.length > 0 && !isSelected && hasOverdue && 'bg-red-50/40 dark:bg-red-950/10',
                  daySchedules.length > 0 && !isSelected && !hasOverdue && hasSoon && 'bg-amber-50/40 dark:bg-amber-950/10',
                )}
              >
                {/* Day number */}
                <span className={cn(
                  'flex h-6 w-6 items-center justify-center rounded-full text-xs font-medium',
                  today && !isSelected && 'bg-emerald-600 text-white font-bold',
                  isSelected && !today && 'bg-emerald-600 text-white',
                  isSelected && today && 'bg-emerald-700 text-white',
                  !today && !isSelected && 'text-foreground',
                )}>
                  {format(day, 'd')}
                </span>

                {/* Dots */}
                {daySchedules.length > 0 && (
                  <div className="flex items-center gap-0.5 flex-wrap justify-center max-w-full px-1">
                    {daySchedules.slice(0, 3).map((s, i) => (
                      <span key={i} className={cn('h-1.5 w-1.5 rounded-full flex-shrink-0', dotColor(s.status))} />
                    ))}
                    {daySchedules.length > 3 && (
                      <span className="text-[9px] text-muted-foreground">+{daySchedules.length - 3}</span>
                    )}
                  </div>
                )}
              </button>
            )
          })}
        </div>
      </div>

      {/* Legend */}
      <div className="flex items-center gap-4 text-[11px] text-muted-foreground">
        <div className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-red-500" />Vencido</div>
        <div className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-amber-400" />Próximo</div>
        <div className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-emerald-500" />Programado</div>
      </div>

      {/* Selected day detail */}
      {selectedDay && (
        <div className="rounded-xl border border-border bg-card overflow-hidden">
          <div className="border-b border-border px-4 py-3">
            <p className="text-sm font-semibold text-foreground capitalize">
              {format(selectedDay, "EEEE d 'de' MMMM", { locale: es })}
            </p>
            <p className="text-xs text-muted-foreground mt-0.5">
              {selectedSchedules.length === 0
                ? 'Sin servicios programados'
                : `${selectedSchedules.length} servicio${selectedSchedules.length > 1 ? 's' : ''} programado${selectedSchedules.length > 1 ? 's' : ''}`}
            </p>
          </div>

          {selectedSchedules.length === 0 ? (
            <div className="px-4 py-6 text-center text-sm text-muted-foreground">
              Día libre de mantenimientos programados
            </div>
          ) : (
            <div className="divide-y divide-border">
              {selectedSchedules.map(s => (
                <div key={s.id} className="flex items-center gap-3 px-4 py-3">
                  <div className={cn(
                    'flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-lg',
                    s.status === 'overdue' ? 'bg-red-50 dark:bg-red-950/40' :
                    s.status === 'soon' ? 'bg-amber-50 dark:bg-amber-950/40' :
                    'bg-emerald-50 dark:bg-emerald-950/40'
                  )}>
                    <Clock className={cn(
                      'h-3.5 w-3.5',
                      s.status === 'overdue' ? 'text-red-600 dark:text-red-400' :
                      s.status === 'soon' ? 'text-amber-600 dark:text-amber-400' :
                      'text-emerald-600 dark:text-emerald-400'
                    )} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-foreground">{s.title}</p>
                    <p className="text-xs text-muted-foreground">
                      {s.asset_name} · {subsystemLabels[s.subsystem] ?? s.subsystem}
                    </p>
                  </div>
                  <Link
                    href={`/maintenance/log/${s.asset_id}`}
                    className="flex-shrink-0 flex items-center gap-1 rounded-lg bg-emerald-600 px-2.5 py-1.5 text-[11px] font-semibold text-white hover:bg-emerald-700 transition-colors"
                  >
                    <Wrench className="h-3 w-3" />
                    Registrar
                  </Link>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
