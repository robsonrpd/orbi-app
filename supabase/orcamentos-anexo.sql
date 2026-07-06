-- ============================================================
-- Orbi — Anexo de arquivo modelo nos Orçamentos
-- ============================================================
-- Permite anexar um arquivo (PDF/Word/Excel) já pronto ao
-- orçamento, em vez de montar tudo manualmente pelo sistema.
-- ============================================================

alter table public.orcamentos add column if not exists anexo_url text;
alter table public.orcamentos add column if not exists anexo_nome text;

-- ============================================================
-- Pronto. Execute este script no SQL Editor do Supabase.
-- ============================================================
