-- ============================================================
-- Fotos de perfil dos contatos: tentativas registradas + fila de pendentes
--
-- Dois problemas reais:
--  1) O link de foto do WhatsApp (pps.whatsapp.net) VENCE em ~2 semanas (parâmetro "oe"). Guardar o
--     link fazia a foto sumir sozinha. Agora a imagem é baixada, reduzida e hospedada no Storage
--     (link permanente). Os links antigos são migrados em segundo plano antes de vencer.
--  2) A foto só era buscada na PRIMEIRA mensagem do contato. Se essa tentativa falhasse (o WhatsApp
--     às vezes ainda não "enxerga" o contato novo), nunca mais era tentada. foto_tentada_em permite
--     tentar de novo sem martelar quem simplesmente esconde a foto.
-- ============================================================

alter table public.contacts add column if not exists foto_tentada_em timestamptz;

-- troca a assinatura (agora devolve foto_tentada_em), por isso o drop
drop function if exists public.achar_contato_por_telefone(uuid, text);
create function public.achar_contato_por_telefone(p_company uuid, p_chave text)
returns table (id uuid, phone text, foto_url text, foto_tentada_em timestamptz)
language sql
stable
as $$
  select c.id, c.phone, c.foto_url, c.foto_tentada_em
    from public.contacts c
   where c.company_id = p_company
     and right(regexp_replace(c.phone, '\D', '', 'g'), 8) = p_chave
   order by c.created_at
   limit 1
$$;

-- Contatos que precisam de foto, na ordem em que vale a pena buscar:
--   1º) quem tem link do WhatsApp (vai vencer): migrar pro Storage; revisita no máximo 1x por dia
--   2º) quem não tem foto: tenta de novo a cada 3 dias (a pessoa pode ter colocado uma)
-- dentro de cada grupo, as conversas mais recentes primeiro (são as que aparecem no topo da lista).
create or replace function public.fotos_pendentes(p_company uuid, p_limite int default 8)
returns table (id uuid, phone text, foto_url text)
language sql
stable
as $$
  select c.id, c.phone, c.foto_url
    from public.contacts c
    left join lateral (
      select max(v.last_message_at) as ultima from public.conversations v where v.contact_id = c.id
    ) u on true
   where c.company_id = p_company
     and c.active
     and (
          (c.foto_url like '%pps.whatsapp.net%' and (c.foto_tentada_em is null or c.foto_tentada_em < now() - interval '1 day'))
       or (c.foto_url is null                  and (c.foto_tentada_em is null or c.foto_tentada_em < now() - interval '3 days'))
     )
   order by (c.foto_url is not null) desc, u.ultima desc nulls last
   limit least(greatest(p_limite, 1), 50)
$$;

revoke all on function public.achar_contato_por_telefone(uuid, text) from public, anon, authenticated;
revoke all on function public.fotos_pendentes(uuid, int)             from public, anon, authenticated;
grant execute on function public.achar_contato_por_telefone(uuid, text) to service_role;
grant execute on function public.fotos_pendentes(uuid, int)             to service_role;
