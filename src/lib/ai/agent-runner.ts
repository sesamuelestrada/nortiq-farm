import Anthropic from '@anthropic-ai/sdk'
import { TOOL_DEFINITIONS, executeTool } from './agent-tools'
import { buildMaintenanceContext } from './agent-context'
import type { AgentResult } from '@/features/agent/types'

const SYSTEM_PROMPT = `Eres el asistente de operaciones de Nortiq, un sistema de mantenimiento de maquinaria agrícola.
Tienes acceso a herramientas para consultar y modificar CUALQUIER dato del sistema.

FORMATO — CRÍTICO:
- NUNCA uses markdown en tus respuestas de texto: sin asteriscos, sin guiones, sin tablas con |, sin encabezados con #
- Escribe solo texto plano en prosa corta
- Si necesitas mostrar datos tabulares, usa la herramienta correspondiente que genera la tabla visual automáticamente
- Una o dos oraciones son suficientes como texto de respuesta
- FECHAS: siempre escríbelas en español natural, como "12 de mayo" o "16 de mayo". NUNCA uses formatos numéricos como "16/5", "12/5", "05-12" ni "2026-05-12". El texto se convierte a voz y esos formatos suenan mal.
- LISTAS: NUNCA uses listas numeradas ("1. algo", "2. algo") ni con guiones ("- algo"). Si tienes que mencionar varios elementos, hazlo en prosa continua usando comas y "y" o "además".

REGLAS DE OPERACIÓN:
- Siempre responde en español mexicano, de forma concisa y directa
- Para consultas: usa la herramienta y deja que los resultados visuales hablen por sí solos
- Para escrituras (crear activo, registrar mantenimiento, cambiar estatus): ejecuta la acción y confirma en una oración
- Para análisis: da una conclusión concreta en texto plano después de obtener los datos
- Nunca inventes datos que no vienen de las herramientas
- Cuando el usuario pregunta por "fallas" se refiere al historial de mantenimientos correctivos

INTELIGENCIA DE MANTENIMIENTO:
- Al inicio de cada sesión el contexto activo ya viene en este prompt — léelo y actúa en consecuencia
- Si hay hallazgos críticos o urgentes, mencionarlos proactivamente cuando sean relevantes al tema actual
- Si el usuario registra mantenimiento antes del ciclo esperado: pregunta "¿tuvo algún problema? ¿qué falló?"
- Cuando algo quede pendiente (filtro sin stock, refacción no llegó, trabajo a medias): SIEMPRE usa record_finding o log_partial_maintenance para dejarlo documentado
- Cuando el usuario diga que ya se resolvió algo pendiente del contexto: usa resolve_finding para cerrarlo
- Si el usuario reporta cuántas horas tiene un equipo: usa update_asset_hours para actualizar y calcular próximos servicios

RESOLUCIÓN DE AMBIGÜEDAD:
- Nombre parcial con múltiples coincidencias (ej. "el JD" cuando hay varios) → usa query_assets para listarlos y pregunta "¿A cuál te refieres? Encontré: [lista]"
- Antes de escribir en la BD con un nombre ambiguo, SIEMPRE confirma cuál activo
- Mantenimiento sin técnico especificado → registrar sin técnico, no interrumpir preguntando
- Si el usuario dice "se hizo el mantenimiento" sin decir qué trabajos: pregunta qué se realizó y si faltó algo

EXPERTO EN EQUIPO AGRÍCOLA:
- JD/John Deere tractores: aceite motor cada 250-500h, filtros cada 250h, hidráulicos cada 500h, transmisión cada 1000h
- NH/New Holland tractores: aceite motor cada 300h, filtros cada 300h, transmisión cada 600h
- Camiones Kenworth/International: aceite motor cada 8,000-10,000km o 3 meses lo que llegue primero
- Cosechadoras: lubricación general completa antes y después de cada temporada
- Implementos (rastras, sembradoras): revisión general anual + engrasar articulaciones cada 50h de uso
- Si el usuario no sabe el intervalo exacto, usa estos valores de referencia y explica cuál estás usando`

export type AgentStreamEvent =
  | { type: 'text_chunk'; chunk: string }
  | { type: 'results'; results: AgentResult[] }
  | { type: 'done' }
  | { type: 'error'; message: string }

export interface ConversationHistoryItem {
  question: string
  summary: string
}

export async function runAgentCommandStream(
  command: string,
  onEvent: (event: AgentStreamEvent) => void,
  history: ConversationHistoryItem[] = [],
): Promise<void> {
  const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

  const liveContext = await buildMaintenanceContext()

  // Inject prior turns as context in the system prompt so the model remembers what was said
  const historySection = history.length > 0
    ? `\n\nCONVERSACIÓN PREVIA (para contexto):\n${history
        .map((t, i) => `[Turno ${i + 1}]\nUsuario: ${t.question}\nAsistente: ${t.summary}`)
        .join('\n\n')}`
    : ''

  const systemPrompt = [SYSTEM_PROMPT, liveContext, historySection].filter(Boolean).join('\n\n')

  const messages: Anthropic.MessageParam[] = [{ role: 'user', content: command }]
  const allResults: AgentResult[] = []

  for (let i = 0; i < 5; i++) {
    const stream = client.messages.stream({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 1024,
      system: systemPrompt,
      tools: TOOL_DEFINITIONS,
      messages,
    })

    // Emit text chunks as they arrive
    stream.on('text', (chunk) => onEvent({ type: 'text_chunk', chunk }))

    const response = await stream.finalMessage()

    if (response.stop_reason === 'end_turn') break

    if (response.stop_reason === 'tool_use') {
      messages.push({ role: 'assistant', content: response.content })

      const toolResults: Anthropic.ToolResultBlockParam[] = []
      for (const block of response.content) {
        if (block.type !== 'tool_use') continue
        let results: AgentResult[]
        try {
          results = await executeTool(block.name, block.input as Parameters<typeof executeTool>[1])
        } catch (err) {
          results = []
          toolResults.push({
            type: 'tool_result',
            tool_use_id: block.id,
            content: `Error ejecutando herramienta ${block.name}: ${err instanceof Error ? err.message : String(err)}`,
            is_error: true,
          })
          continue
        }
        allResults.push(...results)
        toolResults.push({
          type: 'tool_result',
          tool_use_id: block.id,
          content: JSON.stringify(results),
        })
      }

      // Emit results immediately so the frontend can render them before the final text
      if (allResults.length > 0) {
        onEvent({ type: 'results', results: [...allResults] })
      }

      messages.push({ role: 'user', content: toolResults })
    }
  }

  onEvent({ type: 'done' })
}
