import { currentStaff } from '@/lib/auth'
import { thisMonth } from '@/lib/date'
import { invoicesFor, isMonthClosed } from '@/lib/billing'

export const dynamic = 'force-dynamic'

const HEADERS = [
  '対象月', '利用者番号', '利用者名', '保険種別', '被保険者番号', '要介護度', '担当ケアマネ',
  '負担割合', '実施回数', '単位数', '単価', '費用総額', '保険請求額', '利用者負担額', '締め',
]

export async function GET(request: Request) {
  const staff = await currentStaff()
  if (!staff) return new Response('ログインが必要です。', { status: 401 })

  const param = new URL(request.url).searchParams.get('month') ?? ''
  const month = /^\d{4}-\d{2}$/.test(param) ? param : thisMonth()
  const closed = isMonthClosed(month) ? '締め済' : '締め前'

  const body = [
    HEADERS,
    ...invoicesFor(month).map((r) => [
      month, r.client_code, r.client_name, r.insurance_type, r.insured_number, r.care_level,
      r.care_manager, `${r.burden_ratio}割`, r.visits, r.units, r.unit_price, r.total_yen,
      r.insurance_yen, r.copay_yen, closed,
    ]),
  ]
    .map((cols) => cols.map(csvCell).join(','))
    .join('\r\n')

  // Excel で文字化けしないよう BOM を付ける
  return new Response(`﻿${body}`, {
    headers: {
      'content-type': 'text/csv; charset=utf-8',
      'content-disposition': `attachment; filename="seikyu-${month}.csv"`,
    },
  })
}

function csvCell(value: string | number): string {
  const s = String(value).replace(/\r?\n/g, ' ')
  return /[",]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s
}
