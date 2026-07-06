-- ============================================================
-- Orbi — Tabela de Projetos (nicho Geral / editoras e afins)
-- ============================================================
-- Kanban genérico de projetos: nome, cliente, responsável, valor,
-- prazo e status. Usado por empresas do nicho "geral" (ex: editoras)
-- que não se encaixam no fluxo de Ordem de Serviço da ótica.
-- ============================================================

create table if not exists public.projetos (
  id           uuid primary key default gen_random_uuid(),
  company_id   uuid not null references public.companies(id) on delete cascade,
  nome         text not null,
  contact_id   uuid references public.contacts(id) on delete set null,
  responsavel  text,
  valor        numeric(12,2) default 0,
  prazo        date,
  status       text not null default 'planejamento'
               check (status in ('planejamento', 'andamento', 'revisao', 'concluido')),
  notas        text,
  created_at   timestamptz not null default now()
);

create index if not exists projetos_company_idx on public.projetos(company_id);

-- RLS (defense-in-depth; o app usa service role e ignora isto)
alter table public.projetos enable row level security;
drop policy if exists orbi_same_company on public.projetos;
create policy orbi_same_company on public.projetos
  for all
  to authenticated
  using (company_id = public.current_company_id())
  with check (company_id = public.current_company_id());

-- ============================================================
-- Pronto. Execute este script no SQL Editor do Supabase.
-- ============================================================
