'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { db, now } from '@/lib/db'
import { requireStaff } from '@/lib/auth'
import { today } from '@/lib/date'

function str(fd: FormData, key: string) {
  return String(fd.get(key) ?? '').trim()
}

/** 1か月分の勤怠をまとめて保存する（並列配列で受け取る） */
export async function saveMonthlyAttendance(formData: FormData) {
  await requireStaff()
  const staffId = Number(str(formData, 'staff_id'))
  const month = str(formData, 'month')
  if (!staffId || !month) throw new Error('職員と対象月を指定してください。')

  const dates = formData.getAll('row_date').map(String)
  const kinds = formData.getAll('row_kind').map(String)
  const ins = formData.getAll('row_in').map(String)
  const outs = formData.getAll('row_out').map(String)
  const breaks = formData.getAll('row_break').map(String)
  const notes = formData.getAll('row_note').map(String)

  const upsert = db().prepare(
    `INSERT INTO attendances (staff_id, date, kind, clock_in, clock_out, break_minutes, note)
     VALUES (?, ?, ?, ?, ?, ?, ?)
     ON CONFLICT(staff_id, date) DO UPDATE SET
       kind = excluded.kind, clock_in = excluded.clock_in, clock_out = excluded.clock_out,
       break_minutes = excluded.break_minutes, note = excluded.note, updated_at = ?`,
  )
  const remove = db().prepare('DELETE FROM attendances WHERE staff_id = ? AND date = ?')

  db().transaction(() => {
    dates.forEach((date, i) => {
      const kind = kinds[i] ?? ''
      const clockIn = ins[i] ?? ''
      const clockOut = outs[i] ?? ''
      const note = (notes[i] ?? '').trim()
      // 区分も時刻も備考も無い日は登録しない（未入力として扱う）
      if (!kind && !clockIn && !clockOut && !note) {
        remove.run(staffId, date)
        return
      }
      upsert.run(
        staffId, date, kind || '出勤', clockIn, clockOut,
        Number(breaks[i] || 0), note, now(),
      )
    })
  })()

  revalidatePath('/attendance')
  redirect(`/attendance/${staffId}?month=${month}&saved=1`)
}

/** ダッシュボード／勤怠画面からのその場の打刻 */
export async function punch(formData: FormData) {
  const staff = await requireStaff()
  const kind = str(formData, 'punch') // 'in' | 'out'
  const date = today()
  const time = new Date().toTimeString().slice(0, 5)

  const existing = db()
    .prepare('SELECT id, clock_in, clock_out FROM attendances WHERE staff_id = ? AND date = ?')
    .get(staff.id, date) as { id: number; clock_in: string; clock_out: string } | undefined

  if (!existing) {
    db()
      .prepare(
        `INSERT INTO attendances (staff_id, date, kind, clock_in, clock_out, break_minutes)
         VALUES (?, ?, '出勤', ?, ?, 0)`,
      )
      .run(staff.id, date, kind === 'in' ? time : '', kind === 'out' ? time : '')
  } else {
    db()
      .prepare(
        `UPDATE attendances SET clock_in = ?, clock_out = ?, updated_at = ? WHERE id = ?`,
      )
      .run(
        kind === 'in' ? time : existing.clock_in,
        kind === 'out' ? time : existing.clock_out,
        now(),
        existing.id,
      )
  }

  revalidatePath('/attendance')
}
