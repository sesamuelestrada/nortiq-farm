export type MaintenanceType = 'preventive' | 'corrective' | 'inspection'
export type MaintenanceStatus = 'completed' | 'pending' | 'in_progress'

export interface MaintenanceLog {
  id: string
  asset_id: string
  performed_by: string | null
  performed_by_name: string | null
  type: MaintenanceType
  description: string
  parts_used: string[]
  hours_spent: number | null
  asset_hours_at_service: number | null
  next_service_date: string | null
  cost_estimate: number | null
  status: MaintenanceStatus
  voice_transcript: string | null
  created_at: string
  asset?: {
    name: string
    type: string
  }
}

export interface CreateMaintenanceLogInput {
  asset_id: string
  performed_by_name?: string
  type: MaintenanceType
  description: string
  parts_used?: string[]
  hours_spent?: number
  asset_hours_at_service?: number
  next_service_date?: string
  cost_estimate?: number
  status?: MaintenanceStatus
  voice_transcript?: string
}

export interface VoiceExtractedData {
  type?: MaintenanceType
  description?: string
  parts_used?: string[]
  hours_spent?: number
  asset_hours_at_service?: number
  next_service_date?: string
  cost_estimate?: number
  performed_by_name?: string
}
