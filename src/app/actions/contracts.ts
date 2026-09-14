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
  'client_id', 'kind', 'insurance_type', 'contract_date', 'start_date', 'end_date',
  'important_date', 'privacy_date', 'signer_name', 'signer_relation', 'explained_by',
  'monthly_fee', 'status', 'note',
] as const

export async function saveContract(formData: FormData) {
  await requireStaff()
  const id = str(formData, 'id')
  const explainedBy = str(formData, 'explained_by')

  const values = {
    client_id: Number(str(formData, 'client_id')),
    kind: str(formData, 'kind') || '訪問介護',
    insurance_type: str(formData, 'insurance_type') || '介護保険',
    contract_date: dateOrNull(formData, 'contract_date'),
    start_date: dateOrNull(formData, 'start_date'),
    end_date: dateOrNull(formData, 'end_date'),
    important_date: dateOrNull(formData, 'important_date'),
    privacy_date: dateOrNull(formData, 'privacy_date'),
    signer_name: str(formData, 'signer_name'),
    signer_relation: str(formData, 'signer_relation'),
    explained_by: explainedBy ? Number(explainedBy) : null,
    monthly_fee: Number(str(formData, 'monthly_fee') || 0),
    status: str(formData, 'status') || '有効',
    note: str(formData, 'note'),
  }

  if (!values.client_id) throw new Error('利用者を選択してください。')

  const args = FIELDS.map((f) => values[f])

  if (id) {
    db()
      .prepare(`UPDATE contracts SET ${FIELDS.map((f) => `${f}=?`).join(', ')}, updated_at=? WHERE id=?`)
      .run(...args, now(), Number(id))
  } else {
    db()
      .prepare(`INSERT INTO contracts (${FIELDS.join(', ')}) VALUES (${FIELDS.map(() => '?').join(', ')})`)
      .run(...args)
  }

  revalidatePath('/contracts')
  revalidatePath(`/clients/${values.client_id}`)
  redirect(str(formData, 'back') || `/clients/${values.client_id}`)
}

export async function deleteContract(formData: FormData) {
  await requireStaff()
  const id = Number(str(formData, 'id'))
  const clientId = Number(str(formData, 'client_id'))
  db().prepare('DELETE FROM contracts WHERE id = ?').run(id)
  revalidatePath('/contracts')
  revalidatePath(`/clients/${clientId}`)
  redirect(`/clients/${clientId}`)
}
