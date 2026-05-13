'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import { Mic, MicOff, Loader2, Sparkles, Keyboard, Send, Tractor, Volume2, VolumeX } from 'lucide-react'
import { Sheet, SheetContent, SheetTitle } from '@/components/ui/sheet'
import { AgentResponsePanel } from './AgentResponsePanel'
import { cn } from '@/lib/utils'
import type { AgentResult } from '../types'
import type { ConversationHistoryItem } from '@/lib/ai/agent-runner'

function normalizeForSpeech(text: string): string {
  return text
    // Montos en pesos — $18,000 → 18 mil pesos / $108,900 → 108 mil 900 pesos
    .replace(/\$(\d{1,3}),(\d{3}),(\d{3})/g, (_, a, b, c) => {
      const n = parseInt(a) * 1_000_000 + parseInt(b) * 1_000 + parseInt(c)
      return `${n.toLocaleString('es-MX')} pesos`
    })
    .replace(/\$(\d{1,3}),(\d{3})/g, (_, miles, cientos) => {
      const n = parseInt(miles) * 1000 + parseInt(cientos)
      if (parseInt(cientos) === 0) return `${miles} mil pesos`
      return `${miles} mil ${cientos} pesos`
    })
    .replace(/\$(\d+)/g, '$1 pesos')
    // Porcentajes — 90% → 90 por ciento
    .replace(/(\d+)%/g, '$1 por ciento')
    // Horas — 500h → 500 horas
    .replace(/(\d+)h\b/g, '$1 horas')
    // km — 10,000km → 10 mil kilómetros
    .replace(/(\d{1,3}),(\d{3})km/g, (_, m, c) => `${m} mil ${parseInt(c) > 0 ? c : ''} kilómetros`.trim())
    .replace(/(\d+)km\b/g, '$1 kilómetros')
    // Marcas y modelos agrícolas
    .replace(/\bJD\b/g, 'J D')
    .replace(/\bNH\b/g, 'N H')
    .replace(/\bGEA\b/g, 'G E A')
    .replace(/\bMXN\b/g, 'pesos mexicanos')
    // Separar letra+número — T680 → T 680, 6155M → 6155 M
    .replace(/\b([A-Z])(\d{3,})\b/g, '$1 $2')
    .replace(/\b([A-Z])(\d{1,2})\b/g, '$1 $2')
    .replace(/(\d{3,})([A-Z])\b/g, '$1 $2')
    // Limpiar espacios dobles
    .replace(/\s{2,}/g, ' ')
    .trim()
}

function stripMarkdown(text: string): string {
  return text
    .replace(/```[\s\S]*?```/g, '')        // code blocks
    .replace(/`([^`]+)`/g, '$1')           // inline code
    .replace(/\*\*(.+?)\*\*/g, '$1')       // **bold**
    .replace(/\*(.+?)\*/g, '$1')           // *italic*
    .replace(/__(.+?)__/g, '$1')           // __bold__
    .replace(/_([^_]+)_/g, '$1')           // _italic_
    .replace(/#+\s*/g, '')                 // headings
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1') // [links](url)
    .replace(/^[-*+]\s+/gm, '')            // bullet points
    .replace(/^\d+\.\s+/gm, '')            // numbered lists
    .replace(/\n{2,}/g, '. ')             // double newlines → period
    .replace(/\n/g, ', ')                  // single newlines → comma
    .replace(/\s{2,}/g, ' ')              // collapse spaces
    .trim()
}

type UIState = 'idle' | 'recording' | 'processing' | 'showing' | 'error'

interface ConversationTurn {
  id: string
  question: string
  text: string
  results: AgentResult[]
  done: boolean
  error?: string
}

type SSEEvent =
  | { type: 'transcript'; transcript: string }
  | { type: 'text_chunk'; chunk: string }
  | { type: 'results'; results: AgentResult[] }
  | { type: 'done' }
  | { type: 'error'; message: string }

function useIsDesktop() {
  const [isDesktop, setIsDesktop] = useState(false)
  useEffect(() => {
    const mql = window.matchMedia('(min-width: 768px)')
    setIsDesktop(mql.matches)
    const handler = (e: MediaQueryListEvent) => setIsDesktop(e.matches)
    mql.addEventListener('change', handler)
    return () => mql.removeEventListener('change', handler)
  }, [])
  return isDesktop
}

const STATUS_CONFIG = {
  idle:       { dot: 'bg-green-400',              label: 'Listo' },
  recording:  { dot: 'bg-red-400 animate-pulse',  label: 'Escuchando…' },
  processing: { dot: 'bg-amber-400 animate-pulse', label: 'Procesando…' },
  showing:    { dot: 'bg-green-400',              label: 'Listo' },
  error:      { dot: 'bg-red-500',               label: 'Error' },
}

export function FloatingVoiceBar() {
  const [uiState, setUiState] = useState<UIState>('idle')
  const [turns, setTurns] = useState<ConversationTurn[]>([])
  const [activeTurnId, setActiveTurnId] = useState<string | null>(null)
  const [errorMsg, setErrorMsg] = useState('')
  const [open, setOpen] = useState(false)
  const [textValue, setTextValue] = useState('')
  const [voiceEnabled, setVoiceEnabled] = useState(true)
  const [speaking, setSpeaking] = useState(false)

  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const chunksRef = useRef<Blob[]>([])
  const inputRef = useRef<HTMLInputElement>(null)
  const scrollRef = useRef<HTMLDivElement>(null)
  const abortControllerRef = useRef<AbortController | null>(null)
  const audioRef = useRef<HTMLAudioElement | null>(null)
  const ttsQueueRef = useRef<HTMLAudioElement[]>([])
  const isPlayingRef = useRef(false)
  const isDesktop = useIsDesktop()

  // Auto-scroll to bottom whenever turns update
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight
    }
  }, [turns])

  useEffect(() => {
    if (open && (uiState === 'idle' || uiState === 'showing')) {
      const t = setTimeout(() => inputRef.current?.focus(), 150)
      return () => clearTimeout(t)
    }
  }, [open, uiState])

  const playNextInQueue = useCallback(() => {
    const audio = ttsQueueRef.current.shift()
    if (!audio) {
      isPlayingRef.current = false
      setSpeaking(false)
      return
    }
    isPlayingRef.current = true
    setSpeaking(true)
    audioRef.current = audio
    audio.onended = () => playNextInQueue()
    audio.onerror = () => playNextInQueue()
    void audio.play().catch(() => playNextInQueue())
  }, [])

  // Enqueue a sentence — strips markdown, normalizes abbreviations, pre-fetches audio
  const speak = useCallback((text: string) => {
    if (!voiceEnabled || !text.trim()) return
    const clean = normalizeForSpeech(stripMarkdown(text))
    if (!clean) return
    const audio = new Audio(`/api/tts?text=${encodeURIComponent(clean)}`)
    audio.preload = 'auto'
    ttsQueueRef.current.push(audio)
    if (!isPlayingRef.current) playNextInQueue()
  }, [voiceEnabled, playNextInQueue])

  const stopSpeaking = useCallback(() => {
    ttsQueueRef.current.forEach(a => { a.src = '' })
    ttsQueueRef.current = []
    isPlayingRef.current = false
    if (audioRef.current) { audioRef.current.pause(); audioRef.current.src = ''; audioRef.current = null }
    setSpeaking(false)
  }, [])

  function buildHistory(currentTurns: ConversationTurn[]): ConversationHistoryItem[] {
    return currentTurns
      .filter(t => t.done && !t.error)
      .map(t => ({
        question: t.question,
        summary: t.text.trim() || 'Respondió con datos estructurados.',
      }))
  }

  async function processCommand(payload: { text: string } | FormData, question: string) {
    // Cancel any in-flight request
    abortControllerRef.current?.abort()
    const controller = new AbortController()
    abortControllerRef.current = controller

    const turnId = crypto.randomUUID()
    const newTurn: ConversationTurn = { id: turnId, question, text: '', results: [], done: false }

    setTurns(prev => [...prev, newTurn])
    setActiveTurnId(turnId)
    setUiState('processing')
    setOpen(true)
    setErrorMsg('')

    const updateTurn = (updater: (t: ConversationTurn) => ConversationTurn) => {
      setTurns(prev => prev.map(t => t.id === turnId ? updater(t) : t))
    }

    try {
      const isFormData = payload instanceof FormData

      // Inject history into payload
      const currentTurns = turns // snapshot before this turn
      if (isFormData) {
        payload.append('history', JSON.stringify(buildHistory(currentTurns)))
      }

      const res = await fetch('/api/agent', {
        method: 'POST',
        signal: controller.signal,
        ...(isFormData
          ? { body: payload }
          : {
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ text: (payload as { text: string }).text, history: buildHistory(currentTurns) }),
            }),
      })

      if (!res.ok || !res.body) {
        const json = await res.json().catch(() => ({})) as { error?: string }
        const msg = json.error ?? 'Error procesando comando'
        updateTurn(t => ({ ...t, error: msg, done: true }))
        setErrorMsg(msg)
        setUiState('error')
        return
      }

      const reader = res.body.getReader()
      const decoder = new TextDecoder()
      let buffer = ''
      let accText = ''
      // Track how many chars have already been enqueued for TTS
      let spokenIndex = 0

      while (true) {
        const { done, value } = await reader.read()
        if (done) break

        buffer += decoder.decode(value, { stream: true })
        const parts = buffer.split('\n\n')
        buffer = parts.pop() ?? ''

        for (const part of parts) {
          if (!part.startsWith('data: ')) continue
          const raw = part.slice(6).trim()
          if (!raw) continue

          const event = JSON.parse(raw) as SSEEvent

          if (event.type === 'transcript') {
            updateTurn(t => ({ ...t, question: event.transcript }))
            setUiState('showing')
          } else if (event.type === 'text_chunk') {
            accText += event.chunk
            updateTurn(t => ({ ...t, text: accText }))
            setUiState(s => s === 'processing' ? 'showing' : s)
            // Speak each complete sentence as it arrives — don't wait for done
            const pending = accText.slice(spokenIndex)
            // (?<!\d) evita que "1." o "2." de listas numeradas cuenten como fin de oración
            const sentenceMatch = pending.match(/^([\s\S]*?(?<!\d)[.!?])(\s+|$)/)
            if (sentenceMatch) {
              speak(sentenceMatch[1].trim())
              spokenIndex += sentenceMatch[0].length
            }
          } else if (event.type === 'results') {
            updateTurn(t => ({ ...t, results: event.results }))
            setUiState('showing')
          } else if (event.type === 'done') {
            updateTurn(t => ({ ...t, done: true }))
            setActiveTurnId(null)
            setUiState('showing')
            // Speak any remaining text that wasn't caught by sentence detection
            const remaining = accText.slice(spokenIndex).trim()
            if (remaining) speak(remaining)
          } else if (event.type === 'error') {
            updateTurn(t => ({ ...t, error: event.message, done: true }))
            setErrorMsg(event.message)
            setUiState('error')
          }
        }
      }
    } catch (err) {
      if ((err as Error).name === 'AbortError') return
      const msg = 'Error al conectar con el servidor'
      updateTurn(t => ({ ...t, error: msg, done: true }))
      setErrorMsg(msg)
      setUiState('error')
    }
  }

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
        const ext = blob.type.includes('mp4') ? 'mp4' : 'webm'
        const formData = new FormData()
        formData.append('audio', new File([blob], `command.${ext}`, { type: blob.type }))
        await processCommand(formData, '…')
      }
      mediaRecorderRef.current = mediaRecorder
      mediaRecorder.start(250)
      setUiState('recording')
    } catch {
      setErrorMsg('No se pudo acceder al micrófono')
      setUiState('error')
    }
  }

  function stopRecording() {
    mediaRecorderRef.current?.stop()
    setUiState('processing')
  }

  function handleMicClick() {
    if (uiState === 'recording') {
      stopRecording()
    } else if (uiState !== 'processing') {
      startRecording()
    }
  }

  function handleTextSubmit() {
    const trimmed = textValue.trim()
    if (!trimmed || uiState === 'processing' || uiState === 'recording') return
    setTextValue('')
    void processCommand({ text: trimmed }, trimmed)
  }

  function handleClose() {
    stopSpeaking()
    abortControllerRef.current?.abort()
    setOpen(false)
    setUiState('idle')
    setTurns([])
    setActiveTurnId(null)
    setTextValue('')
    setErrorMsg('')
  }

  const isRecording = uiState === 'recording'
  const isProcessing = uiState === 'processing'
  const status = STATUS_CONFIG[uiState]
  const hasContent = turns.length > 0
  const activeTurn = activeTurnId ? turns.find(t => t.id === activeTurnId) : null

  return (
    <>
      {/* Floating buttons — bottom-right */}
      <div className="fixed bottom-20 right-4 md:bottom-6 md:right-6 z-40 flex items-center gap-2">
        <button
          onClick={() => setOpen(true)}
          disabled={isProcessing || isRecording}
          title="Abrir asistente"
          className={cn(
            'flex h-9 w-9 items-center justify-center rounded-full shadow-md transition-all duration-200',
            'bg-white border border-gray-200 text-gray-500 hover:bg-gray-50 hover:text-gray-700',
            'focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-300',
            (isProcessing || isRecording) && 'opacity-40 cursor-not-allowed',
          )}
        >
          <Keyboard className="h-3.5 w-3.5" />
        </button>

        <div className="relative">
          <button
            onClick={handleMicClick}
            disabled={isProcessing}
            title={isRecording ? 'Detener y procesar' : 'Hablar con el asistente'}
            className={cn(
              'flex h-14 w-14 items-center justify-center rounded-full transition-all duration-200',
              'focus:outline-none focus:ring-2 focus:ring-offset-2',
              isRecording && 'bg-red-500 hover:bg-red-600 focus:ring-red-500 animate-pulse scale-110 shadow-lg',
              isProcessing && 'bg-gray-400 cursor-not-allowed shadow-lg',
              !isRecording && !isProcessing && cn(
                'bg-gradient-to-br from-emerald-500 to-emerald-700',
                'shadow-[0_4px_24px_rgba(5,150,105,0.5)]',
                'hover:shadow-[0_4px_32px_rgba(5,150,105,0.7)] hover:scale-105',
                'focus:ring-emerald-500',
              ),
            )}
          >
            {isProcessing ? (
              <Loader2 className="h-6 w-6 text-white animate-spin" />
            ) : isRecording ? (
              <MicOff className="h-6 w-6 text-white" />
            ) : (
              <Mic className="h-6 w-6 text-white" />
            )}
          </button>

          {isRecording && (
            <span className="absolute -top-1 -right-1 flex h-3 w-3">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-3 w-3 bg-red-500" />
            </span>
          )}
        </div>
      </div>

      {/* Error toast (only when panel is closed) */}
      {!open && uiState === 'error' && errorMsg && (
        <div className="fixed bottom-36 right-4 md:bottom-24 md:right-6 z-40 w-60 rounded-xl bg-red-50 border border-red-200 px-3 py-2.5 text-xs text-red-700 shadow-lg">
          {errorMsg}
        </div>
      )}

      {/* Assistant Panel */}
      <Sheet open={open} onOpenChange={(o) => { if (!o) handleClose() }}>
        <SheetContent
          side={isDesktop ? 'right' : 'bottom'}
          className={cn(
            'p-0 flex flex-col bg-[#0a0a0a]',
            '[&>button]:bg-transparent [&>button]:data-[state=open]:bg-transparent [&>button]:text-gray-600 [&>button]:hover:text-gray-300 [&>button]:focus:ring-0 [&>button]:focus:ring-offset-0',
            isDesktop
              ? 'w-full max-w-[420px] h-full rounded-none border-l border-white/[0.06]'
              : 'h-[88vh] rounded-t-2xl border-t border-white/[0.06]',
          )}
        >
          {/* Header */}
          <SheetTitle className="sr-only">Asistente de Operaciones — Nortiq</SheetTitle>
          <div className="flex-shrink-0 bg-[#0a0a0a] px-5 pt-5 pb-4">
            <div className="flex items-center gap-3 pr-8">
              <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-2xl bg-emerald-600 shadow-[0_0_20px_rgba(5,150,105,0.35)]">
                <Tractor className="h-5 w-5 text-white" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-bold text-white leading-tight">Nortiq</p>
                <p className="text-xs text-gray-600 leading-tight mt-0.5">Asistente de Operaciones</p>
              </div>
              <div className="flex items-center gap-2 flex-shrink-0">
                {/* Voice toggle */}
                <button
                  onClick={() => { if (speaking) stopSpeaking(); setVoiceEnabled(v => !v) }}
                  title={voiceEnabled ? 'Desactivar voz' : 'Activar voz'}
                  className={cn(
                    'flex h-7 w-7 items-center justify-center rounded-full transition-all duration-200',
                    voiceEnabled
                      ? speaking
                        ? 'bg-emerald-500/20 text-emerald-400 animate-pulse'
                        : 'bg-white/5 text-gray-400 hover:text-emerald-400'
                      : 'bg-white/5 text-gray-700 hover:text-gray-400',
                  )}
                >
                  {voiceEnabled ? <Volume2 className="h-3.5 w-3.5" /> : <VolumeX className="h-3.5 w-3.5" />}
                </button>
                <span className={cn('h-1.5 w-1.5 rounded-full', status.dot)} />
                <span className="text-[11px] text-gray-600 font-medium">{status.label}</span>
              </div>
            </div>
            <div className="mt-4 h-px bg-white/[0.05]" />
          </div>

          {/* Scrollable content area */}
          <div ref={scrollRef} className="flex-1 overflow-y-auto bg-[#0a0a0a] px-4 py-3 space-y-6">

            {/* Welcome screen — only when no turns */}
            {!hasContent && !isProcessing && (
              <div className="flex flex-col h-full gap-5 pt-2">
                <div className="flex flex-col items-center gap-3 text-center px-4 pt-4">
                  <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-500/10 border border-emerald-500/20">
                    <Sparkles className="h-6 w-6 text-emerald-500" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-gray-200">Asistente de Operaciones</p>
                    <p className="text-xs text-gray-500 mt-1 leading-relaxed">
                      Di un comando por voz o escribe abajo
                    </p>
                  </div>
                </div>
                <div className="space-y-2">
                  <p className="text-[10px] font-semibold text-gray-600 uppercase tracking-wider px-1">Comandos sugeridos</p>
                  {[
                    '¿Cómo van los liners?',
                    '¿Qué activos están en mantenimiento?',
                    'Registrar servicio al Tractor JD 6155M',
                    '¿Qué mantenimientos vencen esta semana?',
                    'Mostrar hallazgos críticos abiertos',
                  ].map((cmd) => (
                    <button
                      key={cmd}
                      onClick={() => { setTextValue(cmd); inputRef.current?.focus() }}
                      className="w-full text-left rounded-xl bg-white/5 border border-gray-700/50 px-3 py-2.5 text-xs text-gray-300 hover:bg-white/10 hover:text-white hover:border-emerald-500/40 transition-all duration-150 cursor-pointer"
                    >
                      {cmd}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Conversation history — all completed + active turn */}
            {turns.map((turn, idx) => {
              const isActive = turn.id === activeTurnId
              const isStreamingEmpty = isActive && !turn.text && !turn.done

              return (
                <div key={turn.id} className="space-y-4">
                  {/* Separator between turns */}
                  {idx > 0 && (
                    <div className="flex items-center gap-2 py-1">
                      <div className="flex-1 h-px bg-white/[0.04]" />
                    </div>
                  )}

                  {/* Spinner — active turn with no content yet */}
                  {isStreamingEmpty && (
                    <div className="flex flex-col items-center justify-center py-6 gap-3">
                      <Loader2 className="h-7 w-7 animate-spin text-emerald-500" />
                      <div className="flex items-center gap-1">
                        <span className="h-1.5 w-1.5 rounded-full bg-gray-500 animate-bounce [animation-delay:0ms]" />
                        <span className="h-1.5 w-1.5 rounded-full bg-gray-500 animate-bounce [animation-delay:150ms]" />
                        <span className="h-1.5 w-1.5 rounded-full bg-gray-500 animate-bounce [animation-delay:300ms]" />
                      </div>
                      <p className="text-xs text-gray-500">Analizando…</p>
                    </div>
                  )}

                  {/* Turn content */}
                  {!isStreamingEmpty && (
                    <AgentResponsePanel
                      transcript={turn.question}
                      text={turn.text}
                      results={turn.results}
                      onClose={handleClose}
                    />
                  )}

                  {/* Error inline */}
                  {turn.error && (
                    <div className="rounded-xl bg-red-950/50 border border-red-900/50 px-3 py-2.5 text-xs text-red-400">
                      {turn.error}
                    </div>
                  )}
                </div>
              )
            })}

            {/* Typing indicator — processing a new turn before transcript arrives */}
            {isProcessing && !activeTurn && (
              <div className="flex flex-col items-center justify-center py-6 gap-3">
                <Loader2 className="h-7 w-7 animate-spin text-emerald-500" />
                <p className="text-xs text-gray-500">Analizando…</p>
              </div>
            )}
          </div>

          {/* Bottom input bar */}
          <div className="flex-shrink-0 bg-[#0a0a0a] px-4 pt-2 pb-4">
            <div className="h-px bg-white/[0.05] mb-3" />
            <div className="flex items-center gap-2 rounded-2xl bg-white/[0.04] border border-white/[0.07] px-3 py-2">
              {/* Mic button inside panel */}
              <button
                onClick={handleMicClick}
                disabled={isProcessing}
                title={isRecording ? 'Detener grabación' : 'Grabar audio'}
                className={cn(
                  'flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full transition-all duration-200',
                  isRecording
                    ? 'bg-red-500 text-white animate-pulse'
                    : isProcessing
                      ? 'text-gray-700 cursor-not-allowed'
                      : 'text-gray-500 hover:text-emerald-400 hover:bg-white/5',
                )}
              >
                {isRecording ? <MicOff className="h-3.5 w-3.5" /> : <Mic className="h-3.5 w-3.5" />}
              </button>

              <input
                ref={inputRef}
                type="text"
                value={textValue}
                onChange={e => setTextValue(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleTextSubmit()}
                placeholder={isRecording ? 'Grabando…' : 'Escribe o graba un comando…'}
                disabled={isProcessing || isRecording}
                className="flex-1 text-sm outline-none text-gray-200 placeholder-gray-600 bg-transparent disabled:opacity-50 min-w-0"
              />

              <button
                onClick={handleTextSubmit}
                disabled={!textValue.trim() || isProcessing || isRecording}
                className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full bg-emerald-600 text-white hover:bg-emerald-500 disabled:bg-white/5 disabled:text-gray-700 transition-all duration-200 cursor-pointer disabled:cursor-not-allowed"
              >
                <Send className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>
        </SheetContent>
      </Sheet>
    </>
  )
}
