import Link from 'next/link'
import { currentStaff } from '@/lib/auth'
import { db } from '@/lib/db'
import { addDays, longDate, monthRange, thisMonth, today } from '@/lib/date'
import { unrecordedVisits, upcomingAlerts, visitsBetween } from '@/lib/queries'
import { Content, Empty, Metric, Panel, PageHeader, StatusBadge } from '@/components/ui'
import { Icon } from '@/components/icons'

export const dynamic = 'force-dynamic'

export default async function DashboardPage() {
  const staff = await currentStaff()
  const nowIso = today()
  const month = thisMonth()
  const { from, to } = monthRange(month)

  const todaysVisits = visitsBetween(nowIso, nowIso)
  const unrecorded = unrecordedVisits(addDays(nowIso, -60), nowIso)
  const alerts = upcomingAlerts(nowIso, addDays(nowIso, 60))

  const monthly = db()
    .prepare(
      `SELECT status, COUNT(*) AS n FROM visits WHERE date BETWEEN ? AND ? GROUP BY status`,
    )
    .all(from, to) as { status: string; n: number }[]
  const done = monthly.find((m) => m.status === '実施済')?.n ?? 0
  const cancelled = monthly.find((m) => m.status === 'キャンセル')?.n ?? 0

  const meetings = db()
    .prepare(
      `SELECT m.id, m.kind, m.held_on, m.place, c.name AS client_name
       FROM meetings m LEFT JOIN clients c ON c.id = m.client_id
       ORDER BY m.held_on DESC LIMIT 5`,
    )
    .all() as { id: number; kind: string; held_on: string; place: string; client_name: string | null }[]

  const myToday = todaysVisits.filter((v) => v.staff_id === staff?.id)

  return (
    <>
      <PageHeader
        title={`${staff?.name} さん、おつかれさまです`}
        sub={`${longDate(nowIso)}　本日の訪問 ${todaysVisits.length} 件${
          myToday.length ? `（うち自分の担当 ${myToday.length} 件）` : ''
        }`}
      />

      <Content className="space-y-5">
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          <Metric label="本日の訪問" value={todaysVisits.length} unit="件" href="/schedule" />
          <Metric
            label="記録の未入力"
            value={unrecorded.length}
            unit="件"
            tone={unrecorded.length > 0 ? 'warn' : 'ok'}
            href="/records"
          />
          <Metric label="今月の実施" value={done} unit="件" href="/results" />
          <Metric
            label="今月のキャンセル"
            value={cancelled}
            unit="件"
            tone={cancelled > 0 ? 'warn' : 'plain'}
            href="/results"
          />
        </div>

        <div className="grid grid-cols-1 gap-5 xl:grid-cols-[minmax(0,1.65fr)_minmax(0,1fr)]">
          <Panel
            title="本日の訪問予定"
            flush
            actions={
              <Link href="/schedule" className="btn btn-default btn-sm">
                スケジュール
              </Link>
            }
          >
            {todaysVisits.length === 0 ? (
              <Empty message="本日の訪問予定はありません。" />
            ) : (
              <div className="overflow-x-auto">
                <table className="table">
                  <thead>
                    <tr>
                      <th className="w-28">時間</th>
                      <th>利用者</th>
                      <th className="w-28">担当</th>
                      <th>サービス</th>
                      <th className="w-20">状態</th>
                      <th className="w-24 text-right">記録</th>
                    </tr>
                  </thead>
                  <tbody>
                    {todaysVisits.map((v) => (
                      <tr key={v.id}>
                        <td className="tnum whitespace-nowrap text-ink-sub">
                          {v.plan_start}–{v.plan_end}
                        </td>
                        <td>
                          <Link href={`/clients/${v.client_id}`} className="link font-medium">
                            {v.client_name}
                          </Link>
                        </td>
                        <td className="text-ink-sub">{v.staff_name ?? '未割当'}</td>
                        <td className="text-xs text-ink-sub">{v.service_name ?? '—'}</td>
                        <td>
                          <StatusBadge value={v.status} />
                        </td>
                        <td className="text-right">
                          <Link
                            href={`/records/${v.id}`}
                            className={`btn btn-sm ${v.record_id ? 'btn-default' : 'btn-primary'}`}
                          >
                            {v.record_id ? '記録を見る' : '記録する'}
                          </Link>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </Panel>

          <div className="space-y-5">
            <Panel title="要対応" flush>
              {alerts.length === 0 ? (
                <Empty message="期限の近い事項はありません。" />
              ) : (
                <ul className="divide-y divide-line-soft">
                  {alerts.slice(0, 8).map((a, i) => (
                    <li key={i} className="flex items-start gap-2.5 px-4 py-2.5">
                      <Icon.warn
                        className={`mt-0.5 h-3.5 w-3.5 shrink-0 ${a.overdue ? 'text-ng' : 'text-warn'}`}
                      />
                      <div className="min-w-0 flex-1">
                        <Link href={`/clients/${a.clientId}`} className="link text-sm font-medium">
                          {a.clientName}
                        </Link>
                        <p className="text-xs text-ink-sub">
                          {a.detail}
                          {a.dueDate && `　期限 ${a.dueDate}`}
                        </p>
                      </div>
                      <span className={`badge ${a.overdue ? 'badge-ng' : 'badge-warn'}`}>
                        {a.overdue ? '要対応' : '間近'}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
              {alerts.length > 8 && (
                <div className="border-t border-line px-4 py-2 text-xs text-ink-sub">
                  ほか {alerts.length - 8} 件
                </div>
              )}
            </Panel>

            <Panel
              title="最近の会議記録"
              flush
              actions={
                <Link href="/meetings" className="btn btn-default btn-sm">
                  一覧
                </Link>
              }
            >
              {meetings.length === 0 ? (
                <Empty message="会議記録はまだありません。" />
              ) : (
                <ul className="divide-y divide-line-soft">
                  {meetings.map((m) => (
                    <li key={m.id} className="px-4 py-2.5">
                      <Link href={`/meetings/${m.id}`} className="link text-sm font-medium">
                        {m.kind}
                        {m.client_name && `（${m.client_name}）`}
                      </Link>
                      <p className="tnum text-xs text-ink-sub">
                        {m.held_on}　{m.place}
                      </p>
                    </li>
                  ))}
                </ul>
              )}
            </Panel>
          </div>
        </div>
      </Content>
    </>
  )
}
