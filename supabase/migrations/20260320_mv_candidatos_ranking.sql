-- Ranking individual: candidatos/comitês que mais receberam repasses dos partidos
CREATE MATERIALIZED VIEW IF NOT EXISTS mv_candidatos_ranking AS
SELECT
  COALESCE(d.beneficiario_cnpj, d.beneficiario_nome)  AS id_key,
  MAX(d.beneficiario_nome)                             AS candidato_nome,
  d.beneficiario_cnpj                                  AS candidato_doc,
  COUNT(DISTINCT d.partido_numero)                     AS num_partidos,
  ARRAY_AGG(DISTINCT p.sigla ORDER BY p.sigla)         AS siglas,
  SUM(d.valor)                                         AS total_recebido,
  COUNT(*)                                             AS num_transferencias
FROM despesas d
JOIN partidos p ON d.partido_numero = p.numero
WHERE d.tipo_despesa IN (
  'Doações financeiras a outros candidatos/partidos',
  'Doações de outros bens ou serviços a candidatos/partidos'
)
  AND d.valor > 0
  AND d.beneficiario_nome IS NOT NULL
GROUP BY
  COALESCE(d.beneficiario_cnpj, d.beneficiario_nome),
  d.beneficiario_cnpj
ORDER BY total_recebido DESC
LIMIT 300;

CREATE INDEX IF NOT EXISTS idx_mv_candidatos_ranking_total
  ON mv_candidatos_ranking (total_recebido DESC);

GRANT SELECT ON mv_candidatos_ranking TO anon;
