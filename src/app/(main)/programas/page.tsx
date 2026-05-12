import { createClient } from '@/lib/supabase/server'
import { differenceInDays } from 'date-fns'
import { CalendarClock } from 'lucide-react'
import { ProgramasClient } from './ProgramasClient'

export interface ScheduleRow {
  id: string
  title: string
  subsystem: string
  asset_id: string
  asset_name: string
  current_hours: number | null
  next_due_date: string | null
  next_due_hours: number | null
  hours_interval: number | null
  calendar_interval_days: number | null
  notes: string | null
  daysLeft: number | null
  hoursLeft: number | null
  status: 'overdue' | 'soon' | 'upcoming'
}

async function getSchedules(): Promise<{ overdue: ScheduleRow[]; soon: ScheduleRow[]; upcoming: ScheduleRow[]; all: ScheduleRow[] }> {
  const supabase = await createClient()
  const today = new Date()

  const { data } = await supabase
    .from('maintenance_schedules')
    .select('id, title, subsystem, asset_id, next_due_date, next_due_hours, hours_interval, calendar_interval_days, notes, assets(name, current_hours)')
    .eq('status', 'active')
    .order('next_due_date', { ascending: true, nullsFirst: false })

  const rows: ScheduleRow[] = (data ?? []).map(s => {
    const asset = s.assets as unknown as { name: string; current_hours: number | null } | null
    const daysLeft = s.next_due_date ? differenceInDays(new Date(s.next_due_date), today) : null
    const hoursLeft = s.next_due_hours != null && asset?.current_hours != null
      ? s.next_due_hours - asset.current_hours
      : null

    let status: ScheduleRow['status'] = 'upcoming'
    if ((daysLeft !== null && daysLeft < 0) || (hoursLeft !== null && hoursLeft < 0)) {
      status = 'overdue'
    } else if ((daysLeft !== null && daysLeft <= 7) || (hoursLeft !== null && hoursLeft <= 20)) {
      status = 'soon'
    }

    return {
      id: s.id,
      title: s.title,
      subsystem: s.subsystem,
      asset_id: s.asset_id,
      asset_name: asset?.name ?? '—',
      current_hours: asset?.current_hours ?? null,
      next_due_date: s.next_due_date,
      next_due_hours: s.next_due_hours,
      hours_interval: s.hours_interval,
      calendar_interval_days: s.calendar_interval_days,
      notes: s.notes,
      daysLeft,
      hoursLeft,
      status,
    }
  })

  return {
    overdue: rows.filter(r => r.status === 'overdue').sort((a, b) => (a.daysLeft ?? -999) - (b.daysLeft ?? -999)),
    soon: rows.filter(r => r.status === 'soon').sort((a, b) => (a.daysLeft ?? 999) - (b.daysLeft ?? 999)),
    upcoming: rows.filter(r => r.status === 'upcoming').sort((a, b) => (a.daysLeft ?? 999) - (b.daysLeft ?? 999)),
    all: rows,
  }
}

export default async function ProgramasPage() {
  const { overdue, soon, upcoming, all } = await getSchedules()
  const total = overdue.length + soon.length + upcoming.length

  return (
    <div className="p-4 md:p-6 max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-start gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-50 dark:bg-blue-950/40 border border-blue-100 dark:border-blue-800/40 mt-0.5">
            <CalendarClock className="h-5 w-5 text-blue-600 dark:text-blue-400" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-foreground">Programas de mantenimiento</h1>
            <p className="text-sm text-muted-foreground mt-0.5">
              {total} {total === 1 ? 'programa activo' : 'programas activos'}
              {overdue.length > 0 && ` · ${overdue.length} vencido${overdue.length > 1 ? 's' : ''}`}
            </p>
          </div>
        </div>
      </div>

      {/* Client: toggle vista + contenido */}
      <ProgramasClient
        overdue={overdue}
        soon={soon}
        upcoming={upcoming}
        all={all}
        total={total}
      />
    </div>
  )
}
