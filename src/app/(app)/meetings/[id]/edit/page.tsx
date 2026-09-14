import { notFound } from 'next/navigation'
import { db } from '@/lib/db'
import { allClients, activeStaff, officeInfo } from '@/lib/queries'
import { deleteMeeting } from '@/app/actions/meetings'
import { Breadcrumb, Content, Panel, PageHeader } from '@/components/ui'
import { MeetingForm } from '../../meeting-form'
import type { Meeting, MeetingAttendee } from '@/lib/types'

export const dynamic = 'force-dynamic'

export default async function EditMeetingPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const meeting = db().prepare('SELECT * FROM meetings WHERE id = ?').get(Number(id)) as
    | Meeting
    | undefined
  if (!meeting) notFound()

  const attendees = db()
    .prepare('SELECT * FROM meeting_attendees WHERE meeting_id = ? ORDER BY sort_order')
    .all(meeting.id) as MeetingAttendee[]

  return (
    <>
      <PageHeader title="会議記録の編集" sub={`${meeting.held_on}　${meeting.kind}`} />
      <Content className="max-w-5xl space-y-3">
        <Breadcrumb
          items={[
            { label: '会議記録', href: '/meetings' },
            { label: meeting.held_on, href: `/meetings/${meeting.id}` },
            { label: '編集' },
          ]}
        />
        <MeetingForm
          meeting={meeting}
          attendees={attendees}
          clients={allClients()}
          staffList={activeStaff()}
          officeName={officeInfo()?.name ?? ''}
        />

        <Panel title="この会議記録を削除">
          <form action={deleteMeeting} className="flex items-center justify-between gap-4">
            <input type="hidden" name="id" value={meeting.id} />
            <p className="text-xs text-ink-sub">出席者の記録もあわせて削除され、元に戻せません。</p>
            <button type="submit" className="btn btn-danger shrink-0">
              削除する
            </button>
          </form>
        </Panel>
      </Content>
    </>
  )
}
