-- ============================================================
-- Orbi — RLS adicional (tabelas criadas após rls-policies.sql)
-- ============================================================
-- Mesmo princípio: defense-in-depth. O app usa service role
-- (ignora RLS); isto só protege se algum dia o browser ler
-- direto com a chave anon/authenticated. Idempotente.
-- ============================================================

do $$
declare
  t text;
  tenant_tables text[] := array[
    'conversations','lead_produtos','lead_tarefas','lead_anotacoes','mensagens_prontas'
  ];
begin
  foreach t in array tenant_tables loop
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

-- ============================================================
-- Pronto. Conferir no painel: Database > Tables > (RLS enabled)
-- ============================================================
