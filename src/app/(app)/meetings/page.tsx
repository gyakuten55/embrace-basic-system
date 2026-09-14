import Link from 'next/link'
import { db } from '@/lib/db'
import { Content, Empty, Panel, PageHeader } from '@/components/ui'
import { Icon } from '@/components/icons'
import { MEETING_KINDS } from '@/lib/types'

export const dynamic = 'force-dynamic'

type Row = {
  id: number
  kind: string
  held_on: string
  start_time: string
  end_time: string
  place: string
  client_id: number | null
  client_name: string | null
  conclusion: string
  recorder_name: string | null
  attendees: number
}

export default async function MeetingsPage({
  searchParams,
}: {
  searchParams: Promise<{ kind?: string }>
}) {
  const sp = await searchParams
  const kind = sp.kind ?? 'all'

  const rows = db()
    .prepare(
      `SELECT m.id, m.kind, m.held_on, m.start_time, m.end_time, m.place, m.client_id,
              c.name AS client_name, m.conclusion, s.name AS recorder_name,
              (SELECT COUNT(*) FROM meeting_attendees a WHERE a.meeting_id = m.id) AS attendees
       FROM meetings m
       LEFT JOIN clients c ON c.id = m.client_id
       LEFT JOIN staff s ON s.id = m.recorder_id
       ${kind === 'all' ? '' : 'WHERE m.kind = ?'}
       ORDER BY m.held_on DESC, m.start_time DESC`,
    )
    .all(...(kind === 'all' ? [] : [kind])) as Row[]

  return (
    <>
      <PageHeader
        title="会議記録"
        sub="サービス担当者会議・事業所内会議・研修の記録を残します。"
        actions={
          <Link href="/meetings/new" className="btn btn-primary">
            <Icon.plus className="h-3.5 w-3.5" />
            会議記録を作成
          </Link>
        }
      />

      <Content className="space-y-3">
        <div className="tabs border-0">
          <Link href="/meetings" className={`tab ${kind === 'all' ? 'tab-on' : ''}`}>
            すべて
          </Link>
          {MEETING_KINDS.map((k) => (
            <Link key={k} href={`/meetings?kind=${encodeURIComponent(k)}`} className={`tab ${kind === k ? 'tab-on' : ''}`}>
              {k}
            </Link>
          ))}
        </div>

        <Panel flush>
          {rows.length === 0 ? (
            <Empty
              message="会議記録がありません。"
              action={
                <Link href="/meetings/new" className="btn btn-primary btn-sm">
                  会議記録を作成
                </Link>
              }
            />
          ) : (
            <div className="overflow-x-auto">
              <table className="table">
                <thead>
                  <tr>
                    <th className="w-28">開催日</th>
                    <th className="w-24">時間</th>
                    <th className="w-44">種別</th>
                    <th className="w-32">対象利用者</th>
                    <th className="w-36">場所</th>
                    <th className="w-16 text-right">出席</th>
                    <th>結論</th>
                    <th className="w-24">記録者</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((m) => (
                    <tr key={m.id}>
                      <td className="tnum whitespace-nowrap text-xs">
                        <Link href={`/meetings/${m.id}`} className="link font-medium">
                          {m.held_on}
                        </Link>
                      </td>
                      <td className="tnum whitespace-nowrap text-xs text-ink-sub">
                        {m.start_time && m.end_time ? `${m.start_time}–${m.end_time}` : '—'}
                      </td>
                      <td className="text-xs">{m.kind}</td>
                      <td className="text-xs">
                        {m.client_id ? (
                          <Link href={`/clients/${m.client_id}`} className="link">
                            {m.client_name}
                          </Link>
                        ) : (
                          <span className="text-ink-mute">—</span>
                        )}
                      </td>
                      <td className="text-xs text-ink-sub">{m.place || '—'}</td>
                      <td className="tnum text-right text-xs text-ink-sub">{m.attendees}名</td>
                      <td className="line-clamp-2 text-xs leading-relaxed text-ink-sub">{m.conclusion || '—'}</td>
                      <td className="text-xs text-ink-sub">{m.recorder_name ?? '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Panel>
      </Content>
    </>
  )
}
