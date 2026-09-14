import { currentStaff } from '@/lib/auth'
import { db } from '@/lib/db'
import { monthRange, thisMonth } from '@/lib/date'

export const dynamic = 'force-dynamic'

type Row = {
  date: string
  client_code: string
  client_name: string
  insurance_type: string
  care_level: string
  care_manager: string
  staff_name: string | null
  service_name: string | null
  unit: number | null
  minutes: number | null
  plan_start: string
  plan_end: string
  actual_start: string
  actual_end: string
  status: string
  cancel_reason: string
  note: string | null
}

const HEADERS = [
  '日付', '利用者番号', '利用者名', '保険種別', '要介護度', '担当ケアマネ', '担当職員',
  'サービス種別', '単位数', '標準時間(分)', '予定開始', '予定終了', '実績開始', '実績終了',
  '状態', 'キャンセル理由', '特記事項',
]

export async function GET(request: Request) {
  const staff = await currentStaff()
  if (!staff) return new Response('ログインが必要です。', { status: 401 })

  const param = new URL(request.url).searchParams.get('month') ?? ''
  const month = /^\d{4}-\d{2}$/.test(param) ? param : thisMonth()
  const { from, to } = monthRange(month)

  const rows = db()
    .prepare(
      `SELECT v.date, c.code AS client_code, c.name AS client_name, c.insurance_type,
              c.care_level, c.care_manager, s.name AS staff_name,
              sc.name AS service_name, sc.unit, sc.minutes,
              v.plan_start, v.plan_end, v.actual_start, v.actual_end, v.status, v.cancel_reason,
              r.note
       FROM visits v
       JOIN clients c ON c.id = v.client_id
       LEFT JOIN staff s ON s.id = v.staff_id
       LEFT JOIN service_codes sc ON sc.id = v.service_code_id
       LEFT JOIN visit_records r ON r.visit_id = v.id
       WHERE v.date BETWEEN ? AND ?
       ORDER BY c.name_kana, v.date, v.plan_start`,
    )
    .all(from, to) as Row[]

  const body = [
    HEADERS,
    ...rows.map((r) => [
      r.date, r.client_code, r.client_name, r.insurance_type, r.care_level, r.care_manager,
      r.staff_name ?? '', r.service_name ?? '', r.unit ?? '', r.minutes ?? '',
      r.plan_start, r.plan_end, r.actual_start, r.actual_end, r.status, r.cancel_reason,
      r.note ?? '',
    ]),
  ]
    .map((cols) => cols.map(csvCell).join(','))
    .join('\r\n')

  // Excel で文字化けしないよう BOM を付ける
  return new Response(`﻿${body}`, {
    headers: {
      'content-type': 'text/csv; charset=utf-8',
      'content-disposition': `attachment; filename="jisseki-${month}.csv"`,
    },
  })
}

function csvCell(value: string | number): string {
  const s = String(value).replace(/\r?\n/g, ' ')
  return /[",]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s
}
