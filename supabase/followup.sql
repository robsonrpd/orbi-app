-- ============================================================
-- Orbi — Follow-up automático de lead em silêncio
-- ============================================================
-- followup_etapa: quantos follow-ups já foram enviados nesta conversa.
--   O contador só cresce, então a mesma cobrança nunca sai duas vezes.
--   Volta a zero assim que o cliente responde (o silêncio recomeça do início).
--
-- followup_ultimo_em: quando saiu o último follow-up. É a partir dele que
--   se conta o intervalo até o próximo — não da última mensagem do cliente.
-- ============================================================

alter table public.conversations add column if not exists followup_etapa int default 0;
alter table public.conversations add column if not exists followup_ultimo_em timestamptz;

-- ============================================================
-- Pronto. Execute este script no SQL Editor do Supabase.
-- Rode ANTES de ativar o follow-up na tela de Atendimento Automático.
-- ============================================================
