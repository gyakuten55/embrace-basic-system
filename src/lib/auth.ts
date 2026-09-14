import 'server-only'
import crypto from 'node:crypto'
import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import { db } from './db'
import type { Staff } from './types'

export { hashPassword, verifyPassword } from './password'

const COOKIE = 'embrace_session'
const MAX_AGE = 60 * 60 * 12

function secret() {
  return process.env.SESSION_SECRET || 'embrace-dev-secret'
}

function sign(payload: string) {
  return crypto.createHmac('sha256', secret()).update(payload).digest('base64url')
}

export async function createSession(staffId: number) {
  const expires = Date.now() + MAX_AGE * 1000
  const payload = `${staffId}.${expires}`
  const token = `${payload}.${sign(payload)}`
  const jar = await cookies()
  jar.set(COOKIE, token, {
    httpOnly: true,
    sameSite: 'lax',
    path: '/',
    maxAge: MAX_AGE,
    secure: process.env.NODE_ENV === 'production',
  })
}

export async function destroySession() {
  const jar = await cookies()
  jar.delete(COOKIE)
}

export async function currentStaff(): Promise<Staff | null> {
  const jar = await cookies()
  const token = jar.get(COOKIE)?.value
  if (!token) return null
  const parts = token.split('.')
  if (parts.length !== 3) return null
  const [id, expires, mac] = parts
  const payload = `${id}.${expires}`
  const good = sign(payload)
  if (mac.length !== good.length) return null
  if (!crypto.timingSafeEqual(Buffer.from(mac), Buffer.from(good))) return null
  if (Number(expires) < Date.now()) return null
  const row = db()
    .prepare('SELECT * FROM staff WHERE id = ? AND active = 1')
    .get(Number(id)) as Staff | undefined
  return row ?? null
}

/** ログインが切れていればログイン画面へ戻す。更新系の Server Action の先頭で呼ぶ。 */
export async function requireStaff(): Promise<Staff> {
  const staff = await currentStaff()
  if (!staff) redirect('/login')
  return staff
}

export function isAdmin(staff: Staff | null) {
  return staff?.role === '管理者' || staff?.role === 'サービス提供責任者'
}
