'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { z } from 'zod'
import type { Asset, CreateAssetInput } from '../types'

export async function getAssets(): Promise<Asset[]> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('assets')
    .select(`*, telemetry:asset_telemetry(*)`)
    .order('updated_at', { ascending: false })

  if (error) throw new Error(error.message)

  return (data ?? []).map(a => ({
    ...a,
    telemetry: Array.isArray(a.telemetry) ? a.telemetry[0] ?? null : a.telemetry ?? null,
  }))
}

export async function getAsset(id: string): Promise<Asset | null> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('assets')
    .select(`*, telemetry:asset_telemetry(*)`)
    .eq('id', id)
    .single()

  if (error) return null

  return {
    ...data,
    telemetry: Array.isArray(data.telemetry) ? data.telemetry[0] ?? null : data.telemetry ?? null,
  }
}

const createAssetSchema = z.object({
  name: z.string().min(1, 'El nombre es requerido'),
  type: z.enum(['tractor', 'truck', 'implement', 'tool', 'milking_system']),
  brand: z.string().optional(),
  model: z.string().optional(),
  year: z.coerce.number().int().min(1900).max(2030).optional(),
  serial_number: z.string().optional(),
  status: z.enum(['operational', 'maintenance', 'out_of_service']).default('operational'),
  location: z.string().optional(),
  has_telemetry: z.boolean().default(false),
  notes: z.string().optional(),
})

export type AssetFormState = { error?: string; success?: boolean }

export async function createAsset(
  _prev: AssetFormState,
  formData: FormData
): Promise<AssetFormState> {
  const parsed = createAssetSchema.safeParse({
    name: formData.get('name'),
    type: formData.get('type'),
    brand: formData.get('brand') || undefined,
    model: formData.get('model') || undefined,
    year: formData.get('year') || undefined,
    serial_number: formData.get('serial_number') || undefined,
    status: formData.get('status'),
    location: formData.get('location') || undefined,
    has_telemetry: formData.get('has_telemetry') === 'true',
    notes: formData.get('notes') || undefined,
  })

  if (!parsed.success) {
    return { error: parsed.error.issues[0].message }
  }

  const supabase = await createClient()
  const { error } = await supabase.from('assets').insert(parsed.data as CreateAssetInput)

  if (error) return { error: error.message }

  revalidatePath('/assets')
  return { success: true }
}

export async function updateAssetStatus(id: string, status: Asset['status']) {
  const supabase = await createClient()
  const { error } = await supabase
    .from('assets')
    .update({ status })
    .eq('id', id)

  if (error) throw new Error(error.message)
  revalidatePath('/assets')
  revalidatePath(`/assets/${id}`)
  revalidatePath('/dashboard')
}

export type HorometerFormState = { error?: string; success?: boolean }

export async function updateAssetHours(
  _prev: HorometerFormState,
  formData: FormData
): Promise<HorometerFormState> {
  const id = formData.get('asset_id') as string
  const currentHours = Number(formData.get('current_hours'))
  const avgHoursPerWeek = formData.get('avg_hours_per_week')
    ? Number(formData.get('avg_hours_per_week'))
    : null

  if (!id) return { error: 'ID de activo requerido' }
  if (isNaN(currentHours) || currentHours < 0) return { error: 'Horas inválidas' }

  const supabase = await createClient()

  await supabase
    .from('assets')
    .update({
      current_hours: currentHours,
      hours_updated_at: new Date().toISOString(),
      ...(avgHoursPerWeek != null ? { avg_hours_per_week: avgHoursPerWeek } : {}),
    })
    .eq('id', id)

  // Recalcular next_due_date en los programas activos que usan horas
  if (avgHoursPerWeek && avgHoursPerWeek > 0) {
    const { data: schedules } = await supabase
      .from('maintenance_schedules')
      .select('id, next_due_hours')
      .eq('asset_id', id)
      .eq('status', 'active')
      .not('next_due_hours', 'is', null)

    for (const s of schedules ?? []) {
      if (s.next_due_hours != null) {
        const hoursLeft = s.next_due_hours - currentHours
        if (hoursLeft > 0) {
          const daysLeft = Math.round((hoursLeft / avgHoursPerWeek) * 7)
          const nextDate = new Date()
          nextDate.setDate(nextDate.getDate() + daysLeft)
          await supabase
            .from('maintenance_schedules')
            .update({ next_due_date: nextDate.toISOString().split('T')[0] })
            .eq('id', s.id)
        }
      }
    }
  }

  revalidatePath(`/assets/${id}`)
  revalidatePath('/programas')
  revalidatePath('/dashboard')
  return { success: true }
}

export async function deleteAsset(id: string): Promise<{ error?: string }> {
  const supabase = await createClient()

  const tables = [
    'alerts',
    'asset_telemetry',
    'liner_configs',
    'maintenance_findings',
    'maintenance_schedules',
    'maintenance_logs',
  ] as const

  for (const table of tables) {
    const { error } = await supabase.from(table).delete().eq('asset_id', id)
    if (error) return { error: error.message }
  }

  const { error } = await supabase.from('assets').delete().eq('id', id)
  if (error) return { error: error.message }

  revalidatePath('/assets')
  revalidatePath('/dashboard')
  return {}
}
