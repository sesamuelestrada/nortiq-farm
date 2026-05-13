import { createClient } from '@/lib/supabase/server'
import { FindingsList } from '@/features/today/components/FindingsList'
import { AlertsTable } from '@/features/alerts/components/AlertsTable'
import { format, differenceInDays, addDays } from 'date-fns'
import { es } from 'date-fns/locale'
import {
  ClipboardList,
  Bell,
  Calendar,
  CheckCircle2,
  AlertTriangle,
  Clock,
  Milk,
} from 'lucide-react'
import Link from 'next/link'
import type { FindingItem } from '@/features/today/components/FindingsList'

const SEVERITY_ORDER = { critical: 0, high: 1, medium: 2, low: 3 }

interface LinerAlert {
  asset_id: string
  asset_name: string
  pct: number
  remainingDays: number
  nextChangeDate: Date
}

async function getTodayData() {
  const supabase = await createClient()
  const today = new Date()
  const in7Days = new Date(today.getTime() + 7 * 24 * 60 * 60 * 1000)

  const [
    { data: rawFindings },
    { data: alerts },
    { data: schedules },
    { data: linerConfigs },
  ] = await Promise.all([
    supabase
      .from('maintenance_findings')
      .select('id, asset_id, description, severity, follow_up_date, created_at, assets(name)')
      .eq('status', 'open')
      .order('created_at', { ascending: true }),
    supabase
      .from('alerts')
      .select('*, asset:assets(id, name)')
      .eq('is_read', false)
      .order('created_at', { ascending: false })
      .limit(50),
    supabase
      .from('maintenance_schedules')
      .select('id, title, subsystem, next_due_date, next_due_hours, asset_id, assets(name, current_hours)')
      .eq('status', 'active')
      .or(`next_due_date.lte.${in7Days.toISOString().split('T')[0]},next_due_date.is.null`)
      .order('next_due_date', { ascending: true })
      .limit(30),
    supabase
      .from('liner_configs')
      .select('asset_id, cows_count, milkings_per_day, liner_life_milkings, last_change_date, assets(name)')
      .not('asset_id', 'is', null),
  ])

  const findings: FindingItem[] = (rawFindings ?? [])
    .map(f => ({
      id: f.id,
      asset_id: f.asset_id,
      asset_name: (f.assets as unknown as { name: string } | null)?.name ?? '—',
      description: f.description,
      severity: (f.severity ?? 'low') as FindingItem['severity'],
      follow_up_date: f.follow_up_date,
      created_at: f.created_at ?? new Date().toISOString(),
    }))
    .sort((a, b) => SEVERITY_ORDER[a.severity] - SEVERITY_ORDER[b.severity])

  // Filter schedules: overdue or due within 7 days (by date or by hours)
  const urgentSchedules = (schedules ?? []).filter(s => {
    const asset = s.assets as unknown as { name: string; current_hours: number | null } | null
    if (s.next_due_date) {
      const daysLeft = differenceInDays(new Date(s.next_due_date), today)
      return daysLeft <= 7
    }
    if (s.next_due_hours != null && asset?.current_hours != null) {
      return (s.next_due_hours - asset.current_hours) <= 20
    }
    return false
  }).map(s => {
    const asset = s.assets as unknown as { name: string; current_hours: number | null } | null
    const daysLeft = s.next_due_date ? differenceInDays(new Date(s.next_due_date), today) : null
    const hoursLeft = s.next_due_hours != null && asset?.current_hours != null
      ? s.next_due_hours - asset.current_hours
      : null
    return { ...s, asset_name: asset?.name ?? '—', daysLeft, hoursLeft }
  }).sort((a, b) => (a.daysLeft ?? 999) - (b.daysLeft ?? 999))

  // Liner alerts: >= 75% vida útil
  const todayMidnight = new Date()
  todayMidnight.setHours(0, 0, 0, 0)
  const linerAlerts: LinerAlert[] = (linerConfigs ?? [])
    .map(cfg => {
      const lastChange = new Date(cfg.last_change_date)
      lastChange.setHours(0, 0, 0, 0)
      const daysSince = Math.max(0, differenceInDays(todayMidnight, lastChange))
      const milkingsPerDay = cfg.cows_count * cfg.milkings_per_day
      const completed = daysSince * milkingsPerDay
      const pct = Math.min(100, (completed / cfg.liner_life_milkings) * 100)
      const remaining = Math.max(0, cfg.liner_life_milkings - completed)
      const remainingDays = milkingsPerDay > 0 ? Math.floor(remaining / milkingsPerDay) : 0
      const assetRecord = cfg.assets as unknown as { name: string } | { name: string }[] | null
      const asset_name = Array.isArray(assetRecord) ? (assetRecord[0]?.name ?? 'Sistema de ordeña') : (assetRecord?.name ?? 'Sistema de ordeña')
      return { asset_id: cfg.asset_id!, asset_name, pct, remainingDays, nextChangeDate: addDays(todayMidnight, remainingDays) }
    })
    .filter(s => s.pct >= 75)
    .sort((a, b) => b.pct - a.pct)

  // Auto-crear alertas críticas cuando liner >= 90%, auto-cerrar cuando < 75%
  const allLinerStats = (linerConfigs ?? []).map(cfg => {
    const lastChange = new Date(cfg.last_change_date)
    lastChange.setHours(0, 0, 0, 0)
    const daysSince = Math.max(0, differenceInDays(todayMidnight, lastChange))
    const milkingsPerDay = cfg.cows_count * cfg.milkings_per_day
    const completed = daysSince * milkingsPerDay
    const pct = Math.min(100, (completed / cfg.liner_life_milkings) * 100)
    const assetRecord = cfg.assets as unknown as { name: string } | { name: string }[] | null
    const asset_name = Array.isArray(assetRecord) ? (assetRecord[0]?.name ?? 'Sistema de ordeña') : (assetRecord?.name ?? 'Sistema de ordeña')
    return { asset_id: cfg.asset_id!, asset_name, pct }
  })

  const criticalLiners = allLinerStats.filter(l => l.pct >= 90)
  const okLiners = allLinerStats.filter(l => l.pct < 75)

  if (criticalLiners.length > 0 || okLiners.length > 0) {
    const allAssetIds = allLinerStats.map(l => l.asset_id)
    const { data: existingLinerAlerts } = await supabase
      .from('alerts')
      .select('id, asset_id')
      .in('asset_id', allAssetIds)
      .ilike('message', '%liner%')
      .eq('is_read', false)

    const assetsWithAlert = new Set((existingLinerAlerts ?? []).map(a => a.asset_id))

    // Crear alertas para liners críticos sin alerta activa
    const toCreate = criticalLiners
      .filter(l => !assetsWithAlert.has(l.asset_id))
      .map(l => ({
        asset_id: l.asset_id,
        type: 'critical',
        message: `Liners de ${l.asset_name} al ${Math.round(l.pct)}% de vida útil — cambio urgente requerido.`,
        is_read: false,
      }))
    if (toCreate.length > 0) await supabase.from('alerts').insert(toCreate)

    // Auto-cerrar alertas de liners que ya fueron cambiados (pct < 75%)
    const toDismiss = (existingLinerAlerts ?? [])
      .filter(a => okLiners.some(l => l.asset_id === a.asset_id))
      .map(a => a.id)
    if (toDismiss.length > 0) {
      await supabase.from('alerts').update({ is_read: true }).in('id', toDismiss)
    }
  }

  const totalPending = findings.length + (alerts ?? []).length + urgentSchedules.length + linerAlerts.length

  return { findings, alerts: alerts ?? [], urgentSchedules, totalPending, linerAlerts }
}

const subsystemLabels: Record<string, string> = {
  engine: 'Motor', transmission: 'Transmisión', hydraulics: 'Hidráulicos',
  filters: 'Filtros', tires: 'Llantas', electrical: 'Eléctrico', general: 'General',
}

export default async function HoyPage() {
  const { findings, alerts, urgentSchedules, totalPending, linerAlerts } = await getTodayData()

  return (
    <div className="p-4 md:p-6 max-w-4xl mx-auto space-y-8">
      {/* Header */}
      <div className="flex items-start gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-100 dark:border-emerald-800/40 mt-0.5">
          <ClipboardList className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-foreground">Hoy</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            {totalPending === 0
              ? 'Todo en orden — sin pendientes'
              : `${totalPending} ${totalPending === 1 ? 'pendiente' : 'pendientes'} que atender`}
          </p>
        </div>
        {totalPending === 0 && (
          <div className="ml-auto flex h-9 w-9 items-center justify-center rounded-full bg-emerald-50 dark:bg-emerald-950/40">
            <CheckCircle2 className="h-5 w-5 text-emerald-600" />
          </div>
        )}
      </div>

      {/* SECTION 1: Hallazgos abiertos */}
      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 text-muted-foreground" />
            <h2 className="text-sm font-semibold text-foreground">
              Hallazgos abiertos
            </h2>
            {findings.length > 0 && (
              <span className="rounded-full bg-red-100 dark:bg-red-950/40 border border-red-200 dark:border-red-800/40 px-2 py-0.5 text-[11px] font-bold text-red-700 dark:text-red-400">
                {findings.length}
              </span>
            )}
          </div>
        </div>
        <FindingsList initialFindings={findings} />
      </section>

      {/* SECTION 2: Mantenimientos urgentes */}
      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Calendar className="h-4 w-4 text-muted-foreground" />
            <h2 className="text-sm font-semibold text-foreground">
              Servicios vencidos o próximos 7 días
            </h2>
            {urgentSchedules.length > 0 && (
              <span className="rounded-full bg-amber-100 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800/40 px-2 py-0.5 text-[11px] font-bold text-amber-700 dark:text-amber-400">
                {urgentSchedules.length}
              </span>
            )}
          </div>
          <Link href="/programas" className="text-xs text-emerald-600 hover:text-emerald-700 font-medium">
            Ver todos →
          </Link>
        </div>

        {urgentSchedules.length === 0 ? (
          <div className="rounded-xl border border-border bg-card py-10 text-center text-sm text-muted-foreground">
            <CheckCircle2 className="h-8 w-8 mx-auto mb-2 text-emerald-500 opacity-60" />
            Sin servicios urgentes esta semana
          </div>
        ) : (
          <div className="space-y-2">
            {urgentSchedules.map(s => {
              const isOverdue = (s.daysLeft ?? 1) < 0 || (s.hoursLeft ?? 1) < 0
              return (
                <div
                  key={s.id}
                  className={`flex items-center gap-4 rounded-xl border bg-card px-4 py-3.5 ${
                    isOverdue
                      ? 'border-l-4 border-l-red-500 border-border'
                      : 'border-l-4 border-l-amber-400 border-border'
                  }`}
                >
                  <div className={`flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg ${isOverdue ? 'bg-red-50 dark:bg-red-950/40' : 'bg-amber-50 dark:bg-amber-950/40'}`}>
                    <Clock className={`h-4 w-4 ${isOverdue ? 'text-red-600 dark:text-red-400' : 'text-amber-600 dark:text-amber-400'}`} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-foreground truncate">{s.title}</p>
                    <p className="text-xs text-muted-foreground">
                      {s.asset_name} · {subsystemLabels[s.subsystem] ?? s.subsystem}
                    </p>
                  </div>
                  <div className="text-right flex-shrink-0">
                    {s.daysLeft !== null ? (
                      <span className={`text-xs font-bold ${isOverdue ? 'text-red-600 dark:text-red-400' : 'text-amber-600 dark:text-amber-400'}`}>
                        {isOverdue ? `Vencido ${Math.abs(s.daysLeft)} días` : s.daysLeft === 0 ? 'Hoy' : `En ${s.daysLeft} días`}
                      </span>
                    ) : s.hoursLeft !== null ? (
                      <span className={`text-xs font-bold ${isOverdue ? 'text-red-600 dark:text-red-400' : 'text-amber-600 dark:text-amber-400'}`}>
                        {isOverdue ? `Vencido ${Math.abs(s.hoursLeft)}h` : `Faltan ${s.hoursLeft}h`}
                      </span>
                    ) : null}
                    {s.next_due_date && (
                      <p className="text-[10px] text-muted-foreground mt-0.5">
                        {format(new Date(s.next_due_date), "d MMM", { locale: es })}
                      </p>
                    )}
                  </div>
                  <Link
                    href={`/assets/${s.asset_id}`}
                    className="flex-shrink-0 rounded-lg border border-border bg-muted/30 px-2.5 py-1.5 text-[11px] font-medium text-muted-foreground hover:text-foreground hover:bg-muted/60 transition-colors"
                  >
                    Ver activo
                  </Link>
                </div>
              )
            })}
          </div>
        )}
      </section>

      {/* SECTION 2.5: Liners urgentes */}
      {linerAlerts.length > 0 && (
        <section className="space-y-3">
          <div className="flex items-center gap-2">
            <Milk className="h-4 w-4 text-muted-foreground" />
            <h2 className="text-sm font-semibold text-foreground">Liners — Cambio requerido</h2>
            <span className="rounded-full bg-amber-100 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800/40 px-2 py-0.5 text-[11px] font-bold text-amber-700 dark:text-amber-400">
              {linerAlerts.length}
            </span>
          </div>
          <div className="space-y-2">
            {linerAlerts.map(l => {
              const isUrgent = l.pct >= 90
              return (
                <div
                  key={l.asset_id}
                  className={`flex items-center gap-4 rounded-xl border bg-card px-4 py-3.5 ${
                    isUrgent
                      ? 'border-l-4 border-l-red-500 border-border'
                      : 'border-l-4 border-l-amber-400 border-border'
                  }`}
                >
                  <div className={`flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg ${isUrgent ? 'bg-red-50 dark:bg-red-950/40' : 'bg-amber-50 dark:bg-amber-950/40'}`}>
                    <Milk className={`h-4 w-4 ${isUrgent ? 'text-red-600 dark:text-red-400' : 'text-amber-600 dark:text-amber-400'}`} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-foreground truncate">Cambio de liners</p>
                    <p className="text-xs text-muted-foreground">{l.asset_name} · {Math.round(l.pct)}% vida útil consumida</p>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <span className={`text-xs font-bold ${isUrgent ? 'text-red-600 dark:text-red-400' : 'text-amber-600 dark:text-amber-400'}`}>
                      {l.remainingDays === 0 ? 'Hoy' : `En ${l.remainingDays} días`}
                    </span>
                    <p className="text-[10px] text-muted-foreground mt-0.5">
                      {format(l.nextChangeDate, "d MMM", { locale: es })}
                    </p>
                  </div>
                  <Link
                    href={`/assets/${l.asset_id}`}
                    className="flex-shrink-0 rounded-lg border border-border bg-muted/30 px-2.5 py-1.5 text-[11px] font-medium text-muted-foreground hover:text-foreground hover:bg-muted/60 transition-colors"
                  >
                    Ver activo
                  </Link>
                </div>
              )
            })}
          </div>
        </section>
      )}

      {/* SECTION 3: Alertas sin leer */}
      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Bell className="h-4 w-4 text-muted-foreground" />
            <h2 className="text-sm font-semibold text-foreground">
              Alertas sin leer
            </h2>
            {alerts.length > 0 && (
              <span className="rounded-full bg-red-100 dark:bg-red-950/40 border border-red-200 dark:border-red-800/40 px-2 py-0.5 text-[11px] font-bold text-red-700 dark:text-red-400">
                {alerts.length}
              </span>
            )}
          </div>
          <Link href="/alerts" className="text-xs text-muted-foreground hover:text-foreground transition-colors">
            Ver historial completo →
          </Link>
        </div>
        <AlertsTable initialAlerts={alerts as Parameters<typeof AlertsTable>[0]['initialAlerts']} />
      </section>
    </div>
  )
}
