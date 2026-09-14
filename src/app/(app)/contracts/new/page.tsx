import { activeClients, activeStaff } from '@/lib/queries'
import { Breadcrumb, Content, PageHeader } from '@/components/ui'
import { ContractForm } from '../contract-form'

export const dynamic = 'force-dynamic'

export default async function NewContractPage({
  searchParams,
}: {
  searchParams: Promise<{ client?: string }>
}) {
  const sp = await searchParams
  return (
    <>
      <PageHeader title="契約の登録" />
      <Content className="max-w-4xl space-y-3">
        <Breadcrumb items={[{ label: '契約', href: '/contracts' }, { label: '新規登録' }]} />
        <ContractForm
          clients={activeClients()}
          staffList={activeStaff()}
          defaultClientId={sp.client ? Number(sp.client) : undefined}
          back={sp.client ? `/clients/${sp.client}` : '/contracts'}
        />
      </Content>
    </>
  )
}
