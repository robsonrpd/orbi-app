-- ============================================================
-- Orbi — Políticas RLS (Row Level Security) por empresa
-- ============================================================
-- Rede de proteção (defense-in-depth). O app acessa os dados pela
-- chave de SERVICE ROLE, que IGNORA o RLS — então estas políticas
-- NÃO quebram nada. Elas só passam a proteger caso algum dia uma
-- leitura seja feita com a chave anon/authenticated no browser.
--
-- Seguro de rodar: o front só usa o Supabase para autenticação.
-- Idempotente: pode rodar mais de uma vez.
-- ============================================================

-- 1) Função auxiliar: company_id do usuário logado (via auth.uid())
--    SECURITY DEFINER para conseguir ler public.users ignorando o RLS.
create or replace function public.current_company_id()
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select company_id from public.users where id = auth.uid()
$$;

-- 2) Habilita RLS + cria política "mesma empresa" para cada tabela tenant
do $$
declare
  t text;
  tenant_tables text[] := array[
    'appointments','caixa_movimentos','caixas','contacts','contas_pagar',
    'movimentacoes_estoque','orcamentos','ordens_servico','products',
    'receitas','services','transactions','vendas','vendedores'
  ];
begin
  foreach t in array tenant_tables loop
    -- só age se a tabela existir
    if exists (select 1 from information_schema.tables
               where table_schema = 'public' and table_name = t) then
      execute format('alter table public.%I enable row level security;', t);
      execute format('drop policy if exists orbi_same_company on public.%I;', t);
      execute format($p$
        create policy orbi_same_company on public.%I
        for all
        to authenticated
        using (company_id = public.current_company_id())
        with check (company_id = public.current_company_id());
      $p$, t);
    end if;
  end loop;
end $$;

-- 3) Tabela companies: usuário só enxerga a própria empresa
alter table public.companies enable row level security;
drop policy if exists orbi_own_company on public.companies;
create policy orbi_own_company on public.companies
  for all
  to authenticated
  using (id = public.current_company_id())
  with check (id = public.current_company_id());

-- 4) Tabela users: usuário só enxerga colegas da mesma empresa
alter table public.users enable row level security;
drop policy if exists orbi_company_users on public.users;
create policy orbi_company_users on public.users
  for all
  to authenticated
  using (company_id = public.current_company_id())
  with check (company_id = public.current_company_id());

-- ============================================================
-- Pronto. Conferir no painel: Database > Tables > (RLS enabled)
-- ============================================================
