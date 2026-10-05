'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { db, now } from '@/lib/db'
import { requireStaff } from '@/lib/auth'
import { closedMessage } from '@/lib/billing'

function str(fd: FormData, key: string) {
  return String(fd.get(key) ?? '').trim()
}
function numOrNull(fd: FormData, key: string) {
  const v = str(fd, key)
  if (!v) return null
  const n = Number(v)
  return Number.isFinite(n) ? n : null
}

export async function saveRecord(formData: FormData) {
  const staff = await requireStaff()
  const visitId = Number(str(formData, 'visit_id'))
  if (!visitId) throw new Error('訪問が特定できません。')

  const visit = db().prepare('SELECT date FROM visits WHERE id = ?').get(visitId) as { date: string } | undefined
  const locked = visit ? closedMessage(visit.date) : null
  if (locked) redirect(`/records/${visitId}?error=${encodeURIComponent(locked)}`)

  const status = str(formData, 'status') || '実施済'
  const actualStart = str(formData, 'actual_start')
  const actualEnd = str(formData, 'actual_end')
  const cancelReason = str(formData, 'cancel_reason')

  db()
    .prepare(
      `UPDATE visits SET status = ?, actual_start = ?, actual_end = ?, cancel_reason = ?, updated_at = ?
       WHERE id = ?`,
    )
    .run(status, actualStart, actualEnd, cancelReason, now(), visitId)

  // キャンセルは記録本体を残さない（実績として請求されないため）
  if (status === 'キャンセル') {
    db().prepare('DELETE FROM visit_records WHERE visit_id = ?').run(visitId)
    revalidatePath('/records')
    revalidatePath('/results')
    redirect(`/records?date=${str(formData, 'date')}`)
  }

  const values = {
    temperature: numOrNull(formData, 'temperature'),
    bp_high: numOrNull(formData, 'bp_high'),
    bp_low: numOrNull(formData, 'bp_low'),
    pulse: numOrNull(formData, 'pulse'),
    spo2: numOrNull(formData, 'spo2'),
    meal: str(formData, 'meal'),
    water_ml: numOrNull(formData, 'water_ml'),
    excretion: str(formData, 'excretion'),
    bathing: str(formData, 'bathing'),
    condition: str(formData, 'condition'),
    performed: JSON.stringify(formData.getAll('performed').map(String)),
    note: str(formData, 'note'),
    raw_input: str(formData, 'raw_input'),
    ai_used: str(formData, 'ai_used') === '1' ? 1 : 0,
  }

  const existing = db().prepare('SELECT id FROM visit_records WHERE visit_id = ?').get(visitId) as
    | { id: number }
    | undefined

  if (existing) {
    db()
      .prepare(
        `UPDATE visit_records SET temperature=?, bp_high=?, bp_low=?, pulse=?, spo2=?, meal=?,
         water_ml=?, excretion=?, bathing=?, condition=?, performed=?, note=?, raw_input=?,
         ai_used=?, recorded_by=?, recorded_at=?, updated_at=? WHERE visit_id=?`,
      )
      .run(
        values.temperature, values.bp_high, values.bp_low, values.pulse, values.spo2, values.meal,
        values.water_ml, values.excretion, values.bathing, values.condition, values.performed,
        values.note, values.raw_input, values.ai_used, staff.id, now(), now(), visitId,
      )
  } else {
    db()
      .prepare(
        `INSERT INTO visit_records (visit_id, temperature, bp_high, bp_low, pulse, spo2, meal,
         water_ml, excretion, bathing, condition, performed, note, raw_input, ai_used,
         recorded_by, recorded_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      )
      .run(
        visitId, values.temperature, values.bp_high, values.bp_low, values.pulse, values.spo2,
        values.meal, values.water_ml, values.excretion, values.bathing, values.condition,
        values.performed, values.note, values.raw_input, values.ai_used, staff.id, now(),
      )
  }

  revalidatePath('/records')
  revalidatePath('/results')
  revalidatePath(`/records/${visitId}`)
  redirect(`/records?date=${str(formData, 'date')}&saved=${visitId}`)
}
