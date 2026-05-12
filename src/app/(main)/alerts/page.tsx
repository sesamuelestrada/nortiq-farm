import { createClient } from '@/lib/supabase/server'
import { AlertsTable } from '@/features/alerts/components/AlertsTable'
import { Bell } from 'lucide-react'

async function getAlerts() {
  const supabase = await createClient()
  const { data } = await supabase
    .from('alerts')
    .select('*, asset:assets(id, name)')
    .order('created_at', { ascending: false })
    .limit(100)
  return data ?? []
}

export default async function AlertsPage() {
  const alerts = await getAlerts()
  const unreadCount = alerts.filter(a => !a.is_read).length

  return (
    <div className="p-4 md:p-6 max-w-4xl mx-auto space-y-6">
      <div className="flex items-start gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-red-50 border border-red-100 mt-0.5">
          <Bell className="h-5 w-5 text-red-600" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-foreground">Alertas</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            {unreadCount > 0
              ? `${unreadCount} alerta${unreadCount > 1 ? 's' : ''} pendiente${unreadCount > 1 ? 's' : ''} de atender`
              : 'No hay alertas pendientes — todo en orden'}
          </p>
        </div>
      </div>

      <AlertsTable initialAlerts={alerts as Parameters<typeof AlertsTable>[0]['initialAlerts']} />
    </div>
  )
}
