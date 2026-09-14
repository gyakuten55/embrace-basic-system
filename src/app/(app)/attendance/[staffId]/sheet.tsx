'use client'

import { useState } from 'react'
import Link from 'next/link'
import { saveMonthlyAttendance } from '@/app/actions/attendance'
import { FormActions } from '@/components/ui'
import { ATTENDANCE_KINDS } from '@/lib/types'
import { WEEKDAY_JP } from '@/lib/date'

export type SheetRow = {
  date: string
  weekday: number
  kind: string
  clock_in: string
  clock_out: string
  break_minutes: number
  note: string
}

function worked(row: SheetRow): number {
  if (row.kind === '有給' || row.kind === '欠勤' || row.kind === '休日') return 0
  const [sh, sm] = row.clock_in.split(':').map(Number)
  const [eh, em] = row.clock_out.split(':').map(Number)
  if ([sh, sm, eh, em].some((n) => !Number.isFinite(n))) return 0
  let span = eh * 60 + em - (sh * 60 + sm)
  if (span < 0) span += 24 * 60
  return Math.max(0, span - (row.break_minutes || 0))
}

export function AttendanceSheet({
  staffId,
  month,
  rows: initial,
  defaultIn,
  defaultOut,
  defaultBreak,
}: {
  staffId: number
  month: string
  rows: SheetRow[]
  defaultIn: string
  defaultOut: string
  defaultBreak: number
}) {
  const [rows, setRows] = useState<SheetRow[]>(initial)

  const update = (date: string, field: keyof SheetRow, value: string | number) =>
    setRows((rs) => rs.map((r) => (r.date === date ? { ...r, [field]: value } : r)))

  const fillWeekdays = () =>
    setRows((rs) =>
      rs.map((r) =>
        r.weekday === 0 || r.kind
          ? r
          : { ...r, kind: '出勤', clock_in: defaultIn, clock_out: defaultOut, break_minutes: defaultBreak },
      ),
    )

  const clearAll = () =>
    setRows((rs) => rs.map((r) => ({ ...r, kind: '', clock_in: '', clock_out: '', break_minutes: 0, note: '' })))

  const totalMinutes = rows.reduce((n, r) => n + worked(r), 0)
  const workDays = rows.filter((r) => worked(r) > 0).length
  const paid = rows.filter((r) => r.kind === '有給').length

  return (
    <form action={saveMonthlyAttendance}>
      <input type="hidden" name="staff_id" value={staffId} />
      <input type="hidden" name="month" value={month} />

      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-line px-4 py-2.5">
        <div className="flex flex-wrap items-center gap-2">
          <button type="button" className="btn btn-default btn-sm" onClick={fillWeekdays}>
            未入力の平日を既定の勤務で埋める
          </button>
          <button type="button" className="btn btn-quiet btn-sm" onClick={clearAll}>
            すべてクリア
          </button>
        </div>
        <div className="tnum text-xs text-ink-sub">
          出勤 {workDays} 日　有給 {paid} 日　実働 {(totalMinutes / 60).toFixed(1)} 時間
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="table min-w-[48rem]">
          <thead>
            <tr>
              <th className="w-24">日付</th>
              <th className="w-32">区分</th>
              <th className="w-28">出勤</th>
              <th className="w-28">退勤</th>
              <th className="w-24">休憩(分)</th>
              <th className="w-20 text-right">実働</th>
              <th>備考</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => {
              const minutes = worked(row)
              const weekend = row.weekday === 0 || row.weekday === 6
              return (
                <tr key={row.date} className={weekend ? 'bg-line-soft/40' : ''}>
                  <td
                    className={`tnum whitespace-nowrap text-sm ${
                      row.weekday === 0 ? 'text-ng' : row.weekday === 6 ? 'text-accent' : ''
                    }`}
                  >
                    <input type="hidden" name="row_date" value={row.date} />
                    {Number(row.date.slice(8))}日
                    <span className="ml-1 text-2xs">({WEEKDAY_JP[row.weekday]})</span>
                  </td>
                  <td>
                    <select
                      name="row_kind"
                      value={row.kind}
                      onChange={(e) => update(row.date, 'kind', e.target.value)}
                      className="field py-1 text-sm"
                      aria-label={`${row.date}の区分`}
                    >
                      <option value="">未入力</option>
                      {ATTENDANCE_KINDS.map((k) => (
                        <option key={k} value={k}>
                          {k}
                        </option>
                      ))}
                    </select>
                  </td>
                  <td>
                    <input
                      type="time"
                      name="row_in"
                      value={row.clock_in}
                      onChange={(e) => update(row.date, 'clock_in', e.target.value)}
                      className="field tnum py-1 text-sm"
                      aria-label={`${row.date}の出勤時刻`}
                    />
                  </td>
                  <td>
                    <input
                      type="time"
                      name="row_out"
                      value={row.clock_out}
                      onChange={(e) => update(row.date, 'clock_out', e.target.value)}
                      className="field tnum py-1 text-sm"
                      aria-label={`${row.date}の退勤時刻`}
                    />
                  </td>
                  <td>
                    <input
                      type="number"
                      name="row_break"
                      min={0}
                      step={5}
                      value={row.break_minutes}
                      onChange={(e) => update(row.date, 'break_minutes', Number(e.target.value))}
                      className="field tnum py-1 text-sm"
                      aria-label={`${row.date}の休憩時間`}
                    />
                  </td>
                  <td className="tnum text-right text-sm text-ink-sub">
                    {minutes > 0 ? `${(minutes / 60).toFixed(1)}h` : '—'}
                  </td>
                  <td>
                    <input
                      name="row_note"
                      value={row.note}
                      onChange={(e) => update(row.date, 'note', e.target.value)}
                      className="field py-1 text-sm"
                      aria-label={`${row.date}の備考`}
                    />
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      <FormActions>
        <Link href={`/attendance?month=${month}`} className="btn btn-default">
          一覧へ戻る
        </Link>
        <button type="submit" className="btn btn-primary px-6">
          この月の勤怠を保存
        </button>
      </FormActions>
    </form>
  )
}
