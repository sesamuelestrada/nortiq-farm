'use client'

import { useState, useTransition } from 'react'
import { updateAssetStatus } from '@/features/assets/services/assets'
import type { AssetStatus } from '@/features/assets/types'
import { Loader2 } from 'lucide-react'
import { cn } from '@/lib/utils'

const statuses: { value: AssetStatus; label: string }[] = [
  { value: 'operational', label: 'Operativo' },
  { value: 'maintenance', label: 'En mantenimiento' },
  { value: 'out_of_service', label: 'Fuera de servicio' },
]

interface Props {
  assetId: string
  currentStatus: AssetStatus
}

export function AssetStatusSelect({ assetId, currentStatus }: Props) {
  const [status, setStatus] = useState<AssetStatus>(currentStatus)
  const [isPending, startTransition] = useTransition()

  function handleChange(newStatus: AssetStatus) {
    if (newStatus === status) return
    setStatus(newStatus)
    startTransition(async () => {
      await updateAssetStatus(assetId, newStatus)
    })
  }

  return (
    <div className="relative inline-flex items-center">
      <select
        value={status}
        onChange={e => handleChange(e.target.value as AssetStatus)}
        disabled={isPending}
        className={cn(
          'appearance-none rounded-full border px-3 py-1 pr-7 text-xs font-medium cursor-pointer transition-colors',
          'focus:outline-none focus:ring-2 focus:ring-offset-1',
          status === 'operational' && 'border-green-200 bg-green-50 text-green-700 focus:ring-green-500',
          status === 'maintenance' && 'border-yellow-200 bg-yellow-50 text-yellow-700 focus:ring-yellow-500',
          status === 'out_of_service' && 'border-red-200 bg-red-50 text-red-700 focus:ring-red-500',
          isPending && 'opacity-60'
        )}
      >
        {statuses.map(s => (
          <option key={s.value} value={s.value}>{s.label}</option>
        ))}
      </select>
      <div className="pointer-events-none absolute right-2 flex items-center">
        {isPending ? (
          <Loader2 className="h-3 w-3 animate-spin" />
        ) : (
          <svg className="h-3 w-3 opacity-40" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        )}
      </div>
    </div>
  )
}
