import Link from 'next/link'
import { db } from '@/lib/db'
import { formatMonth, monthRange, thisMonth } from '@/lib/date'
import { Content, Panel, PageHeader, Empty } from '@/components/ui'
import { MonthNav } from '@/components/period-nav'

export const dynamic = 'force-dynamic'

type Row = {
  client_id: number
  client_name: string
  client_code: string
  care_level: string
  insurance_type: string
  care_manager: string
  planned: number
  done: number
  cancelled: number
  minutes: number
  units: number
  unrecorded: number
}

export default async function ResultsPage({
  searchParams,
}: {
  searchParams: Promise<{ month?: string }>
}) {
  const sp = await searchParams
  const month = sp.month && /^\d{4}-\d{2}$/.test(sp.month) ? sp.month : thisMonth()
  const { from, to } = monthRange(month)

  const rows = db()
    .prepare(
      `SELECT c.id AS client_id, c.name AS client_name, c.code AS client_code,
              c.care_level, c.insurance_type, c.care_manager,
              COUNT(*) AS planned,
              SUM(CASE WHEN v.status = '実施済' THEN 1 ELSE 0 END) AS done,
              SUM(CASE WHEN v.status = 'キャンセル' THEN 1 ELSE 0 END) AS cancelled,
              COALESCE(SUM(CASE WHEN v.status = '実施済' THEN sc.minutes ELSE 0 END), 0) AS minutes,
              COALESCE(SUM(CASE WHEN v.status = '実施済' THEN sc.unit ELSE 0 END), 0) AS units,
              SUM(CASE WHEN v.status = '実施済' AND r.id IS NULL THEN 1 ELSE 0 END) AS unrecorded
       FROM visits v
       JOIN clients c ON c.id = v.client_id
       LEFT JOIN service_codes sc ON sc.id = v.service_code_id
       LEFT JOIN visit_records r ON r.visit_id = v.id
       WHERE v.date BETWEEN ? AND ?
       GROUP BY c.id
       ORDER BY c.name_kana`,
    )
    .all(from, to) as Row[]

  const total = rows.reduce(
    (acc, r) => ({
      planned: acc.planned + r.planned,
      done: acc.done + r.done,
      cancelled: acc.cancelled + r.cancelled,
      minutes: acc.minutes + r.minutes,
      units: acc.units + r.units,
      unrecorded: acc.unrecorded + r.unrecorded,
    }),
    { planned: 0, done: 0, cancelled: 0, minutes: 0, units: 0, unrecorded: 0 },
  )

  return (
    <>
      <PageHeader
        title="実績・集計"
        sub="月ごとの提供実績です。ケアマネジャーへ返す実績表と、請求前の確認に使います。"
        actions={
          <a href={`/api/results/csv?month=${month}`} className="btn btn-default">
            CSVで書き出す
          </a>
        }
      />

      <Content className="space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <MonthNav month={month} />
          <div className="text-xs text-ink-sub">
            {formatMonth(month)}　実施 {total.done} 件 / キャンセル {total.cancelled} 件 / のべ{' '}
            {(total.minutes / 60).toFixed(1)} 時間 / {total.units.toLocaleString()} 単位
          </div>
        </div>

        {total.unrecorded > 0 && (
          <p className="notice border-warn/20 bg-warn-soft text-sm text-warn">
            実施済みなのに記録が未入力の訪問が {total.unrecorded} 件あります。請求前に記録を入力してください。
            <Link href="/records?view=unrecorded" className="ml-2 underline">
              未記録一覧を開く
            </Link>
          </p>
        )}

        <Panel flush>
          {rows.length === 0 ? (
            <Empty message={`${formatMonth(month)}の訪問はありません。`} />
          ) : (
            <div className="overflow-x-auto">
              <table className="table">
                <thead>
                  <tr>
                    <th className="w-44">利用者</th>
                    <th className="w-24">要介護度</th>
                    <th className="w-24">保険</th>
                    <th className="w-36">担当ケアマネ</th>
                    <th className="w-20 text-right">予定</th>
                    <th className="w-20 text-right">実施</th>
                    <th className="w-24 text-right">キャンセル</th>
                    <th className="w-24 text-right">提供時間</th>
                    <th className="w-24 text-right">単位数</th>
                    <th className="w-24">記録</th>
                    <th className="w-20 text-right"></th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((r) => (
                    <tr key={r.client_id}>
                      <td>
                        <Link href={`/results/${r.client_id}?month=${month}`} className="link font-medium">
                          {r.client_name}
                        </Link>
                        <div className="tnum text-2xs text-ink-mute">{r.client_code}</div>
                      </td>
                      <td className="text-xs text-ink-sub">{r.care_level || '—'}</td>
                      <td className="text-xs text-ink-sub">{r.insurance_type}</td>
                      <td className="text-xs text-ink-sub">{r.care_manager || '—'}</td>
                      <td className="tnum text-right">{r.planned}</td>
                      <td className="tnum text-right font-medium">{r.done}</td>
                      <td className="tnum text-right">
                        {r.cancelled > 0 ? <span className="text-ng">{r.cancelled}</span> : '—'}
                      </td>
                      <td className="tnum text-right text-ink-sub">{(r.minutes / 60).toFixed(1)}h</td>
                      <td className="tnum text-right">{r.units.toLocaleString()}</td>
                      <td>
                        {r.unrecorded > 0 ? (
                          <span className="badge badge-warn">未記録 {r.unrecorded}</span>
                        ) : (
                          <span className="badge badge-ok">完了</span>
                        )}
                      </td>
                      <td className="text-right">
                        <Link href={`/results/${r.client_id}?month=${month}`} className="btn btn-default btn-sm">
                          実績表
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="border-t-2 border-line-hard bg-line-soft/60 font-medium">
                    <td colSpan={4} className="px-3 py-2 text-xs">
                      合計（{rows.length} 名）
                    </td>
                    <td className="tnum px-3 py-2 text-right">{total.planned}</td>
                    <td className="tnum px-3 py-2 text-right">{total.done}</td>
                    <td className="tnum px-3 py-2 text-right">{total.cancelled}</td>
                    <td className="tnum px-3 py-2 text-right">{(total.minutes / 60).toFixed(1)}h</td>
                    <td className="tnum px-3 py-2 text-right">{total.units.toLocaleString()}</td>
                    <td colSpan={2}></td>
                  </tr>
                </tfoot>
              </table>
            </div>
          )}
        </Panel>

        <p className="text-2xs leading-5 text-ink-mute">
          単位数はサービス種別マスタに登録した単位を合計したものです。加算・減算は含みません。
          請求ソフトへ渡す前の突き合わせにお使いください。
        </p>
      </Content>
    </>
  )
}
