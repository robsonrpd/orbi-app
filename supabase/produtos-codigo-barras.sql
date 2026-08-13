-- ============================================================
-- Orbi — Código de barras nos produtos (leitor / "bip" no PDV)
-- ============================================================
-- Guarda o código de barras de cada produto para que o PDV possa
-- identificar a peça pela leitura do bip (o leitor USB funciona como
-- um teclado: digita o código e dá Enter).
--
-- Aceita tanto o código de fábrica (EAN da etiqueta do fornecedor)
-- quanto um código interno criado pela loja.
-- ============================================================

alter table public.products add column if not exists codigo_barras text;

-- Um mesmo código não pode se repetir dentro da mesma empresa, senão
-- a leitura fica ambígua (o sistema não saberia qual peça baixar do
-- estoque). Só vale para produtos ativos: se a peça for excluída, o
-- código fica livre para ser reaproveitado.
create unique index if not exists products_codigo_barras_unico
  on public.products(company_id, codigo_barras)
  where codigo_barras is not null and active = true;

-- ============================================================
-- Pronto. Execute este script no SQL Editor do Supabase.
-- Rode ANTES de atualizar o sistema (a coluna precisa existir
-- antes do código que grava nela).
-- ============================================================
