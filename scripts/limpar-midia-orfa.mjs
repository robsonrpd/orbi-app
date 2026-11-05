// Limpeza de MÍDIA ÓRFÃ do Storage (bucket "fotos"): arquivos de conversa (<loja>/wa/...) que NENHUMA linha do
// banco cita mais — não aparecem em tela nenhuma, só ocupam o limite de 1 GB do plano grátis.
//
//   node scripts/limpar-midia-orfa.mjs            -> só MOSTRA o que seria removido (nada é apagado)
//   node scripts/limpar-midia-orfa.mjs --apagar   -> remove de verdade (irreversível)
//
// Segurança: "citado" = o caminho do arquivo aparece em QUALQUER coluna de QUALQUER tabela (conversas, arquivo
// de mensagens, backups, produtos, logos...). Só entra na lista o que tem mais de 2 dias (mídia que acabou de
// chegar ainda pode estar a caminho da conversa). Fotos de perfil e qualquer pasta que não seja wa/ ficam de fora.
// Lê o .env.local; usa a senha do banco e a chave do servidor, e não imprime nenhuma.
import pg from 'pg'
import { createClient } from '@supabase/supabase-js'
import { readFileSync } from 'fs'

const env = Object.fromEntries(readFileSync('.env.local', 'utf8').split('\n').map(l => l.match(/^([A-Z0-9_]+)=(.*)$/)).filter(Boolean).map(m => [m[1], m[2].replace(/^"|"$/g, '')]))
const APAGAR = process.argv.includes('--apagar')
const IDADE_MINIMA = '2 days'

const c = new pg.Client({ host: 'aws-0-sa-east-1.pooler.supabase.com', port: 5432, user: 'postgres.ghluqagnpaakeaiwglpu', password: env.SUPABASE_DB_PASSWORD, database: 'postgres', ssl: { rejectUnauthorized: false } })
await c.connect()

const tabelas = (await c.query(`select table_name from information_schema.tables where table_schema='public' and table_type='BASE TABLE'`)).rows.map(r => r.table_name)
await c.query(`create temp table citados(name text)`)
for (const t of tabelas) {
  await c.query(`insert into citados select distinct m[1] from public."${t}" x, regexp_matches(x::text, 'object/public/fotos/([^"\\\\ ,)]+)', 'g') m`)
}
const orfaos = (await c.query(`
  select o.name, (o.metadata->>'size')::bigint as tam
    from storage.objects o
    left join (select distinct name from citados) r on r.name = o.name
   where o.bucket_id = 'fotos' and o.name like '%/wa/%' and r.name is null
     and o.created_at < now() - interval '${IDADE_MINIMA}'
   order by o.created_at`)).rows
await c.end()

const mb = orfaos.reduce((a, o) => a + Number(o.tam || 0), 0) / 1e6
console.log(`Arquivos de mídia sem uso: ${orfaos.length} (${mb.toFixed(0)} MB)`)
if (!APAGAR) { console.log('Nada foi apagado. Para remover: node scripts/limpar-midia-orfa.mjs --apagar'); process.exit(0) }

const sb = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } })
let removidos = 0, falhas = 0
for (let i = 0; i < orfaos.length; i += 100) {
  const lote = orfaos.slice(i, i + 100).map(o => o.name)
  const { data, error } = await sb.storage.from('fotos').remove(lote)
  if (error) { falhas += lote.length; console.error('lote falhou:', error.message); continue }
  removidos += data?.length ?? 0
}
console.log(`Removidos: ${removidos} | falhas: ${falhas}`)
