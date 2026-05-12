import Anthropic from '@anthropic-ai/sdk'
import type { VoiceExtractedData } from '@/features/maintenance/types'

const SYSTEM_PROMPT = `Eres un asistente de mantenimiento industrial para un rancho lechero en México.
Tu tarea es extraer información estructurada de una transcripción de voz en español
sobre un registro de mantenimiento realizado.

Extrae SOLO la información que claramente se menciona. No inventes datos.
Para el tipo de mantenimiento:
- "preventivo" si mencionan servicio rutinario, cambio de aceite, filtros, revisión programada
- "correctivo" si mencionan reparación, falla, compostura, arreglo de algo roto
- "inspección" si solo revisaron o inspeccionaron sin hacer cambios

Para partes_utilizadas: extrae los refacciones, piezas, materiales mencionados como array.
Para fechas de próximo servicio: extrae si mencionan cuándo darle siguiente servicio.

Responde ÚNICAMENTE con JSON válido, sin texto adicional.`

export async function extractMaintenanceFromTranscript(
  transcript: string
): Promise<VoiceExtractedData> {
  const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })
  const today = new Date().toLocaleDateString('es-MX', { year: 'numeric', month: 'long', day: 'numeric' })

  const message = await client.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 1024,
    messages: [
      {
        role: 'user',
        content: `Hoy es ${today}. Extrae la información de mantenimiento de esta transcripción de voz:

"${transcript}"

Si mencionan fechas relativas como "en tres meses", "la próxima semana", "en 500 horas", conviértelas a fecha absoluta YYYY-MM-DD usando la fecha de hoy como referencia.

Responde con JSON con estos campos opcionales:
{
  "type": "preventive" | "corrective" | "inspection",
  "description": "descripción clara del trabajo realizado",
  "parts_used": ["parte1", "parte2"],
  "hours_spent": número de horas trabajadas,
  "asset_hours_at_service": horas del equipo al momento del servicio,
  "next_service_date": "YYYY-MM-DD",
  "cost_estimate": costo estimado en pesos,
  "performed_by_name": "nombre del mecánico si se menciona"
}`,
      },
    ],
    system: SYSTEM_PROMPT,
  })

  const content = message.content[0]
  if (content.type !== 'text') return {}

  try {
    const jsonMatch = content.text.match(/\{[\s\S]*\}/)
    if (!jsonMatch) return {}
    return JSON.parse(jsonMatch[0]) as VoiceExtractedData
  } catch {
    return {}
  }
}
