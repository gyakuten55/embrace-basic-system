'use server'

import { redirect } from 'next/navigation'
import { db } from '@/lib/db'
import { createSession, destroySession, verifyPassword } from '@/lib/auth'

export async function login(_prev: string | null, formData: FormData): Promise<string | null> {
  const code = String(formData.get('code') ?? '').trim()
  const password = String(formData.get('password') ?? '')
  if (!code || !password) return '職員コードとパスワードを入力してください。'

  const staff = db()
    .prepare('SELECT id, password_hash FROM staff WHERE code = ? AND active = 1')
    .get(code) as { id: number; password_hash: string } | undefined

  if (!staff || !verifyPassword(password, staff.password_hash)) {
    return '職員コードまたはパスワードが違います。'
  }

  await createSession(staff.id)
  redirect('/')
}

export async function logout() {
  await destroySession()
  redirect('/login')
}
