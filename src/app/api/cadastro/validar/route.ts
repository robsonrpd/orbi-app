import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'
import { codigoPareceValido, hashCodigo } from '@/lib/claim'

// Confere um código de loja ANTES do cadastro, pra a tela avisar na hora ("Loja: Ótica Diniz") em vez
// de criar a conta e só depois descobrir que o código não vale (a conta ficaria sem loja).
// Só quem tem o código consegue ver o nome da loja: a busca é pelo hash, nunca por nome.
export async function POST(req: NextRequest) {
  let codigo = ''
  try { codigo = String((await req.json())?.codigo ?? '') } catch { /* corpo inválido */ }

  const invalido = async () => {
    // espera um pouco: chutar códigos em sequência fica lento
    await new Promise(r => setTimeout(r, 600))
    return NextResponse.json({ error: 'Código inválido ou já usado.' }, { status: 404 })
  }
  if (!codigoPareceValido(codigo)) return invalido()

  const service = createServiceClient()
  const { data } = await service.from('companies').select('id, name')
    .eq('settings->>claim_hash', hashCodigo(codigo)).maybeSingle()
  if (!data) return invalido()

  return NextResponse.json({ ok: true, loja: data.name })
}
