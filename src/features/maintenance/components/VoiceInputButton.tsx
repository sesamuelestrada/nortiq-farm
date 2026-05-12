'use client'

import { useState, useRef } from 'react'
import { Mic, MicOff, Loader2, AlertCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import type { VoiceExtractedData } from '../types'

interface Props {
  onExtracted: (data: VoiceExtractedData, transcript: string) => void
}

type State = 'idle' | 'recording' | 'processing' | 'error'

export function VoiceInputButton({ onExtracted }: Props) {
  const [state, setState] = useState<State>('idle')
  const [errorMsg, setErrorMsg] = useState<string>('')
  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const chunksRef = useRef<Blob[]>([])

  async function startRecording() {
    setErrorMsg('')
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      const mediaRecorder = new MediaRecorder(stream, {
        mimeType: MediaRecorder.isTypeSupported('audio/webm') ? 'audio/webm' : 'audio/mp4',
      })
      chunksRef.current = []

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data)
      }

      mediaRecorder.onstop = async () => {
        stream.getTracks().forEach(t => t.stop())
        const blob = new Blob(chunksRef.current, { type: mediaRecorder.mimeType })
        await processAudio(blob)
      }

      mediaRecorderRef.current = mediaRecorder
      mediaRecorder.start(250)
      setState('recording')
    } catch {
      setErrorMsg('No se pudo acceder al micrófono')
      setState('error')
    }
  }

  function stopRecording() {
    mediaRecorderRef.current?.stop()
    setState('processing')
  }

  async function processAudio(blob: Blob) {
    const formData = new FormData()
    const ext = blob.type.includes('mp4') ? 'mp4' : 'webm'
    formData.append('audio', new File([blob], `voice.${ext}`, { type: blob.type }))

    try {
      const res = await fetch('/api/voice', { method: 'POST', body: formData })
      const json = await res.json()

      if (!res.ok) {
        setErrorMsg(json.error ?? 'Error procesando audio')
        setState('error')
        return
      }

      if (json.extracted) {
        onExtracted(json.extracted as VoiceExtractedData, json.transcript as string)
      }
      setState('idle')
    } catch {
      setErrorMsg('Error al conectar con el servidor')
      setState('error')
    }
  }

  const isRecording = state === 'recording'
  const isProcessing = state === 'processing'

  return (
    <div className="space-y-2">
      <Button
        type="button"
        variant={isRecording ? 'destructive' : 'outline'}
        onClick={isRecording ? stopRecording : startRecording}
        disabled={isProcessing}
        className={cn(
          'gap-2 transition-all',
          isRecording && 'animate-pulse',
        )}
      >
        {isProcessing ? (
          <><Loader2 className="h-4 w-4 animate-spin" /> Procesando voz...</>
        ) : isRecording ? (
          <><MicOff className="h-4 w-4" /> Detener grabación</>
        ) : (
          <><Mic className="h-4 w-4" /> Dictar con voz</>
        )}
      </Button>

      {state === 'error' && (
        <div className="flex items-center gap-2 text-xs text-red-600">
          <AlertCircle className="h-3.5 w-3.5" />
          {errorMsg}
        </div>
      )}

      {isRecording && (
        <p className="text-xs text-gray-500 flex items-center gap-1.5">
          <span className="inline-block h-2 w-2 rounded-full bg-red-500 animate-pulse" />
          Grabando... habla en español sobre el mantenimiento realizado
        </p>
      )}
    </div>
  )
}
