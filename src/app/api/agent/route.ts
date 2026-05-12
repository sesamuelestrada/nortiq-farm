import { NextRequest } from 'next/server'
import OpenAI from 'openai'
import { runAgentCommandStream, type AgentStreamEvent, type ConversationHistoryItem } from '@/lib/ai/agent-runner'

type SSEEvent = AgentStreamEvent | { type: 'transcript'; transcript: string }

export async function POST(request: NextRequest) {
  if (!process.env.ANTHROPIC_API_KEY) {
    return Response.json({ error: 'ANTHROPIC_API_KEY no configurada' }, { status: 503 })
  }

  try {
    const contentType = request.headers.get('content-type') ?? ''
    let command: string
    let history: ConversationHistoryItem[] = []

    if (contentType.includes('multipart/form-data')) {
      if (!process.env.OPENAI_API_KEY) {
        return Response.json({ error: 'OPENAI_API_KEY no configurada para transcripción de voz' }, { status: 503 })
      }
      const formData = await request.formData()
      const audioFile = formData.get('audio') as File | null
      if (!audioFile) {
        return Response.json({ error: 'No se recibió audio' }, { status: 400 })
      }
      const historyRaw = formData.get('history') as string | null
      if (historyRaw) {
        try { history = JSON.parse(historyRaw) as ConversationHistoryItem[] } catch { /* ignore */ }
      }
      const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })
      const transcription = await openai.audio.transcriptions.create({
        file: audioFile,
        model: 'whisper-1',
        language: 'es',
        prompt: 'Comandos de operación para un sistema de mantenimiento de maquinaria agrícola en un rancho.',
      })
      command = transcription.text
    } else {
      const body = await request.json() as { text?: string; history?: ConversationHistoryItem[] }
      if (!body.text?.trim()) {
        return Response.json({ error: 'Se requiere texto o audio' }, { status: 400 })
      }
      command = body.text.trim()
      history = body.history ?? []
    }

    const encoder = new TextEncoder()

    const stream = new ReadableStream({
      async start(controller) {
        const send = (event: SSEEvent) => {
          controller.enqueue(encoder.encode(`data: ${JSON.stringify(event)}\n\n`))
        }

        // Emit transcript immediately so the user bubble appears right away
        send({ type: 'transcript', transcript: command })

        try {
          await runAgentCommandStream(command, send, history)
        } catch (err) {
          send({ type: 'error', message: err instanceof Error ? err.message : 'Error procesando comando' })
        }

        controller.close()
      },
    })

    return new Response(stream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
      },
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Error procesando comando'
    return Response.json({ error: message }, { status: 500 })
  }
}
