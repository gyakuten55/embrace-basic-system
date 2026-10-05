'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { db } from '@/lib/db'
import { requireStaff, isAdmin } from '@/lib/auth'

function str(fd: FormData, key: string) {
  return String(fd.get(key) ?? '').trim()
}

export async function saveOffice(formData: FormData) {
  const me = await requireStaff()
  if (!isAdmin(me)) {
    redirect('/settings?error=' + encodeURIComponent('事業所情報の変更は管理者のみ行えます。'))
  }

  const unitPrice = (key: string) => {
    const n = Number(str(formData, key))
    return Number.isFinite(n) && n >= 10 ? Math.round(n * 100) / 100 : 10
  }

  db()
    .prepare(
      `INSERT INTO office (id, name, office_number, postal_code, address, phone, fax, manager,
         unit_price_care, unit_price_disability)
       VALUES (1, ?, ?, ?, ?, ?, ?, ?, ?, ?)
       ON CONFLICT(id) DO UPDATE SET
         name = excluded.name, office_number = excluded.office_number,
         postal_code = excluded.postal_code, address = excluded.address,
         phone = excluded.phone, fax = excluded.fax, manager = excluded.manager,
         unit_price_care = excluded.unit_price_care,
         unit_price_disability = excluded.unit_price_disability`,
    )
    .run(
      str(formData, 'name'), str(formData, 'office_number'), str(formData, 'postal_code'),
      str(formData, 'address'), str(formData, 'phone'), str(formData, 'fax'), str(formData, 'manager'),
      unitPrice('unit_price_care'), unitPrice('unit_price_disability'),
    )

  revalidatePath('/settings')
  revalidatePath('/', 'layout')
  redirect('/settings?saved=office')
}

export async function saveService(formData: FormData) {
  const me = await requireStaff()
  if (!isAdmin(me)) {
    redirect('/settings?error=' + encodeURIComponent('サービス種別の変更は管理者のみ行えます。'))
  }

  const id = str(formData, 'id')
  const values = [
    str(formData, 'name'),
    str(formData, 'category') || '身体介護',
    str(formData, 'insurance_type') || '介護保険',
    Number(str(formData, 'minutes') || 30),
    Number(str(formData, 'unit') || 0),
    str(formData, 'active') === '0' ? 0 : 1,
  ] as const

  if (!values[0]) {
    redirect('/settings?error=' + encodeURIComponent('サービス名を入力してください。'))
  }

  if (id) {
    db()
      .prepare(
        'UPDATE service_codes SET name=?, category=?, insurance_type=?, minutes=?, unit=?, active=? WHERE id=?',
      )
      .run(...values, Number(id))
  } else {
    db()
      .prepare(
        'INSERT INTO service_codes (name, category, insurance_type, minutes, unit, active) VALUES (?, ?, ?, ?, ?, ?)',
      )
      .run(...values)
  }

  revalidatePath('/settings')
  redirect('/settings?saved=service#services')
}

export async function deleteService(formData: FormData) {
  const me = await requireStaff()
  if (!isAdmin(me)) {
    redirect('/settings?error=' + encodeURIComponent('サービス種別の削除は管理者のみ行えます。'))
  }
  const id = Number(str(formData, 'id'))
  const used = db()
    .prepare('SELECT COUNT(*) AS n FROM visits WHERE service_code_id = ?')
    .get(id) as { n: number }

  if (used.n > 0) {
    // 実績に紐づくものは履歴を壊さないよう、無効化にとどめる
    db().prepare('UPDATE service_codes SET active = 0 WHERE id = ?').run(id)
    revalidatePath('/settings')
    redirect('/settings?saved=service-disabled#services')
  }

  db().prepare('DELETE FROM service_codes WHERE id = ?').run(id)
  revalidatePath('/settings')
  redirect('/settings?saved=service-deleted#services')
}
