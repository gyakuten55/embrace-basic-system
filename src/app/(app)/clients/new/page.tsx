import { db } from '@/lib/db'
import { Breadcrumb, Content, PageHeader } from '@/components/ui'
import { ClientForm } from '../client-form'

export const dynamic = 'force-dynamic'

export default async function NewClientPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>
}) {
  const sp = await searchParams
  const last = db().prepare("SELECT code FROM clients ORDER BY code DESC LIMIT 1").get() as
    | { code: string }
    | undefined
  const nextCode = suggestCode(last?.code)

  return (
    <>
      <PageHeader title="利用者の登録" sub="契約前でも、問い合わせ段階で登録しておけます。" />
      <Content className="max-w-5xl space-y-3">
        <Breadcrumb items={[{ label: '利用者', href: '/clients' }, { label: '新規登録' }]} />
        {sp.error && (
          <p className="rounded border border-ng/25 bg-ng-soft px-3 py-2 text-sm text-ng">{sp.error}</p>
        )}
        <ClientForm nextCode={nextCode} />
      </Content>
    </>
  )
}

function suggestCode(last: string | undefined): string {
  if (!last) return 'A-001'
  const m = /^([A-Za-z]*-?)(\d+)$/.exec(last)
  if (!m) return ''
  return `${m[1]}${String(Number(m[2]) + 1).padStart(m[2].length, '0')}`
}
