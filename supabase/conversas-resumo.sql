-- ============================================================
-- Resumo leve das conversas (sem o histórico de mensagens)
--
-- Por que existe: a tela de Conversas atualizava a lista a cada 6 segundos baixando até
-- 500 conversas COM o histórico inteiro de cada uma (~1,2 MB por atualização). Uma única
-- aba aberta consumia ~6 GB por dia de 8h; a cota GRATUITA do Supabase é 5 GB por MÊS.
-- A lista só precisa do texto da última mensagem — aqui o banco devolve só isso.
--
-- p_desde: devolve só as conversas com atividade a partir dessa data (atualização
-- incremental: quando nada mudou, a resposta é vazia).
-- ============================================================

create or replace function public.conversas_resumo(
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
  handled_by_ai   boolean,
  ultima_texto    text,
  ultima_midia    text
)
language sql
stable
as $$
  select c.id, c.numero, c.contact_id, c.grupo_nome, c.last_message_at, c.handled_by_ai,
         left(c.messages -> -1 ->> 'content', 160),
         c.messages -> -1 -> 'midia' ->> 'tipo'
  from public.conversations c
  where c.company_id = p_company
    and (p_desde is null or c.last_message_at >= p_desde)
  order by c.last_message_at desc nulls last
  limit least(greatest(p_limite, 1), 1000)
$$;

-- Esta função lê conversas de QUALQUER empresa pelo id informado. Funções em "public" ficam
-- expostas à API pública por padrão: sem o revoke abaixo, quem tivesse a chave anônima
-- poderia listar as conversas de outra loja. Só o servidor (service_role) pode chamar.
revoke all on function public.conversas_resumo(uuid, int, timestamptz) from public, anon, authenticated;
grant execute on function public.conversas_resumo(uuid, int, timestamptz) to service_role;
