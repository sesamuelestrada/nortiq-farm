import { createClient } from '@/lib/supabase/server'
import { KpiCard } from '@/features/kpis/components/KpiCard'
import { format, subMonths, startOfMonth, endOfMonth, differenceInDays } from 'date-fns'
import { es } from 'date-fns/locale'
import { DollarSign, TrendingUp, CheckCircle, AlertTriangle, Truck, Calendar, BarChart3, ShieldAlert, Wrench, Timer, Activity } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import Link from 'next/link'
import { MonthlyCostChartWrapper as MonthlyCostChart } from '@/features/kpis/components/MonthlyCostChartWrapper'

async function getKpiData() {
  const supabase = await createClient()
  const now = new Date()

  const thisMonthStart = startOfMonth(now)
  const thisMonthEnd = endOfMonth(now)
  const lastMonthStart = startOfMonth(subMonths(now, 1))
  const lastMonthEnd = endOfMonth(subMonths(now, 1))
  const yearStart = new Date(now.getFullYear(), 0, 1)
  const twelveMonthsAgo = startOfMonth(subMonths(now, 11))
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)
  const ninetyDaysAgo = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000)

  const [
    { data: thisMonthLogs },
    { data: lastMonthData },
    { data: yearData },
    { data: typeLogs },
    { data: chartLogs },
    { data: assets },
    { data: openFindings },
    { data: closedFindingsThisMonth },
    { data: upcomingSchedules },
    { data: resolvedFindings90d },
    { data: recentLogs30d },
  ] = await Promise.all([
    // This month: cost + asset breakdown
    supabase.from('maintenance_logs')
      .select('cost_estimate, asset_id, performed_by_name')
      .gte('created_at', thisMonthStart.toISOString())
      .lte('created_at', thisMonthEnd.toISOString()),
    // Last month: cost only
    supabase.from('maintenance_logs')
      .select('cost_estimate')
      .gte('created_at', lastMonthStart.toISOString())
      .lte('created_at', lastMonthEnd.toISOString()),
    // This year: cost only
    supabase.from('maintenance_logs')
      .select('cost_estimate')
      .gte('created_at', yearStart.toISOString()),
    // All time: type + asset_id only (for preventive/corrective + problematic asset)
    supabase.from('maintenance_logs')
      .select('type, asset_id'),
    // Last 12 months: cost + date (for chart)
    supabase.from('maintenance_logs')
      .select('cost_estimate, created_at')
      .gte('created_at', twelveMonthsAgo.toISOString()),
    supabase.from('assets').select('id, name, status'),
    supabase.from('maintenance_findings').select('id, severity').eq('status', 'open'),
    supabase.from('maintenance_findings').select('id').eq('status', 'resolved')
      .gte('resolved_at', thisMonthStart.toISOString())
      .lte('resolved_at', thisMonthEnd.toISOString()),
    supabase.from('maintenance_schedules')
      .select('id, title, next_due_date, asset_id, assets(name)')
      .eq('status', 'active')
      .gte('next_due_date', now.toISOString().split('T')[0])
      .lte('next_due_date', new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0])
      .order('next_due_date', { ascending: true }),
    supabase.from('maintenance_findings')
      .select('created_at, resolved_at')
      .eq('status', 'resolved')
      .gte('resolved_at', ninetyDaysAgo.toISOString())
      .not('resolved_at', 'is', null),
    supabase.from('maintenance_logs')
      .select('asset_id')
      .gte('created_at', thirtyDaysAgo.toISOString()),
  ])

  // This month cost
  const thisMonthCost = (thisMonthLogs ?? []).reduce((s, l) => s + (l.cost_estimate ?? 0), 0)

  // Last month cost
  const lastMonthCost = (lastMonthData ?? []).reduce((s, l) => s + (l.cost_estimate ?? 0), 0)
  const costDiff = lastMonthCost > 0 ? ((thisMonthCost - lastMonthCost) / lastMonthCost) * 100 : 0

  // Year cost + projection
  const yearCost = (yearData ?? []).reduce((s, l) => s + (l.cost_estimate ?? 0), 0)
  const monthsPassed = now.getMonth() + 1
  const projectedYear = monthsPassed > 0 ? (yearCost / monthsPassed) * 12 : 0

  // Most expensive asset this month
  const costByAsset: Record<string, number> = {}
  for (const l of (thisMonthLogs ?? [])) {
    if (!l.asset_id) continue
    costByAsset[l.asset_id] = (costByAsset[l.asset_id] ?? 0) + (l.cost_estimate ?? 0)
  }
  const topAssetId = Object.entries(costByAsset).sort((a, b) => b[1] - a[1])[0]?.[0]
  const topAsset = topAssetId ? (assets ?? []).find(a => a.id === topAssetId) : null
  const topAssetCost = topAssetId ? costByAsset[topAssetId] : 0

  // % Preventivo vs Correctivo (typeLogs: all time, 2 fields only)
  const preventiveCount = (typeLogs ?? []).filter(l => l.type === 'preventive').length
  const correctiveCount = (typeLogs ?? []).filter(l => l.type === 'corrective').length
  const totalTyped = preventiveCount + correctiveCount
  const preventivePct = totalTyped > 0 ? Math.round((preventiveCount / totalTyped) * 100) : 0
  const correctivePct = totalTyped > 0 ? 100 - preventivePct : 0

  // Activo más problemático (typeLogs)
  const correctiveByAsset: Record<string, number> = {}
  for (const l of (typeLogs ?? []).filter(x => x.type === 'corrective')) {
    if (!l.asset_id) continue
    correctiveByAsset[l.asset_id] = (correctiveByAsset[l.asset_id] ?? 0) + 1
  }
  const problemAssetId = Object.entries(correctiveByAsset).sort((a, b) => b[1] - a[1])[0]?.[0]
  const problemAsset = problemAssetId ? (assets ?? []).find(a => a.id === problemAssetId) : null
  const problemAssetCount = problemAssetId ? correctiveByAsset[problemAssetId] : 0

  // Tiempo promedio resolución (últimos 90 días)
  const resolutionDays = (resolvedFindings90d ?? [])
    .filter(f => f.created_at && f.resolved_at)
    .map(f => Math.max(0, differenceInDays(new Date(f.resolved_at!), new Date(f.created_at!))))
  const avgResolutionDays = resolutionDays.length > 0
    ? Math.round(resolutionDays.reduce((a, b) => a + b, 0) / resolutionDays.length)
    : null

  // Hallazgos abiertos por severidad
  const findingsBySeverity = { critical: 0, high: 0, medium: 0, low: 0 }
  for (const f of openFindings ?? []) {
    const s = f.severity as keyof typeof findingsBySeverity
    if (s in findingsBySeverity) findingsBySeverity[s]++
  }

  // Activos sin mantenimiento en últimos 30 días
  const activeAssetIds = new Set((recentLogs30d ?? []).map(l => l.asset_id))
  const neglectedAssets = (assets ?? [])
    .filter(a => a.status === 'operational' && !activeAssetIds.has(a.id))
    .slice(0, 5)

  // Monthly chart (last 12 months, from chartLogs)
  const monthlyData = []
  for (let i = 11; i >= 0; i--) {
    const d = subMonths(now, i)
    const start = startOfMonth(d)
    const end = endOfMonth(d)
    const monthLogs = (chartLogs ?? []).filter(l => {
      if (!l.created_at) return false
      const date = new Date(l.created_at)
      return date >= start && date <= end
    })
    monthlyData.push({
      month: format(d, 'MMM', { locale: es }),
      costo: monthLogs.reduce((s, l) => s + (l.cost_estimate ?? 0), 0),
    })
  }
  const avgCost = monthlyData.reduce((s, m) => s + m.costo, 0) / 12

  // Fleet uptime
  const totalAssets = (assets ?? []).length
  const operationalAssets = (assets ?? []).filter(a => a.status === 'operational').length
  const uptimePct = totalAssets > 0 ? Math.round((operationalAssets / totalAssets) * 100) : 0

  return {
    thisMonthCost,
    lastMonthCost,
    costDiff,
    yearCost,
    projectedYear,
    openFindingsCount: (openFindings ?? []).length,
    closedFindingsCount: (closedFindingsThisMonth ?? []).length,
    topAsset: topAsset ? { name: topAsset.name, cost: topAssetCost } : null,
    uptimePct,
    monthlyData,
    avgCost,
    upcomingSchedules: (upcomingSchedules ?? []) as unknown as {
      id: string
      title: string
      next_due_date: string | null
      asset_id: string
      assets: { name: string } | null
    }[],
    preventivePct,
    correctivePct,
    totalTyped,
    problemAsset: problemAsset ? { name: problemAsset.name, id: problemAsset.id, count: problemAssetCount } : null,
    avgResolutionDays,
    findingsBySeverity,
    neglectedAssets,
  }
}

export default async function KpisPage() {
  const kpi = await getKpiData()

  return (
    <div className="p-4 md:p-6 max-w-6xl mx-auto space-y-8">
      {/* Header */}
      <div className="flex items-start gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-50 border border-emerald-100 mt-0.5">
          <BarChart3 className="h-5 w-5 text-emerald-600" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-foreground">KPIs del Rancho</h1>
          <p className="text-sm text-muted-foreground mt-0.5">Métricas de negocio — vista ejecutiva</p>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        <KpiCard
          title="Gasto este mes"
          value={`$${kpi.thisMonthCost.toLocaleString('es-MX', { maximumFractionDigits: 0 })}`}
          subtitle={`vs $${kpi.lastMonthCost.toLocaleString('es-MX', { maximumFractionDigits: 0 })} mes anterior`}
          icon={<DollarSign className="h-4.5 w-4.5" />}
          trend={kpi.lastMonthCost > 0 ? {
            value: `${Math.abs(kpi.costDiff).toFixed(1)}% vs mes anterior`,
            positive: kpi.costDiff <= 0,
          } : null}
          accent="emerald"
        />
        <KpiCard
          title="Gasto acumulado año"
          value={`$${kpi.yearCost.toLocaleString('es-MX', { maximumFractionDigits: 0 })}`}
          subtitle={`Proyección cierre: $${kpi.projectedYear.toLocaleString('es-MX', { maximumFractionDigits: 0 })}`}
          icon={<TrendingUp className="h-4.5 w-4.5" />}
          accent="blue"
        />
        <KpiCard
          title="Uptime de la flota"
          value={`${kpi.uptimePct}%`}
          subtitle="Activos en estado operativo"
          icon={<Truck className="h-4.5 w-4.5" />}
          accent={kpi.uptimePct >= 80 ? 'emerald' : kpi.uptimePct >= 60 ? 'amber' : 'red'}
        />
        <KpiCard
          title="Hallazgos abiertos"
          value={String(kpi.openFindingsCount)}
          subtitle={`${kpi.closedFindingsCount} cerrados este mes`}
          icon={<AlertTriangle className="h-4.5 w-4.5" />}
          accent={kpi.openFindingsCount === 0 ? 'emerald' : kpi.openFindingsCount > 5 ? 'red' : 'amber'}
        />
        {kpi.topAsset && (
          <KpiCard
            title="Activo más costoso (mes)"
            value={`$${kpi.topAsset.cost.toLocaleString('es-MX', { maximumFractionDigits: 0 })}`}
            subtitle={kpi.topAsset.name}
            icon={<CheckCircle className="h-4.5 w-4.5" />}
            accent="slate"
          />
        )}
        <KpiCard
          title="Preventivo vs Correctivo"
          value={`${kpi.preventivePct}%`}
          subtitle={kpi.totalTyped > 0 ? `Preventivo · ${kpi.correctivePct}% correctivo` : 'Sin registros aún'}
          icon={<Activity className="h-4.5 w-4.5" />}
          accent={kpi.preventivePct >= 60 ? 'emerald' : kpi.preventivePct >= 40 ? 'amber' : 'red'}
          trend={kpi.totalTyped > 0 ? {
            value: kpi.preventivePct >= 60 ? 'Estrategia preventiva saludable' : 'Demasiados correctivos',
            positive: kpi.preventivePct >= 60,
          } : null}
        />
        {kpi.problemAsset && (
          <KpiCard
            title="Activo más problemático"
            value={String(kpi.problemAsset.count)}
            subtitle={`${kpi.problemAsset.name} — fallas correctivas`}
            icon={<Wrench className="h-4.5 w-4.5" />}
            accent={kpi.problemAsset.count > 5 ? 'red' : kpi.problemAsset.count > 2 ? 'amber' : 'slate'}
          />
        )}
        <KpiCard
          title="Tiempo de cierre hallazgos"
          value={kpi.avgResolutionDays !== null ? `${kpi.avgResolutionDays}d` : '—'}
          subtitle="Promedio últimos 90 días"
          icon={<Timer className="h-4.5 w-4.5" />}
          accent={
            kpi.avgResolutionDays === null ? 'slate' :
            kpi.avgResolutionDays <= 3 ? 'emerald' :
            kpi.avgResolutionDays <= 7 ? 'amber' : 'red'
          }
        />
      </div>

      {/* Hallazgos por severidad */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center gap-2">
            <ShieldAlert className="h-4 w-4 text-muted-foreground" />
            <CardTitle className="text-sm font-medium text-muted-foreground">Hallazgos abiertos por severidad</CardTitle>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-4 gap-3">
            {([
              { key: 'critical', label: 'Crítico', bg: 'bg-red-50 dark:bg-red-950/40', text: 'text-red-700 dark:text-red-400', border: 'border-red-200 dark:border-red-800/40' },
              { key: 'high', label: 'Alta', bg: 'bg-orange-50 dark:bg-orange-950/40', text: 'text-orange-700 dark:text-orange-400', border: 'border-orange-200 dark:border-orange-800/40' },
              { key: 'medium', label: 'Media', bg: 'bg-amber-50 dark:bg-amber-950/40', text: 'text-amber-700 dark:text-amber-400', border: 'border-amber-200 dark:border-amber-800/40' },
              { key: 'low', label: 'Baja', bg: 'bg-blue-50 dark:bg-blue-950/40', text: 'text-blue-700 dark:text-blue-400', border: 'border-blue-200 dark:border-blue-800/40' },
            ] as const).map(({ key, label, bg, text, border }) => (
              <div key={key} className={`flex flex-col items-center justify-center rounded-xl border ${border} ${bg} py-4 gap-1`}>
                <span className={`text-3xl font-bold tabular-nums ${text}`}>
                  {kpi.findingsBySeverity[key]}
                </span>
                <span className={`text-[11px] font-semibold ${text}`}>{label}</span>
              </div>
            ))}
          </div>
          {kpi.findingsBySeverity.critical === 0 && kpi.findingsBySeverity.high === 0 && (
            <p className="text-xs text-muted-foreground text-center mt-3">Sin hallazgos críticos ni altos. Buen estado.</p>
          )}
        </CardContent>
      </Card>

      {/* Activos sin servicio reciente */}
      {kpi.neglectedAssets.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-amber-500" />
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Activos operativos sin mantenimiento en 30+ días
              </CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {kpi.neglectedAssets.map(a => (
                <div key={a.id} className="flex items-center justify-between rounded-lg border border-border bg-amber-50/40 dark:bg-amber-950/20 px-4 py-2.5">
                  <p className="text-sm font-medium text-foreground">{a.name}</p>
                  <Link
                    href={`/assets/${a.id}`}
                    className="text-xs text-emerald-600 hover:text-emerald-700 font-medium"
                  >
                    Ver activo →
                  </Link>
                </div>
              ))}
            </div>
            <p className="text-xs text-muted-foreground mt-3">
              Estos equipos están operativos pero no tienen registros de mantenimiento recientes.
            </p>
          </CardContent>
        </Card>
      )}

      {/* Monthly Chart (lazy loaded) */}
      <MonthlyCostChart data={kpi.monthlyData} avgCost={kpi.avgCost} />

      {/* Upcoming 7 days */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center gap-2">
            <Calendar className="h-4 w-4 text-muted-foreground" />
            <CardTitle className="text-sm font-medium text-muted-foreground">Próximos 7 días — Servicios programados</CardTitle>
          </div>
        </CardHeader>
        <CardContent>
          {kpi.upcomingSchedules.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">Sin servicios programados en los próximos 7 días.</p>
          ) : (
            <div className="space-y-2">
              {kpi.upcomingSchedules.map(s => (
                <div key={s.id} className="flex items-center justify-between rounded-lg border border-border bg-muted/30 dark:bg-white/[0.03] px-4 py-3">
                  <div>
                    <p className="text-sm font-medium text-foreground">{s.title}</p>
                    <p className="text-xs text-muted-foreground">{s.assets?.name ?? '—'}</p>
                  </div>
                  {s.next_due_date && (
                    <span className="rounded-full bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800/40 px-3 py-1 text-xs font-semibold text-amber-700 dark:text-amber-400">
                      {format(new Date(s.next_due_date), "d 'de' MMM", { locale: es })}
                    </span>
                  )}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
