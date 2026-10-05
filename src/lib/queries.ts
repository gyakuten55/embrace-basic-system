import 'server-only'
import { db } from './db'
import type { Client, ServiceCode, Staff } from './types'

export type VisitRow = {
  id: number
  date: string
  plan_start: string
  plan_end: string
  actual_start: string
  actual_end: string
  status: string
  cancel_reason: string
  client_id: number
  client_name: string
  client_code: string
  staff_id: number | null
  staff_name: string | null
  service_code_id: number | null
  service_name: string | null
  service_category: string | null
  service_unit: number | null
  insurance_type: string
  record_id: number | null
  record_note: string | null
}

const VISIT_SELECT = `
  SELECT v.id, v.date, v.plan_start, v.plan_end, v.actual_start, v.actual_end,
         v.status, v.cancel_reason,
         v.client_id, c.name AS client_name, c.code AS client_code, c.insurance_type,
         v.staff_id, s.name AS staff_name,
         v.service_code_id, sc.name AS service_name, sc.category AS service_category,
         sc.unit AS service_unit,
         r.id AS record_id, r.note AS record_note
  FROM visits v
  JOIN clients c        ON c.id = v.client_id
  LEFT JOIN staff s     ON s.id = v.staff_id
  LEFT JOIN service_codes sc ON sc.id = v.service_code_id
  LEFT JOIN visit_records r  ON r.visit_id = v.id
`

export function visitsBetween(from: string, to: string, filters: { staffId?: number; clientId?: number } = {}) {
  const where = ['v.date BETWEEN ? AND ?']
  const args: (string | number)[] = [from, to]
  if (filters.staffId) {
    where.push('v.staff_id = ?')
    args.push(filters.staffId)
  }
  if (filters.clientId) {
    where.push('v.client_id = ?')
    args.push(filters.clientId)
  }
  return db()
    .prepare(`${VISIT_SELECT} WHERE ${where.join(' AND ')} ORDER BY v.date, v.plan_start, c.name`)
    .all(...args) as VisitRow[]
}

export function visitById(id: number): VisitRow | undefined {
  return db().prepare(`${VISIT_SELECT} WHERE v.id = ?`).get(id) as VisitRow | undefined
}

export function activeClients(): Client[] {
  return db()
    .prepare("SELECT * FROM clients WHERE status <> '終了' ORDER BY name_kana, code")
    .all() as Client[]
}

export function allClients(): Client[] {
  return db().prepare('SELECT * FROM clients ORDER BY status, name_kana, code').all() as Client[]
}

export function clientById(id: number): Client | undefined {
  return db().prepare('SELECT * FROM clients WHERE id = ?').get(id) as Client | undefined
}

export function activeStaff(): Staff[] {
  return db()
    .prepare('SELECT * FROM staff WHERE active = 1 ORDER BY code')
    .all() as Staff[]
}

export function allStaff(): Staff[] {
  return db().prepare('SELECT * FROM staff ORDER BY active DESC, code').all() as Staff[]
}

export function staffById(id: number): Staff | undefined {
  return db().prepare('SELECT * FROM staff WHERE id = ?').get(id) as Staff | undefined
}

export function activeServices(): ServiceCode[] {
  return db()
    .prepare('SELECT * FROM service_codes WHERE active = 1 ORDER BY insurance_type DESC, category, minutes')
    .all() as ServiceCode[]
}

export function officeInfo() {
  return db().prepare('SELECT * FROM office WHERE id = 1').get() as
    | {
        id: number
        name: string
        office_number: string
        postal_code: string
        address: string
        phone: string
        fax: string
        manager: string
        unit_price_care: number
        unit_price_disability: number
      }
    | undefined
}

/** 期限が近い／切れている事項を洗い出す（ダッシュボードのアラート） */
export type Alert = {
  kind: '認定期限' | '計画期間' | '契約' | '未記録'
  clientId: number
  clientName: string
  detail: string
  dueDate: string | null
  overdue: boolean
}

export function upcomingAlerts(todayIso: string, horizonIso: string): Alert[] {
  const alerts: Alert[] = []

  const certs = db()
    .prepare(
      `SELECT id, name, certified_to FROM clients
       WHERE status = '利用中' AND certified_to IS NOT NULL AND certified_to <= ?
       ORDER BY certified_to`,
    )
    .all(horizonIso) as { id: number; name: string; certified_to: string }[]
  for (const c of certs) {
    alerts.push({
      kind: '認定期限',
      clientId: c.id,
      clientName: c.name,
      detail: '要介護認定の有効期間',
      dueDate: c.certified_to,
      overdue: c.certified_to < todayIso,
    })
  }

  const plans = db()
    .prepare(
      `SELECT p.id, p.period_to, c.id AS client_id, c.name
       FROM care_plans p
       JOIN clients c ON c.id = p.client_id
       WHERE p.status = '同意済' AND c.status = '利用中'
         AND p.period_to IS NOT NULL AND p.period_to <= ?
         AND p.id = (SELECT id FROM care_plans WHERE client_id = c.id ORDER BY revision DESC LIMIT 1)
       ORDER BY p.period_to`,
    )
    .all(horizonIso) as { id: number; period_to: string; client_id: number; name: string }[]
  for (const p of plans) {
    alerts.push({
      kind: '計画期間',
      clientId: p.client_id,
      clientName: p.name,
      detail: '介護計画書の計画期間',
      dueDate: p.period_to,
      overdue: p.period_to < todayIso,
    })
  }

  const noPlan = db()
    .prepare(
      `SELECT c.id, c.name FROM clients c
       WHERE c.status = '利用中'
         AND NOT EXISTS (SELECT 1 FROM care_plans p WHERE p.client_id = c.id AND p.status = '同意済')
       ORDER BY c.name_kana`,
    )
    .all() as { id: number; name: string }[]
  for (const c of noPlan) {
    alerts.push({
      kind: '計画期間',
      clientId: c.id,
      clientName: c.name,
      detail: '同意済の介護計画書がありません',
      dueDate: null,
      overdue: true,
    })
  }

  const noContract = db()
    .prepare(
      `SELECT c.id, c.name FROM clients c
       WHERE c.status = '利用中'
         AND NOT EXISTS (SELECT 1 FROM contracts ct WHERE ct.client_id = c.id AND ct.status = '有効')
       ORDER BY c.name_kana`,
    )
    .all() as { id: number; name: string }[]
  for (const c of noContract) {
    alerts.push({
      kind: '契約',
      clientId: c.id,
      clientName: c.name,
      detail: '有効な契約が登録されていません',
      dueDate: null,
      overdue: true,
    })
  }

  return alerts.sort((a, b) => {
    if (a.overdue !== b.overdue) return a.overdue ? -1 : 1
    return (a.dueDate ?? '9999').localeCompare(b.dueDate ?? '9999')
  })
}

/** 実績が入っていない（記録未作成の）過去訪問 */
export function unrecordedVisits(from: string, to: string): VisitRow[] {
  return db()
    .prepare(
      `${VISIT_SELECT} WHERE v.date BETWEEN ? AND ? AND v.status = '実施済' AND r.id IS NULL
       ORDER BY v.date DESC, v.plan_start`,
    )
    .all(from, to) as VisitRow[]
}
