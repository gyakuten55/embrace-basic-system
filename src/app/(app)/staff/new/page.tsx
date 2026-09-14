import { Breadcrumb, Content, PageHeader } from '@/components/ui'
import { StaffForm } from '../staff-form'

export const dynamic = 'force-dynamic'

export default async function NewStaffPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>
}) {
  const sp = await searchParams
  return (
    <>
      <PageHeader title="職員の登録" />
      <Content className="max-w-4xl space-y-3">
        <Breadcrumb items={[{ label: '職員', href: '/staff' }, { label: '新規登録' }]} />
        {sp.error && (
          <p className="rounded border border-ng/25 bg-ng-soft px-3 py-2 text-sm text-ng">{sp.error}</p>
        )}
        <StaffForm />
      </Content>
    </>
  )
}
