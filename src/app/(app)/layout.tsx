import { redirect } from 'next/navigation'
import { currentStaff } from '@/lib/auth'
import { db } from '@/lib/db'
import { aiEngineLabel } from '@/lib/ai'
import { Sidebar } from '@/components/sidebar'
import { Topbar } from '@/components/topbar'

export const dynamic = 'force-dynamic'

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const staff = await currentStaff()
  if (!staff) redirect('/login')

  const office = db().prepare('SELECT name FROM office WHERE id = 1').get() as
    | { name: string }
    | undefined

  return (
    <div className="flex h-screen overflow-hidden print:h-auto print:overflow-visible">
      <Sidebar officeName={office?.name ?? '事業所'} />
      <div className="flex min-w-0 flex-1 flex-col">
        <Topbar staff={staff} aiEngine={aiEngineLabel()} />
        <main className="min-w-0 flex-1 overflow-y-auto print:overflow-visible">{children}</main>
      </div>
    </div>
  )
}
