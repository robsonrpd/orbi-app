// Gera (ou renova) o código de uso único que o dono de uma loja JÁ EXISTENTE digita no cadastro
// para assumir a loja — com os leads e o WhatsApp que já estavam ligados.
//
// uso:  node scripts/gerar-codigo-loja.mjs <slug> [<slug> ...]
//   ex: node scripts/gerar-codigo-loja.mjs otica-diniz-890ef7 centro-47a7bf
//
// Só o HASH vai pro banco (companies.settings.claim_hash); o código aparece aqui, uma vez. Rodar de novo
// para a mesma loja invalida o código anterior. Mesmo alfabeto e hash de src/lib/claim.ts.
import { createClient } from '@supabase/supabase-js'
import { createHash, randomInt } from 'node:crypto'
import { readFileSync } from 'node:fs'

const ALFABETO = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789'
const env = Object.fromEntries(readFileSync('.env.local', 'utf8').split('\n').map(l => l.match(/^([A-Z0-9_]+)=(.*)$/)).filter(Boolean).map(m => [m[1], m[2].replace(/^"|"$/g, '')]))
const sb = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } })

const slugs = process.argv.slice(2)
if (!slugs.length) { console.log('informe o slug da loja. Lojas existentes:'); const { data } = await sb.from('companies').select('slug, name').order('name'); for (const c of data) console.log(`  ${c.slug}   ${c.name}`); process.exit(1) }

for (const slug of slugs) {
  const { data: emp } = await sb.from('companies').select('id, name, settings').eq('slug', slug).maybeSingle()
  if (!emp) { console.log(`${slug}: loja não encontrada`); continue }
  const { count } = await sb.from('users').select('id', { count: 'exact', head: true }).eq('company_id', emp.id)
  const codigo = Array.from({ length: 10 }, () => ALFABETO[randomInt(ALFABETO.length)]).join('')
  const hash = createHash('sha256').update(codigo).digest('hex')
  const { error } = await sb.from('companies').update({ settings: { ...emp.settings, claim_hash: hash } }).eq('id', emp.id)
  if (error) { console.log(`${emp.name}: ERRO ${error.message}`); continue }
  console.log(`${emp.name.padEnd(24)} ${codigo.slice(0, 5)}-${codigo.slice(5)}${count ? `   (atenção: esta loja já tem ${count} usuário(s))` : ''}`)
}
