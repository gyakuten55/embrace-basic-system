import { redirect } from 'next/navigation'
import { currentStaff } from '@/lib/auth'
import { db, isEphemeralDb } from '@/lib/db'
import { aiEngineLabel } from '@/lib/ai'
import { logout } from '@/app/actions/session'
import { AppShell } from '@/components/app-shell'
import { addDays, addMonths, thisMonth, today } from '@/lib/date'
import { isMonthClosed } from '@/lib/billing'

export const dynamic = 'force-dynamic'

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const staff = await currentStaff()
  if (!staff) redirect('/login')

  const office = db().prepare('SELECT name FROM office WHERE id = 1').get() as
    | { name: string }
    | undefined

  const unrecorded = db()
    .prepare(
      `SELECT COUNT(*) AS n FROM visits v LEFT JOIN visit_records r ON r.visit_id = v.id
       WHERE v.status = '実施済' AND r.id IS NULL AND v.date BETWEEN ? AND ?`,
    )
    .get(addDays(today(), -60), today()) as { n: number }

  return (
    <AppShell
      counts={{ unrecorded: unrecorded.n, lastMonthClosed: isMonthClosed(addMonths(thisMonth(), -1)) }}
      demo={isEphemeralDb()}
      officeName={office?.name ?? '事業所'}
      staff={staff}
      aiEngine={aiEngineLabel()}
      logoutAction={logout}
    >
      {children}
    </AppShell>
  )
}
