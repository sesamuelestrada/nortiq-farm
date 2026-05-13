import { NextRequest } from 'next/server'
import OpenAI from 'openai'

// GET /api/tts?text=... — streams audio progressively so the browser plays before full download
export async function GET(request: NextRequest) {
  if (!process.env.OPENAI_API_KEY) {
    return new Response('OPENAI_API_KEY no configurada', { status: 503 })
  }

  const text = request.nextUrl.searchParams.get('text')?.trim().slice(0, 4096)
  if (!text) return new Response('Se requiere texto', { status: 400 })

  const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })
  const audio = await openai.audio.speech.create({
    model: 'tts-1-hd',
    voice: 'nova',
    input: text,
    response_format: 'mp3',
    speed: 1.0,
  })

  // Stream OpenAI response body directly — no buffering, browser plays as bytes arrive
  return new Response(audio.body as unknown as ReadableStream, {
    headers: {
      'Content-Type': 'audio/mpeg',
      'Cache-Control': 'no-store',
      'Transfer-Encoding': 'chunked',
    },
  })
}
