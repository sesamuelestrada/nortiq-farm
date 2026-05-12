import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { z } from 'zod'

const schema = z.object({
  manager_phone: z.string().regex(/^\+\d{10,15}$/, 'Formato: +521234567890'),
})

export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data } = await supabase
    .from('whatsapp_config')
    .select('*')
    .eq('user_id', user.id)
    .eq('is_active', true)
    .single()

  return NextResponse.json({ config: data })
}

export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body: unknown = await req.json()
  const parsed = schema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 })
  }

  await supabase.from('whatsapp_config').upsert(
    { user_id: user.id, manager_phone: parsed.data.manager_phone, is_active: true },
    { onConflict: 'user_id' }
  )

  return NextResponse.json({ success: true })
}
