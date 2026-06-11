import { Resend } from 'resend'

/**
 * Envia um e-mail via Resend.
 * Requer RESEND_API_KEY no ambiente. O remetente padrão (onboarding@resend.dev)
 * só entrega para o e-mail da própria conta Resend — para enviar a qualquer
 * cliente, verifique um domínio e defina EMAIL_FROM (ex: "Orbi <nao-responda@seudominio>").
 */
export async function sendEmail({ to, subject, html }: { to: string; subject: string; html: string }) {
  const key = process.env.RESEND_API_KEY
  if (!key) return { error: 'email_nao_configurado' as const }

  const from = process.env.EMAIL_FROM || 'Orbi Sistemas <onboarding@resend.dev>'
  try {
    const resend = new Resend(key)
    const { error } = await resend.emails.send({ from, to, subject, html })
    if (error) { console.error('resend:', error); return { error: 'falha_envio' as const } }
    return { success: true as const }
  } catch (e) {
    console.error('resend exception:', e)
    return { error: 'falha_envio' as const }
  }
}

export function maskEmail(e: string) {
  const [u, d] = e.split('@')
  if (!d) return e
  const um = u.length <= 2 ? u[0] + '***' : u.slice(0, 2) + '***'
  return `${um}@${d}`
}
