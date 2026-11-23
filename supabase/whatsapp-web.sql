-- ============================================================
-- Recursos "de WhatsApp Web" no Orbi
--
-- 1) agenda_contatos: os contatos SALVOS NO CELULAR da loja (nome da agenda). O WhatsApp entrega a agenda no
--    pareamento e a cada alteração (eventos CONTACTS_* do Evolution). Usada para achar contato ao mandar cartão de
--    contato e para iniciar conversa nova — igual à lista de contatos do WhatsApp.
-- 2) reagir_mensagem(): grava a reação (👍❤️…) da loja ou do cliente numa mensagem, de forma atômica, na conversa
--    ativa ou no arquivo. Não muda a identidade da mensagem (a chave de deduplicação continua a mesma).
-- ============================================================

create table if not exists public.agenda_contatos (
  company_id    uuid not null references public.companies(id) on delete cascade,
  numero        text not null,
  nome          text not null,
  atualizado_em timestamptz not null default now(),
  primary key (company_id, numero)
);
alter table public.agenda_contatos enable row level security;

create or replace function public.reagir_mensagem(p_company uuid, p_numero text, p_wa_id text, p_quem text, p_emoji text)
returns boolean
language plpgsql
as $$
declare
  v_conv uuid;
  v_n    int;
  v_patch jsonb;
begin
  select id into v_conv from public.conversations where company_id = p_company and numero = p_numero;
  if v_conv is null then return false; end if;

  -- emoji vazio = reação removida
  update public.conversations c
     set messages = (
       select jsonb_agg(case when e.m ->> 'waId' = p_wa_id
                             then case when coalesce(p_emoji, '') = ''
                                       then e.m #- array['reacoes', p_quem]
                                       else jsonb_set(e.m, '{reacoes}', coalesce(e.m -> 'reacoes', '{}'::jsonb) || jsonb_build_object(p_quem, p_emoji)) end
                             else e.m end order by e.ord)
         from jsonb_array_elements(c.messages) with ordinality as e(m, ord))
   where c.id = v_conv
     and exists (select 1 from jsonb_array_elements(c.messages) as x(m) where x.m ->> 'waId' = p_wa_id);
  get diagnostics v_n = row_count;
  if v_n > 0 then return true; end if;

  update public.mensagens_arquivo
     set msg = case when coalesce(p_emoji, '') = '' then msg #- array['reacoes', p_quem]
                    else jsonb_set(msg, '{reacoes}', coalesce(msg -> 'reacoes', '{}'::jsonb) || jsonb_build_object(p_quem, p_emoji)) end
   where conversation_id = v_conv and msg ->> 'waId' = p_wa_id;
  get diagnostics v_n = row_count;
  return v_n > 0;
end;
$$;

revoke all on function public.reagir_mensagem(uuid, text, text, text, text) from public, anon, authenticated;
grant execute on function public.reagir_mensagem(uuid, text, text, text, text) to service_role;
