-- ============================================================
-- Orbi — Tamanho e cor nos produtos (roupa e acessório)
-- ============================================================
-- Loja de roupa vende a mesma peça em vários tamanhos e cores, e cada
-- combinação tem estoque próprio. Com tamanho e cor em campos separados
-- (em vez de escondidos no nome), dá pra mostrar na etiqueta, filtrar no
-- PDV e, mais pra frente, cadastrar a grade inteira de uma vez.
-- ============================================================

alter table public.products add column if not exists tamanho text;
alter table public.products add column if not exists cor text;

-- ============================================================
-- Pronto. Execute este script no SQL Editor do Supabase.
-- Rode ANTES de atualizar o sistema.
-- Lembre de desligar a tradução automática do Chrome nesta página.
-- ============================================================
