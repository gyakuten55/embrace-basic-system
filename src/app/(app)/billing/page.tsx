import Link from 'next/link'
import { currentStaff, isAdmin } from '@/lib/auth'
import { addMonths, formatMonth, shortDate, thisMonth } from '@/lib/date'
import { closingIssues, closingOf, invoicesFor } from '@/lib/billing'
import { closeBillingMonth, reopenBillingMonth } from '@/app/actions/billing'
import { Content, Empty, Panel, PageHeader } from '@/components/ui'
import { MonthNav } from '@/components/period-nav'
import { ConfirmButton } from '@/components/confirm-button'

export const dynamic = 'force-dynamic'

const SAVED: Record<string, string> = {
  closed: '月を締めました。請求額が確定し、この月の予定・記録は変更できなくなりました。',
  reopened: '締めを解除しました。訪問・記録を直したら、もう一度締めてください。',
}

const yen = (n: number) => `${n.toLocaleString()}円`

export default async function BillingPage({
  searchParams,
}: {
  searchParams: Promise<{ month?: string; saved?: string; error?: string }>
}) {
  const sp = await searchParams
  // 請求は前月分を締めるのが基本なので、既定は前月
  const month = sp.month && /^\d{4}-\d{2}$/.test(sp.month) ? sp.month : addMonths(thisMonth(), -1)
  const me = await currentStaff()
  const canManage = isAdmin(me)

  const closing = closingOf(month)
  const rows = invoicesFor(month)
  const issues = closing ? [] : closingIssues(month)
  const ready = issues.length === 0

  const total = rows.reduce(
    (a, r) => ({
      visits: a.visits + r.visits,
      units: a.units + r.units,
      total: a.total + r.total_yen,
      insurance: a.insurance + r.insurance_yen,
      copay: a.copay + r.copay_yen,
    }),
    { visits: 0, units: 0, total: 0, insurance: 0, copay: 0 },
  )

  return (
    <>
      <PageHeader
        title="月締め・請求"
        sub="1か月分の実績を締めて、請求額を確定します。締めた月の予定・記録は変更できなくなります。"
        actions={
          <a href={`/api/billing/csv?month=${month}`} className="btn btn-default">
            CSVで書き出す
          </a>
        }
      />

      <Content className="space-y-3">
        {sp.saved && SAVED[sp.saved] && (
          <p className="notice border-ok/20 bg-ok-soft text-sm text-ok">{SAVED[sp.saved]}</p>
        )}
        {sp.error && (
          <p className="notice border-ng/20 bg-ng-soft text-sm text-ng">{sp.error}</p>
        )}

        <div className="flex flex-wrap items-center justify-between gap-3">
          <MonthNav month={month} />
          {closing ? (
            <span className="badge badge-ok">
              締め済　{closing.closed_at.slice(0, 16)}
              {closing.closed_by_name && `　${closing.closed_by_name}`}
            </span>
          ) : (
            <span className="badge badge-warn">締め前（金額は見込みです）</span>
          )}
        </div>

        {!closing && (
          <Panel title="締める前の確認" flush>
            {ready ? (
              <p className="px-4 py-3 text-sm text-ok">
                予定のまま・記録なしの訪問はありません。締められます。
              </p>
            ) : (
              <>
                <p className="border-b border-line-soft px-4 py-2.5 text-sm text-warn">
                  次の {issues.length} 件を片づけると締められます。実施したか中止したかを記録してください。
                </p>
                <ul className="max-h-80 divide-y divide-line-soft overflow-y-auto text-sm">
                  {issues.map((v) => (
                    <li key={v.visit_id} className="flex flex-wrap items-center gap-x-3 gap-y-1 px-4 py-2">
                      <span className="tnum w-28 text-xs text-ink-sub">
                        {shortDate(v.date)} {v.plan_start}
                      </span>
                      <span className="min-w-[7rem] font-medium">{v.client_name}</span>
                      <span className="text-xs text-ink-sub">{v.staff_name ?? '担当未割当'}</span>
                      <span className="badge badge-warn">{v.issue}</span>
                      <Link
                        href={v.issue === '種別なし' ? `/schedule/${v.visit_id}/edit` : `/records/${v.visit_id}`}
                        className="btn btn-default btn-sm ml-auto"
                      >
                        {v.issue === '種別なし' ? '種別を設定' : '記録する'}
                      </Link>
                    </li>
                  ))}
                </ul>
              </>
            )}
            {canManage && (
              <form action={closeBillingMonth} className="flex items-center justify-end gap-3 border-t border-line px-4 py-3">
                <input type="hidden" name="month" value={month} />
                {!ready && <span className="text-xs text-ink-sub">上の項目がすべて済むと締められます。</span>}
                {ready ? (
                  <ConfirmButton
                    className="btn btn-primary"
                    message={`${formatMonth(month)}を締めます。請求額が確定し、この月の予定・記録は変更できなくなります。よろしいですか？`}
                  >
                    {formatMonth(month)}を締める
                  </ConfirmButton>
                ) : (
                  <button type="button" className="btn btn-primary" disabled>
                    {formatMonth(month)}を締める
                  </button>
                )}
              </form>
            )}
          </Panel>
        )}

        <Panel
          title={`${formatMonth(month)}の請求（${rows.length} 名）`}
          flush
          actions={
            closing && canManage ? (
              <form action={reopenBillingMonth}>
                <input type="hidden" name="month" value={month} />
                <ConfirmButton
                  className="btn btn-default btn-sm"
                  message={`${formatMonth(month)}の締めを解除します。確定した請求額は消え、予定・記録を変更できる状態に戻ります。よろしいですか？`}
                >
                  締めを解除
                </ConfirmButton>
              </form>
            ) : undefined
          }
        >
          {rows.length === 0 ? (
            <Empty message={`${formatMonth(month)}に実施済の訪問はありません。`} />
          ) : (
            <div className="overflow-x-auto">
              <table className="table">
                <thead>
                  <tr>
                    <th className="w-44">利用者</th>
                    <th className="w-24">保険</th>
                    <th className="w-16 text-right">負担</th>
                    <th className="w-16 text-right">回数</th>
                    <th className="w-24 text-right">単位数</th>
                    <th className="w-20 text-right">単価</th>
                    <th className="w-28 text-right">費用総額</th>
                    <th className="w-28 text-right">保険請求額</th>
                    <th className="w-28 text-right">利用者負担</th>
                    <th className="w-20 text-right"></th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((r) => (
                    <tr key={r.client_id}>
                      <td>
                        <Link href={`/billing/${r.client_id}?month=${month}`} className="link font-medium">
                          {r.client_name}
                        </Link>
                        <div className="tnum text-2xs text-ink-mute">{r.client_code}</div>
                      </td>
                      <td className="text-xs text-ink-sub">{r.insurance_type}</td>
                      <td className="tnum text-right text-xs">{r.burden_ratio}割</td>
                      <td className="tnum text-right">{r.visits}</td>
                      <td className="tnum text-right">{r.units.toLocaleString()}</td>
                      <td className="tnum text-right text-xs text-ink-sub">{r.unit_price.toFixed(2)}</td>
                      <td className="tnum text-right">{yen(r.total_yen)}</td>
                      <td className="tnum text-right">{yen(r.insurance_yen)}</td>
                      <td className="tnum text-right font-medium">{yen(r.copay_yen)}</td>
                      <td className="text-right">
                        <Link href={`/billing/${r.client_id}?month=${month}`} className="btn btn-default btn-sm">
                          請求書
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="border-t-2 border-line-hard bg-line-soft/60 font-medium">
                    <td colSpan={3} className="px-3 py-2 text-xs">
                      合計
                    </td>
                    <td className="tnum px-3 py-2 text-right">{total.visits}</td>
                    <td className="tnum px-3 py-2 text-right">{total.units.toLocaleString()}</td>
                    <td></td>
                    <td className="tnum px-3 py-2 text-right">{yen(total.total)}</td>
                    <td className="tnum px-3 py-2 text-right">{yen(total.insurance)}</td>
                    <td className="tnum px-3 py-2 text-right">{yen(total.copay)}</td>
                    <td></td>
                  </tr>
                </tfoot>
              </table>
            </div>
          )}
        </Panel>

        <p className="text-2xs leading-5 text-ink-mute">
          費用総額＝単位数×単価（円未満切り捨て）、保険請求額＝費用総額×給付率（円未満切り捨て）、
          利用者負担＝費用総額−保険請求額で計算しています。単価は「設定」で変更できます。
          加算・減算、障害福祉の負担上限月額、公費は含みません。国保連への伝送は請求ソフトで行ってください（CSVで受け渡せます）。
        </p>
      </Content>
    </>
  )
}
