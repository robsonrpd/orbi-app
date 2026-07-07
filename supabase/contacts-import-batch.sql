-- ============================================================
-- Orbi — Identifica cada importação de planilha (contacts.import_batch_id)
-- ============================================================
-- Cada vez que uma planilha é importada, todos os contatos criados
-- naquela importação recebem o mesmo import_batch_id. Isso permite
-- excluir "essa planilha" especificamente, sem afetar outras
-- importações feitas em momentos diferentes.
-- ============================================================

alter table public.contacts add column if not exists import_batch_id uuid;

create index if not exists contacts_import_batch_idx on public.contacts(import_batch_id) where import_batch_id is not null;

-- ============================================================
-- Pronto. Execute este script no SQL Editor do Supabase.
-- ============================================================
