import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { sendWhatsAppMessage } from '@/lib/whatsapp/client'
import Anthropic from '@anthropic-ai/sdk'

interface TwilioWebhookBody {
  From?: string
  Body?: string
  MediaUrl0?: string
  MediaContentType0?: string
  NumMedia?: string
}

async function transcribeAudio(audioUrl: string): Promise<string | null> {
  if (!process.env.OPENAI_API_KEY) return null
  try {
    const OpenAI = await import('openai')
    const openai = new OpenAI.default({ apiKey: process.env.OPENAI_API_KEY })
    const audioResponse = await fetch(audioUrl)
    const audioBuffer = await audioResponse.arrayBuffer()
    const audioFile = new File([audioBuffer], 'audio.ogg', { type: 'audio/ogg' })
    const result = await openai.audio.transcriptions.create({
      file: audioFile,
      model: 'whisper-1',
      language: 'es',
      prompt: 'Reporte de falla o anomalía en equipo de rancho. Tractor, ordeñadora, camión, implemento.',
    })
    return result.text
  } catch (err) {
    console.error('[WhatsApp webhook] Whisper error:', err)
    return null
  }
}

async function extractFindingFromText(text: string): Promise<{
  asset_name: string | null
  description: string
  severity: 'low' | 'medium' | 'high' | 'critical'
} | null> {
  if (!process.env.ANTHROPIC_API_KEY) return null
  try {
    const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })
    const msg = await anthropic.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 256,
      messages: [
        {
          role: 'user',
          content: `Eres un sistema que extrae hallazgos de mantenimiento de reportes de operadores.

Texto del operador: "${text}"

Extrae y responde SOLO con JSON (sin markdown):
{
  "asset_name": "nombre del equipo mencionado o null si no se menciona",
  "description": "descripción clara del problema en español",
  "severity": "low|medium|high|critical"
}

Criterios de severidad:
- critical: el equipo no puede operar, hay peligro inmediato
- high: falla que afecta operación pero puede continuar temporalmente
- medium: problema notable que debe atenderse pronto
- low: observación menor, puede esperar`,
        },
      ],
    })

    const raw = msg.content[0].type === 'text' ? msg.content[0].text.trim() : ''
    const parsed = JSON.parse(raw) as {
      asset_name: string | null
      description: string
      severity: 'low' | 'medium' | 'high' | 'critical'
    }
    return parsed
  } catch (err) {
    console.error('[WhatsApp webhook] Claude extraction error:', err)
    return null
  }
}

export async function POST(req: NextRequest) {
  const supabase = await createClient()

  const formData = await req.formData()
  const body: TwilioWebhookBody = {}
  for (const [key, value] of formData.entries()) {
    (body as Record<string, string>)[key] = value.toString()
  }

  const from = body.From?.replace('whatsapp:', '') ?? 'unknown'
  const textBody = body.Body ?? ''
  const hasMedia = body.NumMedia !== '0' && body.MediaUrl0
  const isAudio = hasMedia && body.MediaContentType0?.startsWith('audio/')

  let transcript = textBody
  let rawAudioUrl: string | null = null

  if (isAudio && body.MediaUrl0) {
    rawAudioUrl = body.MediaUrl0
    const whisperResult = await transcribeAudio(body.MediaUrl0)
    if (whisperResult) transcript = whisperResult
  }

  if (!transcript.trim()) {
    return new NextResponse('<?xml version="1.0"?><Response></Response>', {
      headers: { 'Content-Type': 'text/xml' },
    })
  }

  const extracted = await extractFindingFromText(transcript)

  let assetId: string | null = null

  if (extracted?.asset_name) {
    const { data: assets } = await supabase
      .from('assets')
      .select('id, name')
      .ilike('name', `%${extracted.asset_name}%`)
      .limit(1)
    assetId = assets?.[0]?.id ?? null
  }

  if (!extracted) {
    const replyMsg = `Recibí tu mensaje pero no pude extraer información de mantenimiento. Por favor menciona el nombre del equipo y el problema.`
    await sendWhatsAppMessage(from, replyMsg)
    return new NextResponse('<?xml version="1.0"?><Response></Response>', {
      headers: { 'Content-Type': 'text/xml' },
    })
  }

  const findingPayload = {
    asset_id: assetId ?? (await getFirstAssetId(supabase)),
    description: extracted.description,
    severity: extracted.severity,
    status: 'open',
  }

  const { data: finding, error: findingError } = await supabase
    .from('maintenance_findings')
    .insert(findingPayload)
    .select()
    .single()

  if (findingError || !finding) {
    console.error('[WhatsApp webhook] Insert finding error:', findingError)
    return new NextResponse('<?xml version="1.0"?><Response></Response>', {
      headers: { 'Content-Type': 'text/xml' },
    })
  }

  await supabase.from('operator_reports').insert({
    finding_id: finding.id,
    whatsapp_from: from,
    transcript,
    raw_audio_url: rawAudioUrl,
  })

  const assetName = assetId
    ? (await supabase.from('assets').select('name').eq('id', assetId).single()).data?.name ?? 'equipo desconocido'
    : 'equipo no identificado'

  const confirmMsg = `✅ Registrado en Nortiq\n\nActivo: ${assetName}\nProblema: ${extracted.description}\nSeveridad: ${extracted.severity}\n\nEl equipo de mantenimiento ha sido notificado.`
  await sendWhatsAppMessage(from, confirmMsg)

  return new NextResponse('<?xml version="1.0"?><Response></Response>', {
    headers: { 'Content-Type': 'text/xml' },
  })
}

async function getFirstAssetId(supabase: Awaited<ReturnType<typeof createClient>>): Promise<string> {
  const { data } = await supabase.from('assets').select('id').limit(1).single()
  return data?.id ?? ''
}
