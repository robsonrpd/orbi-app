-- ============================================================
-- UMA conversa por número (e gravação atômica da mensagem)
--
-- BUG: o webhook buscava "a conversa deste número" com .maybeSingle(). Quando existem DUAS, o PostgREST dá
-- erro ("mais de uma linha"), o código ignorava o erro, entendia "não existe" e CRIAVA OUTRA — e dali em
-- diante cada mensagem nova criava mais uma conversa, para sempre. O primeiro par nascia numa corrida (várias
-- mensagens do mesmo número chegando juntas, ex: o despejo do acumulado depois de uma queda do servidor).
-- Resultado em produção: 7.101 conversas para 3.510 números; a tela mostra UMA das ~30 linhas de um mesmo
-- cliente, com 1 mensagem, e o resto some. Foi o que o cliente reportou ("não carregou a mensagem completa").
--
-- Correção:
--  1) unificar_conversas_duplicadas(): junta as linhas repetidas na mais antiga (ativas + arquivo, sem
--     duplicar mensagem) e guarda uma cópia das linhas removidas em conversations_duplicadas_backup;
--  2) índice ÚNICO (company_id, numero): duplicata passa a ser impossível, não só improvável;
--  3) anexar_mensagem(): cria-se-não-existe E acrescenta a mensagem numa única operação travada (FOR UPDATE).
--     Elimina também o "ler-e-regravar" do webhook, em que duas mensagens quase simultâneas se sobrescreviam
--     e uma se perdia.
-- ============================================================

create table if not exists public.conversations_duplicadas_backup (like public.conversations including defaults);
alter table public.conversations_duplicadas_backup enable row level security;

create or replace function public.unificar_conversas_duplicadas()
returns table (grupos int, linhas_removidas int)
language plpgsql
as $$
declare
  g        record;
  v_canon  uuid;
  v_msgs   jsonb;
  v_contat uuid;
  v_rem    int;
  v_grupos int := 0;
  v_linhas int := 0;
begin
  for g in
    select company_id, numero from public.conversations
     where numero is not null
     group by company_id, numero having count(*) > 1
  loop
    -- a que fica: a ligada a um contato e, entre elas, a mais antiga
    select id into v_canon from public.conversations
     where company_id = g.company_id and numero = g.numero
     order by (contact_id is not null) desc, created_at asc, id
     limit 1;

    -- mensagens de TODAS as outras linhas (ativas + arquivo); a canônica já tem as dela
    select coalesce(jsonb_agg(s.m), '[]'::jsonb) into v_msgs from (
      select e.m
        from public.conversations c, jsonb_array_elements(c.messages) as e(m)
       where c.company_id = g.company_id and c.numero = g.numero and c.id <> v_canon
      union all
      select a.msg
        from public.mensagens_arquivo a join public.conversations c on c.id = a.conversation_id
       where c.company_id = g.company_id and c.numero = g.numero and c.id <> v_canon
    ) s;

    -- mescla sem duplicar, em ordem de hora, 40 ativas + resto no arquivo
    perform public.mesclar_mensagens(v_canon, v_msgs, 40);

    -- se só uma das duplicadas estava ligada a um contato, a canônica herda o vínculo
    select contact_id into v_contat from public.conversations
     where company_id = g.company_id and numero = g.numero and contact_id is not null
     order by created_at limit 1;
    update public.conversations set contact_id = coalesce(contact_id, v_contat) where id = v_canon;

    -- guarda cópia e remove as repetidas (o arquivo delas já foi mesclado acima)
    insert into public.conversations_duplicadas_backup
      select * from public.conversations where company_id = g.company_id and numero = g.numero and id <> v_canon;
    delete from public.conversations where company_id = g.company_id and numero = g.numero and id <> v_canon;
    get diagnostics v_rem = row_count;

    v_grupos := v_grupos + 1;
    v_linhas := v_linhas + v_rem;
  end loop;

  return query select v_grupos, v_linhas;
end;
$$;

-- Acrescenta UMA mensagem a conversa do número, criando a conversa se ainda não existir, de forma atômica.
-- Devolve o id da conversa. Mensagem repetida (o Evolution reenvia) não duplica.
create or replace function public.anexar_mensagem(
  p_company uuid, p_numero text, p_contact uuid, p_msg jsonb, p_marcar_cliente boolean default true
)
returns uuid
language plpgsql
as $$
declare
  v_id    uuid;
  v_msgs  jsonb;
  v_novas jsonb;
  v_chave text        := public.chave_mensagem(p_msg);
  v_ts    timestamptz := public.hora_mensagem(p_msg);
  v_ult   jsonb;
begin
  insert into public.conversations (company_id, contact_id, numero, messages, last_message_at, handled_by_ai)
  values (p_company, p_contact, p_numero, '[]'::jsonb, v_ts, false)
  on conflict (company_id, numero) where numero is not null do nothing;

  -- trava a linha: duas mensagens do mesmo número processadas ao mesmo tempo entram uma depois da outra
  select id, messages into v_id, v_msgs
    from public.conversations where company_id = p_company and numero = p_numero for update;
  if v_id is null then return null; end if;

  if exists (select 1 from jsonb_array_elements(v_msgs) as x(m) where public.chave_mensagem(x.m) = v_chave)
     or exists (select 1 from public.mensagens_arquivo r where r.conversation_id = v_id and r.chave = v_chave) then
    return v_id;
  end if;

  v_novas := v_msgs || jsonb_build_array(p_msg);
  v_ult := v_msgs -> -1;
  -- chegou fora de ordem (acumulado/histórico): reordena pela hora real
  if v_ult is not null and v_ts < public.hora_mensagem(v_ult) then
    select coalesce(jsonb_agg(e.m order by public.hora_mensagem(e.m), e.ord), '[]'::jsonb) into v_novas
      from jsonb_array_elements(v_novas) with ordinality as e(m, ord);
  end if;
  -- só as 40 mais recentes ficam na conversa ativa (o trigger manda o resto para o arquivo)
  if jsonb_array_length(v_novas) > 40 then
    select coalesce(jsonb_agg(e.m order by e.ord), '[]'::jsonb) into v_novas
      from jsonb_array_elements(v_novas) with ordinality as e(m, ord)
     where e.ord > jsonb_array_length(v_novas) - 40;
  end if;

  update public.conversations
     set messages        = v_novas,
         last_message_at = greatest(coalesce(last_message_at, 'epoch'::timestamptz), v_ts),
         contact_id      = coalesce(contact_id, p_contact),
         handled_by_ai   = case when p_marcar_cliente then false else handled_by_ai end
   where id = v_id;
  return v_id;
end;
$$;

revoke all on function public.unificar_conversas_duplicadas()                       from public, anon, authenticated;
revoke all on function public.anexar_mensagem(uuid, text, uuid, jsonb, boolean)      from public, anon, authenticated;
grant execute on function public.unificar_conversas_duplicadas()                    to service_role;
grant execute on function public.anexar_mensagem(uuid, text, uuid, jsonb, boolean)   to service_role;
