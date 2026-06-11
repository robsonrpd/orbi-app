'use server'

import { cookies } from 'next/headers'
import { createClient, createServiceClient } from '@/lib/supabase/server'
import { getEffectiveCompanyId } from '@/lib/auth/company'
import { VENDEDOR_COOKIE } from '@/lib/auth/modo'
import { sendEmail, maskEmail } from '@/lib/email'
import { revalidatePath } from 'next/cache'

/** Passa a operar como um vendedor (aplica as permissões dele). */
export async function operarComoVendedor(vendedorId: string) {
  const companyId = await getEffectiveCompanyId()
  if (!companyId) return { error: 'Não autenticado.' }

  // valida que o vendedor é da empresa
  const service = createServiceClient()
  const { data: v } = await service.from('vendedores').select('id').eq('id', vendedorId).eq('company_id', companyId).single()
  if (!v) return { error: 'Vendedor não encontrado.' }

  const c = await cookies()
  c.set(VENDEDOR_COOKIE, vendedorId, {
    httpOnly: true, sameSite: 'lax', secure: process.env.NODE_ENV === 'production',
    path: '/', maxAge: 60 * 60 * 12, // 12h
  })
  revalidatePath('/dashboard', 'layout')
  return { success: true }
}

/** Volta para a visão de dono (libera tudo). Exige o PIN do dono, se houver. */
export async function sairComoVendedor(pin: string) {
  const companyId = await getEffectiveCompanyId()
  const service = createServiceClient()
  const { data } = await service.from('companies').select('settings').eq('id', companyId).single()
  const realPin = ((data?.settings ?? {}) as { dono_pin?: string }).dono_pin
  if (realPin && (pin ?? '').trim() !== realPin) return { error: 'PIN incorreto.' }

  const c = await cookies()
  c.delete(VENDEDOR_COOKIE)
  revalidatePath('/dashboard', 'layout')
  return { success: true }
}

/** "Esqueci o PIN": gera um código de 6 dígitos e envia ao e-mail do dono (usuário logado). */
export async function solicitarCodigoPin() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user?.email) return { error: 'Não autenticado.' }

  const companyId = await getEffectiveCompanyId()
  if (!companyId) return { error: 'Empresa não encontrada.' }

  const code = String(Math.floor(100000 + Math.random() * 900000))
  const service = createServiceClient()
  const { data } = await service.from('companies').select('settings').eq('id', companyId).single()
  const settings = (data?.settings ?? {}) as Record<string, unknown>
  settings.pin_reset = { code, expires: Date.now() + 15 * 60 * 1000 }
  await service.from('companies').update({ settings }).eq('id', companyId)

  const r = await sendEmail({
    to: user.email,
    subject: 'Código para redefinir seu PIN — Orbi',
    html: `
      <div style="font-family:sans-serif;max-width:480px;margin:0 auto">
        <h2 style="color:#1A56FF">Redefinição de PIN — Orbi</h2>
        <p>Você (ou alguém na sua loja) pediu para redefinir o PIN do dono. Use o código abaixo:</p>
        <p style="font-size:32px;font-weight:bold;letter-spacing:8px;background:#F0F2F5;padding:16px;text-align:center;border-radius:12px">${code}</p>
        <p style="color:#8C8880;font-size:13px">O código expira em 15 minutos. Se não foi você, ignore este e-mail e o PIN continua o mesmo.</p>
      </div>`,
  })
  if (r?.error === 'email_nao_configurado') return { error: 'Envio de e-mail ainda não configurado (RESEND_API_KEY).' }
  if (r?.error) return { error: 'Não foi possível enviar o e-mail. Tente novamente.' }

  return { success: true, email: maskEmail(user.email) }
}

/** Redefine o PIN usando o código recebido por e-mail e já volta para a visão de dono. */
export async function resetarPinComCodigo(code: string, novoPin: string) {
  const companyId = await getEffectiveCompanyId()
  if (!companyId) return { error: 'Empresa não encontrada.' }

  const service = createServiceClient()
  const { data } = await service.from('companies').select('settings').eq('id', companyId).single()
  const settings = (data?.settings ?? {}) as Record<string, unknown> & { pin_reset?: { code: string; expires: number } }
  const reset = settings.pin_reset
  if (!reset?.code) return { error: 'Solicite um novo código.' }
  if (Date.now() > reset.expires) return { error: 'Código expirado. Solicite um novo.' }
  if ((code ?? '').trim() !== reset.code) return { error: 'Código incorreto.' }

  settings.dono_pin = (novoPin ?? '').trim() || undefined
  delete settings.pin_reset
  await service.from('companies').update({ settings }).eq('id', companyId)

  const c = await cookies()
  c.delete(VENDEDOR_COOKIE)
  revalidatePath('/dashboard', 'layout')
  return { success: true }
}

/** Define o PIN do dono (usado para voltar da visão de vendedor). */
export async function salvarPinDono(pin: string) {
  const companyId = await getEffectiveCompanyId()
  if (!companyId) return { error: 'Não autenticado.' }

  const service = createServiceClient()
  const { data } = await service.from('companies').select('settings').eq('id', companyId).single()
  const settings = (data?.settings ?? {}) as Record<string, unknown>
  settings.dono_pin = (pin ?? '').trim() || undefined

  const { error } = await service.from('companies').update({ settings }).eq('id', companyId)
  if (error) return { error: 'Erro ao salvar PIN.' }
  revalidatePath('/dashboard', 'layout')
  return { success: true }
}
