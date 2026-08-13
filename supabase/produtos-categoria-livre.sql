-- ============================================================
-- Orbi — Libera as categorias de produto dos outros ramos
-- ============================================================
-- A tabela products tinha uma trava aceitando só 'otica' e 'diversos',
-- de quando o Orbi atendia apenas ótica. Com o cadastro por ramo, as
-- categorias passaram a variar (roupa, acessorio, barbearia, clinica...)
-- e o banco recusava qualquer uma delas.
--
-- A trava é removida em vez de ampliada de propósito: as categorias agora
-- vivem em src/lib/produtos-nicho.ts, então manter a lista duplicada no
-- banco exigiria uma migração a cada ramo novo — que é exatamente o que
-- causou esse erro.
-- ============================================================

alter table public.products drop constraint if exists products_categoria_check;

-- ============================================================
-- Pronto. Execute este script no SQL Editor do Supabase.
-- Sem ele, cadastrar produto em loja/barbearia/clínica/geral dá erro.
-- ============================================================
