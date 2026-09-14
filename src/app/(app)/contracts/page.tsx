import Link from 'next/link'
import { db } from '@/lib/db'
import { Content, Empty, Panel, PageHeader, StatusBadge } from '@/components/ui'
import { Icon } from '@/components/icons'

export const dynamic = 'force-dynamic'

type Row = {
  id: number
  client_id: number
  client_name: string
  client_code: string
  kind: string
  insurance_type: string
  contract_date: string | null
  start_date: string | null
  end_date: string | null
  important_date: string | null
  privacy_date: string | null
  signer_name: string
  status: string
  explained_by_name: string | null
}

export default async function ContractsPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>
}) {
  const sp = await searchParams
  const status = sp.status ?? '有効'

  const rows = db()
    .prepare(
      `SELECT ct.id, ct.client_id, c.name AS client_name, c.code AS client_code,
              ct.kind, ct.insurance_type, ct.contract_date, ct.start_date, ct.end_date,
              ct.important_date, ct.privacy_date, ct.signer_name, ct.status,
              s.name AS explained_by_name
       FROM contracts ct
       JOIN clients c ON c.id = ct.client_id
       LEFT JOIN staff s ON s.id = ct.explained_by
       ${status === 'all' ? '' : 'WHERE ct.status = ?'}
       ORDER BY ct.status, c.name_kana`,
    )
    .all(...(status === 'all' ? [] : [status])) as Row[]

  const missing = rows.filter((r) => !r.important_date || !r.privacy_date)

  return (
    <>
      <PageHeader
        title="契約"
        sub="契約書・重要事項説明書・個人情報同意の取得状況をまとめて確認できます。"
        actions={
          <Link href="/contracts/new" className="btn btn-primary">
            <Icon.plus className="h-3.5 w-3.5" />
            契約を登録
          </Link>
        }
      />

      <Content className="space-y-3">
        {missing.length > 0 && status !== 'all' && (
          <p className="rounded border border-warn/25 bg-warn-soft px-3 py-2 text-sm text-warn">
            重要事項説明書または個人情報同意の日付が未入力の契約が {missing.length} 件あります。
          </p>
        )}

        <div className="tabs border-0">
          {[
            { key: '有効', label: '有効' },
            { key: '更新待ち', label: '更新待ち' },
            { key: '終了', label: '終了' },
            { key: 'all', label: 'すべて' },
          ].map((t) => (
            <Link
              key={t.key}
              href={`/contracts?status=${t.key}`}
              className={`tab ${status === t.key ? 'tab-on' : ''}`}
            >
              {t.label}
            </Link>
          ))}
        </div>

        <Panel flush>
          {rows.length === 0 ? (
            <Empty message="該当する契約がありません。" />
          ) : (
            <div className="overflow-x-auto">
              <table className="table">
                <thead>
                  <tr>
                    <th className="w-44">利用者</th>
                    <th className="w-52">契約種別</th>
                    <th className="w-24">契約日</th>
                    <th className="w-40">期間</th>
                    <th className="w-28">重要事項</th>
                    <th className="w-28">個人情報同意</th>
                    <th className="w-28">署名者</th>
                    <th className="w-20">状態</th>
                    <th className="w-16"></th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((r) => (
                    <tr key={r.id}>
                      <td>
                        <Link href={`/clients/${r.client_id}`} className="link font-medium">
                          {r.client_name}
                        </Link>
                        <div className="tnum text-2xs text-ink-mute">{r.client_code}</div>
                      </td>
                      <td className="text-xs">
                        {r.kind}
                        <div className="text-2xs text-ink-mute">{r.insurance_type}</div>
                      </td>
                      <td className="tnum text-xs">{r.contract_date ?? '—'}</td>
                      <td className="tnum text-xs text-ink-sub">
                        {r.start_date ?? '—'}
                        <br />〜{r.end_date ?? '（期限なし）'}
                      </td>
                      <td className="tnum text-xs">
                        {r.important_date ?? <span className="badge badge-warn">未取得</span>}
                      </td>
                      <td className="tnum text-xs">
                        {r.privacy_date ?? <span className="badge badge-warn">未取得</span>}
                      </td>
                      <td className="text-xs text-ink-sub">{r.signer_name || '—'}</td>
                      <td>
                        <StatusBadge value={r.status} />
                      </td>
                      <td className="text-right">
                        <Link href={`/contracts/${r.id}/edit`} className="link text-xs">
                          編集
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Panel>
      </Content>
    </>
  )
}
