'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { db, now } from '@/lib/db'
import { currentStaff, requireStaff, isAdmin } from '@/lib/auth'
import { hashPassword, verifyPassword } from '@/lib/password'

function str(fd: FormData, key: string) {
  return String(fd.get(key) ?? '').trim()
}

const FIELDS = [
  'code', 'name', 'name_kana', 'role', 'employment', 'qualification',
  'hourly_wage', 'phone', 'joined_on', 'active',
] as const

export async function saveStaff(formData: FormData) {
  const me = await requireStaff()
  const id = str(formData, 'id')
  if (!isAdmin(me)) {
    redirect('/staff?error=' + encodeURIComponent('職員の登録・編集は管理者またはサービス提供責任者のみ行えます。'))
  }

  const joined = str(formData, 'joined_on')
  const values = {
    code: str(formData, 'code'),
    name: str(formData, 'name'),
    name_kana: str(formData, 'name_kana'),
    role: str(formData, 'role') || '介護職員',
    employment: str(formData, 'employment') || '常勤',
    qualification: str(formData, 'qualification'),
    hourly_wage: Number(str(formData, 'hourly_wage') || 0),
    phone: str(formData, 'phone'),
    joined_on: /^\d{4}-\d{2}-\d{2}$/.test(joined) ? joined : null,
    active: str(formData, 'active') === '0' ? 0 : 1,
  }

  if (!values.code || !values.name) {
    redirect(
      `${id ? `/staff/${id}/edit` : '/staff/new'}?error=${encodeURIComponent('職員コードと氏名は必須です。')}`,
    )
  }

  const duplicate = db()
    .prepare('SELECT id FROM staff WHERE code = ? AND id <> ?')
    .get(values.code, id ? Number(id) : 0) as { id: number } | undefined
  if (duplicate) {
    redirect(
      `${id ? `/staff/${id}/edit` : '/staff/new'}?error=${encodeURIComponent('この職員コードはすでに使われています。')}`,
    )
  }

  const args = FIELDS.map((f) => values[f])

  if (id) {
    db()
      .prepare(`UPDATE staff SET ${FIELDS.map((f) => `${f}=?`).join(', ')}, updated_at=? WHERE id=?`)
      .run(...args, now(), Number(id))
  } else {
    const password = str(formData, 'password') || 'embrace'
    db()
      .prepare(
        `INSERT INTO staff (${FIELDS.join(', ')}, password_hash) VALUES (${FIELDS.map(() => '?').join(', ')}, ?)`,
      )
      .run(...args, hashPassword(password))
  }

  revalidatePath('/staff')
  redirect('/staff?saved=1')
}

export async function resetStaffPassword(formData: FormData) {
  const me = await requireStaff()
  const id = Number(str(formData, 'id'))
  if (!isAdmin(me)) {
    redirect(`/staff/${id}/edit?error=` + encodeURIComponent('パスワードの再設定は管理者のみ行えます。'))
  }
  const password = str(formData, 'password')
  if (password.length < 6) {
    redirect(`/staff/${id}/edit?error=` + encodeURIComponent('パスワードは6文字以上で設定してください。'))
  }
  db()
    .prepare('UPDATE staff SET password_hash = ?, updated_at = ? WHERE id = ?')
    .run(hashPassword(password), now(), id)
  redirect(`/staff/${id}/edit?saved=password`)
}

export async function changeOwnPassword(formData: FormData) {
  const me = await requireStaff()
  const current = str(formData, 'current_password')
  const next = str(formData, 'new_password')
  const confirm = str(formData, 'confirm_password')

  const row = db().prepare('SELECT password_hash FROM staff WHERE id = ?').get(me.id) as
    | { password_hash: string }
    | undefined

  if (!row || !verifyPassword(current, row.password_hash)) {
    redirect('/settings?error=' + encodeURIComponent('現在のパスワードが違います。'))
  }
  if (next.length < 6) {
    redirect('/settings?error=' + encodeURIComponent('新しいパスワードは6文字以上で設定してください。'))
  }
  if (next !== confirm) {
    redirect('/settings?error=' + encodeURIComponent('確認用のパスワードが一致しません。'))
  }

  db()
    .prepare('UPDATE staff SET password_hash = ?, updated_at = ? WHERE id = ?')
    .run(hashPassword(next), now(), me.id)
  redirect('/settings?saved=password')
}

export async function canManageStaff() {
  return isAdmin(await currentStaff())
}
