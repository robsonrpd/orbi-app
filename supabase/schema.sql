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
-- 8. CONFERÊNCIA — o resultado esperado é: tabelas = 28 e bucket = 1
-- ------------------------------------------------------------

select
  (select count(*) from information_schema.tables
    where table_schema = 'public' and table_type = 'BASE TABLE') as tabelas,
  (select count(*) from storage.buckets where id = 'fotos') as bucket_fotos;
