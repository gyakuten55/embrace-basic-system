import { currentStaff } from '@/lib/auth'
import { db } from '@/lib/db'
import { monthRange, thisMonth, WEEKDAY_JP, weekdayOf } from '@/lib/date'
import { workedMinutes } from '@/lib/attendance'

export const dynamic = 'force-dynamic'

type Row = {
  staff_code: string
  staff_name: string
  employment: string
  hourly_wage: number
  date: string
  kind: string
  clock_in: string
  clock_out: string
  break_minutes: number
  note: string
}

const HEADERS = [
  '職員コード', '職員名', '雇用形態', '日付', '曜日', '区分', '出勤', '退勤',
  '休憩(分)', '実働(分)', '実働(時間)', '備考',
]

export async function GET(request: Request) {
  const staff = await currentStaff()
  if (!staff) return new Response('ログインが必要です。', { status: 401 })

  const param = new URL(request.url).searchParams.get('month') ?? ''
  const month = /^\d{4}-\d{2}$/.test(param) ? param : thisMonth()
  const { from, to } = monthRange(month)

  const rows = db()
    .prepare(
      `SELECT s.code AS staff_code, s.name AS staff_name, s.employment, s.hourly_wage,
              a.date, a.kind, a.clock_in, a.clock_out, a.break_minutes, a.note
       FROM attendances a JOIN staff s ON s.id = a.staff_id
       WHERE a.date BETWEEN ? AND ?
       ORDER BY s.code, a.date`,
    )
    .all(from, to) as Row[]

  const body = [
    HEADERS,
    ...rows.map((r) => {
      const minutes = workedMinutes(r)
      return [
        r.staff_code, r.staff_name, r.employment, r.date, WEEKDAY_JP[weekdayOf(r.date)],
        r.kind, r.clock_in, r.clock_out, r.break_minutes, minutes, (minutes / 60).toFixed(2), r.note,
      ]
    }),
  ]
    .map((cols) => cols.map(csvCell).join(','))
    .join('\r\n')

  return new Response(`﻿${body}`, {
    headers: {
      'content-type': 'text/csv; charset=utf-8',
      'content-disposition': `attachment; filename="kintai-${month}.csv"`,
    },
  })
}

function csvCell(value: string | number): string {
  const s = String(value).replace(/\r?\n/g, ' ')
  return /[",]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s
}
