import { differenceInDays } from 'date-fns'
import { Clock, CalendarClock, CheckCircle2, AlertTriangle, Wrench } from 'lucide-react'
import Link from 'next/link'
import { cn } from '@/lib/utils'
import type { MaintenanceSchedule } from '@/features/assets/types'

const SUBSYSTEM_LABELS: Record<string, string> = {
  engine: 'Motor',
  transmission: 'Transmisión',
  hydraulics: 'Hidráulicos',
  filters: 'Filtros',
  tires: 'Llantas',
  electrical: 'Eléctrico',
  general: 'General',
}

interface Props {
  schedules: MaintenanceSchedule[]
  assetId: string
  currentHours: number | null
}

export function AssetSchedules({ schedules, assetId, currentHours }: Props) {
  if (schedules.length === 0) return null

  const today = new Date()

  return (
    <div className="space-y-2">
      {schedules.map(s => {
        const hoursLeft =
          s.next_due_hours != null && currentHours != null
            ? s.next_due_hours - currentHours
            : null

        const daysLeft = s.next_due_date
          ? differenceInDays(new Date(s.next_due_date), today)
          : null

        const isOverdue =
          (hoursLeft !== null && hoursLeft < 0) ||
          (daysLeft !== null && daysLeft < 0)

        const isSoon =
          !isOverdue &&
          ((hoursLeft !== null && hoursLeft <= 20) ||
            (daysLeft !== null && daysLeft <= 7))

        return (
          <div
            key={s.id}
            className={cn(
              'flex items-center gap-4 rounded-xl border bg-card px-4 py-3',
              isOverdue ? 'border-l-4 border-l-red-500 border-border' :
              isSoon ? 'border-l-4 border-l-amber-400 border-border' :
              'border-border'
            )}
          >
            {/* Ícono de estado */}
            <div className={cn(
              'flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg',
              isOverdue ? 'bg-red-50 dark:bg-red-950/40' :
              isSoon ? 'bg-amber-50 dark:bg-amber-950/40' :
              'bg-emerald-50 dark:bg-emerald-950/40'
            )}>
              {isOverdue
                ? <AlertTriangle className="h-4 w-4 text-red-600 dark:text-red-400" />
                : isSoon
                  ? <Clock className="h-4 w-4 text-amber-600 dark:text-amber-400" />
                  : <CheckCircle2 className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
              }
            </div>

            {/* Info */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <p className="text-sm font-semibold text-foreground leading-tight">{s.title}</p>
                <span className="rounded-full border border-border px-2 py-0.5 text-[10px] font-medium text-muted-foreground">
                  {SUBSYSTEM_LABELS[s.subsystem] ?? s.subsystem}
                </span>
              </div>
              <div className="flex items-center gap-3 mt-0.5 text-[11px] text-muted-foreground flex-wrap">
                {s.hours_interval && <span>Cada {s.hours_interval}h</span>}
                {s.calendar_interval_days && <span>Cada {s.calendar_interval_days} días</span>}
                {hoursLeft !== null && currentHours != null && (
                  <span className="flex items-center gap-1">
                    <Clock className="h-3 w-3" />
                    {isOverdue
                      ? `Vencido — ${currentHours}h / programado ${s.next_due_hours}h`
                      : `${currentHours}h actuales · próximo ${s.next_due_hours}h`
                    }
                  </span>
                )}
                {daysLeft !== null && (
                  <span className="flex items-center gap-1">
                    <CalendarClock className="h-3 w-3" />
                    {isOverdue
                      ? `Venció hace ${Math.abs(daysLeft)} días`
                      : daysLeft === 0
                        ? 'Hoy'
                        : `${daysLeft} días`
                    }
                  </span>
                )}
              </div>
            </div>

            {/* Estado / CTA */}
            <div className="flex-shrink-0">
              {isOverdue || isSoon ? (
                <Link
                  href={`/maintenance/log/${assetId}`}
                  className="flex items-center gap-1.5 rounded-lg bg-emerald-600 px-3 py-1.5 text-[11px] font-semibold text-white hover:bg-emerald-700 transition-colors"
                >
                  <Wrench className="h-3 w-3" />
                  Registrar
                </Link>
              ) : (
                <span className="text-[11px] font-medium text-emerald-600 dark:text-emerald-400">Al día</span>
              )}
            </div>
          </div>
        )
      })}
    </div>
  )
}
