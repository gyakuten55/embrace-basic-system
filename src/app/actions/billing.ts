'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { requireStaff, isAdmin } from '@/lib/auth'
import { closeMonth, closingIssues, isMonthClosed, reopenMonth } from '@/lib/billing'

function back(month: string, key: 'error' | 'saved', message: string): never {
  redirect(`/billing?month=${month}&${key}=${encodeURIComponent(message)}`)
}

/** 月を締める：予定のまま・記録なしの訪問が残っていれば締めない */
export async function closeBillingMonth(formData: FormData) {
  const me = await requireStaff()
  const month = String(formData.get('month') ?? '')
  if (!/^\d{4}-\d{2}$/.test(month)) redirect('/billing')
  if (!isAdmin(me)) back(month, 'error', '月締めは管理者・サービス提供責任者のみ行えます。')
  if (isMonthClosed(month)) back(month, 'error', 'この月はすでに締めています。')

  if (closingIssues(month).length > 0) {
    back(month, 'error', '締める前に、下の「締める前の確認」を片づけてください。')
  }

  closeMonth(month, me.id)
  revalidatePath('/billing')
  revalidatePath('/', 'layout')
  back(month, 'saved', 'closed')
}

export async function reopenBillingMonth(formData: FormData) {
  const me = await requireStaff()
  const month = String(formData.get('month') ?? '')
  if (!/^\d{4}-\d{2}$/.test(month)) redirect('/billing')
  if (!isAdmin(me)) back(month, 'error', '締めの解除は管理者・サービス提供責任者のみ行えます。')

  reopenMonth(month)
  revalidatePath('/billing')
  revalidatePath('/', 'layout')
  back(month, 'saved', 'reopened')
}
