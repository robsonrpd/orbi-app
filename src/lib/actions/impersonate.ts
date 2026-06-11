'use server'

import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import { getSuperAdmin } from '@/lib/auth/super-admin'
import { IMPERSONATE_COOKIE } from '@/lib/auth/company'

export async function acessarComo(companyId: string) {
  const admin = await getSuperAdmin()
  if (!admin) return { error: 'Acesso negado.' }

  const cookieStore = await cookies()
  cookieStore.set(IMPERSONATE_COOKIE, companyId, {
    httpOnly: true, sameSite: 'lax', secure: process.env.NODE_ENV === 'production',
    path: '/', maxAge: 60 * 60 * 4, // 4h
  })
  redirect('/dashboard')
}

export async function pararAcesso() {
  const cookieStore = await cookies()
  cookieStore.delete(IMPERSONATE_COOKIE)
  redirect('/founder')
}
