-- ============================================================
-- Histórico completo das conversas (arquivo de mensagens)
--
-- Problema: conversations.messages guardava só as últimas 40 mensagens e DESCARTAVA o resto. Qualquer
-- conversa maior perdia o começo (421 conversas já estavam no limite).
--
-- Por que não simplesmente aumentar o limite: o webhook lê e regrava a conversa inteira a cada mensagem
-- recebida. Com 500 mensagens guardadas isso seriam ~125 KB lidos por mensagem — estoura os 5 GB/mês de
-- tráfego do plano gratuito do Supabase. Então a conversa ATIVA continua leve (as últimas 40) e tudo o
-- que sai dela vai para esta tabela, de onde a tela busca sob demanda ("ver mensagens anteriores").
--
-- O trigger faz isso para QUALQUER código que mexa em conversations.messages (webhook, envio manual,
-- cron, importação): ninguém precisa lembrar de arquivar.
-- ============================================================

create table if not exists public.mensagens_arquivo (
  id               bigserial primary key,
  company_id       uuid not null references public.companies(id) on delete cascade,
  conversation_id  uuid not null references public.conversations(id) on delete cascade,
  ts               timestamptz not null,
  msg              jsonb not null,
  chave            text not null,
  unique (conversation_id, chave)
);
create index if not exists mensagens_arquivo_conversa_idx on public.mensagens_arquivo (conversation_id, ts desc);

-- só o servidor lê/grava (RLS ligado e nenhuma policy)
alter table public.mensagens_arquivo enable row level security;

-- Identidade de uma mensagem: o id do WhatsApp quando existe; senão um hash de papel+hora+texto.
-- O status (✓/✓✓) NÃO entra na chave, então ler uma mensagem não a "duplica".
create or replace function public.chave_mensagem(m jsonb)
returns text
language sql
immutable
as $$
  select coalesce(
    nullif(m ->> 'waId', ''),
    md5(coalesce(m ->> 'role', '') || '|' || coalesce(m ->> 'ts', '') || '|' || coalesce(m ->> 'content', ''))
  )
$$;

-- hora da mensagem, tolerante a lixo
create or replace function public.hora_mensagem(m jsonb)
returns timestamptz
language plpgsql
immutable
as $$
begin
  return coalesce((m ->> 'ts')::timestamptz, 'epoch'::timestamptz);
exception when others then
  return 'epoch'::timestamptz;
end;
$$;

-- Arquiva o que SAIU da conversa. Só roda quando a lista não cresceu (anexar uma mensagem é o caso
-- comum e não descarta nada), o que mantém o custo baixo.
create or replace function public.arquivar_mensagens_cortadas()
returns trigger
language plpgsql
as $$
begin
  if jsonb_typeof(old.messages) = 'array'
     and jsonb_typeof(new.messages) = 'array'
     and jsonb_array_length(old.messages) > 0
     and jsonb_array_length(new.messages) <= jsonb_array_length(old.messages) then
    insert into public.mensagens_arquivo (company_id, conversation_id, ts, msg, chave)
    select old.company_id, old.id, public.hora_mensagem(o.m), o.m, public.chave_mensagem(o.m)
      from jsonb_array_elements(old.messages) as o(m)
     where not exists (
       select 1 from jsonb_array_elements(new.messages) as n(m)
        where public.chave_mensagem(n.m) = public.chave_mensagem(o.m))
    on conflict (conversation_id, chave) do nothing;
  end if;
  return new;
end;
$$;

drop trigger if exists conversations_arquivar_mensagens on public.conversations;
create trigger conversations_arquivar_mensagens
  before update of messages on public.conversations
  for each row execute function public.arquivar_mensagens_cortadas();

-- Mescla um lote de mensagens (ex: histórico do WhatsApp) numa conversa, de forma ATÔMICA:
-- junta com o que já existe (sem duplicar), ordena pela hora real, deixa as mais recentes na conversa
-- ativa e manda o resto para o arquivo. Devolve quantas mensagens eram realmente novas.
create or replace function public.mesclar_mensagens(p_conversation uuid, p_msgs jsonb, p_ativas int default 40)
returns int
language plpgsql
as $$
declare
  v_company uuid;
  v_atuais  jsonb;
  v_antes   int;
  v_todas   jsonb;
  v_total   int;
  v_ativas  jsonb;
  v_ultima  timestamptz;
begin
  select company_id, messages into v_company, v_atuais
    from public.conversations where id = p_conversation for update;
  if v_company is null then return 0; end if;

  -- quantas das mensagens recebidas ainda não estavam na conversa nem no arquivo
  select count(*) into v_antes
    from (select distinct public.chave_mensagem(x.m) as k from jsonb_array_elements(p_msgs) as x(m)) novas
   where not exists (select 1 from jsonb_array_elements(coalesce(v_atuais, '[]'::jsonb)) a(m) where public.chave_mensagem(a.m) = novas.k)
     and not exists (select 1 from public.mensagens_arquivo r where r.conversation_id = p_conversation and r.chave = novas.k);

  -- união sem duplicar (a versão já existente vence: tem status/mídia que o histórico não tem), em ordem de hora
  select coalesce(jsonb_agg(u.m order by u.t, u.ord), '[]'::jsonb), count(*)
    into v_todas, v_total
    from (
      select distinct on (k) m, t, ord
        from (
          select a.m, public.chave_mensagem(a.m) as k, public.hora_mensagem(a.m) as t, 0 as prio, a.ord::int as ord
            from jsonb_array_elements(coalesce(v_atuais, '[]'::jsonb)) with ordinality as a(m, ord)
          union all
          select b.m, public.chave_mensagem(b.m), public.hora_mensagem(b.m), 1, b.ord::int + 100000
            from jsonb_array_elements(p_msgs) with ordinality as b(m, ord)
        ) z
       order by k, prio
    ) u;

  -- o que não cabe na conversa ativa vai para o arquivo
  insert into public.mensagens_arquivo (company_id, conversation_id, ts, msg, chave)
  select v_company, p_conversation, public.hora_mensagem(e.m), e.m, public.chave_mensagem(e.m)
    from jsonb_array_elements(v_todas) with ordinality as e(m, ord)
   where e.ord <= greatest(v_total - p_ativas, 0)
  on conflict (conversation_id, chave) do nothing;

  select coalesce(jsonb_agg(e.m order by e.ord), '[]'::jsonb) into v_ativas
    from jsonb_array_elements(v_todas) with ordinality as e(m, ord)
   where e.ord > greatest(v_total - p_ativas, 0);

  select max(public.hora_mensagem(e.m)) into v_ultima from jsonb_array_elements(v_todas) as e(m);

  update public.conversations
     set messages = v_ativas,
         -- a conversa nunca "volta no tempo"
         last_message_at = greatest(coalesce(last_message_at, 'epoch'::timestamptz), coalesce(v_ultima, 'epoch'::timestamptz))
   where id = p_conversation;

  return v_antes;
end;
$$;

-- contatos da loja pelos 8 últimos dígitos do telefone, vários de uma vez (a importação confere centenas)
create or replace function public.contatos_por_chaves(p_company uuid, p_chaves text[])
returns table (id uuid, phone text, chave text, name text)
language sql
stable
as $$
  select c.id, c.phone, right(regexp_replace(c.phone, '\D', '', 'g'), 8) as chave, c.name
    from public.contacts c
   where c.company_id = p_company
     and right(regexp_replace(c.phone, '\D', '', 'g'), 8) = any (p_chaves)
$$;

-- Funções que mexem em conversas de QUALQUER loja pelo id: só o servidor (service_role) pode chamar.
revoke all on function public.mesclar_mensagens(uuid, jsonb, int)    from public, anon, authenticated;
revoke all on function public.contatos_por_chaves(uuid, text[])      from public, anon, authenticated;
grant execute on function public.mesclar_mensagens(uuid, jsonb, int) to service_role;
grant execute on function public.contatos_por_chaves(uuid, text[])   to service_role;
