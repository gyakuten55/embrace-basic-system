import Link from 'next/link'
import { notFound } from 'next/navigation'
import { db } from '@/lib/db'
import { clientById } from '@/lib/queries'
import { age, longDate, shortDate, thisMonth, today } from '@/lib/date'
import { Breadcrumb, Content, Empty, Panel, PageHeader, StatusBadge } from '@/components/ui'
import { Icon } from '@/components/icons'

export const dynamic = 'force-dynamic'

export default async function ClientDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const clientId = Number(id)
  const client = clientById(clientId)
  if (!client) notFound()

  const contracts = db()
    .prepare(
      `SELECT ct.*, s.name AS explained_by_name FROM contracts ct
       LEFT JOIN staff s ON s.id = ct.explained_by
       WHERE ct.client_id = ? ORDER BY ct.contract_date DESC`,
    )
    .all(clientId) as {
    id: number; kind: string; insurance_type: string; contract_date: string | null
    start_date: string | null; end_date: string | null; status: string
    explained_by_name: string | null
  }[]

  const plans = db()
    .prepare(
      `SELECT p.id, p.revision, p.created_on, p.period_from, p.period_to, p.status, p.short_goal,
              s.name AS author_name
       FROM care_plans p LEFT JOIN staff s ON s.id = p.author_id
       WHERE p.client_id = ? ORDER BY p.revision DESC`,
    )
    .all(clientId) as {
    id: number; revision: number; created_on: string; period_from: string | null
    period_to: string | null; status: string; short_goal: string; author_name: string | null
  }[]

  const meetings = db()
    .prepare(
      'SELECT id, kind, held_on, place, conclusion FROM meetings WHERE client_id = ? ORDER BY held_on DESC',
    )
    .all(clientId) as { id: number; kind: string; held_on: string; place: string; conclusion: string }[]

  const recentVisits = db()
    .prepare(
      `SELECT v.id, v.date, v.plan_start, v.plan_end, v.status, v.cancel_reason,
              sc.name AS service_name, s.name AS staff_name, r.note, r.temperature
       FROM visits v
       LEFT JOIN service_codes sc ON sc.id = v.service_code_id
       LEFT JOIN staff s ON s.id = v.staff_id
       LEFT JOIN visit_records r ON r.visit_id = v.id
       WHERE v.client_id = ? AND v.date <= ?
       ORDER BY v.date DESC, v.plan_start DESC LIMIT 12`,
    )
    .all(clientId, today()) as {
    id: number; date: string; plan_start: string; plan_end: string; status: string
    cancel_reason: string; service_name: string | null; staff_name: string | null
    note: string | null; temperature: number | null
  }[]

  const monthly = db()
    .prepare(
      `SELECT COUNT(*) AS n, SUM(CASE WHEN status='キャンセル' THEN 1 ELSE 0 END) AS cancelled
       FROM visits WHERE client_id = ? AND substr(date,1,7) = ?`,
    )
    .get(clientId, thisMonth()) as { n: number; cancelled: number | null }

  return (
    <>
      <PageHeader
        title={`${client.name} 様`}
        sub={`${client.name_kana}　${client.code}　${client.care_level || '要介護度未設定'}　${
          age(client.birth_date) !== null ? `${age(client.birth_date)}歳` : ''
        }`}
        actions={
          <>
            <StatusBadge value={client.status} />
            <Link href={`/care-plans/new?client=${client.id}`} className="btn btn-default">
              計画書を作成
            </Link>
            <Link href={`/clients/${client.id}/edit`} className="btn btn-primary">
              編集
            </Link>
          </>
        }
      />

      <Content className="space-y-4">
        <Breadcrumb items={[{ label: '利用者', href: '/clients' }, { label: client.name }]} />

        <div className="grid grid-cols-1 gap-4 xl:grid-cols-[20rem_minmax(0,1fr)]">
          <div className="space-y-4">
            <Panel title="基本情報" flush>
              <dl className="dl">
                <dt>フリガナ</dt>
                <dd>{client.name_kana || '—'}</dd>
                <dt>生年月日</dt>
                <dd className="tnum">{longDate(client.birth_date)}</dd>
                <dt>性別</dt>
                <dd>{client.gender || '—'}</dd>
                <dt>住所</dt>
                <dd>
                  {client.postal_code && <span className="tnum text-xs text-ink-sub">〒{client.postal_code}</span>}
                  <div>{client.address || '—'}</div>
                </dd>
                <dt>電話</dt>
                <dd className="tnum">{client.phone || '—'}</dd>
                <dt>緊急連絡先</dt>
                <dd>
                  {client.emergency_name ? (
                    <>
                      {client.emergency_name}
                      <span className="ml-1 text-xs text-ink-sub">（{client.emergency_relation}）</span>
                      <div className="tnum text-xs text-ink-sub">{client.emergency_phone}</div>
                    </>
                  ) : (
                    '—'
                  )}
                </dd>
              </dl>
            </Panel>

            <Panel title="保険・認定" flush>
              <dl className="dl">
                <dt>保険種別</dt>
                <dd>{client.insurance_type}</dd>
                <dt>被保険者番号</dt>
                <dd className="tnum">{client.insured_number || '—'}</dd>
                <dt>要介護度</dt>
                <dd>{client.care_level || '—'}</dd>
                <dt>負担割合</dt>
                <dd>{client.burden_ratio}割</dd>
                <dt>認定期間</dt>
                <dd className="tnum text-xs">
                  {client.certified_from ?? '—'} 〜 {client.certified_to ?? '—'}
                  {client.certified_to && client.certified_to < today() && (
                    <span className="ml-1.5 badge badge-ng">期限切れ</span>
                  )}
                </dd>
                <dt>ケアマネ</dt>
                <dd>
                  {client.care_manager || '—'}
                  {client.care_office && <div className="text-xs text-ink-sub">{client.care_office}</div>}
                </dd>
              </dl>
            </Panel>

            {client.medical_note && (
              <Panel title="既往歴・身体状況">
                <p className="whitespace-pre-wrap text-sm leading-relaxed">{client.medical_note}</p>
              </Panel>
            )}
            {client.note && (
              <Panel title="備考">
                <p className="whitespace-pre-wrap text-sm leading-relaxed text-ink-sub">{client.note}</p>
              </Panel>
            )}
          </div>

          <div className="min-w-0 space-y-4">
            <div className="grid grid-cols-3 gap-3">
              <div className="panel px-4 py-3">
                <div className="text-xs text-ink-sub">今月の訪問</div>
                <div className="tnum mt-1 text-2xl font-semibold leading-none">{monthly.n}</div>
              </div>
              <div className="panel px-4 py-3">
                <div className="text-xs text-ink-sub">今月のキャンセル</div>
                <div className="tnum mt-1 text-2xl font-semibold leading-none">{monthly.cancelled ?? 0}</div>
              </div>
              <div className="panel px-4 py-3">
                <div className="text-xs text-ink-sub">サービス開始</div>
                <div className="tnum mt-1.5 text-sm">{client.started_on ?? '—'}</div>
              </div>
            </div>

            <Panel
              title="契約"
              flush
              actions={
                <Link href={`/contracts/new?client=${client.id}`} className="btn btn-default btn-sm">
                  <Icon.plus className="h-3 w-3" />
                  契約を追加
                </Link>
              }
            >
              {contracts.length === 0 ? (
                <Empty message="契約が登録されていません。" />
              ) : (
                <table className="table">
                  <thead>
                    <tr>
                      <th>契約種別</th>
                      <th className="w-28">契約日</th>
                      <th className="w-44">期間</th>
                      <th className="w-24">説明者</th>
                      <th className="w-20">状態</th>
                      <th className="w-16"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {contracts.map((ct) => (
                      <tr key={ct.id}>
                        <td>
                          {ct.kind}
                          <div className="text-2xs text-ink-mute">{ct.insurance_type}</div>
                        </td>
                        <td className="tnum text-xs">{ct.contract_date ?? '—'}</td>
                        <td className="tnum text-xs text-ink-sub">
                          {ct.start_date ?? '—'} 〜 {ct.end_date ?? '（期限なし）'}
                        </td>
                        <td className="text-xs text-ink-sub">{ct.explained_by_name ?? '—'}</td>
                        <td>
                          <StatusBadge value={ct.status} />
                        </td>
                        <td className="text-right">
                          <Link href={`/contracts/${ct.id}/edit`} className="link text-xs">
                            編集
                          </Link>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </Panel>

            <Panel
              title="介護計画書"
              flush
              actions={
                <Link href={`/care-plans/new?client=${client.id}`} className="btn btn-default btn-sm">
                  <Icon.plus className="h-3 w-3" />
                  新しい版を作成
                </Link>
              }
            >
              {plans.length === 0 ? (
                <Empty message="介護計画書が登録されていません。" />
              ) : (
                <table className="table">
                  <thead>
                    <tr>
                      <th className="w-14">版</th>
                      <th className="w-28">作成日</th>
                      <th className="w-44">計画期間</th>
                      <th>短期目標</th>
                      <th className="w-20">状態</th>
                    </tr>
                  </thead>
                  <tbody>
                    {plans.map((p) => (
                      <tr key={p.id}>
                        <td className="tnum">
                          <Link href={`/care-plans/${p.id}`} className="link font-medium">
                            第{p.revision}版
                          </Link>
                        </td>
                        <td className="tnum text-xs">{p.created_on}</td>
                        <td className="tnum text-xs text-ink-sub">
                          {p.period_from ?? '—'} 〜 {p.period_to ?? '—'}
                        </td>
                        <td className="line-clamp-1 text-xs text-ink-sub">{p.short_goal || '—'}</td>
                        <td>
                          <StatusBadge value={p.status} />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </Panel>

            <Panel
              title="直近のサービス記録"
              flush
              actions={
                <Link href={`/results/${client.id}?month=${thisMonth()}`} className="btn btn-default btn-sm">
                  月間実績を見る
                </Link>
              }
            >
              {recentVisits.length === 0 ? (
                <Empty message="記録がありません。" />
              ) : (
                <table className="table">
                  <thead>
                    <tr>
                      <th className="w-24">日付</th>
                      <th className="w-24">時間</th>
                      <th className="w-24">担当</th>
                      <th className="w-20">状態</th>
                      <th>記録</th>
                    </tr>
                  </thead>
                  <tbody>
                    {recentVisits.map((v) => (
                      <tr key={v.id}>
                        <td className="tnum whitespace-nowrap text-xs">
                          <Link href={`/records/${v.id}`} className="link">
                            {shortDate(v.date)}
                          </Link>
                        </td>
                        <td className="tnum whitespace-nowrap text-xs text-ink-sub">
                          {v.plan_start}–{v.plan_end}
                        </td>
                        <td className="text-xs text-ink-sub">{v.staff_name ?? '—'}</td>
                        <td>
                          <StatusBadge value={v.status} />
                        </td>
                        <td className="max-w-lg">
                          {v.status === 'キャンセル' ? (
                            <span className="text-xs text-ng">{v.cancel_reason || '理由未入力'}</span>
                          ) : v.note ? (
                            <span className="line-clamp-2 text-xs leading-relaxed text-ink-sub">{v.note}</span>
                          ) : v.status === '実施済' ? (
                            <StatusBadge value="未記録" />
                          ) : (
                            <span className="text-xs text-ink-mute">—</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </Panel>

            <Panel
              title="会議記録"
              flush
              actions={
                <Link href={`/meetings/new?client=${client.id}`} className="btn btn-default btn-sm">
                  <Icon.plus className="h-3 w-3" />
                  会議記録を作成
                </Link>
              }
            >
              {meetings.length === 0 ? (
                <Empty message="この利用者に関する会議記録はありません。" />
              ) : (
                <table className="table">
                  <thead>
                    <tr>
                      <th className="w-28">開催日</th>
                      <th className="w-40">種別</th>
                      <th>結論</th>
                    </tr>
                  </thead>
                  <tbody>
                    {meetings.map((m) => (
                      <tr key={m.id}>
                        <td className="tnum text-xs">
                          <Link href={`/meetings/${m.id}`} className="link">
                            {m.held_on}
                          </Link>
                        </td>
                        <td className="text-xs">{m.kind}</td>
                        <td className="line-clamp-2 text-xs text-ink-sub">{m.conclusion || '—'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </Panel>
          </div>
        </div>
      </Content>
    </>
  )
}
