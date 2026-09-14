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
  'code', 'name', 'name_kana', 'birth_date', 'gender', 'postal_code', 'address', 'phone',
  'insurance_type', 'insured_number', 'care_level', 'certified_from', 'certified_to',
  'burden_ratio', 'care_manager', 'care_office', 'emergency_name', 'emergency_relation',
  'emergency_phone', 'medical_note', 'status', 'started_on', 'ended_on', 'note',
] as const

function collect(fd: FormData) {
  return {
    code: str(fd, 'code'),
    name: str(fd, 'name'),
    name_kana: str(fd, 'name_kana'),
    birth_date: dateOrNull(fd, 'birth_date'),
    gender: str(fd, 'gender'),
    postal_code: str(fd, 'postal_code'),
    address: str(fd, 'address'),
    phone: str(fd, 'phone'),
    insurance_type: str(fd, 'insurance_type') || '介護保険',
    insured_number: str(fd, 'insured_number'),
    care_level: str(fd, 'care_level'),
    certified_from: dateOrNull(fd, 'certified_from'),
    certified_to: dateOrNull(fd, 'certified_to'),
    burden_ratio: Number(str(fd, 'burden_ratio') || 1),
    care_manager: str(fd, 'care_manager'),
    care_office: str(fd, 'care_office'),
    emergency_name: str(fd, 'emergency_name'),
    emergency_relation: str(fd, 'emergency_relation'),
    emergency_phone: str(fd, 'emergency_phone'),
    medical_note: str(fd, 'medical_note'),
    status: str(fd, 'status') || '利用中',
    started_on: dateOrNull(fd, 'started_on'),
    ended_on: dateOrNull(fd, 'ended_on'),
    note: str(fd, 'note'),
  }
}

export async function saveClient(formData: FormData) {
  await requireStaff()
  const id = str(formData, 'id')
  const values = collect(formData)

  if (!values.code || !values.name) {
    throw new Error('利用者番号と氏名は必須です。')
  }

  const duplicate = db()
    .prepare('SELECT id FROM clients WHERE code = ? AND id <> ?')
    .get(values.code, id ? Number(id) : 0) as { id: number } | undefined
  if (duplicate) {
    redirect(`${id ? `/clients/${id}/edit` : '/clients/new'}?error=${encodeURIComponent('この利用者番号はすでに使われています。')}`)
  }

  const args = FIELDS.map((f) => values[f])

  if (id) {
    db()
      .prepare(
        `UPDATE clients SET ${FIELDS.map((f) => `${f}=?`).join(', ')}, updated_at=? WHERE id=?`,
      )
      .run(...args, now(), Number(id))
    revalidatePath(`/clients/${id}`)
    revalidatePath('/clients')
    redirect(`/clients/${id}`)
  }

  const res = db()
    .prepare(
      `INSERT INTO clients (${FIELDS.join(', ')}) VALUES (${FIELDS.map(() => '?').join(', ')})`,
    )
    .run(...args)
  revalidatePath('/clients')
  redirect(`/clients/${Number(res.lastInsertRowid)}`)
}

export async function deleteClient(formData: FormData) {
  await requireStaff()
  const id = Number(str(formData, 'id'))
  db().prepare('DELETE FROM clients WHERE id = ?').run(id)
  revalidatePath('/clients')
  redirect('/clients')
}
