import { redirect } from 'next/navigation'
import { getSuperAdmin } from '@/lib/auth/super-admin'

export default async function FounderLayout({ children }: { children: React.ReactNode }) {
  const admin = await getSuperAdmin()
  if (!admin) redirect('/dashboard')

  return <>{children}</>
}
