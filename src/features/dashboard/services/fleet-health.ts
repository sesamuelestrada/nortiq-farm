'use server'

import { createClient } from '@/lib/supabase/server'
import type { AssetHealthColor, MaintenanceFinding, MaintenanceSchedule } from '@/features/assets/types'

export interface AssetHealthData {
  assetId: string
  healthColor: AssetHealthColor
  openFindings: MaintenanceFinding[]
  overdueSchedules: MaintenanceSchedule[]
}

function computeHealthColor(findings: MaintenanceFinding[], schedules: MaintenanceSchedule[]): AssetHealthColor {
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const in7Days = new Date(today)
  in7Days.setDate(in7Days.getDate() + 7)

  const hasCriticalOrHigh = findings.some(f => f.severity === 'critical' || f.severity === 'high')
  const hasOverdue = schedules.some(s => {
    if (!s.next_due_date) return false
    return new Date(s.next_due_date) < today
  })

  if (hasCriticalOrHigh || hasOverdue) return 'red'

  const hasMedium = findings.some(f => f.severity === 'medium')
  const hasUpcoming = schedules.some(s => {
    if (!s.next_due_date) return false
    const due = new Date(s.next_due_date)
    return due >= today && due <= in7Days
  })

  if (hasMedium || hasUpcoming) return 'yellow'

  return 'green'
}

export async function getFleetHealthData(): Promise<Map<string, AssetHealthData>> {
  const supabase = await createClient()

  const [{ data: findings }, { data: schedules }] = await Promise.all([
    supabase
      .from('maintenance_findings')
      .select('*')
      .eq('status', 'open'),
    supabase
      .from('maintenance_schedules')
      .select('*')
      .eq('status', 'active'),
  ])

  const findingsByAsset = new Map<string, MaintenanceFinding[]>()
  for (const f of (findings ?? []) as MaintenanceFinding[]) {
    const list = findingsByAsset.get(f.asset_id) ?? []
    list.push(f)
    findingsByAsset.set(f.asset_id, list)
  }

  const schedulesByAsset = new Map<string, MaintenanceSchedule[]>()
  for (const s of (schedules ?? []) as MaintenanceSchedule[]) {
    const list = schedulesByAsset.get(s.asset_id) ?? []
    list.push(s)
    schedulesByAsset.set(s.asset_id, list)
  }

  const allAssetIds = new Set([...findingsByAsset.keys(), ...schedulesByAsset.keys()])
  const healthMap = new Map<string, AssetHealthData>()

  for (const assetId of allAssetIds) {
    const assetFindings = findingsByAsset.get(assetId) ?? []
    const assetSchedules = schedulesByAsset.get(assetId) ?? []
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const overdueSchedules = assetSchedules.filter(s => {
      if (!s.next_due_date) return false
      return new Date(s.next_due_date) < today
    })
    healthMap.set(assetId, {
      assetId,
      healthColor: computeHealthColor(assetFindings, assetSchedules),
      openFindings: assetFindings,
      overdueSchedules,
    })
  }

  return healthMap
}
