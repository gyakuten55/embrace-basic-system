import crypto from 'node:crypto'

export function hashPassword(plain: string, salt = crypto.randomBytes(16).toString('hex')) {
  const derived = crypto.scryptSync(plain, salt, 32).toString('hex')
  return `${salt}:${derived}`
}

export function verifyPassword(plain: string, stored: string) {
  const [salt, expected] = stored.split(':')
  if (!salt || !expected) return false
  const derived = crypto.scryptSync(plain, salt, 32).toString('hex')
  const a = Buffer.from(derived, 'hex')
  const b = Buffer.from(expected, 'hex')
  return a.length === b.length && crypto.timingSafeEqual(a, b)
}
