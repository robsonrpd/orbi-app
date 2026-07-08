-- ============================================================
-- Orbi — Envio em massa no WhatsApp (broadcasts)
-- ============================================================
-- Uma "campanha" de envio em massa + a fila de destinatários.
-- O disparo real acontece aos poucos, via cron (src/app/api/cron/broadcast),
-- respeitando intervalo_segundos e limite_diario — nunca tudo de uma vez.
-- ============================================================

create table if not exists public.broadcasts (
  id                 uuid primary key default gen_random_uuid(),
  company_id         uuid not null references public.companies(id) on delete cascade,
  mensagem           text not null,
  intervalo_segundos int not null default 15,
  limite_diario      int not null default 100,
  status             text not null default 'ativo'
                     check (status in ('ativo', 'pausado', 'concluido', 'cancelado')),
  enviados_hoje      int not null default 0,
  ultima_data_envio  date,
  erro               text,
  created_by         text,
  created_at         timestamptz not null default now()
);

create table if not exists public.broadcast_destinatarios (
  id            uuid primary key default gen_random_uuid(),
  broadcast_id  uuid not null references public.broadcasts(id) on delete cascade,
  contact_id    uuid references public.contacts(id) on delete set null,
  numero        text not null,
  nome          text,
  status        text not null default 'pendente'
               check (status in ('pendente', 'enviado', 'falhou')),
  enviado_em    timestamptz,
  created_at    timestamptz not null default now()
);

create index if not exists broadcasts_company_status_idx on public.broadcasts(company_id, status);
create index if not exists broadcast_dest_pendentes_idx on public.broadcast_destinatarios(broadcast_id, status, created_at);

-- RLS (defense-in-depth; o app usa service role e ignora isto)
alter table public.broadcasts enable row level security;
drop policy if exists orbi_same_company on public.broadcasts;
create policy orbi_same_company on public.broadcasts
  for all to authenticated
  using (company_id = public.current_company_id())
  with check (company_id = public.current_company_id());

alter table public.broadcast_destinatarios enable row level security;
drop policy if exists orbi_same_company on public.broadcast_destinatarios;
create policy orbi_same_company on public.broadcast_destinatarios
  for all to authenticated
  using (broadcast_id in (select id from public.broadcasts where company_id = public.current_company_id()))
  with check (broadcast_id in (select id from public.broadcasts where company_id = public.current_company_id()));

-- ============================================================
-- Pronto. Execute este script no SQL Editor do Supabase.
-- ============================================================
