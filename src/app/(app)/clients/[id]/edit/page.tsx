import { notFound } from 'next/navigation'
import { clientById } from '@/lib/queries'
import { deleteClient } from '@/app/actions/clients'
import { Breadcrumb, Content, Panel, PageHeader } from '@/components/ui'
import { ConfirmButton } from '@/components/confirm-button'
import { ClientForm } from '../../client-form'

export const dynamic = 'force-dynamic'

export default async function EditClientPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>
  searchParams: Promise<{ error?: string }>
}) {
  const { id } = await params
  const sp = await searchParams
  const client = clientById(Number(id))
  if (!client) notFound()

  return (
    <>
      <PageHeader title={`${client.name} 様の情報を編集`} />
      <Content className="max-w-5xl space-y-3">
        <Breadcrumb
          items={[
            { label: '利用者', href: '/clients' },
            { label: client.name, href: `/clients/${client.id}` },
            { label: '編集' },
          ]}
        />
        {sp.error && (
          <p className="notice border-ng/20 bg-ng-soft text-sm text-ng">{sp.error}</p>
        )}
        <ClientForm client={client} />

        <Panel title="この利用者を削除">
          <form action={deleteClient} className="flex items-center justify-between gap-4">
            <input type="hidden" name="id" value={client.id} />
            <p className="text-xs leading-relaxed text-ink-sub">
              契約・計画書・訪問予定・記録もすべて削除され、元に戻せません。
              サービスが終わっただけの場合は、削除せず利用状況を「終了」にしてください。
            </p>
            <ConfirmButton
              className="btn btn-danger shrink-0"
              message={`${client.name} 様の情報を削除します。契約・計画書・訪問予定・記録もすべて削除され、元に戻せません。よろしいですか？`}
            >
              削除する
            </ConfirmButton>
          </form>
        </Panel>
      </Content>
    </>
  )
}
