import { notFound } from 'next/navigation'
import { db } from '@/lib/db'
import { allClients, activeServices, activeStaff } from '@/lib/queries'
import { deletePlan } from '@/app/actions/care-plans'
import { Breadcrumb, Content, Panel, PageHeader } from '@/components/ui'
import { PlanForm } from '../../plan-form'
import type { CarePlan, CarePlanItem } from '@/lib/types'

export const dynamic = 'force-dynamic'

export default async function EditPlanPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const plan = db().prepare('SELECT * FROM care_plans WHERE id = ?').get(Number(id)) as
    | CarePlan
    | undefined
  if (!plan) notFound()

  const items = db()
    .prepare('SELECT * FROM care_plan_items WHERE plan_id = ? ORDER BY sort_order')
    .all(plan.id) as CarePlanItem[]

  const client = db().prepare('SELECT name FROM clients WHERE id = ?').get(plan.client_id) as
    | { name: string }
    | undefined

  return (
    <>
      <PageHeader title="介護計画書の編集" sub={`${client?.name ?? ''} 様　第${plan.revision}版`} />
      <Content className="space-y-3">
        <Breadcrumb
          items={[
            { label: '介護計画書', href: '/care-plans' },
            { label: `${client?.name ?? ''} 第${plan.revision}版`, href: `/care-plans/${plan.id}` },
            { label: '編集' },
          ]}
        />
        <PlanForm
          plan={plan}
          items={items}
          clients={allClients()}
          staffList={activeStaff()}
          services={activeServices()}
          defaultRevision={plan.revision}
        />

        <Panel title="この計画書を削除">
          <form action={deletePlan} className="flex items-center justify-between gap-4">
            <input type="hidden" name="id" value={plan.id} />
            <input type="hidden" name="client_id" value={plan.client_id} />
            <p className="text-xs text-ink-sub">
              明細もあわせて削除され、元に戻せません。過去の計画は残したい場合、状態を「終了」にしてください。
            </p>
            <button type="submit" className="btn btn-danger shrink-0">
              削除する
            </button>
          </form>
        </Panel>
      </Content>
    </>
  )
}
