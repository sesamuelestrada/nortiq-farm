import { Sidebar } from '@/shared/components/Sidebar'
import { BottomNav } from '@/shared/components/BottomNav'
import { FloatingVoiceBar } from '@/features/agent/components/FloatingVoiceBar'
import { createClient } from '@/lib/supabase/server'

export default async function MainLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const supabase = await createClient()

  const [
    { data: { user } },
    { count: alertCount },
    { count: findingsCount },
  ] = await Promise.all([
    supabase.auth.getUser(),
    supabase.from('alerts').select('id', { count: 'exact', head: true }).eq('is_read', false),
    supabase.from('maintenance_findings').select('id', { count: 'exact', head: true }).eq('status', 'open').in('severity', ['critical', 'high']),
  ])

  const initialHoyCount = (alertCount ?? 0) + (findingsCount ?? 0)

  let userName = user?.email?.split('@')[0] ?? undefined
  if (user) {
    const { data: profile } = await supabase
      .from('profiles')
      .select('full_name')
      .eq('id', user.id)
      .single()
    if (profile?.full_name) userName = profile.full_name
  }

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      <Sidebar userName={userName} initialHoyCount={initialHoyCount} />
      <main className="flex-1 overflow-y-auto pb-16 md:pb-0">
        {children}
      </main>
      <BottomNav initialHoyCount={initialHoyCount} />
      <FloatingVoiceBar />
    </div>
  )
}
