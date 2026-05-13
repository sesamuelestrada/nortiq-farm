import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { z } from 'zod'

const schema = z.object({
  asset_id: z.string().uuid(),
  cost_estimate: z.number().min(0).nullable().optional(),
  performed_by_name: z.string().max(100).optional(),
  changed_at: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
})

export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body: unknown = await req.json()
  const parsed = schema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 })
  }

  const { asset_id, cost_estimate, performed_by_name, changed_at } = parsed.data
  const changeDate = changed_at ?? new Date().toISOString().split('T')[0]

  // 1. Actualizar last_change_date en liner_configs
  const { error: updateError } = await supabase
    .from('liner_configs')
    .update({ last_change_date: changeDate, updated_at: new Date().toISOString() })
    .eq('asset_id', asset_id)

  if (updateError) return NextResponse.json({ error: updateError.message }, { status: 500 })

  // 2. Crear log en maintenance_logs para historial y costo
  const { data: log, error: logError } = await supabase
    .from('maintenance_logs')
    .insert({
      asset_id,
      type: 'preventive',
      description: 'Cambio de liners',
      parts_used: ['liners'],
      cost_estimate: cost_estimate ?? null,
      performed_by_name: performed_by_name ?? null,
      performed_by: user.id,
    })
    .select('id')
    .single()

  if (logError) return NextResponse.json({ error: logError.message }, { status: 500 })

  return NextResponse.json({ success: true, log_id: log.id, change_date: changeDate })
}

export async function GET(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const assetId = req.nextUrl.searchParams.get('asset_id')
  if (!assetId) return NextResponse.json({ error: 'asset_id required' }, { status: 400 })

  const { data, error } = await supabase
    .from('maintenance_logs')
    .select('id, created_at, cost_estimate, performed_by_name')
    .eq('asset_id', assetId)
    .eq('description', 'Cambio de liners')
    .order('created_at', { ascending: false })
    .limit(5)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ history: data ?? [] })
}
