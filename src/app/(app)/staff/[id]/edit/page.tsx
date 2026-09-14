import { notFound } from 'next/navigation'
import { staffById } from '@/lib/queries'
import { resetStaffPassword } from '@/app/actions/staff'
import { Breadcrumb, Content, Field, Panel, PageHeader } from '@/components/ui'
import { StaffForm } from '../../staff-form'

export const dynamic = 'force-dynamic'

export default async function EditStaffPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>
  searchParams: Promise<{ error?: string; saved?: string }>
}) {
  const { id } = await params
  const sp = await searchParams
  const staff = staffById(Number(id))
  if (!staff) notFound()

  return (
    <>
      <PageHeader title={`${staff.name} さんの情報を編集`} />
      <Content className="max-w-4xl space-y-3">
        <Breadcrumb items={[{ label: '職員', href: '/staff' }, { label: staff.name }]} />
        {sp.error && (
          <p className="rounded border border-ng/25 bg-ng-soft px-3 py-2 text-sm text-ng">{sp.error}</p>
        )}
        {sp.saved === 'password' && (
          <p className="rounded border border-ok/25 bg-ok-soft px-3 py-2 text-sm text-ok">
            パスワードを再設定しました。本人に伝えてください。
          </p>
        )}

        <StaffForm staff={staff} />

        <Panel title="パスワードの再設定" flush>
          <form action={resetStaffPassword} className="space-y-3.5 px-4 py-3.5">
            <input type="hidden" name="id" value={staff.id} />
            <Field
              label="新しいパスワード"
              hint="6文字以上。本人がログインできなくなった場合にここから再設定します。"
            >
              <input name="password" type="text" className="field max-w-xs" />
            </Field>
            <button type="submit" className="btn btn-default">
              パスワードを再設定
            </button>
          </form>
        </Panel>
      </Content>
    </>
  )
}
