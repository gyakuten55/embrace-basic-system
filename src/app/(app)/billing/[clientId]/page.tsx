import { notFound } from 'next/navigation'
import { clientById, officeInfo } from '@/lib/queries'
import { addMonths, formatMonth, thisMonth } from '@/lib/date'
import { closingOf, invoicesFor } from '@/lib/billing'
import { Breadcrumb, Content, PageHeader } from '@/components/ui'
import { PrintButton } from '@/components/print-button'
import { MonthNav } from '@/components/period-nav'

export const dynamic = 'force-dynamic'

const yen = (n: number) => `${n.toLocaleString()}円`

export default async function InvoicePage({
  params,
  searchParams,
}: {
  params: Promise<{ clientId: string }>
  searchParams: Promise<{ month?: string }>
}) {
  const { clientId } = await params
  const sp = await searchParams
  const month = sp.month && /^\d{4}-\d{2}$/.test(sp.month) ? sp.month : addMonths(thisMonth(), -1)
  const client = clientById(Number(clientId))
  if (!client) notFound()

  const closing = closingOf(month)
  const inv = invoicesFor(month).find((r) => r.client_id === client.id)
  const office = officeInfo()

  return (
    <>
      <PageHeader
        title={`${client.name} 様　${formatMonth(month)}分の請求書`}
        sub={closing ? '締め済みの確定金額です。' : '締め前の見込み金額です。締めると確定します。'}
        actions={
          <>
            <MonthNav month={month} />
            <PrintButton label="請求書を印刷" />
          </>
        }
      />

      <Content>
        <Breadcrumb items={[{ label: '月締め・請求', href: `/billing?month=${month}` }, { label: client.name }]} />

        <article className="sheet relative mt-3 bg-white p-8 print:p-0">
          {!closing && (
            <div className="absolute right-8 top-8 rounded border border-warn px-2 py-0.5 text-xs font-semibold text-warn">
              見込み（締め前）
            </div>
          )}

          <h2 className="text-center text-xl font-semibold tracking-[0.3em]">ご利用料金請求書</h2>

          <div className="mt-6 flex flex-wrap items-start justify-between gap-6">
            <div>
              <div className="border-b border-ink pb-1 text-lg">
                {client.name}
                <span className="ml-2 text-sm">様</span>
              </div>
              <p className="mt-2 text-xs text-ink-sub">{formatMonth(month)}分のサービス利用料を、下記のとおりご請求いたします。</p>
            </div>
            <div className="text-right text-xs leading-5 text-ink-sub">
              <div className="text-sm font-medium text-ink">{office?.name}</div>
              <div>{office?.address}</div>
              <div className="tnum">TEL {office?.phone}</div>
              <div className="tnum">事業所番号 {office?.office_number}</div>
            </div>
          </div>

          <div className="mt-6 flex items-baseline gap-4 border-y-2 border-ink py-3">
            <span className="text-sm">ご請求額</span>
            <span className="tnum text-2xl font-semibold">{yen(inv?.copay_yen ?? 0)}</span>
            <span className="text-xs text-ink-sub">（{client.insurance_type}・{inv?.burden_ratio ?? client.burden_ratio}割負担）</span>
          </div>

          <table className="mt-5 w-full border-collapse text-sm">
            <thead>
              <tr className="bg-line-soft">
                <th className="border border-line-hard px-2 py-1.5 text-left text-xs font-semibold">サービス内容</th>
                <th className="w-20 border border-line-hard px-2 py-1.5 text-xs font-semibold">単位</th>
                <th className="w-16 border border-line-hard px-2 py-1.5 text-xs font-semibold">回数</th>
                <th className="w-24 border border-line-hard px-2 py-1.5 text-xs font-semibold">単位数</th>
              </tr>
            </thead>
            <tbody>
              {(inv?.lines ?? []).map((l) => (
                <tr key={l.service}>
                  <td className="border border-line-hard px-2 py-1.5">{l.service}</td>
                  <td className="tnum border border-line-hard px-2 py-1.5 text-right">{l.unit}</td>
                  <td className="tnum border border-line-hard px-2 py-1.5 text-right">{l.count}</td>
                  <td className="tnum border border-line-hard px-2 py-1.5 text-right">{l.units.toLocaleString()}</td>
                </tr>
              ))}
              {!inv && (
                <tr>
                  <td colSpan={4} className="border border-line-hard px-2 py-8 text-center text-sm text-ink-sub">
                    この月に実施済のサービスはありません。
                  </td>
                </tr>
              )}
            </tbody>
          </table>

          {inv && (
            <table className="ml-auto mt-4 w-full max-w-sm border-collapse text-sm">
              <tbody>
                <SumRow label="合計単位数" value={`${inv.units.toLocaleString()} 単位`} />
                <SumRow label="1単位の単価" value={`${inv.unit_price.toFixed(2)} 円`} />
                <SumRow label="費用総額" value={yen(inv.total_yen)} />
                <SumRow label={`保険給付額（${10 - inv.burden_ratio}割）`} value={`− ${yen(inv.insurance_yen)}`} />
                <SumRow label="ご請求額（利用者負担）" value={yen(inv.copay_yen)} strong />
              </tbody>
            </table>
          )}

          <p className="mt-8 text-2xs leading-5 text-ink-mute">
            内訳はサービス提供実績記録票のとおりです。ご不明な点は上記事業所までお問い合わせください。
          </p>
        </article>
      </Content>
    </>
  )
}

function SumRow({ label, value, strong = false }: { label: string; value: string; strong?: boolean }) {
  return (
    <tr className={strong ? 'bg-line-soft font-semibold' : ''}>
      <th className="border border-line-hard px-2 py-1.5 text-left text-xs font-medium">{label}</th>
      <td className="tnum border border-line-hard px-2 py-1.5 text-right">{value}</td>
    </tr>
  )
}
