-- ============================================================
-- Orbi — Rastreio de quem inseriu o contato (contacts.criado_por)
-- ============================================================
-- Texto livre (nome do usuário ou origem automática: "WhatsApp",
-- "Importação", "Agendamento online") — não é FK pra manter simples
-- e sobreviver a usuários removidos.
-- ============================================================

alter table public.contacts add column if not exists criado_por text;

-- ============================================================
-- Pronto. Execute este script no SQL Editor do Supabase.
-- ============================================================
