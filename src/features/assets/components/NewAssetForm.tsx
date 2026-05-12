'use client'

import { useActionState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { createAsset, type AssetFormState } from '../services/assets'
import { Loader2, CheckCircle2 } from 'lucide-react'

const initialState: AssetFormState = {}

export function NewAssetForm() {
  const router = useRouter()
  const [state, action, isPending] = useActionState(createAsset, initialState)

  if (state.success) {
    return (
      <div className="flex flex-col items-center gap-4 py-16">
        <div className="flex h-16 w-16 items-center justify-center rounded-full bg-green-100">
          <CheckCircle2 className="h-8 w-8 text-green-600" />
        </div>
        <h2 className="text-xl font-semibold text-gray-900">Activo registrado</h2>
        <Button onClick={() => router.push('/assets')} className="mt-2">
          Ver todos los activos
        </Button>
      </div>
    )
  }

  return (
    <form action={action} className="space-y-5">
      <div className="space-y-1.5">
        <Label htmlFor="name">Nombre del activo *</Label>
        <Input
          id="name"
          name="name"
          placeholder="Tractor JD 6155M — Potrero Norte"
          required
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-1.5">
          <Label htmlFor="type">Tipo *</Label>
          <Select name="type" defaultValue="tractor">
            <SelectTrigger id="type">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="tractor">Tractor</SelectItem>
              <SelectItem value="truck">Camión</SelectItem>
              <SelectItem value="implement">Implemento</SelectItem>
              <SelectItem value="tool">Herramienta</SelectItem>
              <SelectItem value="milking_system">Sistema de Ordeña</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="status">Estado</Label>
          <Select name="status" defaultValue="operational">
            <SelectTrigger id="status">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="operational">Operativo</SelectItem>
              <SelectItem value="maintenance">En mantenimiento</SelectItem>
              <SelectItem value="out_of_service">Fuera de servicio</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-1.5">
          <Label htmlFor="brand">Marca</Label>
          <Input id="brand" name="brand" placeholder="John Deere" />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="model">Modelo</Label>
          <Input id="model" name="model" placeholder="6155M" />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-1.5">
          <Label htmlFor="year">Año</Label>
          <Input id="year" name="year" type="number" min="1900" max="2030" placeholder="2021" />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="serial_number">N° de serie</Label>
          <Input id="serial_number" name="serial_number" placeholder="1RW6155MABC123456" />
        </div>
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="location">Ubicación en el rancho</Label>
        <Input id="location" name="location" placeholder="Potrero Norte" />
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="notes">Notas adicionales</Label>
        <Textarea id="notes" name="notes" placeholder="Observaciones..." rows={3} />
      </div>

      {state.error && (
        <div className="rounded-lg bg-red-50 border border-red-200 px-4 py-3">
          <p className="text-sm text-red-700">{state.error}</p>
        </div>
      )}

      <Button type="submit" className="w-full bg-green-600 hover:bg-green-700" disabled={isPending}>
        {isPending ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Guardando...</> : 'Registrar activo'}
      </Button>
    </form>
  )
}
