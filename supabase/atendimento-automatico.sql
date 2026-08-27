-- ============================================================
-- Orbi — Atendimento automático do primeiro contato + SLA de resposta
-- ============================================================
-- fluxo_etapa: em que ponto do roteiro de boas-vindas a conversa está.
--   null  = o lead ainda não entrou no fluxo
--   N     = próxima etapa a enviar (se a etapa N-1 era pergunta, está aguardando resposta)
--   >= total de etapas = roteiro concluído
--   Esse ponteiro é o que impede o Orbi de reenviar a mesma mensagem — proteção
--   direta contra o padrão de repetição que derruba número no WhatsApp.
--
-- sla_alertado_em / sla_transferido_em: evitam avisar ou transferir o mesmo
--   lead várias vezes a cada passagem da rotina automática.
-- ============================================================

alter table public.conversations add column if not exists fluxo_etapa int;
alter table public.conversations add column if not exists sla_alertado_em timestamptz;
alter table public.conversations add column if not exists sla_transferido_em timestamptz;

-- a rotina de SLA varre conversas paradas; sem índice ela leria a tabela toda
create index if not exists conversations_sla_idx
  on public.conversations(company_id, last_message_at);

-- ============================================================
-- Pronto. Execute este script no SQL Editor do Supabase.
-- Rode ANTES de atualizar o sistema.
-- Lembre de desligar a tradução automática do Chrome nesta página.
-- ============================================================
