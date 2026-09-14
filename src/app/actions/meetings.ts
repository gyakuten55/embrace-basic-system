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
  'kind', 'client_id', 'held_on', 'start_time', 'end_time', 'place', 'chair', 'recorder_id',
  'purpose', 'discussion', 'conclusion', 'todo', 'next_date',
] as const

function readAttendees(fd: FormData) {
  const names = fd.getAll('attendee_name').map(String)
  const orgs = fd.getAll('attendee_org').map(String)
  const roles = fd.getAll('attendee_role').map(String)
  return names
    .map((name, i) => ({
      name: name.trim(),
      org: (orgs[i] ?? '').trim(),
      role: (roles[i] ?? '').trim(),
    }))
    .filter((a) => a.name)
}

export async function saveMeeting(formData: FormData) {
  const staff = await requireStaff()
  const id = str(formData, 'id')
  const clientId = str(formData, 'client_id')
  const recorderId = str(formData, 'recorder_id')

  const values = {
    kind: str(formData, 'kind') || 'サービス担当者会議',
    client_id: clientId ? Number(clientId) : null,
    held_on: dateOrNull(formData, 'held_on') ?? new Date().toLocaleDateString('sv-SE'),
    start_time: str(formData, 'start_time'),
    end_time: str(formData, 'end_time'),
    place: str(formData, 'place'),
    chair: str(formData, 'chair'),
    recorder_id: recorderId ? Number(recorderId) : staff.id,
    purpose: str(formData, 'purpose'),
    discussion: str(formData, 'discussion'),
    conclusion: str(formData, 'conclusion'),
    todo: str(formData, 'todo'),
    next_date: dateOrNull(formData, 'next_date'),
  }

  const attendees = readAttendees(formData)
  const args = FIELDS.map((f) => values[f])
  let meetingId: number

  db().transaction(() => {
    if (id) {
      meetingId = Number(id)
      db()
        .prepare(`UPDATE meetings SET ${FIELDS.map((f) => `${f}=?`).join(', ')}, updated_at=? WHERE id=?`)
        .run(...args, now(), meetingId)
      db().prepare('DELETE FROM meeting_attendees WHERE meeting_id = ?').run(meetingId)
    } else {
      const res = db()
        .prepare(`INSERT INTO meetings (${FIELDS.join(', ')}) VALUES (${FIELDS.map(() => '?').join(', ')})`)
        .run(...args)
      meetingId = Number(res.lastInsertRowid)
    }

    const ins = db().prepare(
      'INSERT INTO meeting_attendees (meeting_id, name, org, role, sort_order) VALUES (?, ?, ?, ?, ?)',
    )
    attendees.forEach((a, i) => ins.run(meetingId, a.name, a.org, a.role, i))
  })()

  revalidatePath('/meetings')
  if (values.client_id) revalidatePath(`/clients/${values.client_id}`)
  redirect(`/meetings/${meetingId!}`)
}

export async function deleteMeeting(formData: FormData) {
  await requireStaff()
  const id = Number(str(formData, 'id'))
  db().prepare('DELETE FROM meetings WHERE id = ?').run(id)
  revalidatePath('/meetings')
  redirect('/meetings')
}
