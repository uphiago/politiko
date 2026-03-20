-- Empresas e prestadores que receberam de 2+ partidos (exclui repasses)
CREATE MATERIALIZED VIEW IF NOT EXISTS mv_empresas_multiplos AS
SELECT
  d.beneficiario_cnpj,
  MAX(d.beneficiario_nome)                        AS beneficiario_nome,
  COUNT(DISTINCT d.partido_numero)                AS num_partidos,
  SUM(d.valor)                                    AS total,
  COUNT(*)                                        AS num_registros,
  ARRAY_AGG(DISTINCT p.sigla ORDER BY p.sigla)    AS siglas
FROM despesas d
JOIN partidos p ON d.partido_numero = p.numero
WHERE d.beneficiario_cnpj IS NOT NULL
  AND d.tipo_despesa NOT IN (
    'Doações financeiras a outros candidatos/partidos',
    'Doações de outros bens ou serviços a candidatos/partidos'
  )
GROUP BY d.beneficiario_cnpj
HAVING COUNT(DISTINCT d.partido_numero) >= 2
ORDER BY num_partidos DESC, total DESC;

GRANT SELECT ON mv_empresas_multiplos TO anon;

-- Gastos operacionais por tipo e por partido (exclui repasses)
CREATE MATERIALIZED VIEW IF NOT EXISTS mv_despesas_tipo_partido AS
SELECT
  d.partido_numero,
  p.sigla,
  d.tipo_despesa,
  SUM(d.valor)  AS total,
  COUNT(*)      AS num_registros
FROM despesas d
JOIN partidos p ON d.partido_numero = p.numero
WHERE d.tipo_despesa NOT IN (
    'Doações financeiras a outros candidatos/partidos',
    'Doações de outros bens ou serviços a candidatos/partidos'
  )
  AND d.valor > 0
GROUP BY d.partido_numero, p.sigla, d.tipo_despesa
ORDER BY d.partido_numero, total DESC;

GRANT SELECT ON mv_despesas_tipo_partido TO anon;
