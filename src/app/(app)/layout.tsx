import { redirect } from 'next/navigation'
import { currentStaff } from '@/lib/auth'
import { db } from '@/lib/db'
import { aiEngineLabel } from '@/lib/ai'
import { logout } from '@/app/actions/session'
import { AppShell } from '@/components/app-shell'

export const dynamic = 'force-dynamic'

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const staff = await currentStaff()
  if (!staff) redirect('/login')

  const office = db().prepare('SELECT name FROM office WHERE id = 1').get() as
    | { name: string }
    | undefined

  return (
    <AppShell
      officeName={office?.name ?? '事業所'}
      staff={staff}
      aiEngine={aiEngineLabel()}
      logoutAction={logout}
    >
      {children}
    </AppShell>
  )
}
