-- ============================================================
-- Orbi — Deduplicação de mensagens do webhook do WhatsApp
-- ============================================================
-- Evita reprocessar (e duplicar na conversa/CRM) a MESMA mensagem
-- recebida duas vezes — acontece quando a Evolution API reenvia o
-- webhook por timeout/erro de rede e o Orbi não tinha como saber
-- que já tinha processado aquela mensagem específica.
-- ============================================================

create table if not exists public.whatsapp_mensagens_processadas (
  message_id  text primary key,
  created_at  timestamptz not null default now()
);

-- limpeza automática: nada precisa ficar guardado por muito tempo,
-- só o suficiente pra pegar reenvios de curto prazo (minutos/horas)
create index if not exists whatsapp_msgs_processadas_created_idx
  on public.whatsapp_mensagens_processadas(created_at);

-- ============================================================
-- Pronto. Execute este script no SQL Editor do Supabase.
-- ============================================================
