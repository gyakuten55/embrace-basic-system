import Link from 'next/link'
import { notFound } from 'next/navigation'
import { db } from '@/lib/db'
import { officeInfo } from '@/lib/queries'
import { longDate } from '@/lib/date'
import { Breadcrumb, Content, PageHeader } from '@/components/ui'
import { PrintButton } from '@/components/print-button'
import type { Meeting, MeetingAttendee } from '@/lib/types'

export const dynamic = 'force-dynamic'

export default async function MeetingDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const meeting = db().prepare('SELECT * FROM meetings WHERE id = ?').get(Number(id)) as
    | Meeting
    | undefined
  if (!meeting) notFound()

  const attendees = db()
    .prepare('SELECT * FROM meeting_attendees WHERE meeting_id = ? ORDER BY sort_order')
    .all(meeting.id) as MeetingAttendee[]

  const client = meeting.client_id
    ? (db().prepare('SELECT id, name, care_level FROM clients WHERE id = ?').get(meeting.client_id) as
        | { id: number; name: string; care_level: string }
        | undefined)
    : undefined

  const recorder = meeting.recorder_id
    ? (db().prepare('SELECT name FROM staff WHERE id = ?').get(meeting.recorder_id) as
        | { name: string }
        | undefined)
    : undefined

  const office = officeInfo()

  return (
    <>
      <PageHeader
        title={meeting.kind}
        sub={`${longDate(meeting.held_on)}${client ? `　${client.name} 様` : ''}`}
        actions={
          <>
            <PrintButton />
            <Link href={`/meetings/${meeting.id}/edit`} className="btn btn-primary">
              編集
            </Link>
          </>
        }
      />

      <Content>
        <Breadcrumb
          items={[{ label: '会議記録', href: '/meetings' }, { label: meeting.held_on }]}
        />

        <article className="sheet mt-3 mx-auto max-w-4xl bg-white p-8 print:max-w-none print:p-0">
          <header className="border-b-2 border-ink pb-3">
            <div className="flex items-end justify-between gap-4">
              <h2 className="text-xl font-semibold tracking-wide">{meeting.kind}　記録</h2>
              <div className="text-right text-xs leading-5 text-ink-sub">
                <div>{office?.name}</div>
                <div className="tnum">事業所番号 {office?.office_number}</div>
              </div>
            </div>
          </header>

          <table className="mt-4 w-full border-collapse text-sm">
            <tbody>
              <Row label="開催日時">
                <span className="tnum">
                  {longDate(meeting.held_on)}
                  {meeting.start_time && `　${meeting.start_time}〜${meeting.end_time}`}
                </span>
              </Row>
              <Row label="開催場所">{meeting.place || '—'}</Row>
              {client && (
                <Row label="対象利用者">
                  {client.name}
                  <span className="ml-3 text-xs text-ink-sub">{client.care_level}</span>
                </Row>
              )}
              <Row label="司会 / 記録者">
                {meeting.chair || '—'}
                <span className="ml-4 text-xs text-ink-sub">記録者 {recorder?.name ?? '—'}</span>
              </Row>
              <Row label="開催目的">
                <p className="whitespace-pre-wrap leading-relaxed">{meeting.purpose || '—'}</p>
              </Row>
            </tbody>
          </table>

          <h3 className="mt-6 text-sm font-semibold">出席者</h3>
          <table className="mt-2 w-full border-collapse text-sm">
            <thead>
              <tr className="bg-line-soft">
                <th className="w-48 border border-line-hard px-2 py-1.5 text-left text-xs font-semibold">氏名</th>
                <th className="border border-line-hard px-2 py-1.5 text-left text-xs font-semibold">所属</th>
                <th className="w-52 border border-line-hard px-2 py-1.5 text-left text-xs font-semibold">職種・立場</th>
              </tr>
            </thead>
            <tbody>
              {attendees.length === 0 ? (
                <tr>
                  <td colSpan={3} className="border border-line-hard px-2 py-5 text-center text-xs text-ink-sub">
                    出席者が登録されていません。
                  </td>
                </tr>
              ) : (
                attendees.map((a) => (
                  <tr key={a.id}>
                    <td className="border border-line-hard px-2 py-1.5">{a.name}</td>
                    <td className="border border-line-hard px-2 py-1.5 text-xs">{a.org || '—'}</td>
                    <td className="border border-line-hard px-2 py-1.5 text-xs">{a.role || '—'}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>

          <Section title="検討内容" body={meeting.discussion} />
          <Section title="結論" body={meeting.conclusion} />
          <Section title="残された課題・次回までの宿題" body={meeting.todo} />

          {meeting.next_date && (
            <p className="mt-5 text-sm">
              次回開催予定：<span className="tnum">{longDate(meeting.next_date)}</span>
            </p>
          )}
        </article>
      </Content>
    </>
  )
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <tr>
      <th className="w-32 border border-line-hard bg-line-soft px-2 py-1.5 text-left align-top text-xs font-semibold">
        {label}
      </th>
      <td className="border border-line-hard px-2 py-1.5 align-top">{children}</td>
    </tr>
  )
}

function Section({ title, body }: { title: string; body: string }) {
  return (
    <section className="mt-6">
      <h3 className="text-sm font-semibold">{title}</h3>
      <div className="mt-1.5 min-h-[3rem] whitespace-pre-wrap rounded border border-line-hard px-3 py-2.5 text-sm leading-relaxed">
        {body || '—'}
      </div>
    </section>
  )
}
