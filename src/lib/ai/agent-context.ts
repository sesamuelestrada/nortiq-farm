import { createServiceClient } from '@/lib/supabase/service'
import { format, differenceInDays, parseISO } from 'date-fns'
import { es } from 'date-fns/locale'

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

interface LinerConfigRow {
  asset_id: string
  cows_count: number
  milkings_per_day: number
  liner_life_milkings: number
  last_change_date: string
  assets: { name: string } | null
}

export async function buildMaintenanceContext(): Promise<string> {
  try {
    const supabase = createServiceClient()
    const today = new Date()
    const todayStr = format(today, 'yyyy-MM-dd')
    const in14Days = new Date(today.getTime() + 14 * 24 * 60 * 60 * 1000)

    const [findingsResult, schedulesResult, linersResult] = await Promise.all([
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
      supabase
        .from('liner_configs')
        .select('asset_id, cows_count, milkings_per_day, liner_life_milkings, last_change_date, assets(name)')
        .limit(10),
    ])

    const findings = (findingsResult.data ?? []) as unknown as FindingRow[]
    const schedules = (schedulesResult.data ?? []) as unknown as ScheduleRow[]
    const liners = (linersResult.data ?? []) as unknown as LinerConfigRow[]

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
        const followUp = f.follow_up_date ? ` — revisar el ${format(parseISO(f.follow_up_date), "d 'de' MMMM", { locale: es })}` : ''
        const since = format(new Date(f.created_at), "d 'de' MMMM", { locale: es })
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

      // Calendar-based check (compare date strings to avoid timezone issues)
      if (s.next_due_date) {
        const daysUntil = differenceInDays(parseISO(s.next_due_date), parseISO(todayStr))
        const dueDate = parseISO(s.next_due_date)

        const dueDateLabel = format(dueDate, "d 'de' MMMM", { locale: es })
        if (daysUntil < 0) {
          overdueByCalendar.push(`  - ${assetName}: ${s.title} — VENCIDO hace ${Math.abs(daysUntil)} días (venció el ${dueDateLabel})`)
        } else if (dueDate <= in14Days) {
          let hoursHint = ''
          if (s.next_due_hours && currentHours && avgHoursPerWeek) {
            const hoursRemaining = s.next_due_hours - currentHours
            const weeksRemaining = hoursRemaining / avgHoursPerWeek
            hoursHint = hoursRemaining > 0
              ? ` (~${Math.round(hoursRemaining)}h restantes, ~${weeksRemaining.toFixed(1)} semanas al ritmo actual)`
              : ` (horas ya superadas)`
          }
          const whenLabel = daysUntil === 0 ? 'hoy' : daysUntil === 1 ? 'mañana' : `en ${daysUntil} días`
          upcoming.push(`  - ${assetName}: ${s.title} — vence el ${dueDateLabel} (${whenLabel})${hoursHint}`)
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

    // ── Liner status ───────────────────────────────────────────────
    if (liners.length > 0) {
      lines.push('ESTADO DE LINERS (sala de ordeña):')
      const todayMidnight = new Date(todayStr + 'T00:00:00')
      for (const cfg of liners) {
        const assetName = cfg.assets?.name ?? 'Sistema de ordeña'
        const lastChange = new Date(cfg.last_change_date + 'T00:00:00')
        const daysSince = Math.max(0, differenceInDays(todayMidnight, lastChange))
        const milkingsPerDay = cfg.cows_count * cfg.milkings_per_day
        const completed = daysSince * milkingsPerDay
        const pct = Math.min(100, Math.round((completed / cfg.liner_life_milkings) * 100))
        const remaining = Math.max(0, cfg.liner_life_milkings - completed)
        const daysLeft = milkingsPerDay > 0 ? Math.round(remaining / milkingsPerDay) : 0
        const lastChangeLabel = format(lastChange, "d 'de' MMMM 'de' yyyy", { locale: es })
        const urgency = pct >= 90 ? ' [CAMBIO URGENTE]' : pct >= 75 ? ' [PRÓXIMO A VENCER]' : ''
        lines.push(`  - ${assetName}: ${pct}% de vida útil usada${urgency} — último cambio el ${lastChangeLabel} — faltan ~${daysLeft} días`)
      }
    }

    return lines.join('\n')
  } catch {
    // If tables don't exist yet (migration pending), return empty context silently
    return ''
  }
}
