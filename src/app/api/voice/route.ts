import { NextRequest, NextResponse } from 'next/server'
import OpenAI from 'openai'
import { extractMaintenanceFromTranscript } from '@/lib/ai/agent'

export async function POST(request: NextRequest) {
  if (!process.env.OPENAI_API_KEY || !process.env.ANTHROPIC_API_KEY) {
    return NextResponse.json(
      {
        error: 'API keys no configuradas. Agrega OPENAI_API_KEY y ANTHROPIC_API_KEY en .env.local',
        transcript: null,
        extracted: null,
      },
      { status: 503 }
    )
  }

  try {
    const formData = await request.formData()
    const audioFile = formData.get('audio') as File | null

    if (!audioFile) {
      return NextResponse.json({ error: 'No se recibió audio' }, { status: 400 })
    }

    const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })

    // Transcribe with Whisper
    const transcription = await openai.audio.transcriptions.create({
      file: audioFile,
      model: 'whisper-1',
      language: 'es',
      prompt: 'Mantenimiento industrial en rancho lechero. Tractores, camiones, implementos.',
    })

    const transcript = transcription.text

    // Extract structured data with Claude
    const extracted = await extractMaintenanceFromTranscript(transcript)

    return NextResponse.json({ transcript, extracted })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Error procesando audio'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
