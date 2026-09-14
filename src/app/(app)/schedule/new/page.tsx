import { activeClients, activeServices, activeStaff } from '@/lib/queries'
import { startOfWeek, today } from '@/lib/date'
import { Breadcrumb, Content, PageHeader } from '@/components/ui'
import { VisitForm } from '../visit-form'

export const dynamic = 'force-dynamic'

type Search = { date?: string; staff?: string; client?: string }

export default async function NewVisitPage({ searchParams }: { searchParams: Promise<Search> }) {
  const sp = await searchParams
  const date = sp.date && /^\d{4}-\d{2}-\d{2}$/.test(sp.date) ? sp.date : today()

  return (
    <>
      <PageHeader title="訪問予定の追加" sub="スケジュールに1件の訪問を登録します。" />
      <Content className="max-w-3xl space-y-3">
        <Breadcrumb items={[{ label: 'スケジュール', href: '/schedule' }, { label: '予定の追加' }]} />
        <VisitForm
          clients={activeClients()}
          staffList={activeStaff()}
          services={activeServices()}
          defaults={{
            date,
            staffId: sp.staff ? Number(sp.staff) : undefined,
            clientId: sp.client ? Number(sp.client) : undefined,
          }}
          week={startOfWeek(date)}
        />
      </Content>
    </>
  )
}
