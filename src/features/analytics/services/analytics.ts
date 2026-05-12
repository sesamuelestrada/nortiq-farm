'use server'

import { createClient } from '@/lib/supabase/server'
import { format, subMonths, startOfMonth, endOfMonth } from 'date-fns'

export interface FailureStat {
  type: string
  count: number
  asset_name: string
}

export interface CostByAsset {
  asset_name: string
  total_cost: number
  log_count: number
}

export interface MaintenanceTrendPoint {
  month: string
  count: number
}

export interface AssetNeedingService {
  id: string
  name: string
  next_service_date: string
  days_until: number
  status: string
}

export async function getFailureStats(): Promise<FailureStat[]> {
  const supabase = await createClient()
  const { data } = await supabase
    .from('maintenance_logs')
    .select('type, assets(name)')
    .order('type')

  if (!data) return []

  const counts: Record<string, number> = {}
  for (const log of data) {
    const key = log.type
    counts[key] = (counts[key] ?? 0) + 1
  }

  return Object.entries(counts).map(([type, count]) => ({
    type,
    count,
    asset_name: '',
  }))
}

export async function getMaintenanceTypeStats(): Promise<{ name: string; value: number }[]> {
  const supabase = await createClient()
  const { data } = await supabase
    .from('maintenance_logs')
    .select('type')

  if (!data) return []

  const counts: Record<string, number> = {}
  for (const log of data) {
    counts[log.type] = (counts[log.type] ?? 0) + 1
  }

  const labels: Record<string, string> = {
    preventive: 'Preventivo',
    corrective: 'Correctivo',
    inspection: 'Inspección',
  }

  return Object.entries(counts).map(([type, value]) => ({
    name: labels[type] ?? type,
    value,
  }))
}

export async function getCostByAsset(): Promise<CostByAsset[]> {
  const supabase = await createClient()
  const { data } = await supabase
    .from('maintenance_logs')
    .select('cost_estimate, assets(name)')

  if (!data) return []

  const map: Record<string, { total: number; count: number }> = {}
  for (const log of data) {
    const name = (log.assets as unknown as { name: string } | null)?.name ?? 'Desconocido'
    if (!map[name]) map[name] = { total: 0, count: 0 }
    map[name].total += log.cost_estimate ?? 0
    map[name].count += 1
  }

  return Object.entries(map)
    .map(([asset_name, { total, count }]) => ({
      asset_name,
      total_cost: Math.round(total),
      log_count: count,
    }))
    .sort((a, b) => b.total_cost - a.total_cost)
}

export async function getMaintenanceTrend(months = 6): Promise<MaintenanceTrendPoint[]> {
  const supabase = await createClient()
  const since = subMonths(new Date(), months)

  const { data } = await supabase
    .from('maintenance_logs')
    .select('created_at')
    .gte('created_at', since.toISOString())
    .order('created_at')

  if (!data) return []

  const map: Record<string, number> = {}
  for (let i = months - 1; i >= 0; i--) {
    const d = subMonths(new Date(), i)
    map[format(d, 'MMM yy')] = 0
  }

  for (const log of data) {
    const key = format(new Date(log.created_at), 'MMM yy')
    if (key in map) map[key] = (map[key] ?? 0) + 1
  }

  return Object.entries(map).map(([month, count]) => ({ month, count }))
}

export async function getAssetsNeedingService(daysAhead = 30): Promise<AssetNeedingService[]> {
  const supabase = await createClient()
  const now = new Date()
  const cutoff = new Date(now.getTime() + daysAhead * 24 * 60 * 60 * 1000)

  const { data } = await supabase
    .from('maintenance_logs')
    .select('next_service_date, assets(id, name, status)')
    .not('next_service_date', 'is', null)
    .lte('next_service_date', cutoff.toISOString().split('T')[0])
    .order('next_service_date')

  if (!data) return []

  const seen = new Set<string>()
  const results: AssetNeedingService[] = []

  for (const log of data) {
    const asset = log.assets as unknown as { id: string; name: string; status: string } | null
    if (!asset || seen.has(asset.id)) continue
    seen.add(asset.id)

    const serviceDate = new Date(log.next_service_date!)
    const days = Math.ceil((serviceDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))

    results.push({
      id: asset.id,
      name: asset.name,
      next_service_date: log.next_service_date!,
      days_until: days,
      status: asset.status,
    })
  }

  return results
}
