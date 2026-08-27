-- ============================================================
-- Orbi — Conversas de grupo do WhatsApp
-- ============================================================
-- grupo_nome: preenchido só em conversas de grupo (null = conversa normal).
--   Serve de marcador e de nome de exibição ao mesmo tempo.
--
-- Em conversa de grupo o campo "numero" guarda o JID completo do grupo
-- (ex: 120363xxxxx@g.us), e não um telefone. É isso que permite responder
-- no grupo certo — e por isso o código não pode assumir que numero é só dígito.
-- ============================================================

alter table public.conversations add column if not exists grupo_nome text;

-- Conversa de grupo não tem contato: o grupo é a conversa, e os participantes
-- não viram leads. Enquanto contact_id for obrigatório, nenhum grupo consegue
-- ser gravado — a inserção falha e a mensagem do grupo se perde.
alter table public.conversations alter column contact_id drop not null;

-- ============================================================
-- Pronto. Execute este script no SQL Editor do Supabase.
-- Pode rodar agora: a coluna é opcional e nada quebra sem ela.
-- ============================================================
