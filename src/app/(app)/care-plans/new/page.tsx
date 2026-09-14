import { db } from '@/lib/db'
import { activeClients, activeServices, activeStaff } from '@/lib/queries'
import { Breadcrumb, Content, PageHeader } from '@/components/ui'
import { PlanForm } from '../plan-form'

export const dynamic = 'force-dynamic'

export default async function NewPlanPage({
  searchParams,
}: {
  searchParams: Promise<{ client?: string }>
}) {
  const sp = await searchParams
  const clientId = sp.client ? Number(sp.client) : undefined

  const nextRevision = clientId
    ? (((db()
        .prepare('SELECT MAX(revision) AS m FROM care_plans WHERE client_id = ?')
        .get(clientId) as { m: number | null }).m ?? 0) + 1)
    : 1

  return (
    <>
      <PageHeader title="介護計画書の作成" sub="訪問介護計画書（サービス提供の根拠となる書類）を作成します。" />
      <Content className="space-y-3">
        <Breadcrumb items={[{ label: '介護計画書', href: '/care-plans' }, { label: '新規作成' }]} />
        <PlanForm
          items={[]}
          clients={activeClients()}
          staffList={activeStaff()}
          services={activeServices()}
          defaultClientId={clientId}
          defaultRevision={nextRevision}
        />
      </Content>
    </>
  )
}
