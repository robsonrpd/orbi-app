-- ============================================================
-- Tiques de entrega/leitura nas mensagens + buscas diretas (sem baixar tabela inteira)
--
-- 1) STATUS DA MENSAGEM (✓ enviada, ✓✓ entregue, ✓✓ azul lida)
--    A Evolution avisa por webhook (MESSAGES_UPDATE) quando uma mensagem é entregue/lida.
--    atualizar_status_mensagem grava o status DENTRO do jsonb, no próprio banco: não baixa nem
--    reenvia o histórico da conversa (cada aviso custaria ~20 KB de tráfego; são 2-3 por mensagem).
--    O status só SOBE (enviada < entregue < lida): um aviso atrasado nunca "desfaz" uma leitura.
--
-- 2) status_em / atividade_em
--    Ler uma mensagem NÃO pode mexer em last_message_at (isso reordena a lista e dispara o alerta
--    de demora). status_em marca "algo mudou nesta conversa" e a atualização incremental da tela
--    usa atividade_em = o maior entre os dois pra perceber a leitura em poucos segundos.
--
-- 3) achar_contato_por_telefone
--    O webhook baixava TODOS os contatos da loja a cada mensagem (~100 KB) só pra achar um.
--    Aqui o banco acha direto, comparando os 8 últimos dígitos (mesma regra de sempre, que
--    resolve o 9º dígito do celular).
-- ============================================================

alter table public.conversations add column if not exists status_em timestamptz;

-- permite achar a conversa de uma mensagem pelo id do WhatsApp (waId) sem varrer a tabela
create index if not exists conversations_messages_gin
  on public.conversations using gin (messages jsonb_path_ops);

-- busca de contato por telefone (8 últimos dígitos, ignorando formatação)
create index if not exists contacts_fone8_idx
  on public.contacts (company_id, (right(regexp_replace(phone, '\D', '', 'g'), 8)));

create or replace function public.atualizar_status_mensagem(
  p_company uuid,
  p_wa_id   text,
  p_status  text
)
returns int
language plpgsql
as $$
declare
  novo int := case p_status when 'sent' then 1 when 'delivered' then 2 when 'read' then 3 else 0 end;
  n    int := 0;
begin
  if novo = 0 or coalesce(p_wa_id, '') = '' then return 0; end if;

  update public.conversations c
     set messages = (
           select jsonb_agg(
                    case
                      when e.m ->> 'waId' = p_wa_id
                       and (case coalesce(e.m ->> 'status', '')
                              when 'read' then 3 when 'delivered' then 2 when 'sent' then 1 else 0 end) < novo
                      then jsonb_set(e.m, '{status}', to_jsonb(p_status))
                      else e.m
                    end
                    order by e.i)
             from jsonb_array_elements(c.messages) with ordinality as e(m, i)
         ),
         status_em = now()
   where c.company_id = p_company
     and c.messages @> jsonb_build_array(jsonb_build_object('waId', p_wa_id))
     -- só toca a conversa se alguma mensagem ainda vai MUDAR de status (evita reescrever o jsonb à toa)
     and exists (
           select 1 from jsonb_array_elements(c.messages) x(m)
            where x.m ->> 'waId' = p_wa_id
              and (case coalesce(x.m ->> 'status', '')
                     when 'read' then 3 when 'delivered' then 2 when 'sent' then 1 else 0 end) < novo);

  get diagnostics n = row_count;
  return n;
end;
$$;

-- (achar_contato_por_telefone é criada em fotos.sql, que devolve também foto_tentada_em)

-- Lista de conversas: agora devolve atividade_em e filtra por ela (troca a assinatura, por isso o drop).
drop function if exists public.conversas_resumo(uuid, int, timestamptz);
create function public.conversas_resumo(
  p_company uuid,
  p_limite  int default 500,
  p_desde   timestamptz default null
)
returns table (
  id              uuid,
  numero          text,
  contact_id      uuid,
  grupo_nome      text,
  last_message_at timestamptz,
  atividade_em    timestamptz,
  handled_by_ai   boolean,
  ultima_texto    text,
  ultima_midia    text
)
language sql
stable
as $$
  select c.id, c.numero, c.contact_id, c.grupo_nome, c.last_message_at,
         greatest(c.last_message_at, c.status_em),
         c.handled_by_ai,
         left(c.messages -> -1 ->> 'content', 160),
         c.messages -> -1 -> 'midia' ->> 'tipo'
  from public.conversations c
  where c.company_id = p_company
    and (p_desde is null or greatest(c.last_message_at, c.status_em) >= p_desde)
  order by c.last_message_at desc nulls last
  limit least(greatest(p_limite, 1), 1000)
$$;

-- Estas funções leem/gravam conversas de QUALQUER empresa pelo id informado. Funções em "public" ficam
-- expostas à API pública por padrão: sem o revoke, quem tivesse a chave anônima mexeria em outra loja.
-- Só o servidor (service_role) pode chamar.
revoke all on function public.atualizar_status_mensagem(uuid, text, text) from public, anon, authenticated;
revoke all on function public.conversas_resumo(uuid, int, timestamptz)    from public, anon, authenticated;
grant execute on function public.atualizar_status_mensagem(uuid, text, text) to service_role;
grant execute on function public.conversas_resumo(uuid, int, timestamptz)    to service_role;
