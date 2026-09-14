'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { db, now } from '@/lib/db'
import { requireStaff } from '@/lib/auth'
import { monthDates, weekdayOf } from '@/lib/date'

function str(fd: FormData, key: string) {
  return String(fd.get(key) ?? '').trim()
}
function numOrNull(fd: FormData, key: string) {
  const v = str(fd, key)
  return v ? Number(v) : null
}

export async function saveVisit(formData: FormData) {
  await requireStaff()
  const id = numOrNull(formData, 'id')
  const fields = {
    client_id: Number(str(formData, 'client_id')),
    staff_id: numOrNull(formData, 'staff_id'),
    service_code_id: numOrNull(formData, 'service_code_id'),
    date: str(formData, 'date'),
    plan_start: str(formData, 'plan_start'),
    plan_end: str(formData, 'plan_end'),
    status: str(formData, 'status') || '予定',
    cancel_reason: str(formData, 'cancel_reason'),
  }

  if (!fields.client_id || !fields.date) {
    throw new Error('利用者と日付は必須です。')
  }

  if (id) {
    db()
      .prepare(
        `UPDATE visits SET client_id=?, staff_id=?, service_code_id=?, date=?, plan_start=?,
         plan_end=?, status=?, cancel_reason=?, updated_at=? WHERE id=?`,
      )
      .run(
        fields.client_id, fields.staff_id, fields.service_code_id, fields.date,
        fields.plan_start, fields.plan_end, fields.status, fields.cancel_reason, now(), id,
      )
  } else {
    db()
      .prepare(
        `INSERT INTO visits (client_id, staff_id, service_code_id, date, plan_start, plan_end, status, cancel_reason)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      )
      .run(
        fields.client_id, fields.staff_id, fields.service_code_id, fields.date,
        fields.plan_start, fields.plan_end, fields.status, fields.cancel_reason,
      )
  }

  revalidatePath('/schedule')
  revalidatePath('/records')
  redirect(`/schedule?week=${weekMondayOf(fields.date)}`)
}

export async function deleteVisit(formData: FormData) {
  await requireStaff()
  const id = Number(str(formData, 'id'))
  const week = str(formData, 'week')
  db().prepare('DELETE FROM visits WHERE id = ?').run(id)
  revalidatePath('/schedule')
  redirect(`/schedule${week ? `?week=${week}` : ''}`)
}

/** 実績の一括確定：予定どおり実施した扱いにする */
export async function confirmVisits(formData: FormData) {
  await requireStaff()
  const ids = formData.getAll('visit_id').map(Number).filter(Boolean)
  if (ids.length === 0) return
  const stmt = db().prepare(
    `UPDATE visits
     SET status='実施済',
         actual_start = CASE WHEN actual_start = '' THEN plan_start ELSE actual_start END,
         actual_end   = CASE WHEN actual_end   = '' THEN plan_end   ELSE actual_end   END,
         updated_at = ?
     WHERE id = ?`,
  )
  db().transaction(() => ids.forEach((id) => stmt.run(now(), id)))()
  revalidatePath('/records')
  revalidatePath('/results')
}

export type GenerateResult = { created: number; skipped: number }

/**
 * 同意済の介護計画書の週間パターンから、指定月の訪問予定をまとめて作る。
 * 同じ利用者・同じ日時の予定がすでにあれば作らない（重複作成の防止）。
 */
export async function generateSchedule(formData: FormData) {
  await requireStaff()
  const month = str(formData, 'month')
  const clientIds = formData.getAll('client_id').map(Number).filter(Boolean)
  if (!month || clientIds.length === 0) {
    redirect(`/schedule/generate?month=${month}&error=対象の利用者を選んでください`)
  }

  const placeholders = clientIds.map(() => '?').join(',')
  const items = db()
    .prepare(
      `SELECT p.client_id, i.weekday, i.start_time, i.end_time, i.service_code_id, i.id AS item_id
       FROM care_plans p
       JOIN care_plan_items i ON i.plan_id = p.id
       WHERE p.status = '同意済' AND p.client_id IN (${placeholders})
         AND i.weekday IS NOT NULL AND i.start_time <> ''
         AND p.id = (SELECT id FROM care_plans WHERE client_id = p.client_id ORDER BY revision DESC LIMIT 1)`,
    )
    .all(...clientIds) as {
    client_id: number
    weekday: number
    start_time: string
    end_time: string
    service_code_id: number | null
    item_id: number
  }[]

  const defaultStaff = db()
    .prepare(
      `SELECT client_id, staff_id FROM (
         SELECT client_id, staff_id, COUNT(*) AS n FROM visits
         WHERE staff_id IS NOT NULL GROUP BY client_id, staff_id ORDER BY n DESC
       ) GROUP BY client_id`,
    )
    .all() as { client_id: number; staff_id: number }[]
  const staffByClient = new Map(defaultStaff.map((d) => [d.client_id, d.staff_id]))

  const exists = db().prepare(
    'SELECT 1 FROM visits WHERE client_id = ? AND date = ? AND plan_start = ? LIMIT 1',
  )
  const insert = db().prepare(
    `INSERT INTO visits (client_id, staff_id, service_code_id, date, plan_start, plan_end, status, plan_item_id)
     VALUES (?, ?, ?, ?, ?, ?, '予定', ?)`,
  )

  let created = 0
  let skipped = 0
  db().transaction(() => {
    for (const date of monthDates(month)) {
      const wd = weekdayOf(date)
      for (const item of items) {
        if (item.weekday !== wd) continue
        if (exists.get(item.client_id, date, item.start_time)) {
          skipped += 1
          continue
        }
        insert.run(
          item.client_id,
          staffByClient.get(item.client_id) ?? null,
          item.service_code_id,
          date,
          item.start_time,
          item.end_time,
          item.item_id,
        )
        created += 1
      }
    }
  })()

  revalidatePath('/schedule')
  redirect(`/schedule?week=${monthDates(month)[0]}&created=${created}&skipped=${skipped}`)
}

function weekMondayOf(iso: string) {
  const [y, m, d] = iso.split('-').map(Number)
  const date = new Date(y, m - 1, d)
  date.setDate(date.getDate() - ((date.getDay() + 6) % 7))
  return date.toLocaleDateString('sv-SE')
}
