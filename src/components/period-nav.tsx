'use client'

import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import { Icon } from './icons'
import { addDays, addMonths, formatMonth, shortDate, startOfWeek, today, thisMonth } from '@/lib/date'

function useSetParam() {
  const router = useRouter()
  const pathname = usePathname()
  const params = useSearchParams()
  return (key: string, value: string) => {
    const next = new URLSearchParams(params.toString())
    next.set(key, value)
    router.push(`${pathname}?${next.toString()}`)
  }
}

/** 月送り（?month=YYYY-MM） */
export function MonthNav({ month }: { month: string }) {
  const setParam = useSetParam()
  return (
    <div className="flex items-center gap-1 print:hidden">
      <button
        type="button"
        className="btn btn-default btn-sm px-1.5"
        aria-label="前の月"
        onClick={() => setParam('month', addMonths(month, -1))}
      >
        <Icon.left className="h-3.5 w-3.5" />
      </button>
      <div className="tnum min-w-[6.5rem] px-1 text-center text-sm font-semibold">
        {formatMonth(month)}
      </div>
      <button
        type="button"
        className="btn btn-default btn-sm px-1.5"
        aria-label="次の月"
        onClick={() => setParam('month', addMonths(month, 1))}
      >
        <Icon.right className="h-3.5 w-3.5" />
      </button>
      {month !== thisMonth() && (
        <button type="button" className="btn btn-quiet btn-sm" onClick={() => setParam('month', thisMonth())}>
          今月
        </button>
      )}
    </div>
  )
}

/** 週送り（?week=YYYY-MM-DD の月曜日） */
export function WeekNav({ week }: { week: string }) {
  const setParam = useSetParam()
  const end = addDays(week, 6)
  return (
    <div className="flex items-center gap-1 print:hidden">
      <button
        type="button"
        className="btn btn-default btn-sm px-1.5"
        aria-label="前の週"
        onClick={() => setParam('week', addDays(week, -7))}
      >
        <Icon.left className="h-3.5 w-3.5" />
      </button>
      <div className="tnum min-w-[9.5rem] px-1 text-center text-sm font-semibold">
        {shortDate(week)} 〜 {shortDate(end)}
      </div>
      <button
        type="button"
        className="btn btn-default btn-sm px-1.5"
        aria-label="次の週"
        onClick={() => setParam('week', addDays(week, 7))}
      >
        <Icon.right className="h-3.5 w-3.5" />
      </button>
      {week !== startOfWeek(today()) && (
        <button
          type="button"
          className="btn btn-quiet btn-sm"
          onClick={() => setParam('week', startOfWeek(today()))}
        >
          今週
        </button>
      )}
    </div>
  )
}

/** 日送り（?date=YYYY-MM-DD） */
export function DayNav({ date }: { date: string }) {
  const setParam = useSetParam()
  return (
    <div className="flex items-center gap-1 print:hidden">
      <button
        type="button"
        className="btn btn-default btn-sm px-1.5"
        aria-label="前の日"
        onClick={() => setParam('date', addDays(date, -1))}
      >
        <Icon.left className="h-3.5 w-3.5" />
      </button>
      <input
        type="date"
        value={date}
        className="field tnum w-[10.5rem] py-1 text-sm"
        onChange={(e) => e.target.value && setParam('date', e.target.value)}
      />
      <button
        type="button"
        className="btn btn-default btn-sm px-1.5"
        aria-label="次の日"
        onClick={() => setParam('date', addDays(date, 1))}
      >
        <Icon.right className="h-3.5 w-3.5" />
      </button>
      {date !== today() && (
        <button type="button" className="btn btn-quiet btn-sm" onClick={() => setParam('date', today())}>
          今日
        </button>
      )}
    </div>
  )
}

/** 絞り込みセレクト（URLパラメータ連動） */
export function FilterSelect({
  name,
  value,
  options,
  placeholder,
  className = '',
}: {
  name: string
  value: string
  options: { value: string; label: string }[]
  placeholder: string
  className?: string
}) {
  const setParam = useSetParam()
  return (
    <select
      className={`field w-auto py-1 text-sm ${className}`}
      value={value}
      onChange={(e) => setParam(name, e.target.value)}
      aria-label={placeholder}
    >
      <option value="">{placeholder}</option>
      {options.map((o) => (
        <option key={o.value} value={o.value}>
          {o.label}
        </option>
      ))}
    </select>
  )
}
