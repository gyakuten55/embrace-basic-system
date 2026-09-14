import { durationMinutes } from './date'
import type { Attendance } from './types'

/** 1日の実働時間（分）。休憩を差し引く。日をまたぐ勤務は翌日扱いで加算する。 */
export function workedMinutes(a: Pick<Attendance, 'kind' | 'clock_in' | 'clock_out' | 'break_minutes'>): number {
  if (a.kind === '有給' || a.kind === '欠勤' || a.kind === '休日') return 0
  const span = durationMinutes(a.clock_in, a.clock_out)
  if (span === null) {
    // 退勤が翌日になるケース（夜勤・遅番）
    const [sh, sm] = a.clock_in.split(':').map(Number)
    const [eh, em] = a.clock_out.split(':').map(Number)
    if ([sh, sm, eh, em].some((n) => !Number.isFinite(n))) return 0
    const overnight = eh * 60 + em + 24 * 60 - (sh * 60 + sm)
    return Math.max(0, overnight - a.break_minutes)
  }
  return Math.max(0, span - a.break_minutes)
}

export type MonthSummary = {
  workDays: number
  paidLeave: number
  absence: number
  minutes: number
}

export function summarize(rows: Attendance[]): MonthSummary {
  return rows.reduce<MonthSummary>(
    (acc, row) => {
      const minutes = workedMinutes(row)
      return {
        workDays: acc.workDays + (minutes > 0 ? 1 : 0),
        paidLeave: acc.paidLeave + (row.kind === '有給' ? 1 : 0),
        absence: acc.absence + (row.kind === '欠勤' ? 1 : 0),
        minutes: acc.minutes + minutes,
      }
    },
    { workDays: 0, paidLeave: 0, absence: 0, minutes: 0 },
  )
}

export function hours(minutes: number): string {
  return (minutes / 60).toFixed(1)
}
