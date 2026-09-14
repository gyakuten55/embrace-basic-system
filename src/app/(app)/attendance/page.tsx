import Link from 'next/link'
import { db } from '@/lib/db'
import { currentStaff } from '@/lib/auth'
import { formatMonth, isoToDate, monthDates, monthRange, thisMonth, today, WEEKDAY_JP } from '@/lib/date'
import { hours, summarize, workedMinutes } from '@/lib/attendance'
import { activeStaff } from '@/lib/queries'
import { punch } from '@/app/actions/attendance'
import { Content, Panel, PageHeader } from '@/components/ui'
import { MonthNav } from '@/components/period-nav'
import type { Attendance } from '@/lib/types'

export const dynamic = 'force-dynamic'

const KIND_MARK: Record<string, string> = {
  出勤: '出',
  直行直帰: '直',
  有給: '有',
  欠勤: '欠',
  休日: '休',
}

const KIND_TONE: Record<string, string> = {
  出勤: 'text-ink',
  直行直帰: 'text-accent',
  有給: 'text-ok',
  欠勤: 'text-ng',
  休日: 'text-ink-mute',
}

export default async function AttendancePage({
  searchParams,
}: {
  searchParams: Promise<{ month?: string }>
}) {
  const sp = await searchParams
  const month = sp.month && /^\d{4}-\d{2}$/.test(sp.month) ? sp.month : thisMonth()
  const { from, to } = monthRange(month)
  const days = monthDates(month)
  const staffList = activeStaff()
  const me = await currentStaff()

  const rows = db()
    .prepare('SELECT * FROM attendances WHERE date BETWEEN ? AND ? ORDER BY date')
    .all(from, to) as Attendance[]

  const byStaff = new Map<number, Attendance[]>()
  for (const r of rows) byStaff.set(r.staff_id, [...(byStaff.get(r.staff_id) ?? []), r])

  const myToday = me
    ? (db()
        .prepare('SELECT * FROM attendances WHERE staff_id = ? AND date = ?')
        .get(me.id, today()) as Attendance | undefined)
    : undefined

  return (
    <>
      <PageHeader
        title="勤怠管理"
        sub="職員ごとの出退勤を月単位で管理します。氏名をクリックすると1か月分をまとめて入力できます。"
        actions={
          <a href={`/api/attendance/csv?month=${month}`} className="btn btn-default">
            CSVで書き出す
          </a>
        }
      />

      <Content className="space-y-3">
        {me && (
          <Panel flush>
            <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-3">
              <div className="text-sm">
                <span className="font-medium">{me.name}</span>
                <span className="ml-2 text-xs text-ink-sub">本日の打刻</span>
                <span className="tnum ml-3">
                  出勤 {myToday?.clock_in || '—'}　退勤 {myToday?.clock_out || '—'}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <form action={punch}>
                  <input type="hidden" name="punch" value="in" />
                  <button type="submit" className="btn btn-default">
                    出勤を打刻
                  </button>
                </form>
                <form action={punch}>
                  <input type="hidden" name="punch" value="out" />
                  <button type="submit" className="btn btn-primary">
                    退勤を打刻
                  </button>
                </form>
              </div>
            </div>
          </Panel>
        )}

        <div className="flex flex-wrap items-center justify-between gap-3">
          <MonthNav month={month} />
          <p className="text-xs text-ink-sub">
            出＝出勤　直＝直行直帰　有＝有給　欠＝欠勤　休＝休日
          </p>
        </div>

        <div className="panel overflow-x-auto">
          <table className="table w-full min-w-[78rem]">
            <thead>
              <tr>
                <th className="sticky left-0 z-10 w-32 whitespace-nowrap border-r border-line bg-line-soft">
                  職員
                </th>
                {days.map((d) => {
                  const wd = isoToDate(d).getDay()
                  return (
                    <th
                      key={d}
                      className={`w-7 px-0 text-center ${
                        d === today()
                          ? 'bg-accent text-white'
                          : wd === 0
                            ? 'text-ng'
                            : wd === 6
                              ? 'text-accent'
                              : ''
                      }`}
                    >
                      <div className="tnum">{Number(d.slice(8))}</div>
                      <div className="text-[10px] font-normal">{WEEKDAY_JP[wd]}</div>
                    </th>
                  )
                })}
                <th className="sticky right-0 z-10 w-28 whitespace-nowrap border-l border-line bg-line-soft text-right">
                  出勤 / 実働
                </th>
              </tr>
            </thead>
            <tbody>
              {staffList.map((s) => {
                const mine = byStaff.get(s.id) ?? []
                const byDate = new Map(mine.map((a) => [a.date, a]))
                const sum = summarize(mine)
                return (
                  <tr key={s.id}>
                    <td className="sticky left-0 z-10 whitespace-nowrap border-r border-line bg-white">
                      <Link href={`/attendance/${s.id}?month=${month}`} className="link text-sm font-medium">
                        {s.name}
                      </Link>
                      <div className="text-2xs text-ink-mute">{s.employment}</div>
                    </td>
                    {days.map((d) => {
                      const a = byDate.get(d)
                      return (
                        <td
                          key={d}
                          className={`px-0 text-center text-2xs ${d === today() ? 'bg-accent-soft' : ''}`}
                          title={
                            a ? `${d} ${a.kind} ${a.clock_in}–${a.clock_out}` : `${d} 未入力`
                          }
                        >
                          {a ? (
                            <span className={KIND_TONE[a.kind] ?? ''}>{KIND_MARK[a.kind] ?? '・'}</span>
                          ) : (
                            <span className="text-line-hard">・</span>
                          )}
                        </td>
                      )
                    })}
                    <td className="tnum sticky right-0 z-10 whitespace-nowrap border-l border-line bg-white text-right text-sm">
                      <span className="text-ink-sub">{sum.workDays}日</span>
                      <span className="ml-2 font-medium">{hours(sum.minutes)}h</span>
                    </td>
                  </tr>
                )
              })}
            </tbody>
            <tfoot>
              <tr className="border-t-2 border-line-hard bg-line-soft/60 font-medium">
                <td className="sticky left-0 z-10 whitespace-nowrap border-r border-line bg-line-soft px-3 py-2 text-xs">
                  合計
                </td>
                <td colSpan={days.length}></td>
                <td className="tnum sticky right-0 z-10 whitespace-nowrap border-l border-line bg-line-soft px-3 py-2 text-right text-sm">
                  <span className="text-ink-sub">
                    {staffList.reduce((n, s) => n + summarize(byStaff.get(s.id) ?? []).workDays, 0)}日
                  </span>
                  <span className="ml-2 font-medium">
                    {hours(rows.reduce((n, r) => n + workedMinutes(r), 0))}h
                  </span>
                </td>
              </tr>
            </tfoot>
          </table>
        </div>

        <p className="text-2xs text-ink-mute">
          {formatMonth(month)}の実働時間は、出退勤の差から休憩時間を引いて計算しています。
          有給・欠勤・休日は実働0時間として扱います。
        </p>
      </Content>
    </>
  )
}
