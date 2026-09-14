import Link from 'next/link'
import { startOfWeek, today, weekDates, WEEKDAY_JP, isoToDate } from '@/lib/date'
import { activeClients, activeStaff, visitsBetween, type VisitRow } from '@/lib/queries'
import { Content, PageHeader } from '@/components/ui'
import { FilterSelect, WeekNav } from '@/components/period-nav'
import { Icon } from '@/components/icons'

export const dynamic = 'force-dynamic'

type Search = { week?: string; by?: string; staff?: string; client?: string; created?: string; skipped?: string }

export default async function SchedulePage({ searchParams }: { searchParams: Promise<Search> }) {
  const sp = await searchParams
  const week = sp.week && /^\d{4}-\d{2}-\d{2}$/.test(sp.week) ? startOfWeek(sp.week) : startOfWeek(today())
  const by = sp.by === 'client' ? 'client' : 'staff'
  const staffFilter = sp.staff ? Number(sp.staff) : undefined
  const clientFilter = sp.client ? Number(sp.client) : undefined

  const days = weekDates(week)
  const visits = visitsBetween(days[0], days[6], { staffId: staffFilter, clientId: clientFilter })
  const staffList = activeStaff()
  const clientList = activeClients()

  const rows =
    by === 'staff'
      ? staffList
          .filter((s) => !staffFilter || s.id === staffFilter)
          .map((s) => ({ id: s.id, label: s.name, sub: s.role }))
          .concat(
            visits.some((v) => v.staff_id === null)
              ? [{ id: 0, label: '未割当', sub: '担当を決めてください' }]
              : [],
          )
      : clientList
          .filter((c) => !clientFilter || c.id === clientFilter)
          .map((c) => ({ id: c.id, label: c.name, sub: c.care_level }))

  const cell = (rowId: number, date: string) =>
    visits.filter(
      (v) => v.date === date && (by === 'staff' ? (v.staff_id ?? 0) === rowId : v.client_id === rowId),
    )

  const totalHours = visits
    .filter((v) => v.status !== 'キャンセル')
    .reduce((sum, v) => sum + durationOf(v), 0)

  return (
    <>
      <PageHeader
        title="スケジュール"
        sub={`週の訪問 ${visits.length} 件　のべ ${(totalHours / 60).toFixed(1)} 時間`}
        actions={
          <>
            <Link href={`/schedule/generate?month=${week.slice(0, 7)}`} className="btn btn-default">
              計画書から一括作成
            </Link>
            <Link href={`/schedule/new?date=${today()}`} className="btn btn-primary">
              <Icon.plus className="h-3.5 w-3.5" />
              予定を追加
            </Link>
          </>
        }
      />

      <Content className="space-y-3">
        {sp.created && (
          <p className="rounded border border-ok/25 bg-ok-soft px-3 py-2 text-sm text-ok">
            訪問予定を {sp.created} 件作成しました。
            {Number(sp.skipped) > 0 && `（重複のため ${sp.skipped} 件はスキップ）`}
          </p>
        )}

        <div className="flex flex-wrap items-center justify-between gap-3">
          <WeekNav week={week} />
          <div className="flex flex-wrap items-center gap-2">
            <div className="flex overflow-hidden rounded border border-line-hard">
              {(['staff', 'client'] as const).map((mode) => (
                <Link
                  key={mode}
                  href={`/schedule?week=${week}&by=${mode}`}
                  className={`px-3 py-1 text-xs font-medium transition-colors ${
                    by === mode ? 'bg-accent text-white' : 'bg-white text-ink-sub hover:bg-line-soft'
                  }`}
                >
                  {mode === 'staff' ? '職員別' : '利用者別'}
                </Link>
              ))}
            </div>
            <FilterSelect
              name="staff"
              value={sp.staff ?? ''}
              placeholder="職員で絞り込み"
              options={staffList.map((s) => ({ value: String(s.id), label: s.name }))}
            />
            <FilterSelect
              name="client"
              value={sp.client ?? ''}
              placeholder="利用者で絞り込み"
              options={clientList.map((c) => ({ value: String(c.id), label: c.name }))}
            />
          </div>
        </div>

        <div className="panel overflow-x-auto">
          <table className="table w-full min-w-[60rem] table-fixed">
            <thead>
              <tr>
                <th className="w-36 border-r border-line">{by === 'staff' ? '職員' : '利用者'}</th>
                {days.map((d) => {
                  const wd = isoToDate(d).getDay()
                  return (
                    <th
                      key={d}
                      className={`text-center ${
                        d === today() ? 'bg-accent-soft text-accent' : wd === 0 ? 'text-ng' : wd === 6 ? 'text-accent' : ''
                      }`}
                    >
                      <div className="tnum">{Number(d.slice(8))}</div>
                      <div className="text-2xs font-normal">({WEEKDAY_JP[wd]})</div>
                    </th>
                  )
                })}
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={`${by}-${row.id}`} className="align-top">
                  <td className="border-r border-line bg-line-soft/40">
                    <div className="text-sm font-medium">{row.label}</div>
                    <div className="text-2xs text-ink-mute">{row.sub}</div>
                  </td>
                  {days.map((d) => {
                    const items = cell(row.id, d)
                    return (
                      <td key={d} className={`p-1 ${d === today() ? 'bg-accent-soft/40' : ''}`}>
                        <div className="space-y-1">
                          {items.map((v) => (
                            <VisitChip key={v.id} visit={v} week={week} showClient={by === 'staff'} />
                          ))}
                          <Link
                            href={`/schedule/new?date=${d}${by === 'staff' && row.id ? `&staff=${row.id}` : ''}${
                              by === 'client' ? `&client=${row.id}` : ''
                            }`}
                            className="flex w-full items-center justify-center rounded border border-dashed border-line
                                       py-1 text-2xs text-ink-mute opacity-0 transition-opacity hover:border-accent
                                       hover:text-accent focus:opacity-100 group-hover:opacity-100 [tr:hover_&]:opacity-100"
                          >
                            + 追加
                          </Link>
                        </div>
                      </td>
                    )
                  })}
                </tr>
              ))}
              {rows.length === 0 && (
                <tr>
                  <td colSpan={8} className="py-10 text-center text-sm text-ink-sub">
                    表示できる行がありません。
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        <p className="text-2xs text-ink-mute">
          予定をクリックすると内容を編集できます。実施済みの予定には記録へのリンクが表示されます。
        </p>
      </Content>
    </>
  )
}

function durationOf(v: VisitRow) {
  const [sh, sm] = (v.plan_start || '0:0').split(':').map(Number)
  const [eh, em] = (v.plan_end || '0:0').split(':').map(Number)
  const d = eh * 60 + em - (sh * 60 + sm)
  return d > 0 ? d : 0
}

const CHIP_TONE: Record<string, string> = {
  予定: 'border-line-hard bg-white text-ink hover:border-accent hover:bg-accent-soft',
  実施済: 'border-ok/30 bg-ok-soft text-ok hover:border-ok/60',
  キャンセル: 'border-ng/25 bg-ng-soft text-ng line-through hover:border-ng/50',
}

function VisitChip({ visit, week, showClient }: { visit: VisitRow; week: string; showClient: boolean }) {
  return (
    <Link
      href={`/schedule/${visit.id}/edit?week=${week}`}
      className={`block rounded border px-1.5 py-1 text-2xs leading-tight transition-colors ${
        CHIP_TONE[visit.status] ?? CHIP_TONE['予定']
      }`}
      title={`${visit.plan_start}–${visit.plan_end} ${visit.client_name} / ${visit.service_name ?? ''}`}
    >
      <span className="tnum font-medium">{visit.plan_start}</span>
      <span className="ml-1 truncate">{showClient ? visit.client_name : (visit.staff_name ?? '未割当')}</span>
      {visit.service_category && (
        <span className="mt-0.5 block truncate text-[10px] opacity-70">{visit.service_category}</span>
      )}
    </Link>
  )
}
