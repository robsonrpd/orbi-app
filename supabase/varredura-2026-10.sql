-- ============================================================
-- Varredura de 2026-10-30 (depois do bug das conversas duplicadas)
--
-- 1) Mais dois lugares do código dependiam de "só existe UMA linha" sem o banco garantir isso (mesmo defeito:
--    .maybeSingle() dá erro com 2+ linhas e o código entendia "não existe"):
--      - um acesso de vendedor por vendedor (users.vendedor_id)
--      - um envio em massa ATIVO por loja (broadcasts)
--    Agora o banco garante.
-- 2) vincular_conversas_a_contatos(): liga ao contato as conversas que ficaram sem vínculo (resíduo das duplicatas).
--    Só liga quando há UM único contato com os mesmos 8 últimos dígitos E o mesmo DDD (o 8 finais sozinho já
--    confundiria 69 com 99). Ambíguo = não liga.
-- ============================================================

create unique index if not exists users_vendedor_uniq
  on public.users (vendedor_id) where vendedor_id is not null;

create unique index if not exists broadcasts_um_ativo_por_loja
  on public.broadcasts (company_id) where status = 'ativo';

create or replace function public.vincular_conversas_a_contatos()
returns int
language plpgsql
as $$
declare
  v_n int;
begin
  with conv as (
    select c.id, c.company_id,
           right(regexp_replace(c.numero, '\D', '', 'g'), 8) as k,
           case when regexp_replace(c.numero, '\D', '', 'g') ~ '^55\d{10,11}$'
                then substr(regexp_replace(c.numero, '\D', '', 'g'), 3, 2) end as ddd
      from public.conversations c
     where c.contact_id is null and c.numero is not null and c.numero not like '%@%'
  ),
  par as (
    select conv.id as conv_id, ct.id as contact_id,
           count(*) over (partition by conv.id) as candidatos
      from conv
      join public.contacts ct on ct.company_id = conv.company_id
       and right(regexp_replace(ct.phone, '\D', '', 'g'), 8) = conv.k
       and (conv.ddd is null
            or regexp_replace(ct.phone, '\D', '', 'g') !~ '^55\d{10,11}$'
            or substr(regexp_replace(ct.phone, '\D', '', 'g'), 3, 2) = conv.ddd)
  )
  update public.conversations c set contact_id = par.contact_id
    from par where par.conv_id = c.id and par.candidatos = 1;
  get diagnostics v_n = row_count;
  return v_n;
end;
$$;

revoke all on function public.vincular_conversas_a_contatos() from public, anon, authenticated;
grant execute on function public.vincular_conversas_a_contatos() to service_role;
