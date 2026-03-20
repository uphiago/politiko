-- Views principais consumidas pelo frontend.
-- Criadas diretamente no Supabase em 2026-03-20; este arquivo reconstrói o estado de produção.

-- ─── mv_ranking_partidos ──────────────────────────────────────────────────────
-- Usado por: Banner (hero stats), Ranking (lista clicável), PartidoModal (dados base)
CREATE MATERIALIZED VIEW IF NOT EXISTS mv_ranking_partidos AS
SELECT
  p.numero,
  p.sigla,
  p.nome,
  pc.total_receitas,
  SUM(d.valor)                                  AS total_despesas_real,
  COUNT(d.id)                                   AS num_despesas
FROM partidos p
LEFT JOIN prestacoes_contas pc ON pc.partido_numero = p.numero
LEFT JOIN despesas d            ON d.partido_numero  = p.numero
GROUP BY p.numero, p.sigla, p.nome, pc.total_receitas
ORDER BY pc.total_receitas DESC NULLS LAST;

CREATE UNIQUE INDEX IF NOT EXISTS idx_mv_ranking_partidos_numero
  ON mv_ranking_partidos (numero);

GRANT SELECT ON mv_ranking_partidos TO anon;

-- ─── mv_despesas_por_tipo ─────────────────────────────────────────────────────
-- Usado por: Destino (para onde foi o dinheiro, com marcação de repasse)
CREATE MATERIALIZED VIEW IF NOT EXISTS mv_despesas_por_tipo AS
SELECT
  tipo_despesa,
  SUM(valor)   AS total,
  COUNT(*)     AS num_registros
FROM despesas
WHERE valor > 0
  AND tipo_despesa IS NOT NULL
GROUP BY tipo_despesa
ORDER BY total DESC;

GRANT SELECT ON mv_despesas_por_tipo TO anon;

-- ─── mv_top_beneficiarios ────────────────────────────────────────────────────
-- Usado por: Beneficiarios (maiores recebedores de repasses)
-- Agrupa por CPF/CNPJ quando disponível, por nome como fallback
CREATE MATERIALIZED VIEW IF NOT EXISTS mv_top_beneficiarios AS
SELECT
  COALESCE(beneficiario_cnpj, beneficiario_nome)  AS id_key,
  MAX(beneficiario_nome)                          AS beneficiario_nome,
  beneficiario_cnpj,
  SUM(valor)                                      AS total,
  COUNT(*)                                        AS num_pagamentos
FROM despesas
WHERE tipo_despesa IN (
  'Doações financeiras a outros candidatos/partidos',
  'Doações de outros bens ou serviços a candidatos/partidos'
)
  AND valor > 0
  AND beneficiario_nome IS NOT NULL
GROUP BY
  COALESCE(beneficiario_cnpj, beneficiario_nome),
  beneficiario_cnpj
ORDER BY total DESC
LIMIT 100;

GRANT SELECT ON mv_top_beneficiarios TO anon;
