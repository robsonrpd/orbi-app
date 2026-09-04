-- ============================================================
-- Orbi — agendamentos automáticos direto no Supabase
--
-- Substitui o cron-job.org. Roda dentro do próprio banco, sem
-- serviço externo. Pode rodar este script mais de uma vez: ele
-- remove o agendamento antigo antes de criar o novo.
-- ============================================================

-- 1. Liga as duas extensões necessárias
create extension if not exists pg_cron;
create extension if not exists pg_net;

-- 2. Remove agendamentos anteriores (pra poder rodar de novo sem duplicar)
select cron.unschedule('orbi-vigia-whatsapp')  where exists (select 1 from cron.job where jobname = 'orbi-vigia-whatsapp');
select cron.unschedule('orbi-sla-atendimento') where exists (select 1 from cron.job where jobname = 'orbi-sla-atendimento');
select cron.unschedule('orbi-broadcast')       where exists (select 1 from cron.job where jobname = 'orbi-broadcast');

-- ------------------------------------------------------------
-- 3. VIGIA DO WHATSAPP — de hora em hora
--    Avisa por e-mail se uma loja conectada parar de receber
--    mensagem por 3h durante o horário comercial.
-- ------------------------------------------------------------
select cron.schedule(
  'orbi-vigia-whatsapp',
  '0 * * * *',
  $$
  select net.http_post(
    url     := 'https://www.orbisistem.com.br/api/cron/vigia-whatsapp',
    headers := '{"Content-Type":"application/json","Authorization":"Bearer pCx5yzdjQ73QRJYIokKre0XOb-zE7Xf1"}'::jsonb,
    body    := '{}'::jsonb
  );
  $$
);

-- ------------------------------------------------------------
-- 4. SLA, RODÍZIO E FOLLOW-UP — a cada 10 minutos
--    Alerta de lead sem resposta, transferência pro próximo
--    vendedor da fila e mensagens de follow-up.
-- ------------------------------------------------------------
select cron.schedule(
  'orbi-sla-atendimento',
  '*/10 * * * *',
  $$
  select net.http_post(
    url     := 'https://www.orbisistem.com.br/api/cron/sla-atendimento',
    headers := '{"Content-Type":"application/json","Authorization":"Bearer pCx5yzdjQ73QRJYIokKre0XOb-zE7Xf1"}'::jsonb,
    body    := '{}'::jsonb
  );
  $$
);

-- ------------------------------------------------------------
-- 5. ENVIO EM MASSA — a cada 1 minuto
--    Esta rota é GET (as outras são POST). Cada chamada trabalha
--    ~48s respeitando o intervalo configurado na campanha.
-- ------------------------------------------------------------
select cron.schedule(
  'orbi-broadcast',
  '* * * * *',
  $$
  select net.http_get(
    url     := 'https://www.orbisistem.com.br/api/cron/broadcast',
    headers := '{"Authorization":"Bearer pCx5yzdjQ73QRJYIokKre0XOb-zE7Xf1"}'::jsonb
  );
  $$
);

-- ------------------------------------------------------------
-- 6. Confere se os três foram criados
-- ------------------------------------------------------------
select jobname, schedule, active from cron.job where jobname like 'orbi-%' order by jobname;
