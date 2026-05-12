export type AssetType = 'tractor' | 'truck' | 'implement' | 'tool' | 'milking_system'
export type AssetStatus = 'operational' | 'maintenance' | 'out_of_service'
export type FindingSeverity = 'low' | 'medium' | 'high' | 'critical'
export type FindingStatus = 'open' | 'snoozed' | 'resolved'
export type AssetHealthColor = 'green' | 'yellow' | 'red'

export interface Asset {
  id: string
  name: string
  type: AssetType
  brand: string | null
  model: string | null
  year: number | null
  serial_number: string | null
  status: AssetStatus
  location: string | null
  has_telemetry: boolean
  notes: string | null
  current_hours: number | null
  avg_hours_per_week: number | null
  hours_updated_at: string | null
  created_at: string
  updated_at: string
  telemetry?: AssetTelemetry | null
}

export interface AssetTelemetry {
  id: string
  asset_id: string
  hours: number | null
  fuel_level: number | null
  next_service_hours: number | null
  recorded_at: string
}

export interface CreateAssetInput {
  name: string
  type: AssetType
  brand?: string
  model?: string
  year?: number
  serial_number?: string
  status?: AssetStatus
  location?: string
  has_telemetry?: boolean
  notes?: string
}

export interface MaintenanceFinding {
  id: string
  asset_id: string
  discovered_in_log_id: string | null
  description: string
  severity: FindingSeverity
  status: FindingStatus
  follow_up_date: string | null
  resolved_at: string | null
  notes: string | null
  created_at: string
}

export interface MaintenanceSchedule {
  id: string
  asset_id: string
  subsystem: string
  title: string
  hours_interval: number | null
  calendar_interval_days: number | null
  next_due_hours: number | null
  next_due_date: string | null
  last_performed_at: string | null
  status: string
  snooze_until: string | null
  notes: string | null
  created_at: string
}

export interface LinerConfig {
  id: string
  asset_id: string
  cows_count: number
  milkings_per_day: number
  liner_life_milkings: number
  last_change_date: string
  created_at: string
  updated_at: string
}

export interface AssetWithHealth extends Asset {
  healthColor: AssetHealthColor
  openFindings: MaintenanceFinding[]
  overdueSchedules: MaintenanceSchedule[]
}
