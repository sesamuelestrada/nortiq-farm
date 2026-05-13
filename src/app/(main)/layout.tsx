import { Sidebar } from '@/shared/components/Sidebar'
import { BottomNav } from '@/shared/components/BottomNav'
import { MobileHeader } from '@/shared/components/MobileHeader'
import { FloatingVoiceBar } from '@/features/agent/components/FloatingVoiceBar'
import { createClient } from '@/lib/supabase/server'

export default async function MainLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const profileQuery = user
    ? supabase.from('profiles').select('full_name').eq('id', user.id).single()
    : Promise.resolve({ data: null as { full_name: string | null } | null, error: null })

  const [
    { count: alertCount },
    { count: findingsCount },
    { data: profile },
  ] = await Promise.all([
    supabase.from('alerts').select('id', { count: 'exact', head: true }).eq('is_read', false),
    supabase.from('maintenance_findings').select('id', { count: 'exact', head: true }).eq('status', 'open').in('severity', ['critical', 'high']),
    profileQuery,
  ])

  const initialHoyCount = (alertCount ?? 0) + (findingsCount ?? 0)
  const userName = profile?.full_name ?? user?.email?.split('@')[0] ?? undefined

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      <Sidebar userName={userName} initialHoyCount={initialHoyCount} />
      <div className="flex flex-1 flex-col overflow-hidden">
        <MobileHeader />
        <main className="flex-1 overflow-y-auto pb-16 md:pb-0">
          {children}
        </main>
      </div>
      <BottomNav initialHoyCount={initialHoyCount} />
      <FloatingVoiceBar />
    </div>
  )
}
