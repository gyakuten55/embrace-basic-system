import { activeClients, activeStaff, officeInfo } from '@/lib/queries'
import { Breadcrumb, Content, PageHeader } from '@/components/ui'
import { MeetingForm } from '../meeting-form'

export const dynamic = 'force-dynamic'

export default async function NewMeetingPage({
  searchParams,
}: {
  searchParams: Promise<{ client?: string }>
}) {
  const sp = await searchParams
  return (
    <>
      <PageHeader title="会議記録の作成" />
      <Content className="max-w-5xl space-y-3">
        <Breadcrumb items={[{ label: '会議記録', href: '/meetings' }, { label: '新規作成' }]} />
        <MeetingForm
          attendees={[]}
          clients={activeClients()}
          staffList={activeStaff()}
          officeName={officeInfo()?.name ?? ''}
          defaultClientId={sp.client ? Number(sp.client) : undefined}
        />
      </Content>
    </>
  )
}
