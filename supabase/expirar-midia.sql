-- ============================================================
-- Validade da mídia das conversas (padrão: 180 dias)
--
-- Fotos, áudios e vídeos das conversas ficam no Storage, cujo limite no plano gratuito é 1 GB — e crescem sem
-- parar (só em outubro entraram ~520 MB). O TEXTO das mensagens continua para sempre; só o arquivo some depois
-- do prazo, e a tela passa a mostrar "mídia removida" no lugar.
--
-- Esta função marca as mensagens (conversa ativa + arquivo) e devolve os caminhos dos arquivos para o servidor
-- apagar do Storage. A ORDEM importa: primeiro o banco (esta função), depois o arquivo. Se a remoção do arquivo
-- falhar sobra um arquivo sem uso, que scripts/limpar-midia-orfa.mjs recolhe — o contrário (apagar o arquivo e
-- falhar o banco) deixaria uma mensagem com link quebrado.
--
-- O texto/identidade da mensagem (role, ts, content, waId) não muda, então a chave de deduplicação é a mesma e
-- o arquivamento por trigger não confunde isso com mensagem descartada.
-- Trabalha em lotes (p_lote conversas + p_lote mensagens do arquivo por chamada) e pula linhas que o webhook
-- esteja gravando nesse instante.
-- ============================================================

create or replace function public.expirar_midia(p_dias int default 180, p_lote int default 300)
returns table (caminho text)
language plpgsql
as $$
declare
  v_corte timestamptz := now() - make_interval(days => p_dias);
  v_urls  text[] := '{}';
  r       record;
  v_novas jsonb;
  v_u     text[];
begin
  -- conversas ativas
  for r in
    select c.id, c.messages
      from public.conversations c
     where jsonb_typeof(c.messages) = 'array'
       and exists (select 1 from jsonb_array_elements(c.messages) as e(m)
                    where e.m ? 'midia' and public.hora_mensagem(e.m) < v_corte)
     limit p_lote
       for update skip locked
  loop
    select jsonb_agg(case when e.m ? 'midia' and public.hora_mensagem(e.m) < v_corte
                          then (e.m - 'midia') || '{"midiaExpirada": true}'::jsonb else e.m end order by e.ord),
           coalesce(array_agg(e.m -> 'midia' ->> 'url') filter (where e.m ? 'midia' and public.hora_mensagem(e.m) < v_corte), '{}')
      into v_novas, v_u
      from jsonb_array_elements(r.messages) with ordinality as e(m, ord);
    update public.conversations set messages = v_novas where id = r.id;
    v_urls := v_urls || v_u;
  end loop;

  -- arquivo de mensagens antigas
  for r in
    select a.id, a.msg
      from public.mensagens_arquivo a
     where a.msg ? 'midia' and a.ts < v_corte
     limit p_lote
       for update skip locked
  loop
    update public.mensagens_arquivo set msg = (r.msg - 'midia') || '{"midiaExpirada": true}'::jsonb where id = r.id;
    v_urls := v_urls || (r.msg -> 'midia' ->> 'url');
  end loop;

  return query
    select distinct substring(u from 'object/public/fotos/(.*)$')
      from unnest(v_urls) as u
     where u is not null and substring(u from 'object/public/fotos/(.*)$') is not null;
end;
$$;

revoke all on function public.expirar_midia(int, int) from public, anon, authenticated;
grant execute on function public.expirar_midia(int, int) to service_role;
