'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Trash2 } from 'lucide-react'
import { deleteAsset } from '@/features/assets/services/assets'

interface Props {
  assetId: string
  assetName: string
}

export function DeleteAssetButton({ assetId, assetName }: Props) {
  const [confirming, setConfirming] = useState(false)
  const [isPending, startTransition] = useTransition()
  const router = useRouter()

  function handleDelete() {
    startTransition(async () => {
      const result = await deleteAsset(assetId)
      if (result.error) {
        alert(`Error al eliminar: ${result.error}`)
        setConfirming(false)
      } else {
        router.push('/assets')
      }
    })
  }

  if (confirming) {
    return (
      <div className="flex items-center gap-2">
        <span className="text-sm text-muted-foreground hidden sm:inline">
          ¿Eliminar &ldquo;{assetName}&rdquo;?
        </span>
        <button
          onClick={handleDelete}
          disabled={isPending}
          className="flex items-center gap-1.5 rounded-lg bg-red-600 px-3 py-2 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-50 transition-colors"
        >
          {isPending ? 'Eliminando…' : 'Confirmar'}
        </button>
        <button
          onClick={() => setConfirming(false)}
          disabled={isPending}
          className="rounded-lg border border-border px-3 py-2 text-sm font-medium text-foreground/80 hover:bg-muted/50 transition-colors"
        >
          Cancelar
        </button>
      </div>
    )
  }

  return (
    <button
      onClick={() => setConfirming(true)}
      className="flex items-center gap-2 rounded-lg border border-red-200 dark:border-red-800/40 px-3 py-2 text-sm font-medium text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/20 transition-colors"
    >
      <Trash2 className="h-4 w-4" />
      Eliminar
    </button>
  )
}
