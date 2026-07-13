-- ============================================================
-- Orbi — Foto de perfil do contato (WhatsApp)
-- ============================================================
-- Guarda a URL da foto de perfil do WhatsApp de cada contato,
-- buscada uma vez na Evolution API quando o contato é capturado
-- automaticamente (1ª mensagem recebida) e reaproveitada depois
-- (sem precisar buscar de novo a cada mensagem).
-- ============================================================

alter table public.contacts add column if not exists foto_url text;

-- ============================================================
-- Pronto. Execute este script no SQL Editor do Supabase.
-- ============================================================
