import { redirect } from 'next/navigation'
import { getSuperAdmin } from '@/lib/auth/super-admin'

export default async function FounderLayout({ children }: { children: React.ReactNode }) {
  const admin = await getSuperAdmin()
  if (!admin) redirect('/dashboard')

  return (
    <div className="min-h-screen" style={{ background: 'linear-gradient(180deg, #0A0F1E 0%, #0D1635 100%)' }}>
      {children}
    </div>
  )
}
