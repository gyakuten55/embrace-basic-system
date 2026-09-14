'use client'

import { useState } from 'react'
import { Icon } from '@/components/icons'
import { WEEKDAYS } from '@/lib/types'
import type { CarePlanItem, ServiceCode } from '@/lib/types'

type Row = {
  key: number
  weekday: string
  start_time: string
  end_time: string
  service_code_id: string
  content: string
  caution: string
}

let nextKey = 1

function toRow(item?: CarePlanItem): Row {
  return {
    key: nextKey++,
    weekday: item?.weekday === null || item?.weekday === undefined ? '' : String(item.weekday),
    start_time: item?.start_time ?? '',
    end_time: item?.end_time ?? '',
    service_code_id: item?.service_code_id ? String(item.service_code_id) : '',
    content: item?.content ?? '',
    caution: item?.caution ?? '',
  }
}

export function PlanItemsEditor({
  items,
  services,
}: {
  items: CarePlanItem[]
  services: ServiceCode[]
}) {
  const [rows, setRows] = useState<Row[]>(
    items.length > 0 ? items.map((i) => toRow(i)) : [toRow(), toRow()],
  )

  const update = (key: number, field: keyof Row, value: string) =>
    setRows((rs) => rs.map((r) => (r.key === key ? { ...r, [field]: value } : r)))

  const addRow = () => setRows((rs) => [...rs, toRow()])
  const removeRow = (key: number) => setRows((rs) => (rs.length > 1 ? rs.filter((r) => r.key !== key) : rs))
  const duplicateRow = (key: number) =>
    setRows((rs) => {
      const index = rs.findIndex((r) => r.key === key)
      if (index < 0) return rs
      const copy = { ...rs[index], key: nextKey++ }
      return [...rs.slice(0, index + 1), copy, ...rs.slice(index + 1)]
    })

  return (
    <div>
      <div className="overflow-x-auto">
        <table className="table min-w-[56rem]">
          <thead>
            <tr>
              <th className="w-20">曜日</th>
              <th className="w-44">時間</th>
              <th className="w-56">サービス種別</th>
              <th>援助内容</th>
              <th>留意事項</th>
              <th className="w-20"></th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.key} className="align-top">
                <td>
                  <select
                    name="item_weekday"
                    value={row.weekday}
                    onChange={(e) => update(row.key, 'weekday', e.target.value)}
                    className="field py-1 text-sm"
                    aria-label="曜日"
                  >
                    <option value="">随時</option>
                    {WEEKDAYS.map((w, i) => (
                      <option key={w} value={i}>
                        {w}
                      </option>
                    ))}
                  </select>
                </td>
                <td>
                  <div className="flex items-center gap-1">
                    <input
                      type="time"
                      name="item_start"
                      value={row.start_time}
                      onChange={(e) => update(row.key, 'start_time', e.target.value)}
                      className="field tnum py-1 text-sm"
                      aria-label="開始時刻"
                    />
                    <span className="text-ink-mute">–</span>
                    <input
                      type="time"
                      name="item_end"
                      value={row.end_time}
                      onChange={(e) => update(row.key, 'end_time', e.target.value)}
                      className="field tnum py-1 text-sm"
                      aria-label="終了時刻"
                    />
                  </div>
                </td>
                <td>
                  <select
                    name="item_service"
                    value={row.service_code_id}
                    onChange={(e) => update(row.key, 'service_code_id', e.target.value)}
                    className="field py-1 text-sm"
                    aria-label="サービス種別"
                  >
                    <option value="">未選択</option>
                    {services.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.name}
                      </option>
                    ))}
                  </select>
                </td>
                <td>
                  <textarea
                    name="item_content"
                    value={row.content}
                    onChange={(e) => update(row.key, 'content', e.target.value)}
                    className="field min-h-[3.25rem] py-1 text-sm"
                    placeholder="入浴介助、洗身の一部介助、更衣介助"
                    aria-label="援助内容"
                  />
                </td>
                <td>
                  <textarea
                    name="item_caution"
                    value={row.caution}
                    onChange={(e) => update(row.key, 'caution', e.target.value)}
                    className="field min-h-[3.25rem] py-1 text-sm"
                    placeholder="37.5度以上のときは清拭に変更する"
                    aria-label="留意事項"
                  />
                </td>
                <td>
                  <div className="flex items-center gap-0.5">
                    <button
                      type="button"
                      onClick={() => duplicateRow(row.key)}
                      className="btn btn-quiet btn-sm px-1.5"
                      title="この行を複製"
                    >
                      複製
                    </button>
                    <button
                      type="button"
                      onClick={() => removeRow(row.key)}
                      className="btn btn-quiet btn-sm px-1.5 text-ng"
                      title="この行を削除"
                      disabled={rows.length === 1}
                    >
                      削除
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="border-t border-line px-4 py-2.5">
        <button type="button" onClick={addRow} className="btn btn-default btn-sm">
          <Icon.plus className="h-3 w-3" />
          行を追加
        </button>
        <span className="ml-3 text-2xs text-ink-mute">
          曜日と時間を入れておくと、スケジュールの一括作成で使えます。
        </span>
      </div>
    </div>
  )
}
