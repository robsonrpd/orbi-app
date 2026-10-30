-- ============================================================
-- Orbi — ESQUEMA COMPLETO DO BANCO
--
-- Reconstruído em 2026-09-30 depois que o projeto Supabase original foi
-- deletado (deleção é irreversível). Nunca existiu um schema.sql: as tabelas
-- base foram criadas pelo painel e só as alterações ficaram em arquivos.
-- A partir de agora ESTE é o arquivo de referência — toda mudança de banco
-- entra aqui também.
--
-- Como foi reconstruído: colunas extraídas do código (28 tabelas) e conferidas
-- contra a contagem de colunas do banco antigo. Todas bateram.
--
-- Como usar: SQL Editor do Supabase -> colar tudo -> Run.
-- Pode rodar mais de uma vez (tudo é "if not exists").
--
-- ATENÇÃO — configuração que NÃO é SQL e precisa ser feita no projeto novo (Authentication):
--   * Confirmação de e-mail DESLIGADA ("Confirm email" off). O cadastro chama signUp no navegador e
--     depois /api/setup-account, que exige sessão: com a confirmação ligada o signUp não devolve
--     sessão e a tela mostra "Não autenticado".
--   * Site URL = https://www.orbisistem.com.br e Redirect URLs = https://www.orbisistem.com.br/**
--     (senão os e-mails de "esqueci a senha" apontam para http://localhost:3000).
--   Feito em 2026-09-30 com "supabase config push" (config.toml numa pasta à parte).
-- Pode rodar mais de uma vez (tudo é "if not exists").
-- ============================================================


-- ------------------------------------------------------------
-- 1. EMPRESAS, USUÁRIOS, EQUIPE
-- ------------------------------------------------------------

create table if not exists public.companies (
  id                   uuid primary key default gen_random_uuid(),
  slug                 text unique not null,
  name                 text not null,
  business_type        text default 'otica',
  logo_url             text,
  settings             jsonb not null default '{}'::jsonb,
  subscription_status  text default 'trial',
  subscription_plan    text,
  -- o cadastro promete "14 dias grátis" e o código nunca grava esta data: quem define é o banco
  trial_ends_at        timestamptz default (now() + interval '14 days'),
  active               boolean not null default true,
  created_at           timestamptz not null default now()
);

create table if not exists public.vendedores (
  id               uuid primary key default gen_random_uuid(),
  company_id       uuid not null references public.companies(id) on delete cascade,
  nome             text not null,
  telefone         text,
  email            text,
  data_nascimento  date,
  cep              text,
  endereco         text,
  numero           text,
  complemento      text,
  bairro           text,
  cidade           text,
  uf               text,
  notes            text,
  comissao_percent numeric(5,2) default 0,
  bloqueios        text[] not null default '{}',
  active           boolean not null default true,
  created_at       timestamptz not null default now()
);

create table if not exists public.users (
  id           uuid primary key references auth.users(id) on delete cascade,
  company_id   uuid references public.companies(id) on delete cascade,
  email        text not null,
  name         text,
  role         text not null default 'admin',
  vendedor_id  uuid references public.vendedores(id) on delete set null,
  created_at   timestamptz not null default now()
);

create table if not exists public.company_members (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users(id) on delete cascade,
  company_id  uuid not null references public.companies(id) on delete cascade,
  created_at  timestamptz not null default now(),
  unique (user_id, company_id)
);


-- ------------------------------------------------------------
-- 2. CRM: CONTATOS/LEADS, CONVERSAS, ANOTAÇÕES, TAREFAS
-- ------------------------------------------------------------

create table if not exists public.contacts (
  id               uuid primary key default gen_random_uuid(),
  company_id       uuid not null references public.companies(id) on delete cascade,
  name             text,
  phone            text not null,
  email            text,
  origem           text,
  tags             text[] not null default '{}',
  notes            text,
  funil_etapa      text not null default 'novo',
  funil_valor      numeric(12,2) default 0,
  qualificacao     int default 0,
  negociacao_status text default 'aberta',
  responsavel_id   uuid references public.vendedores(id) on delete set null,
  data_nascimento  date,
  cep              text,
  endereco         text,
  numero           text,
  complemento      text,
  bairro           text,
  cidade           text,
  uf               text,
  lgpd_consent     text default 'nao_informado',
  active           boolean not null default true,
  criado_por       text,
  import_batch_id  uuid,
  foto_url         text,
  created_at       timestamptz not null default now(),
  -- o código trata o erro 23505 ("Este telefone já está cadastrado"), então
  -- a unicidade por loja existia no banco antigo
  unique (company_id, phone)
);

create table if not exists public.conversations (
  id                  uuid primary key default gen_random_uuid(),
  company_id          uuid not null references public.companies(id) on delete cascade,
  -- NULO em conversa de grupo (grupo não é um contato)
  contact_id          uuid references public.contacts(id) on delete cascade,
  numero              text,
  grupo_nome          text,
  messages            jsonb not null default '[]'::jsonb,
  handled_by_ai       boolean not null default false,
  escalated_at        timestamptz,
  last_message_at     timestamptz not null default now(),
  fluxo_etapa         int,
  sla_alertado_em     timestamptz,
  sla_transferido_em  timestamptz,
  followup_etapa      int default 0,
  followup_ultimo_em  timestamptz,
  created_at          timestamptz not null default now()
);

create table if not exists public.lead_anotacoes (
  id          uuid primary key default gen_random_uuid(),
  company_id  uuid not null references public.companies(id) on delete cascade,
  contact_id  uuid not null references public.contacts(id) on delete cascade,
  texto       text not null,
  created_at  timestamptz not null default now()
);

create table if not exists public.lead_tarefas (
  id          uuid primary key default gen_random_uuid(),
  company_id  uuid not null references public.companies(id) on delete cascade,
  contact_id  uuid not null references public.contacts(id) on delete cascade,
  titulo      text not null,
  vence_em    date,
  feito       boolean not null default false,
  created_at  timestamptz not null default now()
);

create table if not exists public.lead_produtos (
  id          uuid primary key default gen_random_uuid(),
  company_id  uuid not null references public.companies(id) on delete cascade,
  contact_id  uuid not null references public.contacts(id) on delete cascade,
  nome        text not null,
  preco       numeric(12,2) not null default 0,
  quantidade  int not null default 1,
  desconto    numeric(12,2) not null default 0,
  created_at  timestamptz not null default now()
);

create table if not exists public.mensagens_prontas (
  id          uuid primary key default gen_random_uuid(),
  company_id  uuid not null references public.companies(id) on delete cascade,
  titulo      text not null,
  texto       text not null,
  created_at  timestamptz not null default now()
);

-- deduplicação do webhook do WhatsApp (a Evolution reenvia o mesmo evento)
create table if not exists public.whatsapp_mensagens_processadas (
  message_id  text primary key,
  created_at  timestamptz not null default now()
);


-- ------------------------------------------------------------
-- 3. ENVIO EM MASSA
-- ------------------------------------------------------------

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


-- ------------------------------------------------------------
-- 4. MÓDULOS FORA DO PRODUTO ATUAL (CRM de leads)
--
-- Ficam ocultos na interface, mas as tabelas existem pra nenhuma tela que
-- permanece quebrar ao consultá-las (ex: ficha do cliente lista vendas).
-- Reconstruídas por inferência a partir do código; se algum módulo for
-- reativado, REVISAR a tabela dele antes.
-- ------------------------------------------------------------

create table if not exists public.services (
  id                uuid primary key default gen_random_uuid(),
  company_id        uuid not null references public.companies(id) on delete cascade,
  name              text not null,
  duration_minutes  int not null default 60,
  price             numeric(10,2) not null default 0,
  image_url         text,
  active            boolean not null default true,
  created_at        timestamptz not null default now()
);

create table if not exists public.appointments (
  id             uuid primary key default gen_random_uuid(),
  company_id     uuid not null references public.companies(id) on delete cascade,
  contact_id     uuid references public.contacts(id) on delete cascade,
  service_id     uuid references public.services(id) on delete set null,
  professional   text,
  start_at       timestamptz not null,
  end_at         timestamptz not null,
  status         text not null default 'scheduled'
                 check (status in ('scheduled','confirmed','completed','cancelled','no_show')),
  reminder_sent  boolean not null default false,
  notes          text,
  created_at     timestamptz not null default now()
);

create table if not exists public.transactions (
  id               uuid primary key default gen_random_uuid(),
  company_id       uuid not null references public.companies(id) on delete cascade,
  contact_id       uuid references public.contacts(id) on delete set null,
  appointment_id   uuid references public.appointments(id) on delete set null,
  amount           numeric(12,2) not null,
  status           text not null default 'pending'
                   check (status in ('pending','paid','overdue','cancelled')),
  forma_pagamento  text,
  due_date         date,
  paid_at          timestamptz,
  payment_link     text,
  external_id      text,
  notes            text,
  created_at       timestamptz not null default now()
);

create table if not exists public.products (
  id                uuid primary key default gen_random_uuid(),
  company_id        uuid not null references public.companies(id) on delete cascade,
  name              text not null,
  categoria         text default 'otica',
  tipo_produto      text,
  grife             text,
  ncm               text,
  price             numeric(12,2) not null default 0,
  cost_price        numeric(12,2) default 0,
  stock             int not null default 0,
  controla_estoque  boolean not null default true,
  image_url         text,
  codigo_barras     text,
  tamanho           text,
  cor               text,
  active            boolean not null default true,
  created_at        timestamptz not null default now()
);
create unique index if not exists products_codigo_barras_unico
  on public.products(company_id, codigo_barras)
  where codigo_barras is not null and active = true;

create table if not exists public.movimentacoes_estoque (
  id          uuid primary key default gen_random_uuid(),
  company_id  uuid not null references public.companies(id) on delete cascade,
  product_id  uuid references public.products(id) on delete cascade,
  tipo        text not null,
  quantidade  int not null,
  motivo      text,
  created_at  timestamptz not null default now()
);

create table if not exists public.caixas (
  id              uuid primary key default gen_random_uuid(),
  company_id      uuid not null references public.companies(id) on delete cascade,
  status          text not null default 'aberto',
  saldo_inicial   numeric(12,2) not null default 0,
  saldo_final     numeric(12,2),
  total_entradas  numeric(12,2) default 0,
  total_saidas    numeric(12,2) default 0,
  diferenca       numeric(12,2),
  observacoes     text,
  fechado_em      timestamptz,
  created_at      timestamptz not null default now()
);

create table if not exists public.caixa_movimentos (
  id          uuid primary key default gen_random_uuid(),
  company_id  uuid not null references public.companies(id) on delete cascade,
  caixa_id    uuid not null references public.caixas(id) on delete cascade,
  tipo        text not null,
  valor       numeric(12,2) not null,
  descricao   text,
  created_at  timestamptz not null default now()
);

create table if not exists public.vendas (
  id               uuid primary key default gen_random_uuid(),
  company_id       uuid not null references public.companies(id) on delete cascade,
  numero           int not null,
  contact_id       uuid references public.contacts(id) on delete set null,
  cliente_nome     text,
  vendedor         text,
  itens            jsonb not null default '[]'::jsonb,
  total            numeric(12,2) not null default 0,
  forma_pagamento  text,
  caixa_id         uuid references public.caixas(id) on delete set null,
  created_at       timestamptz not null default now()
);

create table if not exists public.contas_pagar (
  id          uuid primary key default gen_random_uuid(),
  company_id  uuid not null references public.companies(id) on delete cascade,
  descricao   text not null,
  fornecedor  text,
  valor       numeric(12,2) not null default 0,
  vencimento  date,
  status      text not null default 'pendente',
  pago_em     timestamptz,
  created_at  timestamptz not null default now()
);

create table if not exists public.receitas (
  id            uuid primary key default gen_random_uuid(),
  company_id    uuid not null references public.companies(id) on delete cascade,
  contact_id    uuid references public.contacts(id) on delete cascade,
  data_receita  date,
  medico        text,
  od_esferico   text, od_cilindrico text, od_eixo text, od_dnp text, od_altura text,
  oe_esferico   text, oe_cilindrico text, oe_eixo text, oe_dnp text, oe_altura text,
  adicao        text,
  observacoes   text,
  created_at    timestamptz not null default now()
);

create table if not exists public.orcamentos (
  id                uuid primary key default gen_random_uuid(),
  company_id        uuid not null references public.companies(id) on delete cascade,
  numero            int not null,
  contact_id        uuid references public.contacts(id) on delete set null,
  cliente_nome      text,
  cliente_telefone  text,
  vendedor          text,
  itens             jsonb not null default '[]'::jsonb,
  desconto          numeric(12,2) not null default 0,
  total             numeric(12,2) not null default 0,
  status            text not null default 'pendente',
  validade          date,
  observacoes       text,
  anexo_url         text,
  anexo_nome        text,
  created_at        timestamptz not null default now()
);

create table if not exists public.ordens_servico (
  id                        uuid primary key default gen_random_uuid(),
  company_id                uuid not null references public.companies(id) on delete cascade,
  numero                    int not null,
  contact_id                uuid references public.contacts(id) on delete set null,
  receita_id                uuid references public.receitas(id) on delete set null,
  vendedor                  text,
  medico                    text,
  laboratorio               text,
  status                    text not null default 'emitida',
  data_emissao              date not null default current_date,
  data_prevista_cliente     date,
  data_prevista_fornecedor  date,
  itens                     jsonb not null default '[]'::jsonb,
  desconto                  numeric(12,2) not null default 0,
  total                     numeric(12,2) not null default 0,
  sinal                     numeric(12,2) not null default 0,
  garantia                  boolean not null default false,
  garantia_numero           text,
  observacoes               text,
  created_at                timestamptz not null default now()
);

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

create table if not exists public.indicacoes (
  id                uuid primary key default gen_random_uuid(),
  company_id        uuid not null references public.companies(id) on delete cascade,
  colaborador       text,
  indicado_nome     text,
  indicado_email    text,
  indicado_telefone text,
  status            text not null default 'pendente',
  created_at        timestamptz not null default now()
);

create table if not exists public.reviews (
  id          uuid primary key default gen_random_uuid(),
  company_id  uuid not null references public.companies(id) on delete cascade,
  contact_id  uuid references public.contacts(id) on delete set null,
  author_name text,
  rating      int not null check (rating between 1 and 5),
  comment     text,
  visible     boolean not null default false,
  created_at  timestamptz not null default now()
);


-- ------------------------------------------------------------
-- 5. ÍNDICES
-- ------------------------------------------------------------

create index if not exists company_members_user_idx    on public.company_members(user_id);
create index if not exists company_members_company_idx on public.company_members(company_id);
create index if not exists users_company_idx           on public.users(company_id);
create index if not exists vendedores_company_idx      on public.vendedores(company_id);

create index if not exists contacts_funil_idx          on public.contacts(company_id, funil_etapa);
create index if not exists contacts_responsavel_idx    on public.contacts(responsavel_id);
create index if not exists contacts_import_batch_idx   on public.contacts(import_batch_id) where import_batch_id is not null;

create index if not exists conversations_company_idx   on public.conversations(company_id, last_message_at desc);
create index if not exists conversations_contact_idx   on public.conversations(contact_id);
create index if not exists conversations_numero_idx    on public.conversations(company_id, numero);

create index if not exists lead_anotacoes_contact_idx  on public.lead_anotacoes(contact_id);
create index if not exists lead_tarefas_company_idx    on public.lead_tarefas(company_id, feito);
create index if not exists lead_produtos_contact_idx   on public.lead_produtos(contact_id);

create index if not exists whatsapp_msgs_processadas_created_idx on public.whatsapp_mensagens_processadas(created_at);

create index if not exists broadcasts_company_status_idx  on public.broadcasts(company_id, status);
create index if not exists broadcast_dest_pendentes_idx   on public.broadcast_destinatarios(broadcast_id, status, created_at);

create index if not exists appointments_company_start_idx on public.appointments(company_id, start_at);
create index if not exists transactions_company_idx       on public.transactions(company_id, status);
create index if not exists vendas_company_numero_idx      on public.vendas(company_id, numero desc);
create index if not exists orcamentos_company_numero_idx  on public.orcamentos(company_id, numero desc);
create index if not exists os_company_numero_idx          on public.ordens_servico(company_id, numero desc);


-- ------------------------------------------------------------
-- 6. SEGURANÇA (RLS)
--
-- O app acessa tudo pela service role (que ignora RLS); isto é a segunda
-- barreira, caso alguma chave anon/authenticated seja usada por engano.
-- ------------------------------------------------------------

create or replace function public.current_company_id()
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select company_id from public.users where id = auth.uid()
$$;

do $$
declare
  t text;
  tenant_tables text[] := array[
    'vendedores','contacts','conversations','lead_anotacoes','lead_tarefas','lead_produtos',
    'mensagens_prontas','broadcasts','services','appointments','transactions','products',
    'movimentacoes_estoque','caixas','caixa_movimentos','vendas','contas_pagar','receitas',
    'orcamentos','ordens_servico','projetos','indicacoes','reviews'
  ];
begin
  foreach t in array tenant_tables loop
    execute format('alter table public.%I enable row level security;', t);
    execute format('drop policy if exists orbi_same_company on public.%I;', t);
    execute format($p$
      create policy orbi_same_company on public.%I
      for all to authenticated
      using (company_id = public.current_company_id())
      with check (company_id = public.current_company_id());
    $p$, t);
  end loop;
end $$;

alter table public.companies enable row level security;
drop policy if exists orbi_own_company on public.companies;
create policy orbi_own_company on public.companies
  for all to authenticated
  using (id = public.current_company_id())
  with check (id = public.current_company_id());

alter table public.users enable row level security;
drop policy if exists orbi_company_users on public.users;
create policy orbi_company_users on public.users
  for all to authenticated
  using (company_id = public.current_company_id())
  with check (company_id = public.current_company_id());

alter table public.company_members enable row level security;
drop policy if exists orbi_own_membership on public.company_members;
create policy orbi_own_membership on public.company_members
  for select to authenticated
  using (user_id = auth.uid());

alter table public.broadcast_destinatarios enable row level security;
drop policy if exists orbi_same_company on public.broadcast_destinatarios;
create policy orbi_same_company on public.broadcast_destinatarios
  for all to authenticated
  using (broadcast_id in (select id from public.broadcasts where company_id = public.current_company_id()))
  with check (broadcast_id in (select id from public.broadcasts where company_id = public.current_company_id()));

-- só o servidor usa esta tabela: RLS ligado e nenhuma policy = ninguém mais lê
alter table public.whatsapp_mensagens_processadas enable row level security;


-- ------------------------------------------------------------
-- 7. ARMAZENAMENTO DE FOTOS E ANEXOS
--    (logo, foto de produto, mídia recebida pelo WhatsApp)
-- ------------------------------------------------------------

insert into storage.buckets (id, name, public)
values ('fotos', 'fotos', true)
on conflict (id) do update set public = true;


-- ------------------------------------------------------------
-- 7b. TIQUES DE LEITURA, FOTOS DE PERFIL E BUSCAS DIRETAS (funções leves)
--     (mesmo conteúdo de supabase/status-mensagens.sql e supabase/fotos.sql)
-- ------------------------------------------------------------

alter table public.conversations add column if not exists status_em timestamptz;

-- permite achar a conversa de uma mensagem pelo id do WhatsApp (waId) sem varrer a tabela
create index if not exists conversations_messages_gin
  on public.conversations using gin (messages jsonb_path_ops);

-- busca de contato por telefone (8 últimos dígitos, ignorando formatação)
create index if not exists contacts_fone8_idx
  on public.contacts (company_id, (right(regexp_replace(phone, '\D', '', 'g'), 8)));

create or replace function public.atualizar_status_mensagem(
  p_company uuid,
  p_wa_id   text,
  p_status  text
)
returns int
language plpgsql
as $$
declare
  novo int := case p_status when 'sent' then 1 when 'delivered' then 2 when 'read' then 3 else 0 end;
  n    int := 0;
begin
  if novo = 0 or coalesce(p_wa_id, '') = '' then return 0; end if;

  update public.conversations c
     set messages = (
           select jsonb_agg(
                    case
                      when e.m ->> 'waId' = p_wa_id
                       and (case coalesce(e.m ->> 'status', '')
                              when 'read' then 3 when 'delivered' then 2 when 'sent' then 1 else 0 end) < novo
                      then jsonb_set(e.m, '{status}', to_jsonb(p_status))
                      else e.m
                    end
                    order by e.i)
             from jsonb_array_elements(c.messages) with ordinality as e(m, i)
         ),
         status_em = now()
   where c.company_id = p_company
     and c.messages @> jsonb_build_array(jsonb_build_object('waId', p_wa_id))
     -- só toca a conversa se alguma mensagem ainda vai MUDAR de status (evita reescrever o jsonb à toa)
     and exists (
           select 1 from jsonb_array_elements(c.messages) x(m)
            where x.m ->> 'waId' = p_wa_id
              and (case coalesce(x.m ->> 'status', '')
                     when 'read' then 3 when 'delivered' then 2 when 'sent' then 1 else 0 end) < novo);

  get diagnostics n = row_count;
  return n;
end;
$$;

-- (achar_contato_por_telefone é criada em fotos.sql, que devolve também foto_tentada_em)

-- Lista de conversas: agora devolve atividade_em e filtra por ela (troca a assinatura, por isso o drop).
drop function if exists public.conversas_resumo(uuid, int, timestamptz);
create function public.conversas_resumo(
  p_company uuid,
  p_limite  int default 500,
  p_desde   timestamptz default null
)
returns table (
  id              uuid,
  numero          text,
  contact_id      uuid,
  grupo_nome      text,
  last_message_at timestamptz,
  atividade_em    timestamptz,
  handled_by_ai   boolean,
  ultima_texto    text,
  ultima_midia    text
)
language sql
stable
as $$
  select c.id, c.numero, c.contact_id, c.grupo_nome, c.last_message_at,
         greatest(c.last_message_at, c.status_em),
         c.handled_by_ai,
         left(c.messages -> -1 ->> 'content', 160),
         c.messages -> -1 -> 'midia' ->> 'tipo'
  from public.conversations c
  where c.company_id = p_company
    and (p_desde is null or greatest(c.last_message_at, c.status_em) >= p_desde)
  order by c.last_message_at desc nulls last
  limit least(greatest(p_limite, 1), 1000)
$$;

-- Estas funções leem/gravam conversas de QUALQUER empresa pelo id informado. Funções em "public" ficam
-- expostas à API pública por padrão: sem o revoke, quem tivesse a chave anônima mexeria em outra loja.
-- Só o servidor (service_role) pode chamar.
revoke all on function public.atualizar_status_mensagem(uuid, text, text) from public, anon, authenticated;
revoke all on function public.conversas_resumo(uuid, int, timestamptz)    from public, anon, authenticated;
grant execute on function public.atualizar_status_mensagem(uuid, text, text) to service_role;
grant execute on function public.conversas_resumo(uuid, int, timestamptz)    to service_role;


alter table public.contacts add column if not exists foto_tentada_em timestamptz;

-- troca a assinatura (agora devolve foto_tentada_em), por isso o drop
drop function if exists public.achar_contato_por_telefone(uuid, text);
create function public.achar_contato_por_telefone(p_company uuid, p_chave text)
returns table (id uuid, phone text, foto_url text, foto_tentada_em timestamptz)
language sql
stable
as $$
  select c.id, c.phone, c.foto_url, c.foto_tentada_em
    from public.contacts c
   where c.company_id = p_company
     and right(regexp_replace(c.phone, '\D', '', 'g'), 8) = p_chave
   order by c.created_at
   limit 1
$$;

-- Contatos que precisam de foto, na ordem em que vale a pena buscar:
--   1º) quem tem link do WhatsApp (vai vencer): migrar pro Storage; revisita no máximo 1x por dia
--   2º) quem não tem foto: tenta de novo a cada 3 dias (a pessoa pode ter colocado uma)
-- dentro de cada grupo, as conversas mais recentes primeiro (são as que aparecem no topo da lista).
create or replace function public.fotos_pendentes(p_company uuid, p_limite int default 8)
returns table (id uuid, phone text, foto_url text)
language sql
stable
as $$
  select c.id, c.phone, c.foto_url
    from public.contacts c
    left join lateral (
      select max(v.last_message_at) as ultima from public.conversations v where v.contact_id = c.id
    ) u on true
   where c.company_id = p_company
     and c.active
     and (
          (c.foto_url like '%pps.whatsapp.net%' and (c.foto_tentada_em is null or c.foto_tentada_em < now() - interval '1 day'))
       or (c.foto_url is null                  and (c.foto_tentada_em is null or c.foto_tentada_em < now() - interval '3 days'))
     )
   order by (c.foto_url is not null) desc, u.ultima desc nulls last
   limit least(greatest(p_limite, 1), 50)
$$;

revoke all on function public.achar_contato_por_telefone(uuid, text) from public, anon, authenticated;
revoke all on function public.fotos_pendentes(uuid, int)             from public, anon, authenticated;
grant execute on function public.achar_contato_por_telefone(uuid, text) to service_role;
grant execute on function public.fotos_pendentes(uuid, int)             to service_role;


-- ------------------------------------------------------------
-- 7c. HISTÓRICO COMPLETO DAS CONVERSAS (arquivo de mensagens)
--     (mesmo conteúdo de supabase/historico.sql)
-- ------------------------------------------------------------

create table if not exists public.mensagens_arquivo (
  id               bigserial primary key,
  company_id       uuid not null references public.companies(id) on delete cascade,
  conversation_id  uuid not null references public.conversations(id) on delete cascade,
  ts               timestamptz not null,
  msg              jsonb not null,
  chave            text not null,
  unique (conversation_id, chave)
);
create index if not exists mensagens_arquivo_conversa_idx on public.mensagens_arquivo (conversation_id, ts desc);

-- só o servidor lê/grava (RLS ligado e nenhuma policy)
alter table public.mensagens_arquivo enable row level security;

-- Identidade de uma mensagem: o id do WhatsApp quando existe; senão um hash de papel+hora+texto.
-- O status (✓/✓✓) NÃO entra na chave, então ler uma mensagem não a "duplica".
create or replace function public.chave_mensagem(m jsonb)
returns text
language sql
immutable
as $$
  select coalesce(
    nullif(m ->> 'waId', ''),
    md5(coalesce(m ->> 'role', '') || '|' || coalesce(m ->> 'ts', '') || '|' || coalesce(m ->> 'content', ''))
  )
$$;

-- hora da mensagem, tolerante a lixo
create or replace function public.hora_mensagem(m jsonb)
returns timestamptz
language plpgsql
immutable
as $$
begin
  return coalesce((m ->> 'ts')::timestamptz, 'epoch'::timestamptz);
exception when others then
  return 'epoch'::timestamptz;
end;
$$;

-- Arquiva o que SAIU da conversa. Só roda quando a lista não cresceu (anexar uma mensagem é o caso
-- comum e não descarta nada), o que mantém o custo baixo.
create or replace function public.arquivar_mensagens_cortadas()
returns trigger
language plpgsql
as $$
begin
  if jsonb_typeof(old.messages) = 'array'
     and jsonb_typeof(new.messages) = 'array'
     and jsonb_array_length(old.messages) > 0
     and jsonb_array_length(new.messages) <= jsonb_array_length(old.messages) then
    insert into public.mensagens_arquivo (company_id, conversation_id, ts, msg, chave)
    select old.company_id, old.id, public.hora_mensagem(o.m), o.m, public.chave_mensagem(o.m)
      from jsonb_array_elements(old.messages) as o(m)
     where not exists (
       select 1 from jsonb_array_elements(new.messages) as n(m)
        where public.chave_mensagem(n.m) = public.chave_mensagem(o.m))
    on conflict (conversation_id, chave) do nothing;
  end if;
  return new;
end;
$$;

drop trigger if exists conversations_arquivar_mensagens on public.conversations;
create trigger conversations_arquivar_mensagens
  before update of messages on public.conversations
  for each row execute function public.arquivar_mensagens_cortadas();

-- Mescla um lote de mensagens (ex: histórico do WhatsApp) numa conversa, de forma ATÔMICA:
-- junta com o que já existe (sem duplicar), ordena pela hora real, deixa as mais recentes na conversa
-- ativa e manda o resto para o arquivo. Devolve quantas mensagens eram realmente novas.
create or replace function public.mesclar_mensagens(p_conversation uuid, p_msgs jsonb, p_ativas int default 40)
returns int
language plpgsql
as $$
declare
  v_company uuid;
  v_atuais  jsonb;
  v_antes   int;
  v_todas   jsonb;
  v_total   int;
  v_ativas  jsonb;
  v_ultima  timestamptz;
begin
  select company_id, messages into v_company, v_atuais
    from public.conversations where id = p_conversation for update;
  if v_company is null then return 0; end if;

  -- quantas das mensagens recebidas ainda não estavam na conversa nem no arquivo
  select count(*) into v_antes
    from (select distinct public.chave_mensagem(x.m) as k from jsonb_array_elements(p_msgs) as x(m)) novas
   where not exists (select 1 from jsonb_array_elements(coalesce(v_atuais, '[]'::jsonb)) a(m) where public.chave_mensagem(a.m) = novas.k)
     and not exists (select 1 from public.mensagens_arquivo r where r.conversation_id = p_conversation and r.chave = novas.k);

  -- união sem duplicar (a versão já existente vence: tem status/mídia que o histórico não tem), em ordem de hora
  select coalesce(jsonb_agg(u.m order by u.t, u.ord), '[]'::jsonb), count(*)
    into v_todas, v_total
    from (
      select distinct on (k) m, t, ord
        from (
          select a.m, public.chave_mensagem(a.m) as k, public.hora_mensagem(a.m) as t, 0 as prio, a.ord::int as ord
            from jsonb_array_elements(coalesce(v_atuais, '[]'::jsonb)) with ordinality as a(m, ord)
          union all
          select b.m, public.chave_mensagem(b.m), public.hora_mensagem(b.m), 1, b.ord::int + 100000
            from jsonb_array_elements(p_msgs) with ordinality as b(m, ord)
        ) z
       order by k, prio
    ) u;

  -- o que não cabe na conversa ativa vai para o arquivo
  insert into public.mensagens_arquivo (company_id, conversation_id, ts, msg, chave)
  select v_company, p_conversation, public.hora_mensagem(e.m), e.m, public.chave_mensagem(e.m)
    from jsonb_array_elements(v_todas) with ordinality as e(m, ord)
   where e.ord <= greatest(v_total - p_ativas, 0)
  on conflict (conversation_id, chave) do nothing;

  select coalesce(jsonb_agg(e.m order by e.ord), '[]'::jsonb) into v_ativas
    from jsonb_array_elements(v_todas) with ordinality as e(m, ord)
   where e.ord > greatest(v_total - p_ativas, 0);

  select max(public.hora_mensagem(e.m)) into v_ultima from jsonb_array_elements(v_todas) as e(m);

  update public.conversations
     set messages = v_ativas,
         -- a conversa nunca "volta no tempo"
         last_message_at = greatest(coalesce(last_message_at, 'epoch'::timestamptz), coalesce(v_ultima, 'epoch'::timestamptz))
   where id = p_conversation;

  return v_antes;
end;
$$;

-- contatos da loja pelos 8 últimos dígitos do telefone, vários de uma vez (a importação confere centenas)
create or replace function public.contatos_por_chaves(p_company uuid, p_chaves text[])
returns table (id uuid, phone text, chave text, name text)
language sql
stable
as $$
  select c.id, c.phone, right(regexp_replace(c.phone, '\D', '', 'g'), 8) as chave, c.name
    from public.contacts c
   where c.company_id = p_company
     and right(regexp_replace(c.phone, '\D', '', 'g'), 8) = any (p_chaves)
$$;

-- Funções que mexem em conversas de QUALQUER loja pelo id: só o servidor (service_role) pode chamar.
revoke all on function public.mesclar_mensagens(uuid, jsonb, int)    from public, anon, authenticated;
revoke all on function public.contatos_por_chaves(uuid, text[])      from public, anon, authenticated;
grant execute on function public.mesclar_mensagens(uuid, jsonb, int) to service_role;
grant execute on function public.contatos_por_chaves(uuid, text[])   to service_role;


-- UMA conversa por número: índice único (duplicata passa a ser impossível) + gravação atômica da mensagem.
create unique index if not exists conversations_company_numero_uniq on public.conversations (company_id, numero) where numero is not null;

-- ============================================================
-- UMA conversa por número (e gravação atômica da mensagem)
--
-- BUG: o webhook buscava "a conversa deste número" com .maybeSingle(). Quando existem DUAS, o PostgREST dá
-- erro ("mais de uma linha"), o código ignorava o erro, entendia "não existe" e CRIAVA OUTRA — e dali em
-- diante cada mensagem nova criava mais uma conversa, para sempre. O primeiro par nascia numa corrida (várias
-- mensagens do mesmo número chegando juntas, ex: o despejo do acumulado depois de uma queda do servidor).
-- Resultado em produção: 7.101 conversas para 3.510 números; a tela mostra UMA das ~30 linhas de um mesmo
-- cliente, com 1 mensagem, e o resto some. Foi o que o cliente reportou ("não carregou a mensagem completa").
--
-- Correção:
--  1) unificar_conversas_duplicadas(): junta as linhas repetidas na mais antiga (ativas + arquivo, sem
--     duplicar mensagem) e guarda uma cópia das linhas removidas em conversations_duplicadas_backup;
--  2) índice ÚNICO (company_id, numero): duplicata passa a ser impossível, não só improvável;
--  3) anexar_mensagem(): cria-se-não-existe E acrescenta a mensagem numa única operação travada (FOR UPDATE).
--     Elimina também o "ler-e-regravar" do webhook, em que duas mensagens quase simultâneas se sobrescreviam
--     e uma se perdia.
-- ============================================================

create table if not exists public.conversations_duplicadas_backup (like public.conversations including defaults);
alter table public.conversations_duplicadas_backup enable row level security;

create or replace function public.unificar_conversas_duplicadas()
returns table (grupos int, linhas_removidas int)
language plpgsql
as $$
declare
  g        record;
  v_canon  uuid;
  v_msgs   jsonb;
  v_contat uuid;
  v_rem    int;
  v_grupos int := 0;
  v_linhas int := 0;
begin
  for g in
    select company_id, numero from public.conversations
     where numero is not null
     group by company_id, numero having count(*) > 1
  loop
    -- a que fica: a ligada a um contato e, entre elas, a mais antiga
    select id into v_canon from public.conversations
     where company_id = g.company_id and numero = g.numero
     order by (contact_id is not null) desc, created_at asc, id
     limit 1;

    -- mensagens de TODAS as outras linhas (ativas + arquivo); a canônica já tem as dela
    select coalesce(jsonb_agg(s.m), '[]'::jsonb) into v_msgs from (
      select e.m
        from public.conversations c, jsonb_array_elements(c.messages) as e(m)
       where c.company_id = g.company_id and c.numero = g.numero and c.id <> v_canon
      union all
      select a.msg
        from public.mensagens_arquivo a join public.conversations c on c.id = a.conversation_id
       where c.company_id = g.company_id and c.numero = g.numero and c.id <> v_canon
    ) s;

    -- mescla sem duplicar, em ordem de hora, 40 ativas + resto no arquivo
    perform public.mesclar_mensagens(v_canon, v_msgs, 40);

    -- se só uma das duplicadas estava ligada a um contato, a canônica herda o vínculo
    select contact_id into v_contat from public.conversations
     where company_id = g.company_id and numero = g.numero and contact_id is not null
     order by created_at limit 1;
    update public.conversations set contact_id = coalesce(contact_id, v_contat) where id = v_canon;

    -- guarda cópia e remove as repetidas (o arquivo delas já foi mesclado acima)
    insert into public.conversations_duplicadas_backup
      select * from public.conversations where company_id = g.company_id and numero = g.numero and id <> v_canon;
    delete from public.conversations where company_id = g.company_id and numero = g.numero and id <> v_canon;
    get diagnostics v_rem = row_count;

    v_grupos := v_grupos + 1;
    v_linhas := v_linhas + v_rem;
  end loop;

  return query select v_grupos, v_linhas;
end;
$$;

-- Acrescenta UMA mensagem a conversa do número, criando a conversa se ainda não existir, de forma atômica.
-- Devolve o id da conversa. Mensagem repetida (o Evolution reenvia) não duplica.
create or replace function public.anexar_mensagem(
  p_company uuid, p_numero text, p_contact uuid, p_msg jsonb, p_marcar_cliente boolean default true
)
returns uuid
language plpgsql
as $$
declare
  v_id    uuid;
  v_msgs  jsonb;
  v_novas jsonb;
  v_chave text        := public.chave_mensagem(p_msg);
  v_ts    timestamptz := public.hora_mensagem(p_msg);
  v_ult   jsonb;
begin
  insert into public.conversations (company_id, contact_id, numero, messages, last_message_at, handled_by_ai)
  values (p_company, p_contact, p_numero, '[]'::jsonb, v_ts, false)
  on conflict (company_id, numero) where numero is not null do nothing;

  -- trava a linha: duas mensagens do mesmo número processadas ao mesmo tempo entram uma depois da outra
  select id, messages into v_id, v_msgs
    from public.conversations where company_id = p_company and numero = p_numero for update;
  if v_id is null then return null; end if;

  if exists (select 1 from jsonb_array_elements(v_msgs) as x(m) where public.chave_mensagem(x.m) = v_chave)
     or exists (select 1 from public.mensagens_arquivo r where r.conversation_id = v_id and r.chave = v_chave) then
    return v_id;
  end if;

  v_novas := v_msgs || jsonb_build_array(p_msg);
  v_ult := v_msgs -> -1;
  -- chegou fora de ordem (acumulado/histórico): reordena pela hora real
  if v_ult is not null and v_ts < public.hora_mensagem(v_ult) then
    select coalesce(jsonb_agg(e.m order by public.hora_mensagem(e.m), e.ord), '[]'::jsonb) into v_novas
      from jsonb_array_elements(v_novas) with ordinality as e(m, ord);
  end if;
  -- só as 40 mais recentes ficam na conversa ativa (o trigger manda o resto para o arquivo)
  if jsonb_array_length(v_novas) > 40 then
    select coalesce(jsonb_agg(e.m order by e.ord), '[]'::jsonb) into v_novas
      from jsonb_array_elements(v_novas) with ordinality as e(m, ord)
     where e.ord > jsonb_array_length(v_novas) - 40;
  end if;

  update public.conversations
     set messages        = v_novas,
         last_message_at = greatest(coalesce(last_message_at, 'epoch'::timestamptz), v_ts),
         contact_id      = coalesce(contact_id, p_contact),
         handled_by_ai   = case when p_marcar_cliente then false else handled_by_ai end
   where id = v_id;
  return v_id;
end;
$$;

revoke all on function public.unificar_conversas_duplicadas()                       from public, anon, authenticated;
revoke all on function public.anexar_mensagem(uuid, text, uuid, jsonb, boolean)      from public, anon, authenticated;
grant execute on function public.unificar_conversas_duplicadas()                    to service_role;
grant execute on function public.anexar_mensagem(uuid, text, uuid, jsonb, boolean)   to service_role;


-- Placar da importação do histórico (a tela de Conexão mostra "X mensagens importadas"). Soma NO BANCO, de forma
-- atômica: o histórico chega em vários blocos ao mesmo tempo e o webhook também grava outras chaves em
-- companies.settings (estado da conexão, QR); ler-e-regravar o JSON inteiro perderia atualizações.
create or replace function public.registrar_historico_importado(p_company uuid, p_mensagens int, p_conversas int, p_leads int)
returns void
language sql
as $$
  update public.companies
     set settings = jsonb_set(
           coalesce(settings, '{}'::jsonb), '{wa_historico}',
           jsonb_build_object(
             'pedidoEm',  coalesce(settings #>> '{wa_historico,pedidoEm}', null),
             'mensagens', coalesce((settings #>> '{wa_historico,mensagens}')::int, 0) + p_mensagens,
             'conversas', coalesce((settings #>> '{wa_historico,conversas}')::int, 0) + p_conversas,
             'leads',     coalesce((settings #>> '{wa_historico,leads}')::int, 0) + p_leads,
             'blocos',    coalesce((settings #>> '{wa_historico,blocos}')::int, 0) + 1,
             'atualizadoEm', to_char(now() at time zone 'utc', 'YYYY-MM-DD"T"HH24:MI:SS"Z"')
           ))
   where id = p_company
$$;
revoke all on function public.registrar_historico_importado(uuid, int, int, int) from public, anon, authenticated;
grant execute on function public.registrar_historico_importado(uuid, int, int, int) to service_role;


-- ------------------------------------------------------------
-- 8. CONFERÊNCIA — o resultado esperado é: tabelas = 28 e bucket = 1
-- ------------------------------------------------------------

select
  (select count(*) from information_schema.tables
    where table_schema = 'public' and table_type = 'BASE TABLE') as tabelas,
  (select count(*) from storage.buckets where id = 'fotos') as bucket_fotos;
