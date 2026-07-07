-- ============================================================
-- Orbi — Marca retroativamente os contatos ja importados
-- ============================================================
-- Só preenche quem ainda está em branco (criado_por is null) e só
-- os que vieram da importação em planilha (origem = 'Importação'),
-- escopado para a empresa "Editora Estrelas de Davi" — não afeta
-- outros clientes.
-- ============================================================

-- 1) Confira antes: deve bater com os 445 criados na importação
select count(*) as total_a_marcar
from public.contacts
where criado_por is null
  and origem = 'Importação'
  and company_id = (select id from public.companies where name = 'Editora Estrelas de Davi' limit 1);

-- 2) Se o número acima bateu, rode este update
update public.contacts
set criado_por = 'Importação (retroativo)'
where criado_por is null
  and origem = 'Importação'
  and company_id = (select id from public.companies where name = 'Editora Estrelas de Davi' limit 1);

-- ============================================================
-- Pronto. Execute este script no SQL Editor do Supabase.
-- ============================================================
