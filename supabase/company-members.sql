-- ============================================================
-- Orbi — Multi-empresa por login (company_members)
-- ============================================================
-- Permite que o MESMO login (dono) acesse mais de uma empresa,
-- cada uma 100% isolada (sem compartilhar clientes/dados entre si).
-- Funcionário com login próprio (role='staff') NUNCA usa isso —
-- continua preso a uma única empresa, sem opção de trocar.
-- ============================================================

create table if not exists public.company_members (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users(id) on delete cascade,
  company_id  uuid not null references public.companies(id) on delete cascade,
  created_at  timestamptz not null default now(),
  unique (user_id, company_id)
);

create index if not exists company_members_user_idx on public.company_members(user_id);
create index if not exists company_members_company_idx on public.company_members(company_id);

-- RLS (defense-in-depth; o app usa service role e ignora isto)
alter table public.company_members enable row level security;
drop policy if exists orbi_own_membership on public.company_members;
create policy orbi_own_membership on public.company_members
  for select
  to authenticated
  using (user_id = auth.uid());

-- Backfill: toda conta existente vira "membro" da própria empresa atual.
-- Não é estritamente necessário (o app tem fallback pra contas sem
-- membership), mas deixa os dados consistentes desde já.
insert into public.company_members (user_id, company_id)
select id, company_id from public.users where company_id is not null
on conflict (user_id, company_id) do nothing;

-- ============================================================
-- Pronto. Execute este script no SQL Editor do Supabase.
-- ============================================================
