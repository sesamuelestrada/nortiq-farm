export type AgentResultType = 'text' | 'navigate' | 'chart' | 'table' | 'asset_card' | 'qr_code' | 'log_created' | 'asset_created' | 'status_updated' | 'finding_created' | 'schedule_created'

export interface TextResult {
  type: 'text'
  content: string
}

export interface NavigateResult {
  type: 'navigate'
  route: string
  label: string
}

export interface ChartResult {
  type: 'chart'
  chartType: 'bar' | 'pie'
  title: string
  data: { name: string; value: number; color?: string }[]
  unit?: string
}

export interface TableResult {
  type: 'table'
  title: string
  columns: string[]
  rows: (string | number | null)[][]
}

export interface AssetCardResult {
  type: 'asset_card'
  id: string
  name: string
  status: 'operational' | 'maintenance' | 'out_of_service'
  type_label: string
  brand?: string | null
  location?: string | null
}

export interface QRCodeResult {
  type: 'qr_code'
  asset_id: string
  asset_name: string
}

export interface LogCreatedResult {
  type: 'log_created'
  asset_name: string
  log_type: string
  description: string
}

export interface AssetCreatedResult {
  type: 'asset_created'
  id: string
  name: string
}

export interface StatusUpdatedResult {
  type: 'status_updated'
  asset_name: string
  new_status: 'operational' | 'maintenance' | 'out_of_service'
}

export interface FindingCreatedResult {
  type: 'finding_created'
  asset_name: string
  description: string
  severity: 'low' | 'medium' | 'high' | 'critical'
  follow_up_date?: string
}

export interface ScheduleCreatedResult {
  type: 'schedule_created'
  asset_name: string
  subsystem: string
  title: string
  next_due_date?: string
  next_due_hours?: number
}

export type AgentResult =
  | TextResult
  | NavigateResult
  | ChartResult
  | TableResult
  | AssetCardResult
  | QRCodeResult
  | LogCreatedResult
  | AssetCreatedResult
  | StatusUpdatedResult
  | FindingCreatedResult
  | ScheduleCreatedResult
