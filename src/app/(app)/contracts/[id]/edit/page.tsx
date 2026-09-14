import { notFound } from 'next/navigation'
import { db } from '@/lib/db'
import { allClients, activeStaff } from '@/lib/queries'
import { deleteContract } from '@/app/actions/contracts'
import { Breadcrumb, Content, Panel, PageHeader } from '@/components/ui'
import { ConfirmButton } from '@/components/confirm-button'
import { ContractForm } from '../../contract-form'
import type { Contract } from '@/lib/types'

export const dynamic = 'force-dynamic'

export default async function EditContractPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const contract = db().prepare('SELECT * FROM contracts WHERE id = ?').get(Number(id)) as
    | Contract
    | undefined
  if (!contract) notFound()

  const client = db().prepare('SELECT name FROM clients WHERE id = ?').get(contract.client_id) as
    | { name: string }
    | undefined

  return (
    <>
      <PageHeader title="契約の編集" sub={client?.name ? `${client.name} 様` : undefined} />
      <Content className="max-w-4xl space-y-3">
        <Breadcrumb
          items={[
            { label: '契約', href: '/contracts' },
            { label: client?.name ?? '契約', href: `/clients/${contract.client_id}` },
            { label: '編集' },
          ]}
        />
        <ContractForm
          contract={contract}
          clients={allClients()}
          staffList={activeStaff()}
          back={`/clients/${contract.client_id}`}
        />

        <Panel title="この契約を削除">
          <form action={deleteContract} className="flex items-center justify-between gap-4">
            <input type="hidden" name="id" value={contract.id} />
            <input type="hidden" name="client_id" value={contract.client_id} />
            <p className="text-xs text-ink-sub">
              削除すると元に戻せません。契約が終わっただけの場合は状態を「終了」にしてください。
            </p>
            <ConfirmButton className="btn btn-danger shrink-0" message="この契約を削除します。元に戻せません。よろしいですか？">
              削除する
            </ConfirmButton>
          </form>
        </Panel>
      </Content>
    </>
  )
}
