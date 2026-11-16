-- ============================================================
-- Arquivo do histórico baixado sob demanda
--
-- O histórico importado no pareamento guarda só o "endereço" das fotos/áudios/documentos (midiaPendente).
-- Quando alguém clica em "Baixar", o servidor busca o arquivo no WhatsApp, guarda no Storage e esta função troca,
-- de forma atômica, o endereço pelo arquivo (midia) — na conversa ativa ou no arquivo de mensagens antigas.
-- O texto/identidade da mensagem não muda, então a chave de deduplicação é a mesma.
-- ============================================================

create or replace function public.trocar_midia_pendente(p_conversation uuid, p_wa_id text, p_midia jsonb)
returns boolean
language plpgsql
as $$
declare
  v_n int;
begin
  update public.conversations c
     set messages = (
       select jsonb_agg(case when e.m ->> 'waId' = p_wa_id
                             then (e.m - 'midiaPendente') || jsonb_build_object('midia', p_midia) else e.m end order by e.ord)
         from jsonb_array_elements(c.messages) with ordinality as e(m, ord))
   where c.id = p_conversation
     and exists (select 1 from jsonb_array_elements(c.messages) as x(m) where x.m ->> 'waId' = p_wa_id);
  get diagnostics v_n = row_count;
  if v_n > 0 then return true; end if;

  update public.mensagens_arquivo
     set msg = (msg - 'midiaPendente') || jsonb_build_object('midia', p_midia)
   where conversation_id = p_conversation and msg ->> 'waId' = p_wa_id;
  get diagnostics v_n = row_count;
  return v_n > 0;
end;
$$;

revoke all on function public.trocar_midia_pendente(uuid, text, jsonb) from public, anon, authenticated;
grant execute on function public.trocar_midia_pendente(uuid, text, jsonb) to service_role;
