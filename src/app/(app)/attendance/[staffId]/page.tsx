import { notFound } from 'next/navigation'
import { db } from '@/lib/db'
import { staffById } from '@/lib/queries'
import { formatMonth, monthDates, monthRange, thisMonth, weekdayOf } from '@/lib/date'
import { hours, summarize } from '@/lib/attendance'
import { Breadcrumb, Content, Panel, PageHeader } from '@/components/ui'
import { MonthNav } from '@/components/period-nav'
import { AttendanceSheet, type SheetRow } from './sheet'
import type { Attendance } from '@/lib/types'

export const dynamic = 'force-dynamic'

export default async function StaffAttendancePage({
  params,
  searchParams,
}: {
  params: Promise<{ staffId: string }>
  searchParams: Promise<{ month?: string; saved?: string }>
}) {
  const { staffId } = await params
  const sp = await searchParams
  const staff = staffById(Number(staffId))
  if (!staff) notFound()

  const month = sp.month && /^\d{4}-\d{2}$/.test(sp.month) ? sp.month : thisMonth()
  const { from, to } = monthRange(month)

  const saved = db()
    .prepare('SELECT * FROM attendances WHERE staff_id = ? AND date BETWEEN ? AND ?')
    .all(staff.id, from, to) as Attendance[]
  const byDate = new Map(saved.map((a) => [a.date, a]))

  const rows: SheetRow[] = monthDates(month).map((date) => {
    const a = byDate.get(date)
    return {
      date,
      weekday: weekdayOf(date),
      kind: a?.kind ?? '',
      clock_in: a?.clock_in ?? '',
      clock_out: a?.clock_out ?? '',
      break_minutes: a?.break_minutes ?? 0,
      note: a?.note ?? '',
    }
  })

  const sum = summarize(saved)
  const wage = staff.hourly_wage

  return (
    <>
      <PageHeader
        title={`${staff.name} さんの勤怠`}
        sub={`${staff.role}　${staff.employment}${wage ? `　時給 ${wage.toLocaleString()}円` : ''}`}
        actions={<MonthNav month={month} />}
      />

      <Content className="space-y-3">
        <Breadcrumb
          items={[{ label: '勤怠管理', href: `/attendance?month=${month}` }, { label: staff.name }]}
        />

        {sp.saved && (
          <p className="notice border-ok/20 bg-ok-soft text-sm text-ok">
            {formatMonth(month)}の勤怠を保存しました。
          </p>
        )}

        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          <div className="panel px-4 py-3">
            <div className="text-xs text-ink-sub">出勤日数</div>
            <div className="tnum mt-1 text-2xl font-semibold leading-none">{sum.workDays}</div>
          </div>
          <div className="panel px-4 py-3">
            <div className="text-xs text-ink-sub">実働時間</div>
            <div className="tnum mt-1 text-2xl font-semibold leading-none">{hours(sum.minutes)}</div>
          </div>
          <div className="panel px-4 py-3">
            <div className="text-xs text-ink-sub">有給 / 欠勤</div>
            <div className="tnum mt-1 text-2xl font-semibold leading-none">
              {sum.paidLeave} / {sum.absence}
            </div>
          </div>
          <div className="panel px-4 py-3">
            <div className="text-xs text-ink-sub">実働時間×時給の目安</div>
            <div className="tnum mt-1 text-2xl font-semibold leading-none">
              {wage ? `${Math.round((sum.minutes / 60) * wage).toLocaleString()}` : '—'}
              <span className="ml-1 text-xs font-normal text-ink-sub">円</span>
            </div>
          </div>
        </div>

        <Panel title={`${formatMonth(month)}の勤怠入力`} flush>
          <AttendanceSheet
            staffId={staff.id}
            month={month}
            rows={rows}
            defaultIn={staff.employment === '常勤' ? '08:45' : '09:00'}
            defaultOut={staff.employment === '常勤' ? '17:45' : '16:30'}
            defaultBreak={staff.employment === '常勤' ? 60 : 30}
          />
        </Panel>

        <p className="text-2xs leading-5 text-ink-mute">
          「実働時間×時給の目安」は概算です。手当・交通費・割増賃金は含みません。給与計算の前確認としてお使いください。
        </p>
      </Content>
    </>
  )
}
