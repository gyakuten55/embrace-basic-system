'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { db, now } from '@/lib/db'
import { requireStaff } from '@/lib/auth'

function str(fd: FormData, key: string) {
  return String(fd.get(key) ?? '').trim()
}
function dateOrNull(fd: FormData, key: string) {
  const v = str(fd, key)
  return /^\d{4}-\d{2}-\d{2}$/.test(v) ? v : null
}

const FIELDS = [
  'client_id', 'revision', 'created_on', 'author_id', 'period_from', 'period_to',
  'client_intention', 'family_intention', 'overall_policy', 'long_goal', 'long_goal_period',
  'short_goal', 'short_goal_period', 'consent_on', 'consent_name', 'status', 'note',
] as const

/** 明細はインデックスをそろえた並列配列で受け取る */
function readItems(fd: FormData) {
  const weekdays = fd.getAll('item_weekday').map(String)
  const starts = fd.getAll('item_start').map(String)
  const ends = fd.getAll('item_end').map(String)
  const services = fd.getAll('item_service').map(String)
  const contents = fd.getAll('item_content').map(String)
  const cautions = fd.getAll('item_caution').map(String)

  return contents
    .map((content, i) => ({
      weekday: weekdays[i] === '' ? null : Number(weekdays[i]),
      start_time: starts[i] ?? '',
      end_time: ends[i] ?? '',
      service_code_id: services[i] ? Number(services[i]) : null,
      content: content.trim(),
      caution: (cautions[i] ?? '').trim(),
    }))
    .filter((item) => item.content || item.start_time)
}

export async function savePlan(formData: FormData) {
  const staff = await requireStaff()
  const id = str(formData, 'id')
  const authorId = str(formData, 'author_id')

  const values = {
    client_id: Number(str(formData, 'client_id')),
    revision: Number(str(formData, 'revision') || 1),
    created_on: dateOrNull(formData, 'created_on') ?? new Date().toLocaleDateString('sv-SE'),
    author_id: authorId ? Number(authorId) : staff.id,
    period_from: dateOrNull(formData, 'period_from'),
    period_to: dateOrNull(formData, 'period_to'),
    client_intention: str(formData, 'client_intention'),
    family_intention: str(formData, 'family_intention'),
    overall_policy: str(formData, 'overall_policy'),
    long_goal: str(formData, 'long_goal'),
    long_goal_period: str(formData, 'long_goal_period'),
    short_goal: str(formData, 'short_goal'),
    short_goal_period: str(formData, 'short_goal_period'),
    consent_on: dateOrNull(formData, 'consent_on'),
    consent_name: str(formData, 'consent_name'),
    status: str(formData, 'status') || '下書き',
    note: str(formData, 'note'),
  }

  if (!values.client_id) throw new Error('利用者を選択してください。')

  const items = readItems(formData)
  const args = FIELDS.map((f) => values[f])
  let planId: number

  db().transaction(() => {
    if (id) {
      planId = Number(id)
      db()
        .prepare(`UPDATE care_plans SET ${FIELDS.map((f) => `${f}=?`).join(', ')}, updated_at=? WHERE id=?`)
        .run(...args, now(), planId)
      db().prepare('DELETE FROM care_plan_items WHERE plan_id = ?').run(planId)
    } else {
      const res = db()
        .prepare(`INSERT INTO care_plans (${FIELDS.join(', ')}) VALUES (${FIELDS.map(() => '?').join(', ')})`)
        .run(...args)
      planId = Number(res.lastInsertRowid)
    }

    const insItem = db().prepare(
      `INSERT INTO care_plan_items (plan_id, weekday, start_time, end_time, service_code_id, content, caution, sort_order)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    )
    items.forEach((item, i) =>
      insItem.run(planId, item.weekday, item.start_time, item.end_time, item.service_code_id, item.content, item.caution, i),
    )
  })()

  revalidatePath('/care-plans')
  revalidatePath(`/clients/${values.client_id}`)
  redirect(`/care-plans/${planId!}`)
}

export async function deletePlan(formData: FormData) {
  await requireStaff()
  const id = Number(str(formData, 'id'))
  const clientId = Number(str(formData, 'client_id'))
  db().prepare('DELETE FROM care_plans WHERE id = ?').run(id)
  revalidatePath('/care-plans')
  revalidatePath(`/clients/${clientId}`)
  redirect(`/clients/${clientId}`)
}

/** 既存の計画書を次の版として複製する（更新時の入力を省く） */
export async function duplicatePlan(formData: FormData) {
  await requireStaff()
  const id = Number(str(formData, 'id'))
  const source = db().prepare('SELECT * FROM care_plans WHERE id = ?').get(id) as
    | Record<string, unknown>
    | undefined
  if (!source) throw new Error('計画書が見つかりません。')

  const clientId = Number(source.client_id)
  const nextRevision =
    ((db()
      .prepare('SELECT MAX(revision) AS m FROM care_plans WHERE client_id = ?')
      .get(clientId) as { m: number | null }).m ?? 0) + 1

  let newId: number
  db().transaction(() => {
    const res = db()
      .prepare(
        `INSERT INTO care_plans (client_id, revision, created_on, author_id, period_from, period_to,
          client_intention, family_intention, overall_policy, long_goal, long_goal_period,
          short_goal, short_goal_period, status, note)
         SELECT client_id, ?, ?, author_id, period_from, period_to,
          client_intention, family_intention, overall_policy, long_goal, long_goal_period,
          short_goal, short_goal_period, '下書き', note
         FROM care_plans WHERE id = ?`,
      )
      .run(nextRevision, new Date().toLocaleDateString('sv-SE'), id)
    newId = Number(res.lastInsertRowid)

    db()
      .prepare(
        `INSERT INTO care_plan_items (plan_id, weekday, start_time, end_time, service_code_id, content, caution, sort_order)
         SELECT ?, weekday, start_time, end_time, service_code_id, content, caution, sort_order
         FROM care_plan_items WHERE plan_id = ?`,
      )
      .run(newId, id)
  })()

  revalidatePath('/care-plans')
  revalidatePath(`/clients/${clientId}`)
  redirect(`/care-plans/${newId!}/edit`)
}
