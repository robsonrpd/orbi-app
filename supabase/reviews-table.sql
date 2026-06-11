-- ============================================================
-- Orbi — Tabela de Avaliações (reviews)
-- ============================================================
-- Clientes avaliam a loja por um link público /avaliar/{slug}.
-- A avaliação entra como "em análise" (visible=false) e o dono
-- decide publicar. Inserção pública passa pela service role
-- (server action), então não precisa de policy para anon.
-- ============================================================

create table if not exists public.reviews (
  id          uuid primary key default gen_random_uuid(),
  company_id  uuid not null references public.companies(id) on delete cascade,
  contact_id  uuid references public.contacts(id) on delete set null,
  author_name text,
  rating      int  not null check (rating between 1 and 5),
  comment     text,
  visible     boolean not null default false,
  created_at  timestamptz not null default now()
);

create index if not exists reviews_company_idx on public.reviews(company_id);

-- RLS (defense-in-depth; o app usa service role e ignora isto)
alter table public.reviews enable row level security;
drop policy if exists orbi_same_company on public.reviews;
create policy orbi_same_company on public.reviews
  for all
  to authenticated
  using (company_id = public.current_company_id())
  with check (company_id = public.current_company_id());

-- ============================================================
-- Pronto.
-- ============================================================
