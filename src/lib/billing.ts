import 'server-only'
import { db } from './db'
import { formatMonth, monthRange } from './date'

/**
 * 月締めと請求額の計算。
 *
 * 流れ：予定 → 実施（記録）→ 実績 → 月を締める → 請求
 * 締めた月は訪問・記録を変更できなくなり、その時点の請求額が invoices に残る。
 *
 *   費用総額     = 単位数 × 1単位の単価（円未満切り捨て）
 *   保険請求額   = 費用総額 × 給付率（1割負担なら9割。円未満切り捨て）
 *   利用者負担額 = 費用総額 − 保険請求額
 *
 * 加算・減算、障害福祉の月額上限管理、公費は扱わない（次の段階で追加する）。
 */

export type InvoiceLine = { service: string; count: number; unit: number; units: number }

export type InvoiceRow = {
  client_id: number
  client_name: string
  client_code: string
  insurance_type: string
  insured_number: string
  care_level: string
  care_manager: string
  burden_ratio: number
  visits: number
  units: number
  unit_price: number
  total_yen: number
  insurance_yen: number
  copay_yen: number
  lines: InvoiceLine[]
}

export type Closing = { month: string; closed_at: string; closed_by_name: string | null }

export function closingOf(month: string): Closing | undefined {
  return db()
    .prepare(
      `SELECT m.month, m.closed_at, s.name AS closed_by_name
       FROM month_closings m LEFT JOIN staff s ON s.id = m.closed_by
       WHERE m.month = ?`,
    )
    .get(month) as Closing | undefined
}

export function isMonthClosed(month: string) {
  return Boolean(db().prepare('SELECT 1 FROM month_closings WHERE month = ?').get(month))
}

/** 締めた月の日付なら、変更できない理由を返す。締めていなければ null */
export function closedMessage(date: string): string | null {
  const month = date.slice(0, 7)
  if (!isMonthClosed(month)) return null
  return `${formatMonth(month)}は締め済みのため変更できません。変更が必要なときは「請求」画面で締めを解除してください。`
}

export function calcAmounts(units: number, unitPrice: number, burdenRatio: number) {
  const total = Math.floor(units * unitPrice)
  const ratio = Math.min(Math.max(burdenRatio || 1, 0), 10)
  const insurance = Math.floor((total * (10 - ratio)) / 10)
  return { total, insurance, copay: total - insurance }
}

type ClientBase = Omit<InvoiceRow, 'visits' | 'units' | 'unit_price' | 'total_yen' | 'insurance_yen' | 'copay_yen' | 'lines'>

/** 実施済の訪問から、その月の請求額をその場で計算する（締め前のプレビュー） */
export function computeInvoices(month: string): InvoiceRow[] {
  const { from, to } = monthRange(month)
  const office = db()
    .prepare('SELECT unit_price_care, unit_price_disability FROM office WHERE id = 1')
    .get() as { unit_price_care: number; unit_price_disability: number } | undefined

  const rows = db()
    .prepare(
      `SELECT c.id AS client_id, c.name AS client_name, c.code AS client_code, c.insurance_type,
              c.insured_number, c.care_level, c.care_manager, c.burden_ratio,
              COALESCE(sc.name, 'サービス種別未設定') AS service, COALESCE(sc.unit, 0) AS unit,
              COUNT(*) AS count
       FROM visits v
       JOIN clients c ON c.id = v.client_id
       LEFT JOIN service_codes sc ON sc.id = v.service_code_id
       WHERE v.status = '実施済' AND v.date BETWEEN ? AND ?
       GROUP BY c.id, sc.id
       ORDER BY c.name_kana, c.code, sc.id`,
    )
    .all(from, to) as (ClientBase & { service: string; unit: number; count: number })[]

  const byClient = new Map<number, InvoiceRow>()
  for (const r of rows) {
    let inv = byClient.get(r.client_id)
    if (!inv) {
      inv = {
        client_id: r.client_id,
        client_name: r.client_name,
        client_code: r.client_code,
        insurance_type: r.insurance_type,
        insured_number: r.insured_number,
        care_level: r.care_level,
        care_manager: r.care_manager,
        burden_ratio: r.burden_ratio,
        visits: 0,
        units: 0,
        unit_price:
          r.insurance_type === '障害福祉' ? office?.unit_price_disability ?? 10 : office?.unit_price_care ?? 10,
        total_yen: 0,
        insurance_yen: 0,
        copay_yen: 0,
        lines: [],
      }
      byClient.set(r.client_id, inv)
    }
    inv.lines.push({ service: r.service, count: r.count, unit: r.unit, units: r.unit * r.count })
    inv.visits += r.count
    inv.units += r.unit * r.count
  }

  return [...byClient.values()].map((inv) => {
    const a = calcAmounts(inv.units, inv.unit_price, inv.burden_ratio)
    return { ...inv, total_yen: a.total, insurance_yen: a.insurance, copay_yen: a.copay }
  })
}

/** 締めた月は締めた時点の金額、締める前はその場で計算した金額 */
export function invoicesFor(month: string): InvoiceRow[] {
  if (!isMonthClosed(month)) return computeInvoices(month)
  const rows = db()
    .prepare(
      `SELECT i.client_id, c.name AS client_name, c.code AS client_code, i.insurance_type,
              c.insured_number, c.care_level, c.care_manager, i.burden_ratio, i.visits, i.units,
              i.unit_price, i.total_yen, i.insurance_yen, i.copay_yen, i.lines
       FROM invoices i JOIN clients c ON c.id = i.client_id
       WHERE i.month = ?
       ORDER BY c.name_kana, c.code`,
    )
    .all(month) as (Omit<InvoiceRow, 'lines'> & { lines: string })[]
  return rows.map((r) => ({ ...r, lines: JSON.parse(r.lines) as InvoiceLine[] }))
}

export type ClosingIssue = {
  visit_id: number
  date: string
  plan_start: string
  client_name: string
  staff_name: string | null
  issue: '予定のまま' | '記録なし' | '種別なし'
}

/** 締める前に片づけておく訪問（予定のまま・記録なし・サービス種別なし） */
export function closingIssues(month: string): ClosingIssue[] {
  const { from, to } = monthRange(month)
  return db()
    .prepare(
      `SELECT v.id AS visit_id, v.date, v.plan_start, c.name AS client_name, s.name AS staff_name,
              CASE WHEN v.status = '予定' THEN '予定のまま'
                   WHEN r.id IS NULL THEN '記録なし'
                   ELSE '種別なし' END AS issue
       FROM visits v
       JOIN clients c ON c.id = v.client_id
       LEFT JOIN staff s ON s.id = v.staff_id
       LEFT JOIN visit_records r ON r.visit_id = v.id
       WHERE v.date BETWEEN ? AND ?
         AND (v.status = '予定'
              OR (v.status = '実施済' AND (r.id IS NULL OR v.service_code_id IS NULL)))
       ORDER BY v.date, v.plan_start`,
    )
    .all(from, to) as ClosingIssue[]
}

/** 月を締める。請求額を確定して保存する */
export function closeMonth(month: string, staffId: number) {
  const invoices = computeInvoices(month)
  const conn = db()
  const ins = conn.prepare(
    `INSERT INTO invoices (month, client_id, insurance_type, burden_ratio, visits, units, unit_price,
       total_yen, insurance_yen, copay_yen, lines)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
  )
  conn.transaction(() => {
    conn.prepare('DELETE FROM invoices WHERE month = ?').run(month)
    for (const i of invoices) {
      ins.run(
        month, i.client_id, i.insurance_type, i.burden_ratio, i.visits, i.units, i.unit_price,
        i.total_yen, i.insurance_yen, i.copay_yen, JSON.stringify(i.lines),
      )
    }
    conn
      .prepare(
        `INSERT INTO month_closings (month, closed_at, closed_by) VALUES (?, datetime('now','localtime'), ?)`,
      )
      .run(month, staffId)
  })()
}

export function reopenMonth(month: string) {
  const conn = db()
  conn.transaction(() => {
    conn.prepare('DELETE FROM invoices WHERE month = ?').run(month)
    conn.prepare('DELETE FROM month_closings WHERE month = ?').run(month)
  })()
}
