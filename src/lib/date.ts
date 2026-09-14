export const WEEKDAY_JP = ['日', '月', '火', '水', '木', '金', '土']

/** 'YYYY-MM-DD' の今日 */
export function today(): string {
  return new Date().toLocaleDateString('sv-SE')
}

/** 'YYYY-MM' の今月 */
export function thisMonth(): string {
  return today().slice(0, 7)
}

export function isoToDate(iso: string): Date {
  const [y, m, d] = iso.split('-').map(Number)
  return new Date(y, (m ?? 1) - 1, d ?? 1)
}

export function dateToIso(d: Date): string {
  return d.toLocaleDateString('sv-SE')
}

export function addDays(iso: string, days: number): string {
  const d = isoToDate(iso)
  d.setDate(d.getDate() + days)
  return dateToIso(d)
}

export function addMonths(ym: string, months: number): string {
  const [y, m] = ym.split('-').map(Number)
  const d = new Date(y, m - 1 + months, 1)
  return d.toLocaleDateString('sv-SE').slice(0, 7)
}

/** その日を含む週の月曜日 */
export function startOfWeek(iso: string): string {
  const d = isoToDate(iso)
  const shift = (d.getDay() + 6) % 7
  d.setDate(d.getDate() - shift)
  return dateToIso(d)
}

export function weekDates(mondayIso: string): string[] {
  return Array.from({ length: 7 }, (_, i) => addDays(mondayIso, i))
}

export function monthDates(ym: string): string[] {
  const [y, m] = ym.split('-').map(Number)
  const last = new Date(y, m, 0).getDate()
  return Array.from({ length: last }, (_, i) => `${ym}-${String(i + 1).padStart(2, '0')}`)
}

export function monthRange(ym: string): { from: string; to: string } {
  const days = monthDates(ym)
  return { from: days[0], to: days[days.length - 1] }
}

export function weekdayOf(iso: string): number {
  return isoToDate(iso).getDay()
}

/** 9/14(日) のような短縮表記 */
export function shortDate(iso: string): string {
  const d = isoToDate(iso)
  return `${d.getMonth() + 1}/${d.getDate()}(${WEEKDAY_JP[d.getDay()]})`
}

/** 2026年9月14日(日) */
export function longDate(iso: string | null | undefined): string {
  if (!iso) return '—'
  const d = isoToDate(iso)
  return `${d.getFullYear()}年${d.getMonth() + 1}月${d.getDate()}日(${WEEKDAY_JP[d.getDay()]})`
}

export function formatMonth(ym: string): string {
  const [y, m] = ym.split('-')
  return `${y}年${Number(m)}月`
}

/** 'HH:MM' を分に変換 */
export function toMinutes(hhmm: string): number | null {
  const m = /^(\d{1,2}):(\d{2})$/.exec(hhmm.trim())
  if (!m) return null
  return Number(m[1]) * 60 + Number(m[2])
}

export function minutesToHm(total: number): string {
  const sign = total < 0 ? '-' : ''
  const abs = Math.abs(total)
  return `${sign}${Math.floor(abs / 60)}:${String(abs % 60).padStart(2, '0')}`
}

/** 時間帯の長さ（分）。不正・逆転時は null */
export function durationMinutes(start: string, end: string): number | null {
  const s = toMinutes(start)
  const e = toMinutes(end)
  if (s === null || e === null) return null
  const diff = e - s
  return diff > 0 ? diff : null
}

export function age(birth: string | null | undefined): number | null {
  if (!birth) return null
  const b = isoToDate(birth)
  const n = new Date()
  let a = n.getFullYear() - b.getFullYear()
  const m = n.getMonth() - b.getMonth()
  if (m < 0 || (m === 0 && n.getDate() < b.getDate())) a -= 1
  return a >= 0 ? a : null
}
