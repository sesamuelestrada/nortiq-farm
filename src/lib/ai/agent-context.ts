import { createServiceClient } from '@/lib/supabase/service'
import { format } from 'date-fns'

interface FindingRow {
  id: string
  description: string
  severity: string
  follow_up_date: string | null
  created_at: string
  assets: { name: string } | null
}

interface ScheduleRow {
  id: string
  title: string
  subsystem: string
  next_due_hours: number | null
  next_due_date: string | null
  assets: { name: string; current_hours: number | null; avg_hours_per_week: number | null } | null
}

export async function buildMaintenanceContext(): Promise<string> {
  try {
    const supabase = createServiceClient()
    const today = new Date()
    const in14Days = new Date(today.getTime() + 14 * 24 * 60 * 60 * 1000)

    const [findingsResult, schedulesResult] = await Promise.all([
      supabase
        .from('maintenance_findings')
        .select('id, description, severity, follow_up_date, created_at, assets(name)')
        .eq('status', 'open')
        .order('severity', { ascending: false })
        .limit(10),
      supabase
        .from('maintenance_schedules')
        .select('id, title, subsystem, next_due_hours, next_due_date, assets(name, current_hours, avg_hours_per_week)')
        .eq('status', 'active')
        .limit(20),
    ])

    const findings = (findingsResult.data ?? []) as unknown as FindingRow[]
    const schedules = (schedulesResult.data ?? []) as unknown as ScheduleRow[]

    const lines: string[] = [
      `CONTEXTO ACTIVO AL ${format(today, 'yyyy-MM-dd')}:`,
    ]

    // ── Open findings ─────────────────────────────────────────────
    if (findings.length > 0) {
      lines.push('HALLAZGOS ABIERTOS:')
      for (const f of findings) {
        const assetName = f.assets?.name ?? 'Activo desconocido'
        const severityTag = f.severity === 'critical' ? ' [CRÍTICO]'
          : f.severity === 'high' ? ' [URGENTE]'
          : ''
        const followUp = f.follow_up_date ? ` — revisar el ${format(new Date(f.follow_up_date), 'dd/MM/yyyy')}` : ''
        const since = format(new Date(f.created_at), 'dd/MM/yyyy')
        lines.push(`  - ${assetName}: ${f.description}${severityTag} (desde ${since}${followUp})`)
      }
    }

    // ── Overdue and upcoming schedules ────────────────────────────
    const overdueByCalendar: string[] = []
    const overdueByHours: string[] = []
    const upcoming: string[] = []

    for (const s of schedules) {
      const assetName = s.assets?.name ?? 'Activo desconocido'
      const currentHours = s.assets?.current_hours ?? null
      const avgHoursPerWeek = s.assets?.avg_hours_per_week ?? null

      // Calendar-based check
      if (s.next_due_date) {
        const dueDate = new Date(s.next_due_date)
        const daysUntil = Math.ceil((dueDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))

        if (daysUntil < 0) {
          overdueByCalendar.push(`  - ${assetName}: ${s.title} — VENCIDO ${Math.abs(daysUntil)} días`)
        } else if (dueDate <= in14Days) {
          // Compute hours remaining hint if we have usage data
          let hoursHint = ''
          if (s.next_due_hours && currentHours && avgHoursPerWeek) {
            const hoursRemaining = s.next_due_hours - currentHours
            const weeksRemaining = hoursRemaining / avgHoursPerWeek
            hoursHint = hoursRemaining > 0
              ? ` (~${Math.round(hoursRemaining)}h restantes, ~${weeksRemaining.toFixed(1)} semanas al ritmo actual)`
              : ` (horas ya superadas)`
          }
          upcoming.push(`  - ${assetName}: ${s.title} — en ${daysUntil} días${hoursHint}`)
        }
      }

      // Hours-based check (independent of calendar)
      if (s.next_due_hours && currentHours !== null) {
        const hoursRemaining = s.next_due_hours - currentHours
        if (hoursRemaining <= 0) {
          overdueByHours.push(`  - ${assetName}: ${s.title} — VENCIDO por horas (programado ${s.next_due_hours}h / actualmente en ${currentHours}h)`)
        } else if (hoursRemaining <= 30 && !s.next_due_date) {
          // Only show hours-only warning if no calendar entry already shown
          let weeksHint = ''
          if (avgHoursPerWeek) {
            weeksHint = ` (~${(hoursRemaining / avgHoursPerWeek).toFixed(1)} semanas)`
          }
          upcoming.push(`  - ${assetName}: ${s.title} — faltan ${hoursRemaining}h${weeksHint}`)
        }
      }
    }

    if (overdueByCalendar.length > 0 || overdueByHours.length > 0) {
      lines.push('MANTENIMIENTOS VENCIDOS:')
      lines.push(...overdueByCalendar, ...overdueByHours)
    }

    if (upcoming.length > 0) {
      lines.push('PRÓXIMOS 14 DÍAS:')
      lines.push(...upcoming)
    }

    // If everything is clean, note it so the AI doesn't fabricate alerts
    if (findings.length === 0 && overdueByCalendar.length === 0 && overdueByHours.length === 0 && upcoming.length === 0) {
      lines.push('Sin hallazgos abiertos ni mantenimientos próximos en los siguientes 14 días.')
    }

    return lines.join('\n')
  } catch {
    // If tables don't exist yet (migration pending), return empty context silently
    return ''
  }
}
